import {
  Opportunity,
  OpportunityStage,
  FollowUp,
  FollowUpType,
  FollowUpPriority,
  FollowUpStatus,
  Visit,
  VisitStatus,
  Deal,
  Activity,
  ActivityType,
  User,
  Client,
  Property,
} from '../types';
import { storageService } from './storageService';
import { authzService } from './authzService';
import { initialOpportunities, initialFollowUps, initialVisits } from './mockData';

const STORAGE_KEYS = {
  OPPORTUNITIES: 'amlakino_crm_opportunities_v2',
  FOLLOWUPS: 'amlakino_followups',
  VISITS: 'amlakino_visits',
  DEALS: 'amlakino_crm_deals',
  ACTIVITIES: 'amlakino_crm_activities',
};

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed saving ${key}`, e);
  }
}

export const opportunityService = {
  // -------------------------------------------------------------
  // Opportunities CRUD & Pipeline
  // -------------------------------------------------------------
  async getAll(currentUser?: User | null): Promise<Opportunity[]> {
    const user = currentUser || (await storageService.getCurrentUser());
    const raw = getItem<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, []);

    // If empty in v2 storage, hydrate with default mock opportunities
    if (raw.length === 0) {
      const hydrated = await this.hydrateInitialOpportunities(user);
      setItem(STORAGE_KEYS.OPPORTUNITIES, hydrated);
      return this.filterByAccess(hydrated, user);
    }

    return this.filterByAccess(raw, user);
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
          // If not owner, strip private notes
          if (o.ownerId !== user.id) {
            return { ...o, notes: undefined };
          }
          return o;
        });
    }
    // Managers can see list, but private notes are kept strictly private to the agent
    return list.map((o) => {
      if (o.ownerId !== user.id) {
        return {
          ...o,
          notes: undefined, // Private notes must remain private
        };
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

    const list = getItem<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, []);
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

    list.unshift(newOpp);
    setItem(STORAGE_KEYS.OPPORTUNITIES, list);

    // Log Activity
    await this.addActivity({
      opportunityId: newId,
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

    const list = getItem<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, []);
    const index = list.findIndex((o) => o.id === id);
    if (index === -1) throw new Error('فرصت یافت نشد.');

    const opp = list[index];
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

    list[index] = opp;
    setItem(STORAGE_KEYS.OPPORTUNITIES, list);

    // Activity
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

    const list = getItem<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, []);
    const index = list.findIndex((o) => o.id === id);
    if (index === -1) throw new Error('فرصت یافت نشد.');

    const opp = list[index];
    if (user.role === 'agent' && opp.ownerId !== user.id) {
      throw new Error('فقط مشاور مالک مجاز به ویرایش این فرصت است.');
    }

    // Protect ownership
    const { ownerId, ...safeUpdates } = updates;
    const updated = {
      ...opp,
      ...safeUpdates,
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    setItem(STORAGE_KEYS.OPPORTUNITIES, list);
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

    const followUps = getItem<FollowUp[]>(STORAGE_KEYS.FOLLOWUPS, initialFollowUps);
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

    followUps.unshift(newFollowUp);
    setItem(STORAGE_KEYS.FOLLOWUPS, followUps);

    // If linked to opportunity, log activity and update nextFollowUp
    if (params.opportunityId) {
      await this.addActivity({
        opportunityId: params.opportunityId,
        type: 'followup',
        description: `ایجاد پیگیری: ${params.title} (موعد: ${params.dueAt})`,
        isPrivate: false,
      }, user);

      // Update opp's nextFollowUp
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
    const followUps = getItem<FollowUp[]>(STORAGE_KEYS.FOLLOWUPS, initialFollowUps);
    const index = followUps.findIndex((f) => f.id === id);
    if (index === -1) throw new Error('پیگیری یافت نشد.');

    const f = followUps[index];
    f.status = 'Completed';
    f.completedAt = new Date().toISOString();
    if (resultNotes) {
      f.description = f.description ? `${f.description}\n[انجام شد]: ${resultNotes}` : `[انجام شد]: ${resultNotes}`;
    }

    followUps[index] = f;
    setItem(STORAGE_KEYS.FOLLOWUPS, followUps);

    if (f.opportunityId) {
      await this.addActivity({
        opportunityId: f.opportunityId,
        type: 'followup_completed',
        description: `انجام پیگیری: ${f.title}${resultNotes ? ` - نتیجه: ${resultNotes}` : ''}`,
        isPrivate: false,
      }, user);
    }

    return f;
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

    const visits = getItem<Visit[]>(STORAGE_KEYS.VISITS, initialVisits);
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

    visits.unshift(newVisit);
    setItem(STORAGE_KEYS.VISITS, visits);

    if (params.opportunityId) {
      await this.addActivity({
        opportunityId: params.opportunityId,
        type: 'visit',
        description: `تنظیم بازدید ملک برای تاریخ ${params.date} ساعت ${params.time}`,
        isPrivate: false,
      }, user);

      // Transition opportunity to visit_scheduled
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
    const visits = getItem<Visit[]>(STORAGE_KEYS.VISITS, initialVisits);
    const index = visits.findIndex((v) => v.id === visitId);
    if (index === -1) throw new Error('بازدید یافت نشد.');

    const v = visits[index];
    v.status = 'Completed';
    v.feedback = feedback;

    visits[index] = v;
    setItem(STORAGE_KEYS.VISITS, visits);

    if (v.opportunityId) {
      await this.addActivity({
        opportunityId: v.opportunityId,
        type: 'visit_done',
        description: `بازدید با موفقیت انجام شد.${feedback ? ` بازخورد: ${feedback}` : ''}`,
        isPrivate: false,
      }, user);

      // Advance stage to visited
      await this.updateStage(v.opportunityId, 'visited', user, feedback);
    }

    return v;
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

    const deals = getItem<Deal[]>(STORAGE_KEYS.DEALS, []);
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

    deals.unshift(deal);
    setItem(STORAGE_KEYS.DEALS, deals);

    // Advance opportunity to won
    await this.updateStage(opp.id, 'won', user, params.notes || 'تبدیل به معامله نهایی (Deal Closed)');

    // Log Activity
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
    const all = getItem<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    const oppActivities = all.filter((a) => a.opportunityId === opportunityId);

    // Private notes rule: Only the owner can read their private notes/activities
    return oppActivities.filter((a) => {
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

    const all = getItem<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
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

    all.unshift(newAct);
    setItem(STORAGE_KEYS.ACTIVITIES, all);
    return newAct;
  },

  // -------------------------------------------------------------
  // Hydrate Initial Opportunities (linking existing properties & clients)
  // -------------------------------------------------------------
  async hydrateInitialOpportunities(user: User | null): Promise<Opportunity[]> {
    const properties = await storageService.getProperties(user);
    const clients = await storageService.getClients(user);

    const opps: Opportunity[] = [
      {
        id: 'opp_1',
        title: 'فروش آپارتمان ۱۴۵ متری به مهندس پارسا',
        clientId: 'cli_1',
        clientName: 'مهندس فرشید پارسا',
        client: (clients.find((c) => c.id === 'cli_1') || {
          id: 'cli_1',
          fullName: 'مهندس فرشید پارسا',
          name: 'مهندس فرشید پارسا',
          mobile: '۰۹۱۲۵۵۵۹۸۷۶',
          phone: '۰۹۱۲۵۵۵۹۸۷۶',
          role: 'buyer',
          status: 'active',
          desiredDealType: 'sale',
          ownerId: 'usr_101',
          privacyState: 'private',
          agentId: 'usr_101',
          createdAt: '۱۴۰۳/۰۷/۰۱',
        }) as Client,
        propertyId: 'prop_1',
        propertyTitle: 'آپارتمان ۱۴۵ متری صراف‌ها',
        property: (properties.find((p) => p.id === 'prop_1') || {
          id: 'prop_1',
          code: '1001',
          title: 'آپارتمان ۱۴۵ متری صراف‌های جنوبی',
          dealType: 'sale',
          propertyType: 'apartment',
          price: 22_500_000_000,
          totalPrice: 22_500_000_000,
          area: 145,
          bedrooms: 3,
          district: 'سعادت‌آباد',
          neighborhood: 'سعادت‌آباد',
          city: 'تهران',
          address: 'سعادت‌آباد، صراف‌های جنوبی',
          ownerId: 'usr_101',
          agentId: 'usr_101',
          privacyState: 'private',
          status: 'active',
          availabilityStatus: 'available',
          features: ['آسانسور', 'پارکینگ', 'انباری'],
          images: [],
          media: [],
          createdAt: '۱۴۰۳/۰۷/۰۱',
          updatedAt: '۱۴۰۳/۰۷/۰۴',
        }) as Property,
        matchScore: 96,
        stage: 'negotiation',
        status: 'active',
        priority: 'high',
        nextAction: 'برگزاری جلسه نشست با مالک جهت تخفیف متری ۲ میلیون تومان',
        nextFollowUp: 'امروز ساعت ۱۸:۳۰',
        owner: { id: 'usr_101', name: 'مهدی رضایی' },
        ownerId: 'usr_101',
        agentId: 'usr_101',
        agentName: 'مهدی رضایی',
        privacyState: 'private',
        estimatedValue: 22_500_000_000,
        estimatedCommission: 112_500_000,
        notes: 'مشتری ملک را پسندیده؛ سر قیمت توافق اولیه حاصل شده است.',
        createdAt: '۱۴۰۳/۰۷/۰۲',
        updatedAt: '۱۴۰۳/۰۷/۰۴',
      },
      {
        id: 'opp_2',
        title: 'اجاره ۱۱۰ متری فرهنگ به دکتر معتمدی',
        clientId: 'cli_2',
        clientName: 'خانم دکتر معتمدی',
        client: (clients.find((c) => c.id === 'cli_2') || {
          id: 'cli_2',
          fullName: 'سرکار خانم دکتر معتمدی',
          name: 'خانم دکتر معتمدی',
          mobile: '۰۹۱۲۶۶۶۳۲۱۰',
          phone: '۰۹۱۲۶۶۶۳۲۱۰',
          role: 'tenant',
          status: 'active',
          desiredDealType: 'rent',
          ownerId: 'usr_101',
          privacyState: 'shared',
          agentId: 'usr_101',
          createdAt: '۱۴۰۳/۰۶/۳۰',
        }) as Client,
        propertyId: 'prop_2',
        propertyTitle: '۱۱۰ متری بلوار فرهنگ',
        property: (properties.find((p) => p.id === 'prop_2') || {
          id: 'prop_2',
          code: '1002',
          title: '۱۱۰ متری نوساز، بلوار فرهنگ',
          dealType: 'rent',
          propertyType: 'apartment',
          deposit: 1_200_000_000,
          rent: 35_000_000,
          area: 110,
          bedrooms: 2,
          district: 'سعادت‌آباد',
          neighborhood: 'سعادت‌آباد',
          city: 'تهران',
          address: 'بلوار فرهنگ',
          ownerId: 'usr_101',
          agentId: 'usr_101',
          privacyState: 'shared',
          status: 'active',
          availabilityStatus: 'available',
          features: ['آسانسور', 'پارکینگ', 'انباری', 'نگهبانی'],
          images: [],
          media: [],
          createdAt: '۱۴۰۳/۰۶/۳۰',
          updatedAt: '۱۴۰۳/۰۷/۰۴',
        }) as Property,
        matchScore: 92,
        stage: 'contract',
        status: 'active',
        priority: 'high',
        nextAction: 'تحویل پیش‌نویس قرارداد اجاره‌نامه برای تایید چک‌ها',
        nextFollowUp: 'فردا ساعت ۱۰:۰۰',
        owner: { id: 'usr_101', name: 'مهدی رضایی' },
        ownerId: 'usr_101',
        agentId: 'usr_101',
        agentName: 'مهدی رضایی',
        privacyState: 'shared',
        estimatedValue: 2_400_000_000,
        estimatedCommission: 24_000_000,
        notes: 'چک‌های اجاره نوشته شده، تاریخ تحویل اول آبان.',
        createdAt: '۱۴۰۳/۰۷/۰۱',
        updatedAt: '۱۴۰۳/۰۷/۰۴',
      },
      {
        id: 'opp_3',
        title: 'خرید ویلای گل‌سنگ توسط حاج علیرضا اکبری',
        clientId: 'cli_3',
        clientName: 'حاج علیرضا اکبری',
        client: (clients.find((c) => c.id === 'cli_3') || {
          id: 'cli_3',
          fullName: 'حاج علیرضا اکبری',
          name: 'حاج علیرضا اکبری',
          mobile: '۰۹۱۲۷۷۷۸۸۹۹',
          phone: '۰۹۱۲۷۷۷۸۸۹۹',
          role: 'investor',
          status: 'negotiation',
          desiredDealType: 'sale',
          ownerId: 'usr_102',
          privacyState: 'private',
          agentId: 'usr_102',
          createdAt: '۱۴۰۳/۰۶/۲۰',
        }) as Client,
        propertyId: 'prop_3',
        propertyTitle: 'ویلای ۴۵۰ متری نیاوران',
        property: (properties.find((p) => p.id === 'prop_3') || {
          id: 'prop_3',
          code: '1003',
          title: 'ویلای ۴۵۰ متری باغ‌مستقل، نیاوران گل‌سنگ',
          dealType: 'sale',
          propertyType: 'villa',
          price: 85_000_000_000,
          totalPrice: 85_000_000_000,
          area: 450,
          bedrooms: 4,
          district: 'نیاوران',
          neighborhood: 'نیاوران',
          city: 'تهران',
          address: 'نیاوران، خیابان گل‌سنگ',
          ownerId: 'usr_102',
          agentId: 'usr_102',
          privacyState: 'private',
          status: 'active',
          availabilityStatus: 'available',
          features: ['استخر', 'سونا', 'حیاط مشجر'],
          images: [],
          media: [],
          createdAt: '۱۴۰۳/۰۶/۲۹',
          updatedAt: '۱۴۰۳/۰۷/۰۳',
        }) as Property,
        matchScore: 88,
        stage: 'visit_scheduled',
        status: 'active',
        priority: 'medium',
        nextAction: 'بازدید اول با حضور خانواده آقای اکبری',
        nextFollowUp: 'پنج‌شنبه ساعت ۱۱:۳۰',
        owner: { id: 'usr_102', name: 'سارا امینی' },
        ownerId: 'usr_102',
        agentId: 'usr_102',
        agentName: 'سارا امینی',
        privacyState: 'private',
        estimatedValue: 85_000_000_000,
        estimatedCommission: 425_000_000,
        notes: 'خانواده متقاضی ویلای مشجر با آرامش هستند.',
        createdAt: '۱۴۰۳/۰۶/۲۹',
        updatedAt: '۱۴۰۳/۰۷/۰۳',
      },
    ];

    return opps;
  },
};
