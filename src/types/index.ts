export type UserRole = 'agent' | 'manager' | 'admin';

export type PrivacyState = 'private' | 'shared' | 'archived';

export interface User {
  id: string;
  fullName: string;
  mobile: string;
  email?: string;
  role: UserRole;
  teamId?: string;
  avatarUrl?: string;
  isActive: boolean;
  licenseCode?: string;
  createdAt: string;
  exitDate?: string;
  gracePeriodEndsAt?: string;
  subscriptionStatus?: 'active' | 'expired' | 'none';
  agentMode?: 'team_member' | 'independent' | 'read_only';
}

export interface Team {
  id: string;
  name: string;
  licenseNumber: string;
  managerId: string;
  city: string;
  address: string;
  phone: string;
  logoUrl?: string;
  code?: string;
  membersCount?: number;
  createdAt: string;
}

export interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Invitation {
  id: string;
  teamId: string;
  teamName: string;
  inviterId: string;
  inviterName: string;
  inviteeMobile: string;
  inviteeEmail?: string;
  inviteeName: string;
  role: UserRole;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  token: string;
  expiresAt: string;
  createdAt: string;
  respondedAt?: string;
  acceptedAt?: string;
}

export type DealType = 'sale' | 'rent' | 'presale';
export type PropertyType = 'apartment' | 'villa' | 'office' | 'store' | 'land' | 'penthouse';
export type PropertyStatus = 'active' | 'archived' | 'reserved' | 'deal_closed';
export type AvailabilityStatus = 'available' | 'reserved' | 'sold' | 'rented' | 'archived';
export type PrivacyStatus = 'private' | 'shared';

export interface Property {
  id: string;
  code: string;
  title: string;
  dealType: DealType;
  transactionType?: DealType; // Alias for dealType per prompt
  propertyType: PropertyType;
  area: number; // in square meters
  totalPrice?: number; // for sale (Toman)
  price?: number; // Alias for totalPrice per prompt
  pricePerMeter?: number;
  unitPrice?: number; // alias for pricePerMeter
  deposit?: number; // for rent (Rahn in Toman)
  depositPrice?: number; // alias for deposit
  monthlyRent?: number; // for rent (Ejareh in Toman)
  rent?: number; // Alias for monthlyRent per prompt
  rentPrice?: number; // alias for monthlyRent
  bedrooms: number;
  floor: number;
  totalFloors: number;
  unitsPerFloor?: number;
  yearBuilt: number;
  ageYear?: number;
  parking: boolean;
  elevator: boolean;
  storage: boolean;
  balcony: boolean;
  district: string; // e.g. سعادت‌آباد، نیاوران، پاسداران
  neighborhood?: string; // Alias for district per prompt
  region?: string; // e.g. منطقه ۲
  city: string;
  addressSummary: string;
  address?: string; // Alias for addressSummary / fullAddress
  fullAddress?: string; // Privacy restricted to authorized agents
  description: string;
  features: string[];
  ownerName: string;
  ownerPhone: string;
  status: PropertyStatus;
  availabilityStatus?: AvailabilityStatus; // per prompt
  ownerId: string; // Ownership NEVER changes automatically
  privacyState: PrivacyState; // 'private' | 'shared' | 'archived' - default: private
  privacyStatus?: PrivacyStatus; // Alias for privacyState per prompt
  agentId: string;
  agentName?: string;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
  images?: string[];
  media?: string[]; // Alias for images per prompt
  notes?: string;
  isOwnerConfidentialMasked?: boolean; // Set by authorization layer for unauthorized managers
}

export type ClientRole = 'buyer' | 'tenant' | 'investor';
export type ClientStatus = 'lead' | 'active' | 'negotiation' | 'contracted' | 'lost' | 'archived';
export type ClientUrgency = 'low' | 'medium' | 'high' | 'urgent';

