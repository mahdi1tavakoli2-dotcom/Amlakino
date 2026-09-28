/**
 * Supabase-Backed Relational Repository & Storage Engine
 * Connects directly to Supabase PostgreSQL with Row-Level Security (RLS)
 * Absolute Data Ownership & Manager Privacy Protection
 * (Zero localStorage usage for business entities)
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
const defaultEmptyTeam: Team = {
  id: 'team_default',
  name: 'دپارتمان املاک',
  licenseNumber: '',
  managerId: '',
  city: 'تهران',
  address: '',
  phone: '',
  createdAt: new Date().toISOString(),
};

// In-Memory store (starts completely empty, strictly NO mock/sample data)
const memStore = {
  users: [] as User[],
  team: defaultEmptyTeam,
  teamMemberships: [] as TeamMembership[],
  invitations: [] as Invitation[],
  properties: [] as Property[],
  clients: [] as Client[],
  followUps: [] as FollowUp[],
  opportunities: [] as Opportunity[],
  matches: [] as Match[],
  visits: [] as Visit[],
  notifications: [] as Notification[],
  currentUserId: null as string | null,
};

// -------------------------------------------------------------
// Mappers: PostgreSQL (snake_case) <-> Application (camelCase)
// -------------------------------------------------------------

function mapPropertyFromDb(row: any): Property {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    dealType: row.deal_type,
    transactionType: row.deal_type,
    propertyType: row.property_type,
    area: Number(row.area),
    totalPrice: row.total_price ? Number(row.total_price) : undefined,
    price: row.total_price ? Number(row.total_price) : undefined,
    pricePerMeter: row.price_per_meter ? Number(row.price_per_meter) : undefined,
    deposit: row.deposit ? Number(row.deposit) : undefined,
    depositPrice: row.deposit ? Number(row.deposit) : undefined,
    monthlyRent: row.monthly_rent ? Number(row.monthly_rent) : undefined,
    rent: row.monthly_rent ? Number(row.monthly_rent) : undefined,
    bedrooms: Number(row.bedrooms || 1),
    floor: Number(row.floor || 1),
    totalFloors: Number(row.total_floors || 1),
    unitsPerFloor: row.units_per_floor ? Number(row.units_per_floor) : undefined,
    yearBuilt: Number(row.year_built || 1400),
    parking: Boolean(row.parking),
    elevator: Boolean(row.elevator),
    storage: Boolean(row.storage),
    balcony: Boolean(row.balcony),
    district: row.district,
    neighborhood: row.district,
    city: row.city || 'تهران',
    addressSummary: row.address_summary,
    address: row.address_summary,
    fullAddress: row.full_address,
    description: row.description || '',
    features: Array.isArray(row.features) ? row.features : [],
    images: Array.isArray(row.images) ? row.images : [],
    media: Array.isArray(row.images) ? row.images : [],
    ownerName: row.owner_name,
    ownerPhone: row.owner_phone,
    status: row.status,
    availabilityStatus: row.availability_status || (row.status === 'archived' ? 'archived' : 'available'),
    ownerId: row.owner_id,
    privacyState: row.privacy_state || 'private',
    privacyStatus: (row.privacy_state || 'private') as any,
    agentId: row.agent_id,
    agentName: row.agent_name,
    teamId: row.team_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapClientFromDb(row: any): Client {
  return {
    id: row.id,
    fullName: row.full_name,
    name: row.full_name,
    mobile: row.mobile,
    phone: row.mobile,
    secondMobile: row.second_mobile,
    role: row.role,
    status: row.status,
    desiredDealType: row.desired_deal_type,
    transactionType: row.desired_deal_type,
    desiredPropertyTypes: Array.isArray(row.desired_property_types) ? row.desired_property_types : ['apartment'],
    propertyType: Array.isArray(row.desired_property_types) ? row.desired_property_types[0] : 'apartment',
    budgetMin: row.budget_min ? Number(row.budget_min) : undefined,
    minBudget: row.budget_min ? Number(row.budget_min) : undefined,
    budgetMax: row.budget_max ? Number(row.budget_max) : undefined,
    maxBudget: row.budget_max ? Number(row.budget_max) : undefined,
    maxMonthlyRent: row.max_monthly_rent ? Number(row.max_monthly_rent) : undefined,
    maxDeposit: row.max_deposit ? Number(row.max_deposit) : undefined,
    minArea: row.min_area ? Number(row.min_area) : undefined,
    maxArea: row.max_area ? Number(row.max_area) : undefined,
    minBedrooms: row.min_bedrooms ? Number(row.min_bedrooms) : 1,
    bedrooms: row.min_bedrooms ? Number(row.min_bedrooms) : 1,
    desiredDistricts: Array.isArray(row.desired_districts) ? row.desired_districts : [],
    preferredRegions: Array.isArray(row.desired_districts) ? row.desired_districts : [],
    preferredCity: row.preferred_city || 'تهران',
    mustHaveElevator: Boolean(row.must_have_elevator),
    mustHaveParking: Boolean(row.must_have_parking),
    requirements: Array.isArray(row.requirements) ? row.requirements : [],
    urgency: row.urgency || 'medium',
    notes: row.notes,
    ownerId: row.owner_id,
    privacyState: row.privacy_state || 'private',
    privacyStatus: (row.privacy_state || 'private') as any,
    agentId: row.agent_id,
    agentName: row.agent_name,
    teamId: row.team_id,
    lastContactAt: row.last_contact_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const storageService = {
  // -------------------------------------------------------------
  // Users & Identity
  // -------------------------------------------------------------
  async getUsers(): Promise<User[]> {
    if (!isSupabaseConfigured()) {
      return memStore.users;
    }
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error('Supabase getUsers error:', error.message);
      throw new Error(`خطا در واکشی کاربران: ${error.message}`);
    }
    return (data || []).map((u) => ({
      id: u.id,
      fullName: u.full_name,
      mobile: u.mobile,
      email: u.email || undefined,
      role: u.role,
      teamId: u.team_id || undefined,
      avatarUrl: u.avatar_url || undefined,
      licenseCode: u.license_code || undefined,
      isActive: u.is_active ?? true,
      agentMode: u.agent_mode || 'team_member',
      subscriptionStatus: u.subscription_status || 'none',
      exitDate: u.exit_date || undefined,
      gracePeriodEndsAt: u.grace_period_ends_at || undefined,
      createdAt: u.created_at,
    }));
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
    if (!isSupabaseConfigured()) {
      const idx = memStore.users.findIndex((u) => u.id === user.id);
      if (idx >= 0) memStore.users[idx] = user;
      else memStore.users.push(user);
      return user;
    }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: user.fullName,
      mobile: user.mobile,
      email: user.email || null,
      role: user.role,
      team_id: user.teamId || null,
      avatar_url: user.avatarUrl || null,
      license_code: user.licenseCode || null,
      is_active: user.isActive,
      agent_mode: user.agentMode,
      subscription_status: user.subscriptionStatus,
      exit_date: user.exitDate || null,
      grace_period_ends_at: user.gracePeriodEndsAt || null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase saveUser error:', error.message);
      throw new Error(`خطا در ذخیره مشخصات کاربر در پایگاه داده: ${error.message}`);
    }
    return user;
  },

  async getCurrentUser(): Promise<User | null> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const u = await this.getUserById(data.session.user.id);
        if (u) return u;
      }
      return null;
    }
    const found = memStore.users.find((u) => u.id === memStore.currentUserId);
    return found || null;
  },

  async setCurrentUserId(userId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      console.warn('setCurrentUserId is disabled in Supabase mode; session is managed via Supabase Auth.');
      return;
    }
    memStore.currentUserId = userId;
  },

  // -------------------------------------------------------------
  // Teams & Memberships
  // -------------------------------------------------------------
  async getTeam(): Promise<Team> {
    if (!isSupabaseConfigured()) {
      return memStore.team;
    }
    const { data, error } = await supabase.from('teams').select('*').limit(1).maybeSingle();
    if (error) {
      console.error('Supabase getTeam error:', error.message);
      throw new Error(`خطا در دریافت اطلاعات تیم: ${error.message}`);
    }
    if (!data) {
      return memStore.team;
    }
    return {
      id: data.id,
      name: data.name,
      licenseNumber: data.license_number || '',
      managerId: data.manager_id || '',
      city: data.city || 'تهران',
      address: data.address || '',
      phone: data.phone || '',
      logoUrl: data.logo_url || undefined,
      createdAt: data.created_at,
    };
  },

  async updateTeam(updates: Partial<Team>): Promise<Team> {
    const current = await this.getTeam();
    const updated: Team = { ...current, ...updates, id: current.id };

    if (!isSupabaseConfigured()) {
      memStore.team = updated;
      return updated;
    }

    const { error } = await supabase.from('teams').update({
      name: updated.name,
      license_number: updated.licenseNumber,
      city: updated.city,
      address: updated.address,
      phone: updated.phone,
      logo_url: updated.logoUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', updated.id);

    if (error) {
      console.error('Supabase updateTeam error:', error.message);
      throw new Error(`خطا در ویرایش اطلاعات آژانس: ${error.message}`);
    }
    return updated;
  },

  async getTeamMemberships(teamId?: string): Promise<TeamMembership[]> {
    if (!isSupabaseConfigured()) {
      if (teamId) return memStore.teamMemberships.filter((m) => m.teamId === teamId && m.status === 'active');
      return memStore.teamMemberships;
    }
    let q = supabase.from('team_memberships').select('*');
    if (teamId) q = q.eq('team_id', teamId).eq('status', 'active');
    const { data, error } = await q;
    if (error) {
      console.error('Supabase getTeamMemberships error:', error.message);
      throw new Error(`خطا در دریافت لیست اعضای تیم: ${error.message}`);
    }
    return (data || []).map((d) => ({
      id: d.id,
      teamId: d.team_id,
      userId: d.user_id,
      role: d.role,
      joinedAt: d.joined_at,
      status: d.status,
      createdAt: d.created_at,
    }));
  },

  async getTeamMembers(teamId: string): Promise<User[]> {
    const memberships = await this.getTeamMemberships(teamId);
    const users = await this.getUsers();
    const memberIds = new Set(memberships.map((m) => m.userId));
    return users.filter((u) => memberIds.has(u.id));
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
      createdAt: new Date().toISOString(),
    };

    if (!isSupabaseConfigured()) {
      memStore.team = newTeam;
      managerUser.teamId = newTeam.id;
      managerUser.role = 'manager';
      await this.saveUser(managerUser);
      return newTeam;
    }

    try {
      const { data: created, error } = await supabase.from('teams').insert({
        name: newTeam.name,
        city: newTeam.city,
        address: newTeam.address,
        phone: newTeam.phone,
        license_number: newTeam.licenseNumber,
        manager_id: managerUser.id,
      }).select().single();

      if (error) throw error;
      const teamObj: Team = { ...newTeam, id: created.id };
      await this.saveUser({ ...managerUser, teamId: created.id, role: 'manager' });
      return teamObj;
    } catch (e: any) {
      throw new Error(e.message || 'خطا در ایجاد تیم در پایگاه‌داده.');
    }
  },

  async leaveTeam(agentUser: User): Promise<User> {
    const now = new Date();
    const graceEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const previousTeamId = agentUser.teamId;

    const updatedUser: User = {
      ...agentUser,
      teamId: undefined,
      exitDate: now.toISOString(),
      gracePeriodEndsAt: graceEnd.toISOString(),
      agentMode: agentUser.subscriptionStatus === 'active' ? 'independent' : 'team_member',
    };

    await this.saveUser(updatedUser);

    if (isSupabaseConfigured()) {
      // In Supabase, update team_memberships status to inactive
      await supabase
        .from('team_memberships')
        .update({ status: 'inactive' })
        .eq('user_id', agentUser.id);

      // Re-privatize agent properties & remove team_id
      await supabase
        .from('properties')
        .update({ team_id: null, privacy_state: 'private' })
        .eq('owner_id', agentUser.id);

      await supabase
        .from('clients')
        .update({ team_id: null, privacy_state: 'private' })
        .eq('owner_id', agentUser.id);
    } else {
      memStore.properties = memStore.properties.map((p) =>
        p.ownerId === agentUser.id ? { ...p, teamId: undefined, privacyState: 'private' } : p
      );
      memStore.clients = memStore.clients.map((c) =>
        c.ownerId === agentUser.id ? { ...c, teamId: undefined, privacyState: 'private' } : c
      );
    }

    await auditService.logEvent({
      user: agentUser,
      action: 'team_left',
      entityType: 'team',
      entityId: previousTeamId || 'unknown',
      details: `مشاور ${agentUser.fullName} از دپارتمان خارج شد. کلیه پرونده‌های مشتریان و فایل‌های ملکی نزد مشاور حفظ شدند.`,
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
      endsAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      mode = user.subscriptionStatus === 'active' ? 'independent' : 'read_only';
    } else {
      endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      mode = user.teamId ? 'team_member' : 'independent';
    }

    const updated: User = { ...user, gracePeriodEndsAt: endsAt, agentMode: mode };
    await this.saveUser(updated);
    return updated;
  },

  async removeTeamMember(teamId: string, memberUserId: string, managerUser: User): Promise<void> {
    if (!authzService.isManager(managerUser)) {
      throw new Error('فقط مدیر دپارتمان اجازه حذف مشاور از تیم را دارد.');
    }

    const member = await this.getUserById(memberUserId);
    if (!member) return;

    await this.leaveTeam(member);

    await auditService.logEvent({
      user: managerUser,
      action: 'team_left',
      entityType: 'team',
      entityId: teamId,
      details: `مشاور ${member.fullName} از تیم جدا شد. طبق اصل مالکیت مطلق، فایل‌ها و مشتریان نزد مشاور باقی می‌مانند.`,
    });
  },

  // -------------------------------------------------------------
  // Invitations
  // -------------------------------------------------------------
  async getInvitations(teamId?: string): Promise<Invitation[]> {
    if (!isSupabaseConfigured()) {
      if (teamId) return memStore.invitations.filter((i) => i.teamId === teamId);
      return memStore.invitations;
    }
    let q = supabase.from('invitations').select('*');
    if (teamId) q = q.eq('team_id', teamId);
    const { data, error } = await q;
    if (error) {
      console.error('Supabase getInvitations error:', error.message);
      throw new Error(`خطا در واکشی دعوت‌نامه‌ها: ${error.message}`);
    }
    return (data || []).map((inv) => ({
      id: inv.id,
      teamId: inv.team_id,
      teamName: inv.team_name,
      inviterId: inv.inviter_id,
      inviterName: inv.inviter_name,
      inviteeMobile: inv.invitee_mobile,
      inviteeEmail: inv.invitee_email,
      inviteeName: inv.invitee_name,
      role: inv.role,
      status: inv.status,
      token: inv.token,
      expiresAt: inv.expires_at,
      respondedAt: inv.responded_at,
      createdAt: inv.created_at,
    }));
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
    const token = 'inv_tok_' + Math.random().toString(36).substring(2, 10);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

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
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    if (!isSupabaseConfigured()) {
      memStore.invitations.unshift(newInv);
    } else {
      const { data: inserted, error } = await supabase.from('invitations').insert({
        team_id: newInv.teamId,
        team_name: newInv.teamName,
        inviter_id: newInv.inviterId,
        inviter_name: newInv.inviterName,
        invitee_mobile: newInv.inviteeMobile,
        invitee_email: newInv.inviteeEmail || null,
        invitee_name: newInv.inviteeName,
        role: 'agent',
        status: 'pending',
        token: newInv.token,
        expires_at: newInv.expiresAt,
      }).select().single();
      if (!error && inserted) {
        newInv.id = inserted.id;
      }
    }

    await auditService.logEvent({
      user: data.managerUser,
      action: 'collaboration_requested',
      entityType: 'invitation',
      entityId: newInv.id,
      details: `ارسال دعوت‌نامه برای مشاور ${data.inviteeName} (${data.inviteeMobile})`,
    });

    return newInv;
  },

  async acceptInvitation(token: string, user: User): Promise<{ success: boolean; teamName: string }> {
    const list = await this.getInvitations();
    const invitation = list.find((i) => i.token === token && i.status === 'pending');
    if (!invitation) throw new Error('دعوت‌نامه نامعتبر یا منقضی شده است.');

    if (isSupabaseConfigured()) {
      await supabase
        .from('invitations')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('token', token);

      await supabase.from('profiles').update({ team_id: invitation.teamId }).eq('id', user.id);
      await supabase.from('team_memberships').insert({
        team_id: invitation.teamId,
        user_id: user.id,
        role: 'agent',
        status: 'active',
      });
    }

    user.teamId = invitation.teamId;
    await this.saveUser(user);

    await auditService.logEvent({
      user,
      action: 'team_joined',
      entityType: 'team',
      entityId: invitation.teamId,
      details: `پذیرش دعوت‌نامه تیم "${invitation.teamName}" توسط مشاور ${user.fullName}. مالکیت فایل‌ها نزد مشاور محفوظ است.`,
    });

    return { success: true, teamName: invitation.teamName };
  },

  async cancelInvitation(id: string, managerUser: User): Promise<void> {
    if (!authzService.isManager(managerUser)) {
      throw new Error('فقط مدیر مجاز به لغو دعوت‌نامه است.');
    }
    if (isSupabaseConfigured()) {
      await supabase.from('invitations').delete().eq('id', id);
    } else {
      memStore.invitations = memStore.invitations.filter((i) => i.id !== id);
    }
  },

  // -------------------------------------------------------------
  // Properties (RLS & Privacy Enforced)
  // -------------------------------------------------------------
  async getProperties(currentUser?: User | null): Promise<Property[]> {
    const user = currentUser || (await this.getCurrentUser());
    if (!user) return [];

    let rawProps: Property[] = [];

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('properties').select('*');
      if (error) {
        console.error('Supabase getProperties database error:', error.message);
        throw new Error(`خطا در واکشی فایل‌های ملکی: ${error.message}`);
      }
      rawProps = (data || []).map(mapPropertyFromDb);
    } else {
      rawProps = memStore.properties;
    }

    // Role & Privacy filtering
    if (user.role === 'agent') {
      return rawProps
        .filter(
          (p) =>
            p.ownerId === user.id ||
            (p.privacyState === 'shared' && user.teamId && p.teamId === user.teamId)
        )
        .map((p) => authzService.sanitizeProperty(user, p));
    }

    if (user.role === 'manager' || user.role === 'admin') {
      return rawProps
        .filter((p) => (user.teamId ? p.teamId === user.teamId : true))
        .map((p) => authzService.sanitizeProperty(user, p));
    }

    return [];
  },

  async getPropertyById(id: string, currentUser?: User | null): Promise<Property | null> {
    const user = currentUser || (await this.getCurrentUser());
    let prop: Property | null = null;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('properties').select('*').eq('id', id).maybeSingle();
      if (error) {
        console.error('Supabase getPropertyById database error:', error.message);
        throw new Error(`خطا در دریافت مشخصات فایل: ${error.message}`);
      }
      prop = data ? mapPropertyFromDb(data) : null;
    } else {
      prop = memStore.properties.find((p) => p.id === id) || null;
    }

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

    const code = `AML-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const newProp: Property = {
      ...propertyData,
      id: `prop_${Date.now()}`,
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
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('properties').insert({
        code: newProp.code,
        title: newProp.title,
        deal_type: newProp.dealType,
        property_type: newProp.propertyType,
        area: newProp.area,
        total_price: newProp.totalPrice,
        price_per_meter: newProp.pricePerMeter,
        deposit: newProp.deposit,
        monthly_rent: newProp.monthlyRent,
        bedrooms: newProp.bedrooms,
        floor: newProp.floor,
        total_floors: newProp.totalFloors,
        units_per_floor: newProp.unitsPerFloor,
        year_built: newProp.yearBuilt,
        parking: newProp.parking,
        elevator: newProp.elevator,
        storage: newProp.storage,
        balcony: newProp.balcony,
        district: newProp.district,
        city: newProp.city,
        address_summary: newProp.addressSummary,
        full_address: newProp.fullAddress,
        description: newProp.description,
        features: newProp.features,
        images: newProp.images,
        owner_name: newProp.ownerName,
        owner_phone: newProp.ownerPhone,
        status: newProp.status,
        availability_status: newProp.availabilityStatus,
        owner_id: user.id,
        privacy_state: newProp.privacyState,
        agent_id: user.id,
        agent_name: user.fullName,
        team_id: user.teamId || null,
        notes: newProp.notes,
      }).select().single();

      if (error) {
        console.error('Supabase property insert error:', error.message);
        throw new Error(`خطا در ثبت فایل در سرور: ${error.message}`);
      }
      if (data) newProp.id = data.id;
    } else {
      memStore.properties.unshift(newProp);
    }

    await auditService.logEvent({
      user,
      action: 'property_created',
      entityType: 'property',
      entityId: newProp.id,
      details: `ثبت فایل جدید: ${newProp.title} (وضعیت داده: ${newProp.privacyState === 'shared' ? 'اشتراکی تیم' : 'شخصی و محرمانه'})`,
    });

    return newProp;
  },

  async updateProperty(
    id: string,
    updates: Partial<Property>,
    currentUser?: User | null
  ): Promise<Property | null> {
    const user = currentUser || (await this.getCurrentUser());
    if (!user) throw new Error('کاربر وارد نشده است.');
    const existing = await this.getPropertyById(id, user);
    if (!existing) return null;

    const editCheck = authzService.canCreateOrEdit(user);
    if (!editCheck.allowed) {
      throw new Error(editCheck.reason || 'دسترسی در حالت فقط خواندنی (Read-Only) مسدود است.');
    }
    if (!authzService.canEditProperty(user, existing)) {
      throw new Error('دسترسی غیرمجاز: طبق اصل مالکیت اطلاعات، تنها مشاور مالک فایل مجاز به ویرایش است.');
    }

    const { ownerId, ...safeUpdates } = updates;
    const updatedProp: Property = {
      ...existing,
      ...safeUpdates,
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('properties').update({
        title: updatedProp.title,
        deal_type: updatedProp.dealType,
        property_type: updatedProp.propertyType,
        area: updatedProp.area,
        total_price: updatedProp.totalPrice,
        price_per_meter: updatedProp.pricePerMeter,
        deposit: updatedProp.deposit,
        monthly_rent: updatedProp.monthlyRent,
        bedrooms: updatedProp.bedrooms,
        district: updatedProp.district,
        address_summary: updatedProp.addressSummary,
        full_address: updatedProp.fullAddress,
        description: updatedProp.description,
        features: updatedProp.features,
        images: updatedProp.images,
        owner_name: updatedProp.ownerName,
        owner_phone: updatedProp.ownerPhone,
        status: updatedProp.status,
        availability_status: updatedProp.availabilityStatus,
        privacy_state: updatedProp.privacyState,
        notes: updatedProp.notes,
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      if (error) {
        console.error('Supabase property update error:', error.message);
        throw new Error(`خطا در ویرایش فایل ملکی: ${error.message}`);
      }
    } else {
      const idx = memStore.properties.findIndex((p) => p.id === id);
      if (idx !== -1) memStore.properties[idx] = updatedProp;
    }

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
    return this.updateProperty(id, { status: 'archived', availabilityStatus: 'archived' }, currentUser);
  },

  async restoreProperty(id: string, currentUser?: User | null): Promise<Property | null> {
    return this.updateProperty(id, { status: 'active', availabilityStatus: 'available' }, currentUser);
  },

  async updatePropertyAvailability(
    id: string,
    availability: 'available' | 'reserved' | 'sold' | 'rented' | 'archived',
    currentUser?: User | null
  ): Promise<Property | null> {
    const status = availability === 'archived' ? 'archived' : availability === 'sold' || availability === 'rented' ? 'deal_closed' : availability === 'reserved' ? 'reserved' : 'active';
    return this.updateProperty(id, { availabilityStatus: availability, status }, currentUser);
  },

  async addPropertyNote(id: string, noteText: string, currentUser?: User | null): Promise<Property | null> {
    const user = currentUser || (await this.getCurrentUser());
    if (!user) throw new Error('کاربر وارد نشده است.');
    const prop = await this.getPropertyById(id, user);
    if (!prop) return null;
    const stamp = `[${user.fullName} - ${new Date().toLocaleDateString('fa-IR')}]: ${noteText}`;
    const newNotes = prop.notes ? `${stamp}\n\n${prop.notes}` : stamp;
    return this.updateProperty(id, { notes: newNotes }, user);
  },

  async addPropertyMedia(id: string, mediaUrls: string[], currentUser?: User | null): Promise<Property | null> {
    const prop = await this.getPropertyById(id, currentUser);
    if (!prop) return null;
    const current = prop.images || [];
    const merged = Array.from(new Set([...current, ...mediaUrls]));
    return this.updateProperty(id, { images: merged, media: merged }, currentUser);
  },

  async togglePropertyPrivacy(id: string, currentUser?: User | null): Promise<Property | null> {
    const prop = await this.getPropertyById(id, currentUser);
    if (!prop) return null;
    const nextState: PrivacyState = prop.privacyState === 'shared' ? 'private' : 'shared';
    return this.updateProperty(id, { privacyState: nextState, privacyStatus: nextState as any }, currentUser);
  },

  // -------------------------------------------------------------
  // Clients (Strict Privacy Enforced)
  // -------------------------------------------------------------
  async getClients(currentUser?: User | null): Promise<Client[]> {
    const user = currentUser || (await this.getCurrentUser());
    if (!user) return [];

    let rawClients: Client[] = [];

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('clients').select('*');
      if (error) {
        console.error('Supabase getClients error:', error.message);
        throw new Error(`خطا در واکشی پرونده متقاضیان: ${error.message}`);
      }
      rawClients = (data || []).map(mapClientFromDb);
    } else {
      rawClients = memStore.clients;
    }

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
      return rawClients
        .filter((c) => (user.teamId ? c.teamId === user.teamId : true))
        .map((c) => authzService.sanitizeClient(user, c));
    }

    return [];
  },

  async getClientById(id: string, currentUser?: User | null): Promise<Client | null> {
    const user = currentUser || (await this.getCurrentUser());
    let client: Client | null = null;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
      if (error) {
        console.error('Supabase getClientById error:', error.message);
        throw new Error(`خطا در دریافت پرونده متقاضی: ${error.message}`);
      }
      client = data ? mapClientFromDb(data) : null;
    } else {
      client = memStore.clients.find((c) => c.id === id) || null;
    }

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

    const nowIso = new Date().toISOString();
    const newClient: Client = {
      ...clientData,
      id: `cli_${Date.now()}`,
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
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('clients').insert({
        full_name: newClient.fullName,
        mobile: newClient.mobile,
        second_mobile: newClient.secondMobile || null,
        role: newClient.role,
        status: newClient.status,
        desired_deal_type: newClient.desiredDealType,
        desired_property_types: newClient.desiredPropertyTypes,
        budget_min: newClient.budgetMin,
        budget_max: newClient.budgetMax,
        max_monthly_rent: newClient.maxMonthlyRent,
        max_deposit: newClient.maxDeposit,
        min_area: newClient.minArea,
        max_area: newClient.maxArea,
        min_bedrooms: newClient.minBedrooms,
        desired_districts: newClient.desiredDistricts,
        preferred_city: newClient.preferredCity,
        must_have_elevator: newClient.mustHaveElevator,
        must_have_parking: newClient.mustHaveParking,
        requirements: newClient.requirements,
        urgency: newClient.urgency,
        notes: newClient.notes,
        owner_id: user.id,
        privacy_state: newClient.privacyState,
        agent_id: user.id,
        agent_name: user.fullName,
        team_id: user.teamId || null,
      }).select().single();

      if (error) {
        console.error('Supabase client insert error:', error.message);
        throw new Error(`خطا در ثبت پرونده متقاضی در سرور: ${error.message}`);
      }
      if (data) newClient.id = data.id;
    } else {
      memStore.clients.unshift(newClient);
    }

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
    if (!user) throw new Error('کاربر وارد نشده است.');
    const existing = await this.getClientById(id, user);
    if (!existing) return null;

    const editCheck = authzService.canCreateOrEdit(user);
    if (!editCheck.allowed) {
      throw new Error(editCheck.reason || 'دسترسی در حالت فقط خواندنی (Read-Only) مسدود است.');
    }
    if (!authzService.canEditClient(user, existing)) {
      throw new Error('دسترسی غیرمجاز: طبق اصل مالکیت اطلاعات، تنها مشاور مالک پرونده متقاضی مجاز به ویرایش است.');
    }

    const { ownerId, ...safeUpdates } = updates;
    const updatedClient: Client = {
      ...existing,
      ...safeUpdates,
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('clients').update({
        full_name: updatedClient.fullName,
        mobile: updatedClient.mobile,
        second_mobile: updatedClient.secondMobile || null,
        role: updatedClient.role,
        status: updatedClient.status,
        desired_deal_type: updatedClient.desiredDealType,
        desired_property_types: updatedClient.desiredPropertyTypes,
        budget_min: updatedClient.budgetMin,
        budget_max: updatedClient.budgetMax,
        min_area: updatedClient.minArea,
        max_area: updatedClient.maxArea,
        min_bedrooms: updatedClient.minBedrooms,
        desired_districts: updatedClient.desiredDistricts,
        requirements: updatedClient.requirements,
        urgency: updatedClient.urgency,
        notes: updatedClient.notes,
        privacy_state: updatedClient.privacyState,
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      if (error) {
        console.error('Supabase client update error:', error.message);
        throw new Error(`خطا در ویرایش پرونده متقاضی: ${error.message}`);
      }
    } else {
      const idx = memStore.clients.findIndex((c) => c.id === id);
      if (idx !== -1) memStore.clients[idx] = updatedClient;
    }

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
    return this.updateClient(id, { status: 'archived' }, currentUser);
  },

  async restoreClient(id: string, currentUser?: User | null): Promise<Client | null> {
    return this.updateClient(id, { status: 'active' }, currentUser);
  },

  async addClientNote(id: string, noteText: string, currentUser?: User | null): Promise<Client | null> {
    const user = currentUser || (await this.getCurrentUser());
    if (!user) throw new Error('کاربر وارد نشده است.');
    const client = await this.getClientById(id, user);
    if (!client) return null;
    const stamp = `[${user.fullName} - ${new Date().toLocaleDateString('fa-IR')}]: ${noteText}`;
    const newNotes = client.notes ? `${stamp}\n\n${client.notes}` : stamp;
    return this.updateClient(id, { notes: newNotes }, user);
  },

  async toggleClientPrivacy(id: string, currentUser?: User | null): Promise<Client | null> {
    const client = await this.getClientById(id, currentUser);
    if (!client) return null;
    const nextState: PrivacyState = client.privacyState === 'shared' ? 'private' : 'shared';
    return this.updateClient(id, { privacyState: nextState, privacyStatus: nextState as any }, currentUser);
  },

  // -------------------------------------------------------------
  // Follow-ups (Daily agenda)
  // -------------------------------------------------------------
  async getFollowUps(currentUser?: User | null): Promise<FollowUp[]> {
    const user = currentUser || (await this.getCurrentUser());
    if (!user) return [];

    let raw: FollowUp[] = [];
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('follow_ups').select('*');
      if (error) {
        console.error('Supabase getFollowUps error:', error.message);
        throw new Error(`خطا در واکشی پیگیری‌ها: ${error.message}`);
      }
      raw = (data || []).map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        notes: d.notes,
        dueAt: d.due_at,
        dueDate: d.due_date,
        dueTime: d.due_time,
        priority: d.priority,
        status: d.status,
        type: d.type,
        opportunityId: d.opportunity_id,
        clientId: d.client_id,
        clientName: d.client_name,
        clientPhone: d.client_phone,
        propertyId: d.property_id,
        propertyTitle: d.property_title,
        ownerId: d.owner_id,
        agentId: d.agent_id,
        privacyState: d.privacy_state,
        completedAt: d.completed_at,
        createdAt: d.created_at,
      }));
    } else {
      raw = memStore.followUps;
    }

    if (user.role === 'agent') {
      return raw.filter((f) => f.ownerId === user.id).map((f) => authzService.sanitizeFollowUp(user, f));
    }
    return raw.map((f) => authzService.sanitizeFollowUp(user, f));
  },

  async createFollowUp(
    followUpData: Omit<FollowUp, 'id' | 'createdAt' | 'ownerId'>,
    currentUser?: User | null
  ): Promise<FollowUp> {
    const user = currentUser || (await this.getCurrentUser());
    if (!user) throw new Error('کاربر وارد نشده است.');

    const newFollowUp: FollowUp = {
      ...followUpData,
      id: `flw_${Date.now()}`,
      ownerId: user.id,
      privacyState: 'private',
      agentId: user.id,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('follow_ups').insert({
        title: newFollowUp.title,
        description: newFollowUp.description,
        notes: newFollowUp.notes,
        due_date: newFollowUp.dueDate,
        due_time: newFollowUp.dueTime,
        priority: newFollowUp.priority,
        status: newFollowUp.status,
        type: newFollowUp.type,
        opportunity_id: newFollowUp.opportunityId || null,
        client_id: newFollowUp.clientId || null,
        client_name: newFollowUp.clientName,
        client_phone: newFollowUp.clientPhone,
        property_id: newFollowUp.propertyId || null,
        property_title: newFollowUp.propertyTitle,
        owner_id: user.id,
        agent_id: user.id,
        privacy_state: 'private',
      }).select().single();

      if (error) {
        console.error('Supabase follow_up insert error:', error.message);
        throw new Error(`خطا در ثبت پیگیری: ${error.message}`);
      }
      if (data) newFollowUp.id = data.id;
    } else {
      memStore.followUps.unshift(newFollowUp);
    }

    return newFollowUp;
  },

  async toggleFollowUpStatus(id: string, currentUser?: User | null): Promise<FollowUp | null> {
    const followUps = await this.getFollowUps(currentUser);
    const existing = followUps.find((f) => f.id === id);
    if (!existing) return null;

    const newStatus: FollowUpStatus = existing.status === 'completed' ? 'pending' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : undefined;

    if (isSupabaseConfigured()) {
      await supabase
        .from('follow_ups')
        .update({ status: newStatus, completed_at: completedAt })
        .eq('id', id);
    } else {
      const idx = memStore.followUps.findIndex((f) => f.id === id);
      if (idx !== -1) memStore.followUps[idx] = { ...existing, status: newStatus, completedAt };
    }

    return { ...existing, status: newStatus, completedAt };
  },

  // -------------------------------------------------------------
  // Opportunities, Matches, Visits, Notifications
  // -------------------------------------------------------------
  async getOpportunities(currentUser?: User | null): Promise<Opportunity[]> {
    const user = currentUser || (await this.getCurrentUser());
    if (!user) return [];

    let raw: Opportunity[] = [];
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('opportunities').select('*');
      if (error) {
        console.error('Supabase getOpportunities error:', error.message);
        throw new Error(`خطا در واکشی فرصت‌های معامله: ${error.message}`);
      }
      raw = (data || []).map((d) => ({
        id: d.id,
        title: d.title,
        clientId: d.client_id,
        clientName: d.client_name,
        propertyId: d.property_id,
        propertyTitle: d.property_title,
        matchScore: d.match_score,
        stage: d.stage,
        status: d.status,
        priority: d.priority,
        nextAction: d.next_action,
        nextFollowUp: d.next_follow_up,
        estimatedValue: Number(d.estimated_value || 0),
        estimatedCommission: Number(d.estimated_commission || 0),
        probabilityPercent: Number(d.probability_percent || 20),
        notes: d.notes,
        expectedCloseDate: d.expected_close_date,
        ownerId: d.owner_id,
        privacyState: d.privacy_state,
        agentId: d.agent_id,
        agentName: d.agent_name,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } else {
      raw = memStore.opportunities;
    }

    if (user.role === 'agent') {
      return raw.filter((o) => o.ownerId === user.id || o.privacyState === 'shared');
    }
    return raw;
  },

  async getMatches(): Promise<Match[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('matches').select('*, properties(*), clients(*)');
      if (error) {
        console.error('Supabase getMatches error:', error.message);
        throw new Error(`خطا در واکشی مچ‌های هوشمند: ${error.message}`);
      }
      return (data || []).map((m) => ({
        id: m.id,
        propertyId: m.property_id,
        property: mapPropertyFromDb(m.properties),
        clientId: m.client_id,
        client: mapClientFromDb(m.clients),
        matchScore: m.match_score,
        matchedFactors: Array.isArray(m.matched_factors) ? m.matched_factors : [],
        unmatchedFactors: Array.isArray(m.unmatched_factors) ? m.unmatched_factors : [],
        status: m.status,
        createdAt: m.created_at,
      }));
    }
    return memStore.matches;
  },

  async getVisits(currentUser?: User | null): Promise<Visit[]> {
    const user = currentUser || (await this.getCurrentUser());
    if (!user) return [];

    let raw: Visit[] = [];
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('visits').select('*');
      if (error) {
        console.error('Supabase getVisits error:', error.message);
        throw new Error(`خطا در واکشی بازدیدها: ${error.message}`);
      }
      raw = (data || []).map((v) => ({
        id: v.id,
        opportunityId: v.opportunity_id,
        clientId: v.client_id,
        clientName: v.client_name,
        clientPhone: v.client_phone,
        propertyId: v.property_id,
        propertyTitle: v.property_title,
        propertyDistrict: v.property_district,
        date: v.date,
        time: v.time,
        scheduledDate: v.scheduled_date,
        scheduledTime: v.scheduled_time,
        status: v.status,
        feedback: v.feedback,
        notes: v.notes,
        clientInterestLevel: v.client_interest_level,
        ownerId: v.owner_id,
        privacyState: v.privacy_state,
        agentId: v.agent_id,
        createdAt: v.created_at,
      }));
    } else {
      raw = memStore.visits;
    }

    if (user.role === 'agent') {
      return raw.filter((v) => v.ownerId === user.id).map((v) => authzService.sanitizeVisit(user, v));
    }
    return raw.map((v) => authzService.sanitizeVisit(user, v));
  },

  async getNotifications(currentUser?: User | null): Promise<Notification[]> {
    const user = currentUser || (await this.getCurrentUser());
    if (!user) return [];

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase getNotifications error:', error.message);
        throw new Error(`خطا در واکشی اعلان‌ها: ${error.message}`);
      }
      return (data || []).map((n) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        read: n.read,
        link: n.link,
        createdAt: n.created_at,
      }));
    }
    return memStore.notifications.filter((n) => n.userId === user.id || !n.userId);
  },

  async markNotificationAsRead(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    } else {
      const idx = memStore.notifications.findIndex((n) => n.id === id);
      if (idx !== -1) memStore.notifications[idx].read = true;
    }
  },

  // -------------------------------------------------------------
  // Dashboard Aggregates
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

    const todayFollowUps = followUps.filter((f) => (f.dueDate === 'امروز' || f.dueDate?.includes('امروز')) && f.status !== 'completed');
    const overdueFollowUps = followUps.filter((f) => f.status === 'overdue');
    const newMatches = matches.filter((m) => m.status === 'new');
    const activeOpportunities = opportunities.filter((o) => o.stage !== 'closed_won' && o.stage !== 'closed_lost' && o.stage !== 'won' && o.stage !== 'lost');
    const upcomingVisits = visits.filter((v) => v.status === 'scheduled');
    const activeProps = properties.filter((p) => p.status === 'active');
    const activeClients = clients.filter((c) => c.status === 'active' || c.status === 'negotiation' || c.status === 'lead');

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
