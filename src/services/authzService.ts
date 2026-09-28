import { User, Property, Client, Opportunity, FollowUp, Visit, Deal } from '../types';
import {
  maskPhoneNumber,
  maskPersonName,
  maskOwnerName,
  maskAddress,
  maskPrivateNotes,
} from '../utils/security';

export class AuthorizationService {
  /**
   * Check if user is the true owner of the record.
   * Note: Ownership NEVER changes automatically.
   */
  public isOwner(user: User | null, ownerId: string): boolean {
    if (!user) return false;
    return user.id === ownerId;
  }

  /**
   * Check if user is a team manager or admin
   */
  public isManager(user: User | null): boolean {
    if (!user) return false;
    return user.role === 'manager' || user.role === 'admin';
  }

  /**
   * Check if user is in Read-Only Mode (e.g. post 30-day grace period with no subscription)
   */
  public canCreateOrEdit(user: User | null): { allowed: boolean; reason?: string } {
    if (!user) {
      return { allowed: false, reason: 'کاربر احراز هویت نشده است.' };
    }
    if (user.agentMode === 'read_only') {
      return {
        allowed: false,
        reason: 'مهلت ۳۰ روزه خروج از تیم پایان یافته و حساب شما در حالت «فقط خواندنی» (Read-Only) قرار دارد. اطلاعات شما محفوظ است؛ جهت افزودن یا ویرایش موارد، اشتراک مستقل تهیه نمایید.',
      };
    }
    return { allowed: true };
  }

  /**
   * Property View Permission
   * - Owner agent: Full access
   * - Team agent: Allowed ONLY IF property.privacyState === 'shared'
   * - Team manager: Allowed to view property general attributes, but sensitive owner data is masked!
   * - Outside agent: Denied
   */
  public canViewProperty(user: User | null, property: Property): boolean {
    if (!user) return false;
    if (this.isOwner(user, property.ownerId)) return true;
    if (this.isManager(user) && user.teamId && property.teamId === user.teamId) return true;
    if (property.privacyState === 'shared' && user.teamId && property.teamId === user.teamId) return true;
    return false;
  }

  /**
   * Property Edit Permission
   * Strictly restricted to the owner agent!
   * Neither managers nor peers can alter an agent's listing.
   */
  public canEditProperty(user: User | null, property: Property): boolean {
    if (!user) return false;
    if (user.agentMode === 'read_only') return false;
    return this.isOwner(user, property.ownerId);
  }

  /**
   * Sanitizes Property records according to Privacy First principles.
   * If viewer is NOT owner:
   * Team members may see:
   * region, property type, transaction type, price, area, bedrooms, features, availability
   * NEVER expose:
   * owner name, owner phone, exact address, internal notes, communication history
   */
  public sanitizeProperty(user: User | null, property: Property, hasCollaborationGrant = false): Property {
    if (!user || this.isOwner(user, property.ownerId)) {
      return property;
    }

    if (hasCollaborationGrant) {
      // Mutual collaboration accepted: grant collaboration contact coordination
      return {
        ...property,
        isOwnerConfidentialMasked: false,
      };
    }

    // Unauthorized viewer (manager or colleague) - completely strip private owner details
    return {
      ...property,
      ownerName: 'مالک محرمانه مشاور',
      ownerPhone: '', // Completely stripped - never exposed
      fullAddress: property.district ? `محدوده ${property.district} (آدرس پلاک محرمانه است)` : 'محدوده محرمانه',
      address: property.district ? `محدوده ${property.district}` : 'محدوده محرمانه',
      notes: undefined, // Internal notes strictly hidden
      isOwnerConfidentialMasked: true,
    };
  }

  /**
   * Client View Permission
   * - Owner agent: Full access
   * - Team manager: Can view masked records for KPI and pipeline calculation
   * - Team colleague: Only if explicitly shared
   */
  public canViewClient(user: User | null, client: Client): boolean {
    if (!user) return false;
    if (this.isOwner(user, client.ownerId)) return true;
    if (this.isManager(user) && user.teamId && client.teamId === user.teamId) return true;
    if (client.privacyState === 'shared' && user.teamId && client.teamId === user.teamId) return true;
    return false;
  }

  /**
   * Client Edit Permission
   * Strictly restricted to the owner agent.
   */
  public canEditClient(user: User | null, client: Client): boolean {
    if (!user) return false;
    if (user.agentMode === 'read_only') return false;
    return this.isOwner(user, client.ownerId);
  }

  /**
   * Sanitizes Client records according to Privacy First principles.
   * Team members may see:
   * preferred region, property type, transaction type, budget, area, bedrooms, requirements, match eligibility
   * NEVER expose:
   * client name, client phone, private notes, communication history, follow-up history
   */
  public sanitizeClient(user: User | null, client: Client, hasCollaborationGrant = false): Client {
    if (!user || this.isOwner(user, client.ownerId)) {
      return client;
    }

    if (hasCollaborationGrant) {
      // Mutual collaboration accepted: grant collaboration coordination details
      return {
        ...client,
        isClientConfidentialMasked: false,
      };
    }

    const shortId = client.id.replace('cli_', '').slice(-4);

    // Completely strip client identity, phone, and private notes
    return {
      ...client,
      fullName: `متقاضی محرمانه #${shortId}`,
      name: `متقاضی محرمانه #${shortId}`,
      mobile: '', // Completely stripped - never exposed to peer or manager
      phone: '',
      secondMobile: undefined,
      notes: undefined, // Private notes strictly hidden
      isClientConfidentialMasked: true,
    };
  }

  /**
   * Follow-up Sanitization
   * Managers or peers cannot read private follow-up notes or direct phone numbers
   */
  public sanitizeFollowUp(user: User | null, followUp: FollowUp): FollowUp {
    if (!user || this.isOwner(user, followUp.ownerId)) {
      return followUp;
    }

    return {
      ...followUp,
      clientName: followUp.clientName ? 'متقاضی محرمانه' : undefined,
      clientPhone: undefined,
      notes: 'یادداشت‌های پیگیری محرمانه است.',
    };
  }

  /**
   * Visit Sanitization
   */
  public sanitizeVisit(user: User | null, visit: Visit): Visit {
    if (!user || this.isOwner(user, visit.ownerId)) {
      return visit;
    }

    return {
      ...visit,
      clientName: 'متقاضی محرمانه',
      clientPhone: undefined,
      notes: 'یادداشت‌های بازدید محرمانه است.',
    };
  }
}

export const authzService = new AuthorizationService();