export interface Client {
  id: string;
  fullName: string;
  name?: string; // Alias for fullName per prompt
  mobile: string;
  phone?: string; // Alias for mobile per prompt
  secondMobile?: string;
  role: ClientRole;
  status: ClientStatus;
  desiredDealType: DealType;
  transactionType?: DealType; // Alias for desiredDealType per prompt
  desiredPropertyTypes: PropertyType[];
  propertyType?: PropertyType; // Single propertyType alias per prompt
  preferredCity?: string; // per prompt
  preferredRegions?: string[]; // Alias for desiredDistricts per prompt
  budgetMin?: number;
  minBudget?: number; // Alias for budgetMin per prompt
  budgetMax?: number; // in Toman
  maxBudget?: number; // alias for budgetMax
  maxMonthlyRent?: number; // for tenants
  maxDeposit?: number; // for tenants
  minArea?: number;
  maxArea?: number;
  minBedrooms?: number;
  bedrooms?: number; // Alias for minBedrooms per prompt
  desiredDistricts: string[];
  mustHaveElevator?: boolean;
  mustHaveParking?: boolean;
  requirements?: string[]; // Features required per prompt
  urgency?: ClientUrgency; // per prompt
  notes?: string;
  ownerId: string; // Ownership NEVER changes automatically
  privacyState: PrivacyState; // 'private' | 'shared' | 'archived' - default: private
  privacyStatus?: PrivacyStatus; // Alias for privacyState per prompt
  agentId: string;
  agentName?: string;
  teamId?: string;
  createdAt: string;
  updatedAt?: string;
  lastContactAt?: string;
  isClientConfidentialMasked?: boolean; // Set by authorization layer for unauthorized managers
}

export type OpportunityStage =
  | 'new_match'
  | 'contacted'
  | 'interested'
  | 'visit_scheduled'
  | 'visited'
  | 'negotiation'
  | 'contract'
  | 'won'
  | 'lost'
  // Legacy aliases
  | 'lead'
  | 'viewing_scheduled'
  | 'contract_pending'
  | 'closed_won'
  | 'closed_lost';

export interface Opportunity {
  id: string;
  title: string;
  client?: Client;
  clientId: string;
  clientName?: string;
  property?: Property;
  propertyId: string;
  propertyTitle?: string;
  matchScore?: number;
  stage: OpportunityStage;
  status?: 'active' | 'won' | 'lost' | 'paused' | 'cancelled';
  priority?: 'high' | 'medium' | 'low';
  nextAction?: string;
  nextFollowUp?: string;
  owner?: User | { id: string; name: string; fullName?: string };
  ownerId: string;
  agentId: string;
  agentName?: string;
  privacyState: PrivacyState;
  estimatedValue?: number; // in Toman
  estimatedCommission?: number;
  probabilityPercent?: number;
  notes?: string;
  expectedCloseDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type FollowUpPriority = 'high' | 'medium' | 'low';
export type FollowUpStatus =
  | 'pending'
  | 'completed'
  | 'overdue'
  | 'cancelled'
  | 'Pending'
  | 'Completed'
  | 'Overdue'
  | 'Cancelled';

export type FollowUpType =
  | 'phone_call'
  | 'client_followup'
  | 'property_followup'
  | 'visit_reminder'
  | 'negotiation_reminder'
  | 'contract_reminder'
  | 'custom_reminder'
  // Legacy aliases
  | 'call'
  | 'visit'
  | 'meeting'
  | 'contract'
  | 'message';

export interface FollowUp {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  dueAt?: string; // YYYY-MM-DD HH:mm or Jalali representation
  dueDate?: string;
  dueTime?: string;
  priority: FollowUpPriority;
  status: FollowUpStatus;
  type: FollowUpType;
  opportunityId?: string;
  ownerId: string; // Ownership NEVER changes automatically
  agentId: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  propertyId?: string;
  propertyTitle?: string;
  privacyState: PrivacyState;
  completedAt?: string;
  createdAt: string;
}

export type ActivityType =
  | 'call'
  | 'message'
  | 'visit'
  | 'note'
  | 'followup'
  | 'stage_change'
  | 'deal_won'
  | 'deal_lost'
  | 'opportunity_created'
  | 'property_created'
  | 'client_added'
  | 'visit_done'
  | 'followup_completed'
  | 'deal_closed';

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  type: ActivityType;
  entityType: 'opportunity' | 'property' | 'client' | 'visit' | 'followup' | 'deal';
  entityId: string;
  opportunityId?: string;
  description: string;
  timestamp: string;
  ownerId: string; // Ownership NEVER changes automatically
  privacyState?: PrivacyState;
  isPrivate?: boolean;
  teamId?: string;
}

export type VisitStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'Scheduled'
  | 'Completed'
  | 'Cancelled'
  | 'No-show';

