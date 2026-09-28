import { AuditLog, AuditAction, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type { AuditLog, AuditAction };

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
];

const memAuditLogs: AuditLog[] = [...initialAuditLogs];

class AuditService {
  public async logEvent(params: {
    user: { id: string; fullName: string; role: UserRole; teamId?: string };
    action: AuditAction;
    entityType?: 'property' | 'client' | 'opportunity' | 'team' | 'invitation' | 'collaboration' | 'auth';
    entityId?: string;
    details?: string;
    ipAddress?: string;
  }): Promise<AuditLog> {
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

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('audit_logs').insert({
          user_id: params.user.id.startsWith('usr_') ? null : params.user.id,
          user_name: params.user.fullName,
          user_role: params.user.role,
          team_id: params.user.teamId?.startsWith('team_') ? null : params.user.teamId,
          action: params.action,
          entity_type: params.entityType,
          entity_id: params.entityId,
          details: params.details,
          ip_address: params.ipAddress || '127.0.0.1',
        });
      } catch (err: any) {
        console.warn('Supabase audit log insert error:', err.message);
      }
    }

    memAuditLogs.unshift(newLog);
    if (memAuditLogs.length > 200) memAuditLogs.length = 200;
    return newLog;
  }

  public async getLogs(filter?: {
    userId?: string;
    teamId?: string;
    action?: AuditAction;
  }): Promise<AuditLog[]> {
    if (isSupabaseConfigured()) {
      try {
        let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
        if (filter?.userId) q = q.eq('user_id', filter.userId);
        if (filter?.teamId) q = q.eq('team_id', filter.teamId);
        if (filter?.action) q = q.eq('action', filter.action);
        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            userId: d.user_id || 'system',
            userName: d.user_name,
            userRole: d.user_role,
            teamId: d.team_id,
            action: d.action,
            entityType: d.entity_type,
            entityId: d.entity_id,
            details: d.details,
            ipAddress: d.ip_address,
            createdAt: d.created_at,
          }));
        }
      } catch (e) {
        console.warn('Supabase getLogs error:', e);
      }
    }

    let logs = memAuditLogs;
    if (filter?.userId) logs = logs.filter((l) => l.userId === filter.userId);
    if (filter?.teamId) logs = logs.filter((l) => l.teamId === filter.teamId);
    if (filter?.action) logs = logs.filter((l) => l.action === filter.action);
    return logs;
  }
}

export const auditService = new AuditService();
