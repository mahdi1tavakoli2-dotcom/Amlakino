import { Match, Property, Client, User } from '../types';
import { storageService } from './storageService';
import { authzService } from './authzService';
import { collaborationService } from './collaborationService';
import {
  calculateMatchCompatibility,
  MatchWeights,
  DEFAULT_MATCH_WEIGHTS,
  budgetScore,
  locationScore,
  areaScore,
  propertyTypeScore,
  transactionTypeScore,
  bedroomScore,
  featureScore,
} from './matchingEngine';

export {
  DEFAULT_MATCH_WEIGHTS,
  budgetScore,
  locationScore,
  areaScore,
  propertyTypeScore,
  transactionTypeScore,
  bedroomScore,
  featureScore,
};
export type { MatchWeights };

export interface MatchFilterOptions {
  minScore?: number;
  onlyMyDeals?: boolean;
  status?: Match['status'];
}

export const matchService = {
  /**
   * Evaluates deterministic compatibility score between any property and client.
   * Delegates to the modular matchingEngine.
   */
  calculateMatch(
    property: Property,
    client: Client,
    customWeights?: Partial<MatchWeights>
  ): {
    score: number;
    factors: string[];
    unmatched: string[];
    criteriaBreakdown?: Record<string, {
      label: string;
      rawScore: number;
      weightedScore: number;
      maxWeight: number;
      explanation: string;
      quality: string;
    }>;
    summary: string;
  } {
    const weights: MatchWeights = {
      ...DEFAULT_MATCH_WEIGHTS,
      ...customWeights,
    };

    const result = calculateMatchCompatibility(property, client, weights);

    const breakdown: Record<string, any> = {};
    for (const [key, c] of Object.entries(result.criteria)) {
      breakdown[key] = {
        label: c.label,
        rawScore: c.rawScore,
        weightedScore: Math.round(c.weightedScore * 10) / 10,
        maxWeight: c.weight,
        explanation: c.explanation,
        quality: c.quality,
      };
    }

    return {
      score: result.score,
      factors: result.matchedFactors,
      unmatched: result.weakFactors,
      criteriaBreakdown: breakdown,
      summary: result.summary,
    };
  },

  /**
   * Retrieves all calculated matches for the current user according to Row-Level Security.
   * Efficiently prunes unviable candidates (transaction mismatches, archived items) before scoring.
   */
  async getAll(currentUser?: User | null, options?: MatchFilterOptions): Promise<Match[]> {
    const [properties, clients] = await Promise.all([
      storageService.getProperties(currentUser),
      storageService.getClients(currentUser),
    ]);

    const matches: Match[] = [];
    const minThreshold = options?.minScore ?? 50;

    // Filter out inactive or archived records upfront
    const activeProperties = properties.filter(
      (p) =>
        p.status !== 'archived' &&
        p.availabilityStatus !== 'sold' &&
        p.availabilityStatus !== 'rented'
    );
    const activeClients = clients.filter((c) => c.status !== 'archived');

    for (const property of activeProperties) {
      const pDeal = property.transactionType || property.dealType;

      for (const client of activeClients) {
        const cDeal = client.transactionType || client.desiredDealType;

        // Optimization: Quick heuristic rejection for incompatible transaction types
        if (cDeal && pDeal && cDeal !== pDeal) {
          continue;
        }

        const calc = this.calculateMatch(property, client);

        if (calc.score >= minThreshold) {
          const isTeamMatch = property.ownerId !== client.ownerId;
          const hasCollab = isTeamMatch
            ? collaborationService.hasCollaborationAccess(property.ownerId, client.ownerId, property.id, client.id)
            : true;

          // Finding a match does NOT automatically reveal private information.
          // Acceptance must explicitly grant additional collaboration visibility according to the defined rules.
          const effectiveUser = currentUser || null;
          const sanitizedProp = authzService.sanitizeProperty(effectiveUser, property, hasCollab);
          const sanitizedCli = authzService.sanitizeClient(effectiveUser, client, hasCollab);

          matches.push({
            id: `match_${property.id}_${client.id}`,
            propertyId: property.id,
            property: sanitizedProp,
            clientId: client.id,
            client: sanitizedCli,
            matchScore: calc.score,
            matchedFactors: calc.factors,
            unmatchedFactors: calc.unmatched,
            weakFactors: calc.unmatched,
            criteriaBreakdown: calc.criteriaBreakdown,
            status: 'new',
            isTeamMatch,
            collaborationGranted: hasCollab,
            createdAt: 'امروز',
          });
        }
      }
    }

    // Sort by match score descending
    let sorted = matches.sort((a, b) => b.matchScore - a.matchScore);

    // Team Matching Rule:
    // When a match exists between shared items in a team, ONLY the involved agents should see the match!
    // A third-party agent or uninvolved user must NOT see another pair of agents' matches.
    if (currentUser && currentUser.role === 'agent') {
      sorted = sorted.filter((m) => {
        const isPropInvolved =
          m.property.ownerId === currentUser.id || m.property.agentId === currentUser.id;
        const isClientInvolved =
          m.client.ownerId === currentUser.id || m.client.agentId === currentUser.id;
        return isPropInvolved || isClientInvolved;
      });
    }

    if (options?.onlyMyDeals && currentUser) {
      sorted = sorted.filter(
        (m) =>
          m.property.ownerId === currentUser.id ||
          m.property.agentId === currentUser.id ||
          m.client.ownerId === currentUser.id ||
          m.client.agentId === currentUser.id
      );
    }

    return sorted;
  },

  /**
   * Find matches for a specific property (Property -> Clients)
   */
  async findMatchesForProperty(
    propertyId: string,
    currentUser?: User | null,
    minScore = 50
  ): Promise<Match[]> {
    const [property, clients] = await Promise.all([
      storageService.getPropertyById(propertyId, currentUser),
      storageService.getClients(currentUser),
    ]);

    if (!property) return [];

    const matches: Match[] = [];
    const pDeal = property.transactionType || property.dealType;
    const effectiveUser = currentUser || null;

    for (const client of clients) {
      if (client.status === 'archived') continue;
      const cDeal = client.transactionType || client.desiredDealType;

      // Quick candidate prune
      if (cDeal && pDeal && cDeal !== pDeal) continue;

      const calc = this.calculateMatch(property, client);
      if (calc.score >= minScore) {
        const isTeamMatch = property.ownerId !== client.ownerId;
        const hasCollab = isTeamMatch
          ? collaborationService.hasCollaborationAccess(property.ownerId, client.ownerId, property.id, client.id)
          : true;

        const sanitizedProp = authzService.sanitizeProperty(effectiveUser, property, hasCollab);
        const sanitizedCli = authzService.sanitizeClient(effectiveUser, client, hasCollab);

        matches.push({
          id: `match_${property.id}_${client.id}`,
          propertyId: property.id,
          property: sanitizedProp,
          clientId: client.id,
          client: sanitizedCli,
          matchScore: calc.score,
          matchedFactors: calc.factors,
          unmatchedFactors: calc.unmatched,
          weakFactors: calc.unmatched,
          criteriaBreakdown: calc.criteriaBreakdown,
          status: 'new',
          isTeamMatch,
          collaborationGranted: hasCollab,
          createdAt: 'امروز',
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  },

  /**
   * Find matches for a specific client (Client -> Properties)
   */
  async findMatchesForClient(
    clientId: string,
    currentUser?: User | null,
    minScore = 50
  ): Promise<Match[]> {
    const [client, properties] = await Promise.all([
      storageService.getClientById(clientId, currentUser),
      storageService.getProperties(currentUser),
    ]);

    if (!client) return [];

    const matches: Match[] = [];
    const cDeal = client.transactionType || client.desiredDealType;
    const effectiveUser = currentUser || null;

    for (const property of properties) {
      if (
        property.status === 'archived' ||
        property.availabilityStatus === 'sold' ||
        property.availabilityStatus === 'rented'
      ) {
        continue;
      }

      const pDeal = property.transactionType || property.dealType;
      // Quick candidate prune
      if (cDeal && pDeal && cDeal !== pDeal) continue;

      const calc = this.calculateMatch(property, client);
      if (calc.score >= minScore) {
        const isTeamMatch = property.ownerId !== client.ownerId;
        const hasCollab = isTeamMatch
          ? collaborationService.hasCollaborationAccess(property.ownerId, client.ownerId, property.id, client.id)
          : true;

        const sanitizedProp = authzService.sanitizeProperty(effectiveUser, property, hasCollab);
        const sanitizedCli = authzService.sanitizeClient(effectiveUser, client, hasCollab);

        matches.push({
          id: `match_${property.id}_${client.id}`,
          propertyId: property.id,
          property: sanitizedProp,
          clientId: client.id,
          client: sanitizedCli,
          matchScore: calc.score,
          matchedFactors: calc.factors,
          unmatchedFactors: calc.unmatched,
          weakFactors: calc.unmatched,
          criteriaBreakdown: calc.criteriaBreakdown,
          status: 'new',
          isTeamMatch,
          collaborationGranted: hasCollab,
          createdAt: 'امروز',
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  },
};
