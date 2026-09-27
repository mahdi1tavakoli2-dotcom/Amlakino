import { CollaborationRequest, User, Notification } from '../types';
import { storageService } from './storageService';
import { auditService } from './auditService';

const STORAGE_KEY = 'amlakino_collaboration_requests_v2';

// 7-day default expiration helper
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
    expiresAt: getDefaultExpirationDate(-2), // Past expiration date, but status was accepted before
    createdAt: '۱۴۰۳/۰۶/۲۸',
    respondedAt: '۱۴۰۳/۰۶/۲۹',
  },
];

function getStoredRequests(): CollaborationRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialCollaborationRequests));
      return initialCollaborationRequests;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading collaboration requests:', e);
    return initialCollaborationRequests;
  }
}

function saveStoredRequests(list: CollaborationRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving collaboration requests:', e);
  }
}

export const collaborationService = {
  /**
   * Retrieves all collaboration requests accessible to the user.
   * Agents only see requests where they are sender or receiver.
   * Auto-expires pending requests past their 7-day expiration date.
   */
  async getRequests(currentUser?: User | null): Promise<CollaborationRequest[]> {
    const user = currentUser || (await storageService.getCurrentUser());
    if (!user) return [];

    let list = getStoredRequests();
    const now = new Date().getTime();
    let hasChanges = false;

    // Check expiration for pending requests
    list = list.map((req) => {
      const isPending = req.status === 'pending' || req.status === 'Pending';
      if (isPending && req.expiresAt) {
        const expTime = new Date(req.expiresAt).getTime();
        if (!isNaN(expTime) && expTime <= now) {
          hasChanges = true;
          return {
            ...req,
            status: 'expired' as const,
          };
        }
      }
      return req;
    });

    if (hasChanges) {
      saveStoredRequests(list);
    }

    if (user.role === 'agent') {
      return list.filter((r) => r.senderId === user.id || r.receiverId === user.id);
    }

    if (user.role === 'manager' || user.role === 'admin') {
      // Manager sees team collaboration requests for KPI overview
      return list.filter((r) =>
        user.teamId ? r.senderTeamId === user.teamId || r.receiverTeamId === user.teamId : true
      );
    }

    return [];
  },

  /**
   * Sends a collaboration request for a discovered match.
   * Default expiration: 7 days.
   */
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
    const list = getStoredRequests();

    // Check if an active pending or accepted request already exists
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
      expiresAt: getDefaultExpirationDate(7), // 7-day default expiration mandate
      createdAt: '۱۴۰۳/۰۷/۰۴',
    };

    list.unshift(newReq);
    saveStoredRequests(list);

    // Create notification for receiver
    const notifications = await storageService.getNotifications();
    notifications.unshift({
      id: `notif_collab_${Date.now()}`,
      userId: params.receiverId,
      title: 'درخواست همکاری جدید',
      message: `${params.sender.fullName} درخواست همکاری برای فایل «${params.propertyTitle}» ارسال کرد.`,
      type: 'opportunity',
      read: false,
      link: '/team',
      createdAt: 'همین الان',
    });
    localStorage.setItem('amlakino_notifications_v2', JSON.stringify(notifications));

    await auditService.logEvent({
      user: params.sender,
      action: 'collaboration_requested',
      entityType: 'collaboration',
      entityId: newReq.id,
      details: `ارسال درخواست همکاری به ${params.receiverName} برای ملک ${params.propertyTitle} با ضریب تسهیم کمیسیون ${newReq.commissionSplit}`,
    });

    return newReq;
  },

  /**
   * Responds to a collaboration request (Accept or Reject).
   * Acceptance explicitly grants mutual collaboration visibility.
   */
  async respondToRequest(
    requestId: string,
    decision: 'accept' | 'reject',
    user: User
  ): Promise<CollaborationRequest> {
    const list = getStoredRequests();
    const index = list.findIndex((r) => r.id === requestId);
    if (index === -1) {
      throw new Error('درخواست همکاری یافت نشد.');
    }

    const req = list[index];

    // Authorization check
    if (req.receiverId !== user.id) {
      throw new Error('دسترسی غیرمجاز: تنها دریافت‌کننده درخواست مجاز به پاسخ‌گویی است.');
    }

    // Check expiration
    if (req.status === 'expired' || new Date(req.expiresAt).getTime() <= Date.now()) {
      req.status = 'expired';
      saveStoredRequests(list);
      throw new Error('مهلت ۷ روزه این درخواست همکاری به پایان رسیده و منقضی شده است.');
    }

    if (decision === 'accept') {
      req.status = 'accepted';
      req.collaborationGranted = true;
      req.respondedAt = '۱۴۰۳/۰۷/۰۴';

      // Notify sender
      const notifications = await storageService.getNotifications();
      notifications.unshift({
        id: `notif_collab_acc_${Date.now()}`,
        userId: req.senderId,
        title: 'درخواست همکاری پذیرفته شد!',
        message: `${user.fullName} درخواست همکاری شما برای ملک «${req.propertyTitle}» را پذیرفت. دسترسی هماهنگی معامله فعال شد.`,
        type: 'opportunity',
        read: false,
        link: '/team',
        createdAt: 'همین الان',
      });
      localStorage.setItem('amlakino_notifications_v2', JSON.stringify(notifications));

      await auditService.logEvent({
        user,
        action: 'collaboration_accepted',
        entityType: 'collaboration',
        entityId: req.id,
        details: `پذیرش درخواست همکاری ارسال‌شده از طرف ${req.senderName}. مجوز هماهنگی مشترک معامله فعال گردید.`,
      });
    } else {
      req.status = 'rejected';
      req.collaborationGranted = false;
      req.respondedAt = '۱۴۰۳/۰۷/۰۴';

      const notifications = await storageService.getNotifications();
      notifications.unshift({
        id: `notif_collab_rej_${Date.now()}`,
        userId: req.senderId,
        title: 'عدم پذیرش درخواست همکاری',
        message: `${user.fullName} درخواست همکاری برای ملک «${req.propertyTitle}» را رد کرد.`,
        type: 'opportunity',
        read: false,
        link: '/team',
        createdAt: 'همین الان',
      });
      localStorage.setItem('amlakino_notifications_v2', JSON.stringify(notifications));
    }

    list[index] = req;
    saveStoredRequests(list);
    return req;
  },

  /**
   * Cancel an outgoing pending request by sender
   */
  async cancelRequest(requestId: string, user: User): Promise<void> {
    const list = getStoredRequests();
    const req = list.find((r) => r.id === requestId);
    if (!req) return;

    if (req.senderId !== user.id) {
      throw new Error('تنها ارسال‌کننده مجاز به لغو درخواست است.');
    }

    const filtered = list.filter((r) => r.id !== requestId);
    saveStoredRequests(filtered);
  },

  /**
   * Checks whether mutual accepted collaboration visibility has been explicitly granted.
   */
  hasCollaborationAccess(userAId: string, userBId: string, propertyId?: string, clientId?: string): boolean {
    const list = getStoredRequests();
    return list.some(
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
