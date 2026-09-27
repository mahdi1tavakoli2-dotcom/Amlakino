import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Download,
  Lock,
  CheckCircle2,
  Building,
  User,
  Phone,
  Activity,
  UserCheck,
  RefreshCw,
  Key,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { auditService, AuditLog } from '../services/auditService';
import { toPersianDigits } from '../utils/formatters';

export const SettingsView: React.FC = () => {
  const { user, team, switchDemoUser, logout } = useAuth();
  const toast = useToast();

  const [maskOwnerPhone, setMaskOwnerPhone] = useState(true);
  const [allowExport, setAllowExport] = useState(true);
  const [autoMatchNotification, setAutoMatchNotification] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const loadAuditLogs = async () => {
    const allLogs = await auditService.getLogs();
    setLogs(allLogs);
  };

  useEffect(() => {
    loadAuditLogs();
  }, [user]);

  const handleExport = () => {
    toast.success('خروجی امن داده‌ها با استاندارد رمزنگاری آماده دانلود شد.');
  };

  const handleSwitchUser = async (userId: string, label: string) => {
    try {
      await switchDemoUser(userId);
      toast.success(`جابجایی به حساب کاربری: ${label}`);
      loadAuditLogs();
    } catch {
      toast.error('خطا در تغییر حساب');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">تنظیمات و امنیت سامانه</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          پیکربندی امنیت، مانیتورینگ رویدادهای سیستمی (Audit Logs) و تغییر نقش آزمایشی
        </p>
      </div>

      {/* Profile & Current Role */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <span>اطلاعات حساب کاربری فعال</span>
          </h3>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              user?.role === 'manager'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {user?.role === 'manager' ? 'مدیر دپارتمان (Manager)' : 'مشاور املاک (Agent)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs sm:text-sm">
          <div>
            <span className="text-slate-400 text-xs block mb-0.5">نام و نام خانوادگی:</span>
            <strong className="text-slate-900">{user?.fullName}</strong>
          </div>
          <div>
            <span className="text-slate-400 text-xs block mb-0.5">شماره تلفن همراه:</span>
            <strong className="text-slate-900 font-mono">{user?.mobile}</strong>
          </div>
          <div>
            <span className="text-slate-400 text-xs block mb-0.5">دپارتمان متبوع:</span>
            <strong className="text-slate-900">{team?.name || 'مستقل'}</strong>
          </div>
          <div>
            <span className="text-slate-400 text-xs block mb-0.5">کد پروانه فعالیت:</span>
            <span className="font-mono text-slate-700">{user?.licenseCode || 'در دست بررسی'}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs block mb-0.5">شناسه کاربری پایگاه‌داده:</span>
            <span className="font-mono text-slate-500 text-xs">{user?.id}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs block mb-0.5">شناسه تیم (Tenant ID):</span>
            <span className="font-mono text-slate-500 text-xs">{user?.teamId || 'فاقد تیم'}</span>
          </div>
        </div>
      </Card>

      {/* Fast RBAC Switcher for Evaluation */}
      <Card className="p-5 space-y-3 bg-slate-50/70 border-emerald-200/60">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            <span>تغییر سریع کاربر برای تست دسترسی‌ها (RBAC Testing):</span>
          </h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          برای بررسی و اطمینان از تفکیک کامل دسترسی‌ها (ایزوله‌سازی فایل‌های مشاوران، ماسک‌شدن شماره تماس خریداران و مالکین برای مدیر، و حفظ مالکیت داده‌ها)، کاربر فعال را با ۱ کلیک تغییر دهید:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleSwitchUser('usr_101', 'مهدی رضایی (مشاور)')}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              user?.id === 'usr_101'
                ? 'bg-emerald-100/60 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="text-xs font-bold">مهدی رضایی (مشاور ۱)</div>
            <div className="text-[10px] text-slate-500 mt-1">مالک آپارتمان صراف‌ها و نیاوران</div>
            <span className="mt-2 inline-block px-1.5 py-0.2 text-[9px] font-mono font-bold bg-emerald-200 text-emerald-900 rounded">
              AGENT
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchUser('usr_mgr_1', 'علیرضا تهرانی (مدیر دپارتمان)')}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              user?.id === 'usr_mgr_1'
                ? 'bg-blue-100/60 border-blue-500 text-blue-950 font-bold ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="text-xs font-bold">علیرضا تهرانی (مدیر)</div>
            <div className="text-[10px] text-slate-500 mt-1">داشبورد نظارتی و شماره‌های محافظت‌شده</div>
            <span className="mt-2 inline-block px-1.5 py-0.2 text-[9px] font-mono font-bold bg-blue-200 text-blue-900 rounded">
              MANAGER
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchUser('usr_102', 'سارا امینی (مشاور ۲)')}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              user?.id === 'usr_102'
                ? 'bg-purple-100/60 border-purple-500 text-purple-950 font-bold ring-2 ring-purple-500/20'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="text-xs font-bold">سارا امینی (مشاور ۲)</div>
            <div className="text-[10px] text-slate-500 mt-1">مالک دفتر میدان کاج و عدم دسترسی به مشتریان مشاور ۱</div>
            <span className="mt-2 inline-block px-1.5 py-0.2 text-[9px] font-mono font-bold bg-purple-200 text-purple-900 rounded">
              AGENT
            </span>
          </button>
        </div>
      </Card>

      {/* PRIVACY FIRST & DATA OWNERSHIP */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>اصول بنیادین امنیت داده‌ها و انطباق حریم‌خصوصی</span>
          </h3>
          <a
            href="#/security-tests"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = '/security-tests';
            }}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>مشاهده آزمایشگاه تست زنده نفوذ و RBAC</span>
          </a>
        </div>

        <div className="space-y-3">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 text-xs leading-relaxed text-slate-700 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>رمزنگاری با سالت (Salted Password Hashing)</span>
            </div>
            <p>
              رمزهای عبور با استفاده از الگوریتم SHA-256 به همراه نمک تصادفی ۱۶ بایتی (Crypto Salt) به صورت هش ذخیره شده و هیچ کلمه عبوری به صورت متن خام در هیچ بخشی از پایگاه‌داده نگهداری نمی‌شود.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 text-xs leading-relaxed text-slate-700 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>سیاست‌های امنیت در سطح سطر (PostgreSQL Row-Level Security)</span>
            </div>
            <p>
              در لایه مدل داده و سرویس‌ها، هیچ رکوردی بدون بررسی شناسه مالک (<code className="font-mono bg-slate-200 px-1 py-0.5 rounded">owner_id</code>) یا وضعیت اشتراک سازمانی لود نمی‌شود. در صورت درخواست مدیر، فیلدهای شماره تماس، یادداشت‌های پیگیری و نام مالک توسط متدهای بهداشتی‌سازی (<code className="font-mono bg-slate-200 px-1 py-0.5 rounded">Sanitization</code>) ماسک می‌گردند.
            </p>
          </div>
        </div>
      </Card>

      {/* System Audit Logs */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>ثبت وقایع امنیتی و حسابرسی (System Audit Logs)</span>
          </h3>
          <button
            type="button"
            onClick={loadAuditLogs}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>بروزرسانی وقایع</span>
          </button>
        </div>

        <p className="text-xs text-slate-500">
          تمامی رویدادهای دسترسی، ورود، تغییر سطح محرمانگی فایل‌ها و خروج از تیم جهت جلوگیری از نشت اطلاعات در لاگ سیستمی ثبت می‌شوند:
        </p>

        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{log.userName}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-400">({log.entityType})</span>
                </div>
                <p className="text-slate-600">{log.details}</p>
              </div>

              <div className="text-left shrink-0 text-[10px] text-slate-400 font-mono">
                <div>{log.createdAt}</div>
                <div>IP: {log.ipAddress}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Logout */}
      <div className="pt-2 flex justify-end">
        <Button variant="danger" onClick={logout}>
          خروج از حساب کاربری
        </Button>
      </div>
    </div>
  );
};
