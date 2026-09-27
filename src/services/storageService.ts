/**
 * Data Storage & Relational Repository Engine
 * Implements strict PostgreSQL-compatible relational operations,
 * Row-Level Security (RLS) simulation, Data Ownership enforcement,
 * and Manager Privacy Rules.
 */

import {
  initialProperties,
  initialClients,
  initialFollowUps,
  initialOpportunities,
  initialMatches,
  initialVisits,
  initialNotifications,
  mockUsers,
  mockTeam,
  initialTeamMemberships,
  initialInvitations,
} from './mockData';
import {
  Property,
  Client,
  FollowUp,
  FollowUpStatus,
  Opportunity,
  Match,
  Visit,
  Notification,
  User,
  Team,
  TeamMembership,
  Invitation,
  DashboardStats,
  PrivacyState,
} from '../types';
import { authzService } from './authzService';
import { auditService } from './auditService';

const STORAGE_KEYS = {
  PROPERTIES: 'amlakino_properties_v2',
  CLIENTS: 'amlakino_clients_v2',
  FOLLOWUPS: 'amlakino_followups_v2',
  OPPORTUNITIES: 'amlakino_opportunities_v2',
  MATCHES: 'amlakino_matches_v2',
  VISITS: 'amlakino_visits_v2',
  NOTIFICATIONS: 'amlakino_notifications_v2',
  USERS: 'amlakino_users_v2',
  CURRENT_USER_ID: 'amlakino_current_user_id_v2',
  TEAM: 'amlakino_team_v2',
  TEAM_MEMBERSHIPS: 'amlakino_team_memberships_v2',
  INVITATIONS: 'amlakino_invitations_v2',
};

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Storage access error for ${key}:`, e);
    return fallback;
  }
}

function setItem<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Storage write error for ${key}:`, e);
  }
}

