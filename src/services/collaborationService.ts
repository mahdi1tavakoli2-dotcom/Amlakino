import { CollaborationRequest, User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { storageService } from './storageService';
import { auditService } from './auditService';

function getDefaultExpirationDate(days = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const initialCollaborationRequests: CollaborationRequest[] = [
  {
    id: 'collab_req_1',
    senderId: 'usr_102',
    senderName: 'سارا امینی',
    senderTeamId: 'team_tehran_1',
    senderTeamName: 'گروه مشاورین املاک بارمان',
    receiverId: 'usr_101',
    receiverName: 'مهدی رضایی',
    receiverTeamId: 'team_tehran_1',
    propertyId: 'prop_1',
    propertyTitle: 'آپارتمان ۱۴۵ متری تک‌واحدی، صراف‌های جنوبی',
    propertyDistrict: 'سعادت‌آباد',
    clientId: 'cli_5',
    clientSummary: 'متقاضی نقد آپارتمان ۳ خوابه در سعادت‌آباد با بودجه ۲۲ تا ۲۴ میلیارد تومان',
    matchScore: 94,
    status: 'pending',
    commissionSplit: '50/50',
    notes: 'متقاضی بسیار مصمم است و شرایط پرداخت نقدی دارد. در صورت امکان بازدید هماهنگ کنیم.',
    collaborationGranted: false,
    expiresAt: getDefaultExpirationDate(5),
    createdAt: '۱۴۰۳/۰۷/۰۳',
  },
  {
    id: 'collab_req_2',
    senderId: 'usr_101',
    senderName: 'مهدی رضایی',
    senderTeamId: 'team_tehran_1',
    senderTeamName: 'گروه مشاورین املاک بارمان',
    receiverId: 'usr_102',
    receiverName: 'سارا امینی',
    receiverTeamId: 'team_tehran_1',
    propertyId: 'prop_4',
    propertyTitle: 'موقعیت اداری ۹۰ متر تابلوخور، میدان کاج',
    propertyDistrict: 'سعادت‌آباد',
    clientId: 'cli_2',
    clientSummary: 'متقاضی موقعیت اداری یا مسکونی تابلوخور در محدوده میدان کاج',
    matchScore: 88,
    status: 'accepted',
    commissionSplit: '50/50',
    notes: 'پزشک متخصص برای مطب به دنبال واحد است.',
    collaborationGranted: true,
    expiresAt: getDefaultExpirationDate(-2),
    createdAt: '۱۴۰۳/۰۶/۲۸',
    respondedAt: '۱۴۰۳/۰۶/۲۹',
  },
];

const memCollabRequests: CollaborationRequest[] = [...initialCollaborationRequests];

export const collaborationService = {
  /**
   * Retrieves all collaboration requests accessible to the user.
   * Agents only see requests where they are sender or receiver.
   */
  async getRequests(currentUser?: User | null): Promise<CollaborationRequest[]> {
    const user = currentUser || (await storageService.getCurrentUser());
    if (!user) return [];

    let list: CollaborationRequest[] = [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('collaboration_requests').select('*');
        if (!error && data) {
          list = data.map((d: any) => ({
            id: d.id,
            senderId: d.sender_id,
            senderName: d.sender_name,
            senderTeamId: d.sender_team_id,
            senderTeamName: d.sender_team_name,
            receiverId: d.receiver_id,
            receiverName: d.receiver_name,
            receiverTeamId: d.receiver_team_id,
            propertyId: d.property_id,
            propertyTitle: d.property_title,
            propertyDistrict: d.property_district,
            clientId: d.client_id,
            clientSummary: d.client_summary,
            matchScore: d.match_score,
            status: d.status,
            commissionSplit: d.commission_split,
            notes: d.notes,
            collaborationGranted: d.collaboration_granted,
            expiresAt: d.expires_at,
            respondedAt: d.responded_at,
            createdAt: d.created_at,
          }));
        } else {
          list = memCollabRequests;
        }
      } catch {
        list = memCollabRequests;
      }
    } else {
      list = memCollabRequests;
    }

    const now = Date.now();
    list = list.map((req) => {
      const isPending = req.status === 'pending' || req.status === 'Pending';
      if (isPending && req.expiresAt) {
        const expTime = new Date(req.expiresAt).getTime();
        if (!isNaN(expTime) && expTime <= now) {
          return { ...req, status: 'expired' as const };
        }
      }
      return req;
    });

    if (user.role === 'agent') {
      return list.filter((r) => r.senderId === user.id || r.receiverId === user.id);
    }

    if (user.role === 'manager' || user.role === 'admin') {
      return list.filter((r) =>
        user.teamId ? r.senderTeamId === user.teamId || r.receiverTeamId === user.teamId : true
      );
    }

    return [];
  },

  async sendRequest(params: {
    sender: User;
    receiverId: string;
    receiverName: string;
    receiverTeamId?: string;
    propertyId: string;
    propertyTitle: string;
    propertyDistrict?: string;
    clientId: string;
    clientSummary: string;
    matchScore: number;
    commissionSplit?: string;
    notes?: string;
  }): Promise<CollaborationRequest> {
    const list = await this.getRequests(params.sender);

    const existing = list.find(
      (r) =>
        r.senderId === params.sender.id &&
        r.receiverId === params.receiverId &&
        r.propertyId === params.propertyId &&
        r.clientId === params.clientId &&
        (r.status === 'pending' || r.status === 'accepted')
    );

    if (existing) {
      throw new Error('درخواست همکاری فعال برای این تطابق قبلاً ثبت شده است.');
    }

    const team = await storageService.getTeam();

    const newReq: CollaborationRequest = {
      id: `collab_${Date.now()}`,
      senderId: params.sender.id,
      senderName: params.sender.fullName,
      senderTeamId: params.sender.teamId || team.id,
      senderTeamName: team.name,
      receiverId: params.receiverId,
      receiverName: params.receiverName,
      receiverTeamId: params.receiverTeamId || team.id,
      propertyId: params.propertyId,
      propertyTitle: params.propertyTitle,
      propertyDistrict: params.propertyDistrict,
      clientId: params.clientId,
      clientSummary: params.clientSummary,
      matchScore: params.matchScore,
      status: 'pending',
      commissionSplit: params.commissionSplit || '50/50',
      notes: params.notes,
      collaborationGranted: false,
      expiresAt: getDefaultExpirationDate(7),
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('collaboration_requests').insert({
          sender_id: newReq.senderId,
          sender_name: newReq.senderName,
          sender_team_id: newReq.senderTeamId,
          sender_team_name: newReq.senderTeamName,
          receiver_id: newReq.receiverId,
          receiver_name: newReq.receiverName,
          receiver_team_id: newReq.receiverTeamId,
          property_id: newReq.propertyId,
          property_title: newReq.propertyTitle,
          property_district: newReq.propertyDistrict,
          client_id: newReq.clientId,
          client_summary: newReq.clientSummary,
          match_score: newReq.matchScore,
          status: newReq.status,
          commission_split: newReq.commissionSplit,
          notes: newReq.notes,
          collaboration_granted: false,
          expires_at: newReq.expiresAt,
        }).select().single();
        if (data) newReq.id = data.id;

        await supabase.from('notifications').insert({
          user_id: params.receiverId,
          title: 'درخواست همکاری جدید',
          message: `${params.sender.fullName} درخواست همکاری برای فایل «${params.propertyTitle}» ارسال کرد.`,
          type: 'opportunity',
          link: '/team',
        });
      } catch (err: any) {
        console.warn('Supabase collab insert error:', err.message);
        memCollabRequests.unshift(newReq);
      }
    } else {
      memCollabRequests.unshift(newReq);
    }

    await auditService.logEvent({
      user: params.sender,
      action: 'collaboration_requested',
      entityType: 'collaboration',
      entityId: newReq.id,
      details: `ارسال درخواست همکاری به ${params.receiverName} برای ملک ${params.propertyTitle} با ضریب تسهیم کمیسیون ${newReq.commissionSplit}`,
    });

    return newReq;
  },

  async respondToRequest(
    requestId: string,
    decision: 'accept' | 'reject',
    user: User
  ): Promise<CollaborationRequest> {
    const list = await this.getRequests(user);
    const req = list.find((r) => r.id === requestId);
    if (!req) {
      throw new Error('درخواست همکاری یافت نشد.');
    }

    if (req.receiverId !== user.id) {
      throw new Error('دسترسی غیرمجاز: تنها دریافت‌کننده درخواست مجاز به پاسخ‌گویی است.');
    }

    if (req.status === 'expired' || new Date(req.expiresAt).getTime() <= Date.now()) {
      throw new Error('مهلت ۷ روزه این درخواست همکاری به پایان رسیده و منقضی شده است.');
    }

    const newStatus = decision === 'accept' ? 'accepted' : 'rejected';
    const granted = decision === 'accept';
    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured()) {
      await supabase
        .from('collaboration_requests')
        .update({
          status: newStatus,
          collaboration_granted: granted,
          responded_at: nowIso,
        })
        .eq('id', requestId);

      await supabase.from('notifications').insert({
        user_id: req.senderId,
        title: decision === 'accept' ? 'درخواست همکاری پذیرفته شد!' : 'عدم پذیرش درخواست همکاری',
        message: decision === 'accept'
          ? `${user.fullName} درخواست همکاری شما برای ملک «${req.propertyTitle}» را پذیرفت. دسترسی هماهنگی معامله فعال شد.`
          : `${user.fullName} درخواست همکاری برای ملک «${req.propertyTitle}» را رد کرد.`,
        type: 'opportunity',
        link: '/team',
      });
    } else {
      const idx = memCollabRequests.findIndex((r) => r.id === requestId);
      if (idx !== -1) {
        memCollabRequests[idx] = { ...req, status: newStatus, collaborationGranted: granted, respondedAt: nowIso };
      }
    }

    req.status = newStatus;
    req.collaborationGranted = granted;
    req.respondedAt = nowIso;

    await auditService.logEvent({
      user,
      action: decision === 'accept' ? 'collaboration_accepted' : 'collaboration_requested',
      entityType: 'collaboration',
      entityId: req.id,
      details: decision === 'accept'
        ? `پذیرش درخواست همکاری ارسال‌شده از طرف ${req.senderName}. مجوز هماهنگی مشترک معامله فعال گردید.`
        : `عدم پذیرش درخواست همکاری ${req.senderName}`,
    });

    return req;
  },

  async cancelRequest(requestId: string, user: User): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('collaboration_requests').delete().eq('id', requestId).eq('sender_id', user.id);
    } else {
      const idx = memCollabRequests.findIndex((r) => r.id === requestId && r.senderId === user.id);
      if (idx !== -1) memCollabRequests.splice(idx, 1);
    }
  },

  hasCollaborationAccess(userAId: string, userBId: string, propertyId?: string, clientId?: string): boolean {
    return memCollabRequests.some(
      (r) =>
        r.status === 'accepted' &&
        r.collaborationGranted &&
        ((r.senderId === userAId && r.receiverId === userBId) ||
          (r.senderId === userBId && r.receiverId === userAId)) &&
        (!propertyId || r.propertyId === propertyId) &&
        (!clientId || r.clientId === clientId)
    );
  },
};