export interface Visit {
  id: string;
  opportunityId?: string;
  client?: Client;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  property?: Property;
  propertyId: string;
  propertyTitle: string;
  propertyDistrict?: string;
  date?: string; // Required date representation
  time?: string; // Required time representation
  scheduledDate?: string;
  scheduledTime?: string;
  status: VisitStatus;
  notes?: string;
  feedback?: string;
  clientInterestLevel?: 'high' | 'medium' | 'low';
  ownerId: string; // Ownership NEVER changes automatically
  privacyState: PrivacyState;
  agentId: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  opportunityId?: string;
  property: Property;
  propertyId: string;
  propertyTitle?: string;
  client: Client;
  clientId: string;
  clientName?: string;
  agent: User | { id: string; name: string; fullName?: string };
  agentId: string;
  agentName?: string;
  date: string;
  status: 'won' | 'closed' | 'in_progress' | 'cancelled';
  notes?: string;
  dealType?: DealType;
  finalPrice?: number;
  commissionTotal?: number;
  agentShare?: number;
  officeShare?: number;
  closedAt?: string;
  contractNumber?: string;
  ownerId: string; // Ownership NEVER changes automatically
  privacyState: PrivacyState;
  teamId?: string;
  createdAt: string;
}

export interface Match {
  id: string;
  propertyId: string;
  property: Property;
  clientId: string;
  client: Client;
  matchScore: number; // 0 - 100
  matchedFactors: string[];
  unmatchedFactors?: string[];
  weakFactors?: string[]; // Alias for unmatchedFactors / warnings
  status: 'new' | 'reviewed' | 'contacted' | 'rejected';
  isTeamMatch?: boolean;
  collaborationGranted?: boolean;
  createdAt: string;
  criteriaBreakdown?: Record<string, {
    label: string;
    rawScore: number;
    weightedScore: number;
    maxWeight: number;
    explanation: string;
    quality: string;
  }>;
}

export type CollaborationRequestStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'declined' | 'Pending' | 'Accepted' | 'Rejected' | 'Expired';

export interface CollaborationRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderTeamId?: string;
  senderTeamName?: string;
  receiverId: string;
  receiverName: string;
  receiverTeamId?: string;
  propertyId: string;
  propertyTitle: string;
  propertyDistrict?: string;
  clientId: string;
  clientSummary: string; // Sanitized criteria e.g. "متقاضی خرید آپارتمان ۳ خوابه"
  matchScore: number;
  status: CollaborationRequestStatus;
  commissionSplit: string; // e.g. 50/50
  notes?: string;
  collaborationGranted?: boolean; // Granted upon acceptance
  expiresAt: string; // 7 days expiration per prompt
  createdAt: string;
  respondedAt?: string;
}

export interface SecurityTestResult {
  id: string;
  title: string;
  description: string;
  category: 'data_leakage' | 'ownership_bypass' | 'manager_overreach' | 'unshared_access' | 'team_exit' | 'role_escalation';
  passed: boolean;
  attemptedAction: string;
  expectedOutcome: string;
  actualOutcome: string;
  vulnerabilityPrevented: string;
  executionTimeMs: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'match' | 'followup' | 'visit' | 'system' | 'opportunity' | 'invitation';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface Subscription {
  id: string;
  teamId: string;
  plan: 'starter' | 'pro' | 'enterprise';
  planName: string;
  expiresAt: string;
  maxAgents: number;
  currentAgents: number;
  active: boolean;
}

export type AuditAction =
  | 'login'
  | 'logout'
  | 'property_created'
  | 'property_updated'
  | 'property_shared'
  | 'client_created'
  | 'client_shared'
  | 'opportunity_created'
  | 'collaboration_requested'
  | 'collaboration_accepted'
  | 'team_created'
  | 'team_joined'
  | 'team_left'
  | 'data_exported';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  teamId?: string;
  action: AuditAction;
  entityType?: 'property' | 'client' | 'opportunity' | 'team' | 'invitation' | 'collaboration' | 'auth';
  entityId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface DashboardStats {
  todayFollowUpsCount: number;
  overdueFollowUpsCount: number;
  newMatchesCount: number;
  activeOpportunitiesCount: number;
  upcomingVisitsCount: number;
  activePropertiesCount: number;
  activeClientsCount: number;
  monthDealsVolume: number;
}
