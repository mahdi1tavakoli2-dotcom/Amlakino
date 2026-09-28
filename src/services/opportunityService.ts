import {
  Opportunity,
  OpportunityStage,
  FollowUp,
  FollowUpType,
  FollowUpPriority,
  FollowUpStatus,
  Visit,
  Deal,
  Activity,
  ActivityType,
  User,
  Client,
  Property,
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { storageService } from './storageService';

// In-Memory store for preview/dev mode (starts empty, strictly NO mock data)
const memOpps: Opportunity[] = [];
const memFollowUps: FollowUp[] = [];
const memVisits: Visit[] = [];
const memDeals: Deal[] = [];
const memActivities: Activity[] = [];

export const opportunityService = {
  // -------------------------------------------------------------
  // Opportunities CRUD & Pipeline
  // -------------------------------------------------------------
  async getAll(currentUser?: User | null): Promise<Opportunity[]> {
    const user = currentUser || (await storageService.getCurrentUser());
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('opportunities').select('*');
      if (error) {
        console.error('Supabase opportunities error:', error.message);
        throw new Error(`خطا در واکشی فرصت‌های معامله از پایگاه داده: ${error.message}`);
      }
      const list: Opportunity[] = (data || []).map((d: any) => ({
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
      return this.filterByAccess(list, user);
    }

    return this.filterByAccess(memOpps, user);
  },

  async getById(id: string, currentUser?: User | null): Promise<Opportunity | null> {
    const all = await this.getAll(currentUser);
    return all.find((o) => o.id === id) || null;
  },

  filterByAccess(list: Opportunity[], user: User | null): Opportunity[] {
    if (!user) return [];
    if (user.role === 'agent') {
      return list
        .filter((o) => o.ownerId === user.id || o.privacyState === 'shared')
        .map((o) => {
          if (o.ownerId !== user.id) {
            return { ...o, notes: undefined };
          }
          return o;
        });
    }
    return list.map((o) => {
      if (o.ownerId !== user.id) {
        return { ...o, notes: undefined };
      }
      return o;
    });
  },

  async create(
    params: {
      client: Client;
      property: Property;
      matchScore?: number;
      priority?: 'high' | 'medium' | 'low';
      nextAction?: string;
      nextFollowUp?: string;
      notes?: string;
    },
    currentUser?: User | null
  ): Promise<Opportunity> {
    const user = currentUser || (await storageService.getCurrentUser());
    if (!user) throw new Error('کاربر وارد نشده است.');

    const newId = `opp_${Date.now()}`;
    const now = new Date().toISOString();

    const newOpp: Opportunity = {
      id: newId,
      title: `${params.property.title} — ${params.client.fullName || params.client.name}`,
      client: params.client,
      clientId: params.client.id,
      clientName: params.client.fullName || params.client.name,
      property: params.property,
      propertyId: params.property.id,
      propertyTitle: params.property.title,
      matchScore: params.matchScore ?? 90,
      stage: 'new_match',
      status: 'active',
      priority: params.priority || 'high',
      nextAction: params.nextAction || 'تماس اولیه جهت ارائه مشخصات فایل به مشتری',
      nextFollowUp: params.nextFollowUp || 'امروز ساعت ۱۷:۰۰',
      owner: { id: user.id, name: user.fullName },
      ownerId: user.id,
      agentId: user.id,
      agentName: user.fullName,
      privacyState: 'private',
      estimatedValue: params.property.totalPrice || params.property.price || params.property.deposit || 0,
      estimatedCommission: Math.round((params.property.totalPrice || params.property.price || params.property.deposit || 0) * 0.005),
      notes: params.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('opportunities').insert({
          title: newOpp.title,
          client_id: newOpp.clientId,
          client_name: newOpp.clientName,
          property_id: newOpp.propertyId,
          property_title: newOpp.propertyTitle,
          match_score: newOpp.matchScore,
          stage: newOpp.stage,
          status: newOpp.status,
          priority: newOpp.priority,
          next_action: newOpp.nextAction,
          next_follow_up: newOpp.nextFollowUp,
          estimated_value: newOpp.estimatedValue,
          estimated_commission: newOpp.estimatedCommission,
          notes: newOpp.notes,
          owner_id: user.id,
          privacy_state: newOpp.privacyState,
          agent_id: user.id,
          agent_name: user.fullName,
        }).select().single();
        if (!error && data) newOpp.id = data.id;
      } catch (err: any) {
        console.warn('Supabase create opportunity error:', err.message);
        memOpps.unshift(newOpp);
      }
    } else {
      memOpps.unshift(newOpp);
    }

    await this.addActivity({
      opportunityId: newOpp.id,
      type: 'opportunity_created',
      description: `ایجاد فرصت جدید معامله بین متقاضی ${params.client.fullName} و فایل ${params.property.title}`,
      isPrivate: false,
    }, user);

    return newOpp;
  },

  async updateStage(
    id: string,
    newStage: OpportunityStage,
    currentUser?: User | null,
    notes?: string
  ): Promise<Opportunity> {
    const user = currentUser || (await storageService.getCurrentUser());
    if (!user) throw new Error('کاربر وارد نشده است.');

    const opp = await this.getById(id, user);
    if (!opp) throw new Error('فرصت یافت نشد.');

    if (user.role === 'agent' && opp.ownerId !== user.id) {
      throw new Error('فقط مشاور مالک مجاز به تغییر مرحله این فرصت است.');
    }

    const prevStage = opp.stage;
    opp.stage = newStage;
    opp.updatedAt = new Date().toISOString();

    if (newStage === 'won' || newStage === 'closed_won') {
      opp.status = 'won';
    } else if (newStage === 'lost' || newStage === 'closed_lost') {
      opp.status = 'lost';
    }

    if (notes) {
      opp.notes = opp.notes ? `${opp.notes}\n${notes}` : notes;
    }

    if (isSupabaseConfigured()) {
      await supabase
        .from('opportunities')
        .update({
          stage: opp.stage,
          status: opp.status,
          notes: opp.notes,
          updated_at: opp.updatedAt,
        })
        .eq('id', id);
    } else {
      const idx = memOpps.findIndex((o) => o.id === id);
      if (idx !== -1) memOpps[idx] = opp;
    }

    await this.addActivity({
      opportunityId: id,
      type: 'stage_change',
      description: `تغییر مرحله از «${prevStage}» به «${newStage}»${notes ? ` (${notes})` : ''}`,
      isPrivate: false,
    }, user);

    return opp;
  },

  async update(
    id: string,
    updates: Partial<Opportunity>,
    currentUser?: User | null
  ): Promise<Opportunity> {
    const user = currentUser || (await storageService.getCurrentUser());
    if (!user) throw new Error('کاربر وارد نشده است.');

    const opp = await this.getById(id, user);
    if (!opp) throw new Error('فرصت یافت نشد.');

    if (user.role === 'agent' && opp.ownerId !== user.id) {
      throw new Error('فقط مشاور مالک مجاز به ویرایش این فرصت است.');
    }

    const { ownerId, ...safeUpdates } = updates;
    const updated = {
      ...opp,
      ...safeUpdates,
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      await supabase
        .from('opportunities')
        .update({
          title: updated.title,
          stage: updated.stage,
          status: updated.status,
          priority: updated.priority,
          next_action: updated.nextAction,
          next_follow_up: updated.nextFollowUp,
          estimated_value: updated.estimatedValue,
          estimated_commission: updated.estimatedCommission,
          notes: updated.notes,
          expected_close_date: updated.expectedCloseDate,
          updated_at: updated.updatedAt,
        })
        .eq('id', id);
    } else {
      const idx = memOpps.findIndex((o) => o.id === id);
      if (idx !== -1) memOpps[idx] = updated;
    }

    return updated;
  },

  // -------------------------------------------------------------
  // FOLLOW-UPS FOR OPPORTUNITY
  // -------------------------------------------------------------
  async createFollowUp(
    params: {
      opportunityId?: string;
      title: string;
      description?: string;
      dueAt: string;
      priority: FollowUpPriority;
      type: FollowUpType;
      status?: FollowUpStatus;
      clientId?: string;
      clientName?: string;
      propertyId?: string;
      propertyTitle?: string;
    },
    currentUser?: User | null
  ): Promise<FollowUp> {
    const user = currentUser || (await storageService.getCurrentUser());
    if (!user) throw new Error('کاربر وارد نشده است.');

    const newId = `flw_${Date.now()}`;
    const newFollowUp: FollowUp = {
      id: newId,
      title: params.title,
      description: params.description || '',
      dueAt: params.dueAt,
      dueDate: params.dueAt.includes(' ') ? params.dueAt.split(' ')[0] : params.dueAt,
      dueTime: params.dueAt.includes(' ') ? params.dueAt.split(' ')[1] : '۱۱:۰۰',
      priority: params.priority,
      status: params.status || 'Pending',
      type: params.type,
      opportunityId: params.opportunityId,
      ownerId: user.id,
      agentId: user.id,
      clientId: params.clientId,
      clientName: params.clientName,
      propertyId: params.propertyId,
      propertyTitle: params.propertyTitle,
      privacyState: 'private',
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('follow_ups').insert({
          title: newFollowUp.title,
          description: newFollowUp.description,
          due_date: newFollowUp.dueDate,
          due_time: newFollowUp.dueTime,
          due_at: newFollowUp.dueAt,
          priority: newFollowUp.priority,
          status: newFollowUp.status,
          type: newFollowUp.type,
          opportunity_id: newFollowUp.opportunityId || null,
          client_id: newFollowUp.clientId || null,
          client_name: newFollowUp.clientName,
          property_id: newFollowUp.propertyId || null,
          property_title: newFollowUp.propertyTitle,
          owner_id: user.id,
          agent_id: user.id,
        }).select().single();
        if (data) newFollowUp.id = data.id;
      } catch {
        memFollowUps.unshift(newFollowUp);
      }
    } else {
      memFollowUps.unshift(newFollowUp);
    }

    if (params.opportunityId) {
      await this.addActivity({
        opportunityId: params.opportunityId,
        type: 'followup',
        description: `ایجاد پیگیری: ${params.title} (موعد: ${params.dueAt})`,
        isPrivate: false,
      }, user);

      await this.update(params.opportunityId, {
        nextFollowUp: `${params.title} (${params.dueAt})`,
      }, user);
    }

    return newFollowUp;
  },

  async completeFollowUp(
    id: string,
    resultNotes?: string,
    currentUser?: User | null
  ): Promise<FollowUp> {
    const user = currentUser || (await storageService.getCurrentUser());
    const followUps = isSupabaseConfigured() ? await storageService.getFollowUps(user) : memFollowUps;
    const existing = followUps.find((f) => f.id === id);
    if (!existing) throw new Error('پیگیری یافت نشد.');

    const newStatus = 'Completed';
    const completedAt = new Date().toISOString();
    const updatedDesc = resultNotes
      ? (existing.description ? `${existing.description}\n[انجام شد]: ${resultNotes}` : `[انجام شد]: ${resultNotes}`)
      : existing.description;

    if (isSupabaseConfigured()) {
      await supabase
        .from('follow_ups')
        .update({
          status: newStatus,
          completed_at: completedAt,
          description: updatedDesc,
        })
        .eq('id', id);
    } else {
      const idx = memFollowUps.findIndex((f) => f.id === id);
      if (idx !== -1) {
        memFollowUps[idx] = { ...existing, status: newStatus as any, completedAt, description: updatedDesc };
      }
    }

    if (existing.opportunityId) {
      await this.addActivity({
        opportunityId: existing.opportunityId,
        type: 'followup_completed',
        description: `انجام پیگیری: ${existing.title}${resultNotes ? ` - نتیجه: ${resultNotes}` : ''}`,
        isPrivate: false,
      }, user);
    }

    return { ...existing, status: newStatus as any, completedAt, description: updatedDesc };
  },

  // -------------------------------------------------------------
  // VISITS FOR OPPORTUNITY
  // -------------------------------------------------------------
  async scheduleVisit(
    params: {
      opportunityId?: string;
      client: Client;
      property: Property;
      date: string;
      time: string;
      notes?: string;
    },
    currentUser?: User | null
  ): Promise<Visit> {
    const user = currentUser || (await storageService.getCurrentUser());
    if (!user) throw new Error('کاربر وارد نشده است.');

    const newId = `vst_${Date.now()}`;
    const newVisit: Visit = {
      id: newId,
      opportunityId: params.opportunityId,
      client: params.client,
      clientId: params.client.id,
      clientName: params.client.fullName || params.client.name || 'متقاضی',
      clientPhone: params.client.mobile || params.client.phone,
      property: params.property,
      propertyId: params.property.id,
      propertyTitle: params.property.title,
      propertyDistrict: params.property.neighborhood || params.property.district,
      date: params.date,
      time: params.time,
      scheduledDate: params.date,
      scheduledTime: params.time,
      status: 'Scheduled',
      notes: params.notes || '',
      ownerId: user.id,
      privacyState: 'private',
      agentId: user.id,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('visits').insert({
          opportunity_id: newVisit.opportunityId || null,
          client_id: newVisit.clientId,
          client_name: newVisit.clientName,
          client_phone: newVisit.clientPhone,
          property_id: newVisit.propertyId,
          property_title: newVisit.propertyTitle,
          property_district: newVisit.propertyDistrict,
          date: newVisit.date,
          time: newVisit.time,
          status: newVisit.status,
          notes: newVisit.notes,
          owner_id: user.id,
          agent_id: user.id,
        }).select().single();
        if (data) newVisit.id = data.id;
      } catch {
        memVisits.unshift(newVisit);
      }
    } else {
      memVisits.unshift(newVisit);
    }

    if (params.opportunityId) {
      await this.addActivity({
        opportunityId: params.opportunityId,
        type: 'visit',
        description: `تنظیم بازدید ملک برای تاریخ ${params.date} ساعت ${params.time}`,
        isPrivate: false,
      }, user);

      await this.updateStage(params.opportunityId, 'visit_scheduled', user);
      await this.update(params.opportunityId, {
        nextAction: `انجام بازدید در تاریخ ${params.date} ساعت ${params.time}`,
        nextFollowUp: `${params.date} ${params.time}`,
      }, user);
    }

    return newVisit;
  },

  async completeVisit(
    visitId: string,
    feedback?: string,
    currentUser?: User | null
  ): Promise<Visit> {
    const user = currentUser || (await storageService.getCurrentUser());
    const visits = isSupabaseConfigured() ? await storageService.getVisits(user) : memVisits;
    const existing = visits.find((v) => v.id === visitId);
    if (!existing) throw new Error('بازدید یافت نشد.');

    const newStatus = 'Completed';

    if (isSupabaseConfigured()) {
      await supabase
        .from('visits')
        .update({
          status: newStatus,
          feedback,
        })
        .eq('id', visitId);
    } else {
      const idx = memVisits.findIndex((v) => v.id === visitId);
      if (idx !== -1) memVisits[idx] = { ...existing, status: newStatus as any, feedback };
    }

    if (existing.opportunityId) {
      await this.addActivity({
        opportunityId: existing.opportunityId,
        type: 'visit_done',
        description: `بازدید با موفقیت انجام شد.${feedback ? ` بازخورد: ${feedback}` : ''}`,
        isPrivate: false,
      }, user);

      await this.updateStage(existing.opportunityId, 'visited', user, feedback);
    }

    return { ...existing, status: newStatus as any, feedback };
  },

  // -------------------------------------------------------------
  // DEALS (Allow Opportunity to Become a Deal)
  // -------------------------------------------------------------
  async convertToDeal(
    params: {
      opportunityId: string;
      finalPrice?: number;
      notes?: string;
      date?: string;
    },
    currentUser?: User | null
  ): Promise<Deal> {
    const user = currentUser || (await storageService.getCurrentUser());
    if (!user) throw new Error('کاربر وارد نشده است.');

    const opp = await this.getById(params.opportunityId, user);
    if (!opp) throw new Error('فرصت یافت نشد.');

    const property = opp.property || (await storageService.getPropertyById(opp.propertyId, user));
    const client = opp.client || (await storageService.getClientById(opp.clientId, user));
    if (!property || !client) {
      throw new Error('اطلاعات ملک یا متقاضی برای ثبت معامله در دسترس نیست.');
    }

    const newDealId = `deal_${Date.now()}`;
    const dateStr = params.date || new Date().toISOString().split('T')[0];

    const deal: Deal = {
      id: newDealId,
      opportunityId: opp.id,
      property,
      propertyId: property.id,
      propertyTitle: property.title,
      client,
      clientId: client.id,
      clientName: client.fullName || client.name,
      agent: { id: user.id, name: user.fullName },
      agentId: user.id,
      agentName: user.fullName,
      date: dateStr,
      status: 'won',
      notes: params.notes || 'معامله با موفقیت نهایی و قطعی شد.',
      dealType: property.dealType || property.transactionType || 'sale',
      finalPrice: params.finalPrice || opp.estimatedValue || 0,
      commissionTotal: opp.estimatedCommission || Math.round((params.finalPrice || opp.estimatedValue || 0) * 0.005),
      ownerId: user.id,
      privacyState: 'private',
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('deals').insert({
          opportunity_id: deal.opportunityId,
          property_id: deal.propertyId,
          property_title: deal.propertyTitle,
          client_id: deal.clientId,
          client_name: deal.clientName,
          agent_id: user.id,
          agent_name: user.fullName,
          deal_type: deal.dealType,
          final_price: deal.finalPrice,
          commission_total: deal.commissionTotal,
          agent_share: deal.commissionTotal ? Math.round(deal.commissionTotal * 0.6) : 0,
          office_share: deal.commissionTotal ? Math.round(deal.commissionTotal * 0.4) : 0,
          status: 'won',
          notes: deal.notes,
          owner_id: user.id,
        });
      } catch (err: any) {
        console.warn('Supabase deal insert error:', err.message);
        memDeals.unshift(deal);
      }
    } else {
      memDeals.unshift(deal);
    }

    await this.updateStage(opp.id, 'won', user, params.notes || 'تبدیل به معامله نهایی (Deal Closed)');

    await this.addActivity({
      opportunityId: opp.id,
      type: 'deal_won',
      description: `معامله نهایی ثبت شد! ارزش نهایی: ${(deal.finalPrice || 0).toLocaleString('fa-IR')} تومان`,
      isPrivate: false,
    }, user);

    return deal;
  },

  // -------------------------------------------------------------
  // ACTIVITIES & PRIVATE NOTES TIMELINE
  // -------------------------------------------------------------
  async getActivities(
    opportunityId: string,
    currentUser?: User | null
  ): Promise<Activity[]> {
    const user = currentUser || (await storageService.getCurrentUser());

    let all: Activity[] = [];
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .eq('opportunity_id', opportunityId)
          .order('timestamp', { ascending: false });
        if (!error && data) {
          all = data.map((a: any) => ({
            id: a.id,
            userId: a.user_id,
            userName: a.user_name,
            type: a.type,
            entityType: a.entity_type,
            entityId: a.entity_id,
            opportunityId: a.opportunity_id,
            description: a.description,
            timestamp: a.timestamp,
            ownerId: a.owner_id,
            isPrivate: a.is_private,
          }));
        } else {
          all = memActivities.filter((a) => a.opportunityId === opportunityId);
        }
      } catch {
        all = memActivities.filter((a) => a.opportunityId === opportunityId);
      }
    } else {
      all = memActivities.filter((a) => a.opportunityId === opportunityId);
    }

    return all.filter((a) => {
      if (a.isPrivate) {
        return user?.id === a.ownerId;
      }
      return true;
    });
  },

  async addActivity(
    params: {
      opportunityId: string;
      type: ActivityType;
      description: string;
      isPrivate?: boolean;
    },
    currentUser?: User | null
  ): Promise<Activity> {
    const user = currentUser || (await storageService.getCurrentUser());
    if (!user) throw new Error('کاربر وارد نشده است.');

    const newAct: Activity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      userId: user.id,
      userName: user.fullName,
      type: params.type,
      entityType: 'opportunity',
      entityId: params.opportunityId,
      opportunityId: params.opportunityId,
      description: params.description,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) + ' - امروز',
      ownerId: user.id,
      isPrivate: params.isPrivate ?? false,
      privacyState: params.isPrivate ? 'private' : 'shared',
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('activities').insert({
          user_id: user.id,
          user_name: user.fullName,
          type: newAct.type,
          entity_type: 'opportunity',
          entity_id: params.opportunityId,
          opportunity_id: params.opportunityId,
          description: newAct.description,
          owner_id: user.id,
        });
      } catch {
        memActivities.unshift(newAct);
      }
    } else {
      memActivities.unshift(newAct);
    }

    return newAct;
  },
};
