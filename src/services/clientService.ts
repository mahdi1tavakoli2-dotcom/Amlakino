import { Client, ClientRole, ClientStatus, ClientUrgency, DealType, PropertyType, PrivacyStatus, User } from '../types';
import { storageService } from './storageService';

export type ClientSortOption = 'newest' | 'budget_desc' | 'budget_asc' | 'urgency' | 'urgency_desc' | 'name_asc';

export interface ClientFilters {
  role?: ClientRole | 'all';
  status?: ClientStatus | 'all';
  dealType?: DealType | 'all';
  transactionType?: DealType | 'all';
  propertyType?: PropertyType | 'all';
  location?: string;
  city?: string;
  district?: string;
  preferredRegions?: string[];
  minBudget?: number;
  maxBudget?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number | 'all';
  urgency?: ClientUrgency | 'all';
  privacyStatus?: PrivacyStatus | 'all';
  search?: string;
  includeArchived?: boolean;
  sortBy?: ClientSortOption;
}

export const clientService = {
  async getAll(filters?: ClientFilters, currentUser?: User | null): Promise<Client[]> {
    let clients = await storageService.getClients(currentUser);

    // Default: exclude archived unless explicitly requested
    if (!filters?.includeArchived && (!filters?.status || filters.status !== 'archived')) {
      clients = clients.filter((c) => c.status !== 'archived');
    }

    if (!filters) return clients;

    // Role
    if (filters.role && filters.role !== 'all') {
      clients = clients.filter((c) => c.role === filters.role);
    }

    // Status
    if (filters.status && filters.status !== 'all') {
      clients = clients.filter((c) => c.status === filters.status);
    }

    // Deal type / transaction type
    const transType = filters.transactionType || filters.dealType;
    if (transType && transType !== 'all') {
      clients = clients.filter((c) => (c.transactionType || c.desiredDealType) === transType);
    }

    // Property Type
    if (filters.propertyType && filters.propertyType !== 'all') {
      clients = clients.filter((c) =>
        c.desiredPropertyTypes?.includes(filters.propertyType as PropertyType) ||
        c.propertyType === filters.propertyType
      );
    }

    // Privacy
    if (filters.privacyStatus && filters.privacyStatus !== 'all') {
      clients = clients.filter((c) => (c.privacyStatus || c.privacyState) === filters.privacyStatus);
    }

    // Urgency
    if (filters.urgency && filters.urgency !== 'all') {
      clients = clients.filter((c) => c.urgency === filters.urgency);
    }

    // Location / City / District
    const locationQuery = filters.location || filters.district || filters.city;
    if (locationQuery && locationQuery !== 'all' && locationQuery.trim() !== '') {
      const lq = locationQuery.trim().toLowerCase();
      clients = clients.filter(
        (c) =>
          (c.preferredCity && c.preferredCity.toLowerCase().includes(lq)) ||
          (c.desiredDistricts && c.desiredDistricts.some((d) => d.toLowerCase().includes(lq))) ||
          (c.preferredRegions && c.preferredRegions.some((r) => r.toLowerCase().includes(lq)))
      );
    }

    // Bedrooms
    if (filters.bedrooms && filters.bedrooms !== 'all') {
      clients = clients.filter((c) => (c.bedrooms ?? c.minBedrooms ?? 0) >= Number(filters.bedrooms));
    }

    // Area
    if (filters.minArea !== undefined && filters.minArea > 0) {
      clients = clients.filter((c) => (c.maxArea ?? 9999) >= filters.minArea!);
    }
    if (filters.maxArea !== undefined && filters.maxArea > 0) {
      clients = clients.filter((c) => (c.minArea ?? 0) <= filters.maxArea!);
    }

    // Budget
    if (filters.minBudget !== undefined && filters.minBudget > 0) {
      clients = clients.filter((c) => {
        const b = c.maxBudget ?? c.budgetMax ?? 0;
        return b >= filters.minBudget!;
      });
    }
    if (filters.maxBudget !== undefined && filters.maxBudget > 0) {
      clients = clients.filter((c) => {
        const b = c.minBudget ?? c.budgetMin ?? 0;
        return b <= filters.maxBudget!;
      });
    }

    // Search query
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim().toLowerCase();
      clients = clients.filter(
        (c) =>
          (c.fullName && c.fullName.toLowerCase().includes(q)) ||
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.mobile && c.mobile.includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q)) ||
          (c.desiredDistricts && c.desiredDistricts.some((d) => d.toLowerCase().includes(q))) ||
          (c.requirements && c.requirements.some((r) => r.toLowerCase().includes(q)))
      );
    }

    // Sorting
    const sortBy = filters.sortBy || 'newest';
    clients = [...clients].sort((a, b) => {
      if (sortBy === 'budget_asc') {
        const budgetA = a.maxBudget ?? a.budgetMax ?? 0;
        const budgetB = b.maxBudget ?? b.budgetMax ?? 0;
        return budgetA - budgetB;
      }
      if (sortBy === 'budget_desc') {
        const budgetA = a.maxBudget ?? a.budgetMax ?? 0;
        const budgetB = b.maxBudget ?? b.budgetMax ?? 0;
        return budgetB - budgetA;
      }
      if (sortBy === 'urgency' || sortBy === 'urgency_desc') {
        const urgencyWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        const wA = urgencyWeight[a.urgency || 'medium'] || 2;
        const wB = urgencyWeight[b.urgency || 'medium'] || 2;
        return wB - wA;
      }
      if (sortBy === 'name_asc') {
        const nameA = a.name || a.fullName || '';
        const nameB = b.name || b.fullName || '';
        return nameA.localeCompare(nameB, 'fa');
      }
      // 'newest' default
      return (b.id || '').localeCompare(a.id || '');
    });

    return clients;
  },

  async getById(id: string, currentUser?: User | null): Promise<Client | null> {
    return storageService.getClientById(id, currentUser);
  },

  async create(data: Omit<Client, 'id' | 'createdAt' | 'ownerId'>, currentUser?: User | null): Promise<Client> {
    return storageService.createClient(data, currentUser);
  },

  async update(id: string, updates: Partial<Client>, currentUser?: User | null): Promise<Client | null> {
    return storageService.updateClient(id, updates, currentUser);
  },

  async updateStatus(id: string, status: ClientStatus, currentUser?: User | null): Promise<Client | null> {
    return storageService.updateClient(id, { status }, currentUser);
  },

  async archive(id: string, currentUser?: User | null): Promise<Client | null> {
    return storageService.archiveClient(id, currentUser);
  },

  async restore(id: string, currentUser?: User | null): Promise<Client | null> {
    return storageService.restoreClient(id, currentUser);
  },

  async addNote(id: string, noteText: string, currentUser?: User | null): Promise<Client | null> {
    return storageService.addClientNote(id, noteText, currentUser);
  },

  async togglePrivacy(id: string, currentUser?: User | null): Promise<Client | null> {
    return storageService.toggleClientPrivacy(id, currentUser);
  },
};