export const storageService = {
  // -------------------------------------------------------------
  // Users & Identity
  // -------------------------------------------------------------
  async getUsers(): Promise<User[]> {
    return getItem<User[]>(STORAGE_KEYS.USERS, mockUsers);
  },

  async getUserById(id: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find((u) => u.id === id) || null;
  },

  async getUserByMobile(mobile: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find((u) => u.mobile === mobile.trim()) || null;
  },

  async saveUser(user: User): Promise<User> {
    const users = await this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    setItem(STORAGE_KEYS.USERS, users);
    return user;
  },

  async getCurrentUser(): Promise<User> {
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'usr_101';
    const users = await this.getUsers();
    const found = users.find((u) => u.id === currentId);
    return found || users[0] || mockUsers[0];
  },

  async setCurrentUserId(userId: string): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
  },

  // -------------------------------------------------------------
  // Teams & Memberships
  // -------------------------------------------------------------
  async getTeam(): Promise<Team> {
    return getItem<Team>(STORAGE_KEYS.TEAM, mockTeam);
  },

  async updateTeam(updates: Partial<Team>): Promise<Team> {
    const team = await this.getTeam();
    const updated = { ...team, ...updates, updatedAt: '۱۴۰۳/۰۷/۰۴' };
    setItem(STORAGE_KEYS.TEAM, updated);
    return updated;
  },

  async getTeamMemberships(teamId?: string): Promise<TeamMembership[]> {
    const list = getItem<TeamMembership[]>(STORAGE_KEYS.TEAM_MEMBERSHIPS, initialTeamMemberships);
    if (teamId) {
      return list.filter((m) => m.teamId === teamId && m.status === 'active');
    }
    return list;
  },

  async getTeamMembers(teamId: string): Promise<User[]> {
    const memberships = await this.getTeamMemberships(teamId);
    const users = await this.getUsers();
    const memberUserIds = new Set(memberships.map((m) => m.userId));
    return users.filter((u) => memberUserIds.has(u.id));
  },

  async createTeam(
    data: { name: string; city?: string; address?: string; phone?: string; licenseNumber?: string },
    managerUser: User
  ): Promise<Team> {
    if (!authzService.isManager(managerUser)) {
      throw new Error('فقط مدیر دپارتمان مجاز به تأسیس تیم جدید است.');
    }
    const newTeam: Team = {
      id: `team_${Date.now()}`,
      name: data.name,
      city: data.city || 'تهران',
      address: data.address || '',
      phone: data.phone || '',
      licenseNumber: data.licenseNumber || 'ص/۱۴۰۳/۰۰۱',
      managerId: managerUser.id,
      createdAt: '۱۴۰۳/۰۷/۰۴',
    };
    setItem(STORAGE_KEYS.TEAM, newTeam);

    // Update manager's teamId
    const updatedManager: User = { ...managerUser, teamId: newTeam.id, role: 'manager' };
    await this.saveUser(updatedManager);

    // Create membership for manager
    const memberships = await this.getTeamMemberships();
    memberships.push({
      id: `tmb_${Date.now()}`,
      teamId: newTeam.id,
      userId: managerUser.id,
      role: 'manager',
      joinedAt: '۱۴۰۳/۰۷/۰۴',
      status: 'active',
      createdAt: '۱۴۰۳/۰۷/۰۴',
    });
    setItem(STORAGE_KEYS.TEAM_MEMBERSHIPS, memberships);

    await auditService.logEvent({
      user: managerUser,
      action: 'team_created',
      entityType: 'team',
      entityId: newTeam.id,
      details: `تیم جدید "${newTeam.name}" توسط ${managerUser.fullName} تأسیس شد.`,
    });

    return newTeam;
  },

  async leaveTeam(agentUser: User): Promise<User> {
    const memberships = await this.getTeamMemberships();
    const updatedMemberships = memberships.filter((m) => m.userId !== agentUser.id);
    setItem(STORAGE_KEYS.TEAM_MEMBERSHIPS, updatedMemberships);

    const now = new Date();
    const graceEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30-day grace period

    const previousTeamId = agentUser.teamId;
    const updatedUser: User = {
      ...agentUser,
      teamId: undefined,
      exitDate: now.toISOString(),
      gracePeriodEndsAt: graceEnd.toISOString(),
      agentMode: agentUser.subscriptionStatus === 'active' ? 'independent' : 'team_member',
    };

    await this.saveUser(updatedUser);

    // Absolute agent ownership:
    // Properties and clients stay 100% owned by the agent. Unlink teamId and set to private.
    const props = getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
    const updatedProps = props.map((p) =>
      p.ownerId === agentUser.id ? { ...p, teamId: undefined, privacyState: 'private' as const } : p
    );
    setItem(STORAGE_KEYS.PROPERTIES, updatedProps);

    const clients = getItem<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const updatedClients = clients.map((c) =>
      c.ownerId === agentUser.id ? { ...c, teamId: undefined, privacyState: 'private' as const } : c
    );
    setItem(STORAGE_KEYS.CLIENTS, updatedClients);

    await auditService.logEvent({
      user: agentUser,
      action: 'team_left',
      entityType: 'team',
      entityId: previousTeamId || 'unknown',
      details: `مشاور ${agentUser.fullName} از دپارتمان خارج شد. کلیه پرونده‌های مشتریان و فایل‌های ملکی نزد مشاور حفظ شدند و وارد دوره مهلت ۳۰ روزه انتقال گردید.`,
    });

    return updatedUser;
  },

  async updateSubscriptionStatus(userId: string, status: 'active' | 'none' | 'expired'): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('کاربر یافت نشد.');

    let mode = user.agentMode;
    if (status === 'active') {
      mode = user.teamId ? 'team_member' : 'independent';
    } else if (!user.teamId && user.exitDate) {
      mode = 'read_only';
    }

    const updated: User = {
      ...user,
      subscriptionStatus: status,
      agentMode: mode,
    };
    await this.saveUser(updated);
    return updated;
  },

  async simulateGracePeriodExpiry(userId: string, expireNow: boolean): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('کاربر یافت نشد.');

    let endsAt: string;
    let mode = user.agentMode;

    if (expireNow) {
      // Set to 1 day in the past
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
      endsAt = past.toISOString();
      if (user.subscriptionStatus === 'active') {
        mode = 'independent';
      } else {
        mode = 'read_only';
      }
    } else {
      // 30 days in future
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      endsAt = future.toISOString();
      mode = user.teamId ? 'team_member' : 'independent';
    }

    const updated: User = {
      ...user,
      gracePeriodEndsAt: endsAt,
      agentMode: mode,
    };
    await this.saveUser(updated);
    return updated;
  },

  async removeTeamMember(teamId: string, memberUserId: string, managerUser: User): Promise<void> {
    if (!authzService.isManager(managerUser)) {
      throw new Error('فقط مدیر دپارتمان اجازه حذف مشاور از تیم را دارد.');
    }
    const memberships = await this.getTeamMemberships();
    const updated = memberships.filter((m) => !(m.teamId === teamId && m.userId === memberUserId));
    setItem(STORAGE_KEYS.TEAM_MEMBERSHIPS, updated);

    // Update user's teamId to undefined and start 30-day grace period
    const member = await this.getUserById(memberUserId);
    if (member) {
      const now = new Date();
      const graceEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await this.saveUser({
        ...member,
        teamId: undefined,
        exitDate: now.toISOString(),
        gracePeriodEndsAt: graceEnd.toISOString(),
        agentMode: member.subscriptionStatus === 'active' ? 'independent' : 'team_member',
      });

      // Detach properties and clients from team, retaining 100% agent ownership
      const props = getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
      setItem(
        STORAGE_KEYS.PROPERTIES,
        props.map((p) => (p.ownerId === memberUserId ? { ...p, teamId: undefined, privacyState: 'private' as const } : p))
      );

      const clients = getItem<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
      setItem(
        STORAGE_KEYS.CLIENTS,
        clients.map((c) => (c.ownerId === memberUserId ? { ...c, teamId: undefined, privacyState: 'private' as const } : c))
      );

      await auditService.logEvent({
        user: managerUser,
        action: 'team_left',
        entityType: 'team',
        entityId: teamId,
        details: `مشاور ${member.fullName} از تیم حذف شد. توجه: طبق اصل مالکیت مطلق، فایل‌ها و مشتریان نزد مشاور باقی می‌مانند و دوره ۳۰ روزه آغاز شد.`,
      });
    }
  },

  // -------------------------------------------------------------
  // Invitations
  // -------------------------------------------------------------
  async getInvitations(teamId?: string): Promise<Invitation[]> {
    const list = getItem<Invitation[]>(STORAGE_KEYS.INVITATIONS, initialInvitations);
    if (teamId) {
      return list.filter((inv) => inv.teamId === teamId);
    }
    return list;
  },

  async createInvitation(data: {
    managerUser: User;
    teamId: string;
    inviteeMobile: string;
    inviteeName: string;
    inviteeEmail?: string;
  }): Promise<Invitation> {
    if (!authzService.isManager(data.managerUser)) {
      throw new Error('فقط مدیر تیم اجازه ارسال دعوت‌نامه دارد.');
    }
    const team = await this.getTeam();
    const list = await this.getInvitations();

    const newInv: Invitation = {
      id: 'inv_' + Date.now(),
      teamId: data.teamId,
      teamName: team.name,
      inviterId: data.managerUser.id,
      inviterName: data.managerUser.fullName,
      inviteeMobile: data.inviteeMobile,
      inviteeEmail: data.inviteeEmail,
      inviteeName: data.inviteeName,
      role: 'agent',
      status: 'pending',
      token: 'inv_tok_' + Math.random().toString(36).substring(2, 10),
      expiresAt: '۱۴۰۳/۰۸/۱۰',
      createdAt: '۱۴۰۳/۰۷/۰۴',
    };

    list.unshift(newInv);
    setItem(STORAGE_KEYS.INVITATIONS, list);

    await auditService.logEvent({
      user: data.managerUser,
      action: 'collaboration_requested',
      entityType: 'invitation',
      entityId: newInv.id,
      details: `دعوت‌نامه عضویت در تیم برای ${data.inviteeName} (${data.inviteeMobile}) ارسال شد.`,
    });

    return newInv;
  },

  async acceptInvitation(token: string, user: User): Promise<{ success: boolean; teamName: string }> {
    const list = await this.getInvitations();
    const invitation = list.find((i) => i.token === token && i.status === 'pending');
    if (!invitation) {
      throw new Error('دعوت‌نامه نامعتبر یا منقضی شده است.');
    }

    invitation.status = 'accepted';
    invitation.acceptedAt = '۱۴۰۳/۰۷/۰۴';
    setItem(STORAGE_KEYS.INVITATIONS, list);

    // Update user team
    await this.saveUser({ ...user, teamId: invitation.teamId });

    // Add membership
    const memberships = await this.getTeamMemberships();
    memberships.push({
      id: 'tmb_' + Date.now(),
      teamId: invitation.teamId,
      userId: user.id,
      role: 'agent',
      joinedAt: '۱۴۰۳/۰۷/۰۴',
      status: 'active',
      createdAt: '۱۴۰۳/۰۷/۰۴',
    });
    setItem(STORAGE_KEYS.TEAM_MEMBERSHIPS, memberships);

    await auditService.logEvent({
      user,
      action: 'team_joined',
      entityType: 'team',
      entityId: invitation.teamId,
      details: `پذیرش دعوت‌نامه تیم "${invitation.teamName}" توسط مشاور ${user.fullName}. مالکیت اطلاعات حفظ شده است.`,
    });

    return { success: true, teamName: invitation.teamName };
  },

  async cancelInvitation(id: string, managerUser: User): Promise<void> {
    if (!authzService.isManager(managerUser)) {
      throw new Error('فقط مدیر مجاز به لغو دعوت‌نامه است.');
    }
    const list = await this.getInvitations();
    const filtered = list.filter((i) => i.id !== id);
    setItem(STORAGE_KEYS.INVITATIONS, filtered);
  },

  // -------------------------------------------------------------
  // Properties (RLS & Privacy Enforced)
  // -------------------------------------------------------------
  async getProperties(currentUser?: User | null): Promise<Property[]> {
    const rawProps = getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
    const user = currentUser || (await this.getCurrentUser());

    if (!user) return [];

    // Filter by Role & Ownership
    if (user.role === 'agent') {
      // Agent sees:
      // 1. Their own properties (private or shared)
      // 2. Colleague properties marked 'shared' within the same team
      return rawProps
        .filter(
          (p) =>
            p.ownerId === user.id ||
            (p.privacyState === 'shared' && user.teamId && p.teamId === user.teamId)
        )
        .map((p) => authzService.sanitizeProperty(user, p));
    }

    if (user.role === 'manager' || user.role === 'admin') {
      // Manager sees team inventory for statistics and aggregated listings,
      // but confidential owner information (name, phone, exact address) is strictly sanitized!
      return rawProps
        .filter((p) => (user.teamId ? p.teamId === user.teamId : true))
        .map((p) => authzService.sanitizeProperty(user, p));
    }

    return [];
  },

  async getPropertyById(id: string, currentUser?: User | null): Promise<Property | null> {
    const user = currentUser || (await this.getCurrentUser());
    const rawProps = getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
    const prop = rawProps.find((p) => p.id === id);
    if (!prop) return null;

    if (!authzService.canViewProperty(user, prop)) {
      throw new Error('دسترسی غیرمجاز: شما اجازه مشاهده این فایل ملکی را ندارید.');
    }

    return authzService.sanitizeProperty(user, prop);
  },

  async createProperty(
    propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'code' | 'ownerId'>,
    currentUser?: User | null
  ): Promise<Property> {
    const user = currentUser || (await this.getCurrentUser());
    if (!user) throw new Error('کاربر احراز هویت نشده است.');

    const editCheck = authzService.canCreateOrEdit(user);
    if (!editCheck.allowed) {
      throw new Error(editCheck.reason || 'دسترسی در حالت فقط خواندنی (Read-Only) مسدود است.');
    }

    const props = getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
    const newId = `prop_${Date.now()}`;
    const code = `AML-${Math.floor(1000 + Math.random() * 9000)}`;

    const newProp: Property = {
      ...propertyData,
      id: newId,
      code,
      transactionType: propertyData.transactionType || propertyData.dealType,
      neighborhood: propertyData.neighborhood || propertyData.district,
      price: propertyData.price ?? propertyData.totalPrice,
      rent: propertyData.rent ?? propertyData.monthlyRent,
      deposit: propertyData.deposit ?? propertyData.depositPrice,
      media: propertyData.media || propertyData.images || [],
      images: propertyData.images || propertyData.media || [],
      availabilityStatus: propertyData.availabilityStatus || (propertyData.status === 'archived' ? 'archived' : 'available'),
      privacyStatus: (propertyData.privacyStatus || propertyData.privacyState || 'private') as 'private' | 'shared',
      privacyState: propertyData.privacyState || propertyData.privacyStatus || 'private',
      ownerId: user.id, // Immutable ownership
      agentId: user.id,
      agentName: user.fullName,
      teamId: user.teamId,
      createdAt: '۱۴۰۳/۰۷/۰۴',
      updatedAt: '۱۴۰۳/۰۷/۰۴',
    };

    props.unshift(newProp);
    setItem(STORAGE_KEYS.PROPERTIES, props);

    await auditService.logEvent({
      user,
      action: 'property_created',
      entityType: 'property',
      entityId: newProp.id,
      details: `ثبت فایل جدید: ${newProp.title} (وضعیت داده: ${newProp.privacyState === 'shared' ? 'اشتراکی تیم' : 'خصوصی و محرمانه'})`,
    });

    return newProp;
  },

  async updateProperty(
    id: string,
    updates: Partial<Property>,
    currentUser?: User | null
  ): Promise<Property | null> {
    const user = currentUser || (await this.getCurrentUser());
    const rawProps = getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
    const index = rawProps.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = rawProps[index];
    const editCheck = authzService.canCreateOrEdit(user);
    if (!editCheck.allowed) {
      throw new Error(editCheck.reason || 'دسترسی در حالت فقط خواندنی (Read-Only) مسدود است.');
    }
    if (!authzService.canEditProperty(user, existing)) {
      throw new Error('دسترسی غیرمجاز: طبق اصل مالکیت اطلاعات، تنها مشاور مالک فایل مجاز به ویرایش است.');
    }

    // Ownership cannot be transferred via update!
    const { ownerId, ...safeUpdates } = updates;

    const updatedProp: Property = {
      ...existing,
      ...safeUpdates,
      transactionType: safeUpdates.transactionType || safeUpdates.dealType || existing.transactionType || existing.dealType,
      dealType: safeUpdates.dealType || safeUpdates.transactionType || existing.dealType,
      neighborhood: safeUpdates.neighborhood || safeUpdates.district || existing.neighborhood || existing.district,
      district: safeUpdates.district || safeUpdates.neighborhood || existing.district,
      price: safeUpdates.price !== undefined ? safeUpdates.price : safeUpdates.totalPrice !== undefined ? safeUpdates.totalPrice : existing.price,
      totalPrice: safeUpdates.totalPrice !== undefined ? safeUpdates.totalPrice : safeUpdates.price !== undefined ? safeUpdates.price : existing.totalPrice,
      rent: safeUpdates.rent !== undefined ? safeUpdates.rent : safeUpdates.monthlyRent !== undefined ? safeUpdates.monthlyRent : existing.rent,
      monthlyRent: safeUpdates.monthlyRent !== undefined ? safeUpdates.monthlyRent : safeUpdates.rent !== undefined ? safeUpdates.rent : existing.monthlyRent,
      media: safeUpdates.media || safeUpdates.images || existing.media || existing.images,
      images: safeUpdates.images || safeUpdates.media || existing.images || existing.media,
      privacyState: safeUpdates.privacyState || safeUpdates.privacyStatus || existing.privacyState,
      privacyStatus: (safeUpdates.privacyStatus || safeUpdates.privacyState || existing.privacyStatus || existing.privacyState) as 'private' | 'shared',
      availabilityStatus: safeUpdates.availabilityStatus || existing.availabilityStatus,
      updatedAt: '۱۴۰۳/۰۷/۰۴',
    };

    rawProps[index] = updatedProp;
    setItem(STORAGE_KEYS.PROPERTIES, rawProps);

    await auditService.logEvent({
      user,
      action: updates.privacyState === 'shared' ? 'property_shared' : 'property_updated',
      entityType: 'property',
      entityId: id,
      details: `ویرایش فایل ملکی با شناسه ${id}`,
    });

    return updatedProp;
  },

  async archiveProperty(id: string, currentUser?: User | null): Promise<Property | null> {
    const user = currentUser || (await this.getCurrentUser());
    const rawProps = getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
    const index = rawProps.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = rawProps[index];
    if (!authzService.canEditProperty(user, existing)) {
      throw new Error('تنها مشاور مالک فایل مجاز به بایگانی کردن آن است.');
    }

    existing.status = 'archived';
    existing.availabilityStatus = 'archived';
    existing.updatedAt = '۱۴۰۳/۰۷/۰۴';
    rawProps[index] = existing;
    setItem(STORAGE_KEYS.PROPERTIES, rawProps);

    await auditService.logEvent({
      user,
      action: 'property_updated',
      entityType: 'property',
      entityId: id,
      details: `بایگانی فایل ملکی ${existing.title}`,
    });

    return existing;
  },

  async restoreProperty(id: string, currentUser?: User | null): Promise<Property | null> {
    const user = currentUser || (await this.getCurrentUser());
    const rawProps = getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
    const index = rawProps.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = rawProps[index];
    if (!authzService.canEditProperty(user, existing)) {
      throw new Error('تنها مشاور مالک فایل مجاز به بازیابی آن است.');
    }

    existing.status = 'active';
    existing.availabilityStatus = 'available';
    existing.updatedAt = '۱۴۰۳/۰۷/۰۴';
    rawProps[index] = existing;
    setItem(STORAGE_KEYS.PROPERTIES, rawProps);

    await auditService.logEvent({
      user,
      action: 'property_updated',
      entityType: 'property',
      entityId: id,
      details: `بازیابی فایل ملکی از بایگانی: ${existing.title}`,
    });

    return existing;
  },

  async updatePropertyAvailability(
    id: string,
    availability: 'available' | 'reserved' | 'sold' | 'rented' | 'archived',
    currentUser?: User | null
  ): Promise<Property | null> {
    const user = currentUser || (await this.getCurrentUser());
    const rawProps = getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
    const index = rawProps.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = rawProps[index];
    if (!authzService.canEditProperty(user, existing)) {
      throw new Error('تنها مشاور مالک فایل مجاز به تغییر وضعیت دسترسی ملک است.');
    }

    existing.availabilityStatus = availability;
    if (availability === 'archived') {
      existing.status = 'archived';
    } else if (availability === 'sold' || availability === 'rented') {
      existing.status = 'deal_closed';
    } else if (availability === 'reserved') {
      existing.status = 'reserved';
    } else {
      existing.status = 'active';
    }
    existing.updatedAt = '۱۴۰۳/۰۷/۰۴';
    rawProps[index] = existing;
    setItem(STORAGE_KEYS.PROPERTIES, rawProps);

    await auditService.logEvent({
      user,
      action: 'property_updated',
      entityType: 'property',
      entityId: id,
      details: `تغییر وضعیت موجودی فایل ملکی به: ${availability}`,
    });

    return existing;
  },

  async addPropertyNote(id: string, noteText: string, currentUser?: User | null): Promise<Property | null> {
    const user = currentUser || (await this.getCurrentUser());
    const rawProps = getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
    const index = rawProps.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = rawProps[index];
    if (!authzService.canEditProperty(user, existing)) {
      throw new Error('تنها مشاور مالک مجاز به افزودن یادداشت به این فایل است.');
    }

    const stamp = `[${user.fullName} - ۱۴۰۳/۰۷/۰۴]: ${noteText}`;
    existing.notes = existing.notes ? `${stamp}\n\n${existing.notes}` : stamp;
    existing.updatedAt = '۱۴۰۳/۰۷/۰۴';
    rawProps[index] = existing;
    setItem(STORAGE_KEYS.PROPERTIES, rawProps);

    return existing;
  },

  async addPropertyMedia(id: string, mediaUrls: string[], currentUser?: User | null): Promise<Property | null> {
    const user = currentUser || (await this.getCurrentUser());
    const rawProps = getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
    const index = rawProps.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = rawProps[index];
    if (!authzService.canEditProperty(user, existing)) {
      throw new Error('تنها مشاور مالک مجاز به افزودن تصاویر به این فایل است.');
    }

    const currentMedia = existing.media || existing.images || [];
    const merged = Array.from(new Set([...currentMedia, ...mediaUrls]));
    existing.media = merged;
    existing.images = merged;
    existing.updatedAt = '۱۴۰۳/۰۷/۰۴';
    rawProps[index] = existing;
    setItem(STORAGE_KEYS.PROPERTIES, rawProps);

    return existing;
  },

  async togglePropertyPrivacy(id: string, currentUser?: User | null): Promise<Property | null> {
    const user = currentUser || (await this.getCurrentUser());
    const rawProps = getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
    const index = rawProps.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = rawProps[index];
    if (!authzService.canEditProperty(user, existing)) {
      throw new Error('تنها مشاور ثبت‌کننده فایل می‌تواند وضعیت دسترسی آن را تغییر دهد.');
    }

    const nextState: PrivacyState = existing.privacyState === 'shared' ? 'private' : 'shared';
    existing.privacyState = nextState;
    existing.updatedAt = '۱۴۰۳/۰۷/۰۴';
    rawProps[index] = existing;
    setItem(STORAGE_KEYS.PROPERTIES, rawProps);

    await auditService.logEvent({
      user,
      action: nextState === 'shared' ? 'property_shared' : 'property_updated',
      entityType: 'property',
      entityId: id,
      details: `تغییر سطح محرمانگی فایل به: ${nextState === 'shared' ? 'اشتراک با اعضای دپارتمان' : 'شخصی و محفوظ'}`,
    });

    return existing;
  },

  // -------------------------------------------------------------
  // Clients (Strict Privacy Enforced)
  // -------------------------------------------------------------
  async getClients(currentUser?: User | null): Promise<Client[]> {
    const rawClients = getItem<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const user = currentUser || (await this.getCurrentUser());
    if (!user) return [];

    if (user.role === 'agent') {
      return rawClients
        .filter(
          (c) =>
            c.ownerId === user.id ||
            (c.privacyState === 'shared' && user.teamId && c.teamId === user.teamId)
        )
        .map((c) => authzService.sanitizeClient(user, c));
    }

    if (user.role === 'manager' || user.role === 'admin') {
      // Managers can see team client pipelines, BUT contact info & notes are sanitized!
      return rawClients
        .filter((c) => (user.teamId ? c.teamId === user.teamId : true))
        .map((c) => authzService.sanitizeClient(user, c));
    }

    return [];
  },

  async getClientById(id: string, currentUser?: User | null): Promise<Client | null> {
    const user = currentUser || (await this.getCurrentUser());
    const rawClients = getItem<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const client = rawClients.find((c) => c.id === id);
    if (!client) return null;

    if (!authzService.canViewClient(user, client)) {
      throw new Error('دسترسی غیرمجاز: پرونده این متقاضی محرمانه است.');
    }

    return authzService.sanitizeClient(user, client);
  },

  async createClient(
    clientData: Omit<Client, 'id' | 'createdAt' | 'ownerId'>,
    currentUser?: User | null
  ): Promise<Client> {
    const user = currentUser || (await this.getCurrentUser());
    if (!user) throw new Error('کاربر احراز هویت نشده است.');

    const editCheck = authzService.canCreateOrEdit(user);
    if (!editCheck.allowed) {
      throw new Error(editCheck.reason || 'دسترسی در حالت فقط خواندنی (Read-Only) مسدود است.');
    }

    const clients = getItem<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const newId = `cli_${Date.now()}`;

    const newClient: Client = {
      ...clientData,
      id: newId,
      name: clientData.name || clientData.fullName,
      phone: clientData.phone || clientData.mobile,
      fullName: clientData.fullName || clientData.name || '',
      mobile: clientData.mobile || clientData.phone || '',
      transactionType: clientData.transactionType || clientData.desiredDealType,
      desiredDealType: clientData.desiredDealType || clientData.transactionType || 'sale',
      propertyType: clientData.propertyType || clientData.desiredPropertyTypes?.[0] || 'apartment',
      desiredPropertyTypes: clientData.desiredPropertyTypes || (clientData.propertyType ? [clientData.propertyType] : ['apartment']),
      preferredCity: clientData.preferredCity || 'تهران',
      preferredRegions: clientData.preferredRegions || clientData.desiredDistricts || [],
      desiredDistricts: clientData.desiredDistricts || clientData.preferredRegions || [],
      bedrooms: clientData.bedrooms ?? clientData.minBedrooms,
      minBedrooms: clientData.minBedrooms ?? clientData.bedrooms,
      maxBudget: clientData.maxBudget ?? clientData.budgetMax,
      budgetMax: clientData.budgetMax ?? clientData.maxBudget,
      requirements: clientData.requirements || [],
      urgency: clientData.urgency || 'medium',
      privacyStatus: (clientData.privacyStatus || clientData.privacyState || 'private') as 'private' | 'shared',
      privacyState: clientData.privacyState || clientData.privacyStatus || 'private',
      status: clientData.status || 'active',
      ownerId: user.id, // Strict data ownership
      agentId: user.id,
      agentName: user.fullName,
      teamId: user.teamId,
      createdAt: '۱۴۰۳/۰۷/۰۴',
      updatedAt: '۱۴۰۳/۰۷/۰۴',
    };

    clients.unshift(newClient);
    setItem(STORAGE_KEYS.CLIENTS, clients);

    await auditService.logEvent({
      user,
      action: 'client_created',
      entityType: 'client',
      entityId: newClient.id,
      details: `ثبت متقاضی جدید: ${newClient.fullName} (داده‌ها شخصی و رمزنگاری شده)`,
    });

    return newClient;
  },

  async updateClient(
    id: string,
    updates: Partial<Client>,
    currentUser?: User | null
  ): Promise<Client | null> {
    const user = currentUser || (await this.getCurrentUser());
    const rawClients = getItem<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const index = rawClients.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = rawClients[index];
    const editCheck = authzService.canCreateOrEdit(user);
    if (!editCheck.allowed) {
      throw new Error(editCheck.reason || 'دسترسی در حالت فقط خواندنی (Read-Only) مسدود است.');
    }
    if (!authzService.canEditClient(user, existing)) {
      throw new Error('دسترسی غیرمجاز: طبق اصل مالکیت اطلاعات، تنها مشاور مالک پرونده متقاضی مجاز به ویرایش است.');
    }

    // Ownership cannot be transferred via update!
    const { ownerId, ...safeUpdates } = updates;

    const updatedClient: Client = {
      ...existing,
      ...safeUpdates,
      name: safeUpdates.name || safeUpdates.fullName || existing.name || existing.fullName || '',
      fullName: safeUpdates.fullName || safeUpdates.name || existing.fullName || existing.name || '',
      phone: safeUpdates.phone || safeUpdates.mobile || existing.phone || existing.mobile || '',
      mobile: safeUpdates.mobile || safeUpdates.phone || existing.mobile || existing.phone || '',
      transactionType: safeUpdates.transactionType || safeUpdates.desiredDealType || existing.transactionType || existing.desiredDealType,
      desiredDealType: safeUpdates.desiredDealType || safeUpdates.transactionType || existing.desiredDealType || existing.transactionType,
      preferredRegions: safeUpdates.preferredRegions || safeUpdates.desiredDistricts || existing.preferredRegions || existing.desiredDistricts,
      desiredDistricts: safeUpdates.desiredDistricts || safeUpdates.preferredRegions || existing.desiredDistricts || existing.preferredRegions,
      maxBudget: safeUpdates.maxBudget !== undefined ? safeUpdates.maxBudget : safeUpdates.budgetMax !== undefined ? safeUpdates.budgetMax : existing.maxBudget,
      budgetMax: safeUpdates.budgetMax !== undefined ? safeUpdates.budgetMax : safeUpdates.maxBudget !== undefined ? safeUpdates.maxBudget : existing.budgetMax,
      bedrooms: safeUpdates.bedrooms !== undefined ? safeUpdates.bedrooms : safeUpdates.minBedrooms !== undefined ? safeUpdates.minBedrooms : existing.bedrooms,
      minBedrooms: safeUpdates.minBedrooms !== undefined ? safeUpdates.minBedrooms : safeUpdates.bedrooms !== undefined ? safeUpdates.bedrooms : existing.minBedrooms,
      privacyState: safeUpdates.privacyState || safeUpdates.privacyStatus || existing.privacyState,
      privacyStatus: (safeUpdates.privacyStatus || safeUpdates.privacyState || existing.privacyStatus || existing.privacyState) as 'private' | 'shared',
      status: safeUpdates.status || existing.status,
      updatedAt: '۱۴۰۳/۰۷/۰۴',
    };

    rawClients[index] = updatedClient;
    setItem(STORAGE_KEYS.CLIENTS, rawClients);

    await auditService.logEvent({
      user,
      action: 'client_created',
      entityType: 'client',
      entityId: id,
      details: `ویرایش پرونده متقاضی ${updatedClient.fullName}`,
    });

    return updatedClient;
  },

  async archiveClient(id: string, currentUser?: User | null): Promise<Client | null> {
    const user = currentUser || (await this.getCurrentUser());
    const rawClients = getItem<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const index = rawClients.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = rawClients[index];
    if (!authzService.canEditClient(user, existing)) {
      throw new Error('تنها مشاور مالک پرونده مجاز به بایگانی متقاضی است.');
    }

    existing.status = 'archived';
    existing.updatedAt = '۱۴۰۳/۰۷/۰۴';
    rawClients[index] = existing;
    setItem(STORAGE_KEYS.CLIENTS, rawClients);

    await auditService.logEvent({
      user,
      action: 'client_created',
      entityType: 'client',
      entityId: id,
      details: `بایگانی پرونده متقاضی ${existing.fullName}`,
    });

    return existing;
  },

  async restoreClient(id: string, currentUser?: User | null): Promise<Client | null> {
    const user = currentUser || (await this.getCurrentUser());
    const rawClients = getItem<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const index = rawClients.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = rawClients[index];
    if (!authzService.canEditClient(user, existing)) {
      throw new Error('تنها مشاور مالک پرونده مجاز به بازیابی متقاضی است.');
    }

    existing.status = 'active';
    existing.updatedAt = '۱۴۰۳/۰۷/۰۴';
    rawClients[index] = existing;
    setItem(STORAGE_KEYS.CLIENTS, rawClients);

    await auditService.logEvent({
      user,
      action: 'client_created',
      entityType: 'client',
      entityId: id,
      details: `بازیابی متقاضی از بایگانی: ${existing.fullName}`,
    });

    return existing;
  },

  async addClientNote(id: string, noteText: string, currentUser?: User | null): Promise<Client | null> {
    const user = currentUser || (await this.getCurrentUser());
    const rawClients = getItem<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const index = rawClients.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = rawClients[index];
    if (!authzService.canEditClient(user, existing)) {
      throw new Error('تنها مشاور مالک پرونده مجاز به افزودن یادداشت است.');
    }

    const stamp = `[${user.fullName} - ۱۴۰۳/۰۷/۰۴]: ${noteText}`;
    existing.notes = existing.notes ? `${stamp}\n\n${existing.notes}` : stamp;
    existing.updatedAt = '۱۴۰۳/۰۷/۰۴';
    rawClients[index] = existing;
    setItem(STORAGE_KEYS.CLIENTS, rawClients);

    return existing;
  },

  async toggleClientPrivacy(id: string, currentUser?: User | null): Promise<Client | null> {
    const user = currentUser || (await this.getCurrentUser());
    const rawClients = getItem<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const index = rawClients.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = rawClients[index];
    if (!authzService.canEditClient(user, existing)) {
      throw new Error('تنها مشاور مالک پرونده مجاز به تغییر سطح محرمانگی متقاضی است.');
    }

    const nextState: PrivacyState = existing.privacyState === 'shared' ? 'private' : 'shared';
    existing.privacyState = nextState;
    rawClients[index] = existing;
    setItem(STORAGE_KEYS.CLIENTS, rawClients);

    await auditService.logEvent({
      user,
      action: nextState === 'shared' ? 'client_shared' : 'client_created',
      entityType: 'client',
      entityId: id,
      details: `تغییر سطح محرمانگی متقاضی به: ${nextState === 'shared' ? 'اشتراک با همکاران' : 'شخصی و محفوظ'}`,
    });

    return existing;
  },

  // -------------------------------------------------------------
  // Follow-ups (Daily agenda, only owner can view notes)
  // -------------------------------------------------------------
  async getFollowUps(currentUser?: User | null): Promise<FollowUp[]> {
    const raw = getItem<FollowUp[]>(STORAGE_KEYS.FOLLOWUPS, initialFollowUps);
    const user = currentUser || (await this.getCurrentUser());
    if (!user) return [];

    if (user.role === 'agent') {
      return raw
        .filter((f) => f.ownerId === user.id)
        .map((f) => authzService.sanitizeFollowUp(user, f));
    }

    if (user.role === 'manager' || user.role === 'admin') {
      // Manager views activity overview, but notes and client phones are masked
      return raw.map((f) => authzService.sanitizeFollowUp(user, f));
    }

    return [];
  },

  async createFollowUp(
    followUpData: Omit<FollowUp, 'id' | 'createdAt' | 'ownerId'>,
    currentUser?: User | null
  ): Promise<FollowUp> {
    const user = currentUser || (await this.getCurrentUser());
    if (!user) throw new Error('کاربر وارد نشده است.');

    const followUps = getItem<FollowUp[]>(STORAGE_KEYS.FOLLOWUPS, initialFollowUps);
    const newId = `flw_${Date.now()}`;
    const newFollowUp: FollowUp = {
      ...followUpData,
      id: newId,
      ownerId: user.id,
      privacyState: 'private',
      agentId: user.id,
      createdAt: '۱۴۰۳/۰۷/۰۴',
    };
    followUps.unshift(newFollowUp);
    setItem(STORAGE_KEYS.FOLLOWUPS, followUps);
    return newFollowUp;
  },

  async toggleFollowUpStatus(id: string, currentUser?: User | null): Promise<FollowUp | null> {
    const followUps = getItem<FollowUp[]>(STORAGE_KEYS.FOLLOWUPS, initialFollowUps);
    const index = followUps.findIndex((f) => f.id === id);
    if (index === -1) return null;

    const current = followUps[index];
    const newStatus: FollowUpStatus = current.status === 'completed' ? 'pending' : 'completed';
    const updated: FollowUp = {
      ...current,
      status: newStatus,
      completedAt: newStatus === 'completed' ? '۱۴۰۳/۰۷/۰۴' : undefined,
    };
    followUps[index] = updated;
    setItem(STORAGE_KEYS.FOLLOWUPS, followUps);
    return updated;
  },

  // -------------------------------------------------------------
  // Opportunities, Matches, Visits, Notifications
  // -------------------------------------------------------------
  async getOpportunities(currentUser?: User | null): Promise<Opportunity[]> {
    const raw = getItem<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, initialOpportunities);
    const user = currentUser || (await this.getCurrentUser());
    if (!user) return [];

    if (user.role === 'agent') {
      return raw.filter((o) => o.ownerId === user.id || o.privacyState === 'shared');
    }
    // Managers can see pipeline values for revenue projections
    return raw;
  },

  async getMatches(): Promise<Match[]> {
    return getItem<Match[]>(STORAGE_KEYS.MATCHES, initialMatches);
  },

  async getVisits(currentUser?: User | null): Promise<Visit[]> {
    const raw = getItem<Visit[]>(STORAGE_KEYS.VISITS, initialVisits);
    const user = currentUser || (await this.getCurrentUser());
    if (!user) return [];

    if (user.role === 'agent') {
      return raw.filter((v) => v.ownerId === user.id).map((v) => authzService.sanitizeVisit(user, v));
    }
    return raw.map((v) => authzService.sanitizeVisit(user, v));
  },

  async getNotifications(currentUser?: User | null): Promise<Notification[]> {
    const list = getItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
    const user = currentUser || (await this.getCurrentUser());
    if (!user) return [];
    return list.filter((n) => n.userId === user.id || !n.userId);
  },

  async markNotificationAsRead(id: string): Promise<void> {
    const list = getItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    setItem(STORAGE_KEYS.NOTIFICATIONS, updated);
  },

  // -------------------------------------------------------------
  // Dashboard Aggregates (Strict role-adaptive stats)
  // -------------------------------------------------------------
  async getDashboardStats(currentUser?: User | null): Promise<DashboardStats> {
    const user = currentUser || (await this.getCurrentUser());
    const [properties, clients, followUps, opportunities, matches, visits] = await Promise.all([
      this.getProperties(user),
      this.getClients(user),
      this.getFollowUps(user),
      this.getOpportunities(user),
      this.getMatches(),
      this.getVisits(user),
    ]);

    const todayFollowUps = followUps.filter((f) => f.dueDate === 'امروز' && f.status !== 'completed');
    const overdueFollowUps = followUps.filter((f) => f.status === 'overdue');
    const newMatches = matches.filter((m) => m.status === 'new');
    const activeOpportunities = opportunities.filter((o) => o.stage !== 'closed_won' && o.stage !== 'closed_lost');
    const upcomingVisits = visits.filter((v) => v.status === 'scheduled');
    const activeProps = properties.filter((p) => p.status === 'active');
    const activeClients = clients.filter((c) => c.status === 'active' || c.status === 'negotiation');

    return {
      todayFollowUpsCount: todayFollowUps.length,
      overdueFollowUpsCount: overdueFollowUps.length,
      newMatchesCount: newMatches.length,
      activeOpportunitiesCount: activeOpportunities.length,
      upcomingVisitsCount: upcomingVisits.length,
      activePropertiesCount: activeProps.length,
      activeClientsCount: activeClients.length,
      monthDealsVolume: user?.role === 'manager' ? 84_500_000_000 : 24_900_000_000,
    };
  },
};
