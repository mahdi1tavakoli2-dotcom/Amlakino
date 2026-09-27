import { AuditLog, AuditAction, UserRole, User } from '../types';

export type { AuditLog, AuditAction };

const AUDIT_LOGS_STORAGE_KEY = 'amlakino_audit_logs_v1';

const initialAuditLogs: AuditLog[] = [
  {
    id: 'aud_1',
    userId: 'usr_101',
    userName: 'مهدی رضایی',
    userRole: 'agent',
    teamId: 'team_01',
    action: 'login',
    entityType: 'auth',
    details: 'ورود موفق به سامانه با شماره ۰۹۱۲۱۱۱۴۳۲۱',
    ipAddress: '192.168.1.45',
    createdAt: '۱۴۰۳/۰۷/۰۴ - ۱۰:۱۵',
  },
  {
    id: 'aud_2',
    userId: 'usr_101',
    userName: 'مهدی رضایی',
    userRole: 'agent',
    teamId: 'team_01',
    action: 'property_created',
    entityType: 'property',
    entityId: 'prop_1',
    details: 'ثبت فایل اختصاصی جدید با کد AML-1042 (صراف‌های جنوبی)',
    ipAddress: '192.168.1.45',
    createdAt: '۱۴۰۳/۰۷/۰۴ - ۱۱:۳۰',
  },
  {
    id: 'aud_3',
    userId: 'usr_101',
    userName: 'مهدی رضایی',
    userRole: 'agent',
    teamId: 'team_01',
    action: 'client_created',
    entityType: 'client',
    entityId: 'cli_1',
    details: 'ثبت پرونده خریدار نقدی (وضعیت داده: شخصی و محرمانه)',
    ipAddress: '192.168.1.45',
    createdAt: '۱۴۰۳/۰۷/۰۴ - ۱۲:۰۰',
  },
  {
    id: 'aud_4',
    userId: 'usr_mgr_1',
    userName: 'علیرضا تهرانی',
    userRole: 'manager',
    teamId: 'team_01',
    action: 'login',
    entityType: 'auth',
    details: 'ورود مدیر دپارتمان به پنل مدیریتی',
    ipAddress: '192.168.1.10',
    createdAt: '۱۴۰۳/۰۷/۰۴ - ۱۳:۰۰',
  },
  {
    id: 'aud_5',
    userId: 'usr_101',
    userName: 'مهدی رضایی',
    userRole: 'agent',
    teamId: 'team_01',
    action: 'property_shared',
    entityType: 'property',
    entityId: 'prop_2',
    details: 'اشتراک‌گذاری فایل ۱۱۰ متری بلوار فرهنگ با همکاران دپارتمان جهت کمیسیون مشترک',
    ipAddress: '192.168.1.45',
    createdAt: '۱۴۰۳/۰۷/۰۴ - ۱۴:۲۰',
  },
];

class AuditService {
  private getStoredLogs(): AuditLog[] {
    try {
      const data = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
      if (!data) {
        localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(initialAuditLogs));
        return initialAuditLogs;
      }
      return JSON.parse(data);
    } catch {
      return initialAuditLogs;
    }
  }

  private saveLogs(logs: AuditLog[]): void {
    try {
      localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save audit logs:', e);
    }
  }

  public async logEvent(params: {
    user: { id: string; fullName: string; role: UserRole; teamId?: string };
    action: AuditAction;
    entityType?: 'property' | 'client' | 'opportunity' | 'team' | 'invitation' | 'collaboration' | 'auth';
    entityId?: string;
    details?: string;
    ipAddress?: string;
  }): Promise<AuditLog> {
    const logs = this.getStoredLogs();
    const now = new Date();
    const dateStr = now.toLocaleDateString('fa-IR') + ' - ' + now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    const newLog: AuditLog = {
      id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      userId: params.user.id,
      userName: params.user.fullName,
      userRole: params.user.role,
      teamId: params.user.teamId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details || '',
      ipAddress: params.ipAddress || '127.0.0.1',
      createdAt: dateStr,
    };

    logs.unshift(newLog);
    // Keep last 500 audit entries
    if (logs.length > 500) {
      logs.length = 500;
    }
    this.saveLogs(logs);
    return newLog;
  }

  public async getLogs(filter?: {
    userId?: string;
    teamId?: string;
    action?: AuditAction;
  }): Promise<AuditLog[]> {
    let logs = this.getStoredLogs();
    if (filter?.userId) {
      logs = logs.filter((l) => l.userId === filter.userId);
    }
    if (filter?.teamId) {
      logs = logs.filter((l) => l.teamId === filter.teamId);
    }
    if (filter?.action) {
      logs = logs.filter((l) => l.action === filter.action);
    }
    return logs;
  }
}

export const auditService = new AuditService();
