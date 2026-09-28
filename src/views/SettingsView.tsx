import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  User,
  Activity,
  RefreshCw,
  ShieldAlert,
  Database,
  Server,
  Key,
  Globe,
  Check,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { auditService, AuditLog } from '../services/auditService';
import {
  isSupabaseConfigured,
  getResolvedSupabaseUrl,
  getResolvedSupabaseKey,
  getRawEnvStatus,
  saveSupabaseConfig,
  clearSavedSupabaseConfig,
  testSupabaseConnection,
} from '../lib/supabase';

export const SettingsView: React.FC = () => {
  const { user, team, logout } = useAuth();
  const toast = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const envStatus = getRawEnvStatus();

  // Supabase connection state
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(getResolvedSupabaseUrl());
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(
    getResolvedSupabaseKey() || (envStatus.hasEnvKey ? 'sb_publishable_KRgQJTYSthiP1gO5U0DWbA_Y6vY06dI' : '')
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    latencyMs?: number;
  }>({
    tested: false,
    success: false,
    message: '',
  });

  const loadAuditLogs = async () => {
    const allLogs = await auditService.getLogs();
    setLogs(allLogs);
  };

  useEffect(() => {
    loadAuditLogs();
  }, [user]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult({ tested: false, success: false, message: '' });
    try {
      const res = await testSupabaseConnection(supabaseUrlInput, supabaseKeyInput);
      setTestResult({
        tested: true,
        success: res.success,
        message: res.message,
        latencyMs: res.latencyMs,
      });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      const msg = err.message || 'خطا در برقراری ارتباط با سرور';
      setTestResult({
        tested: true,
        success: false,
        message: msg,
      });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!supabaseUrlInput.trim()) {
      toast.error('لطفاً آدرس معتبر پروژه Supabase را وارد فرمایید.');
      return;
    }
    if (!supabaseKeyInput.trim()) {
      toast.error('لطفاً کلید Publishable یا Anon پروژه را وارد فرمایید.');
      return;
    }

    const res = saveSupabaseConfig(supabaseUrlInput, supabaseKeyInput);
    if (!res.success) {
      toast.error(res.message);
      return;
    }

    toast.success(res.message);
    // Test automatically after saving
    await handleTestConnection();
  };

  const handleClearConnection = () => {
    clearSavedSupabaseConfig();
    setSupabaseUrlInput(getResolvedSupabaseUrl());
    setSupabaseKeyInput(getResolvedSupabaseKey());
    setTestResult({ tested: false, success: false, message: '' });
    toast.success('تنظیمات اختصاصی پاکسازی شد و به متغیرهای سیستمی بازگشت.');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">تنظیمات و زیرساخت پایگاه داده</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          پیکربندی اتصال مستقیم به Supabase PostgreSQL، مدیریت دسترسی‌ها و مانیتورینگ امنیتی
        </p>
      </div>

      {/* Supabase Live Database Connection Manager */}
      <Card className="p-5 space-y-5 border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">اتصال زنده به پایگاه‌داده Supabase (Live Backend)</h3>
              <p className="text-xs text-slate-500">اتصال مستقیم کلاینت به PostgreSQL و جداول املاکینو</p>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0 ${
              isSupabaseConfigured()
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {isSupabaseConfigured() ? 'متصل به Supabase PostgreSQL' : 'در انتظار تنظیم آدرس معتبر پروژه'}
          </span>
        </div>

        {/* Warning if Secret Key was provided instead of HTTP URL in Environment */}
        {envStatus.isEnvUrlSecretKey && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-bold">راهنمای تصحیح آدرس اتصال Supabase:</strong>
              <p>
                مقدار <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">VITE_SUPABASE_URL</code> در تنظیمات اولیه سیستم حاوی کلید سرور (<code className="font-mono">sb_secret_...</code>) است. آدرس پایگاه‌داده باید به فرمت پروتکل HTTP باشد (مانند <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">https://your-project.supabase.co</code>).
              </p>
              <p>
                لطفاً آدرس اختصاصی پروژه Supabase خود را در فیلد زیر وارد کرده و دکمه <strong>«ذخیره و اتصال زنده»</strong> را انتخاب فرمایید.
              </p>
            </div>
          </div>
        )}

        {/* Input Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>آدرس پروژه Supabase (Project URL):</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">فرمت: https://[project-ref].supabase.co</span>
            </label>
            <input
              type="text"
              value={supabaseUrlInput}
              onChange={(e) => setSupabaseUrlInput(e.target.value)}
              placeholder="https://xyzcompany.supabase.co یا نام شناسه پروژه"
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-slate-900 text-left dir-ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span>کلید عمومی پروژه (Publishable Key / Anon Key):</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">کلید با دسترسی عمومی مجاز در فرانت‌اند</span>
            </label>
            <input
              type="password"
              value={supabaseKeyInput}
              onChange={(e) => setSupabaseKeyInput(e.target.value)}
              placeholder="sb_publishable_... یا eyJhbGciOi..."
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-slate-900 text-left dir-ltr"
            />
          </div>
        </div>

        {/* Test Result Message */}
        {testResult.tested && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
                : 'bg-rose-50 border-rose-200 text-rose-900 font-medium'
            }`}
          >
            {testResult.success ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="text-xs"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>در حال آزمایش اتصال...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>تست زنده اتصال (Ping)</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleSaveConnection}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Check className="w-3.5 h-3.5" />
              <span>ذخیره و اتصال زنده</span>
            </Button>
          </div>

          <button
            type="button"
            onClick={handleClearConnection}
            className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer"
          >
            بازنشانی به پیش‌فرض
          </button>
        </div>
      </Card>

      {/* Profile & Current Account */}
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
            <strong className="text-slate-900">{user?.fullName || 'کاربر ثبت‌نشده'}</strong>
          </div>
          <div>
            <span className="text-slate-400 text-xs block mb-0.5">شماره تلفن همراه:</span>
            <strong className="text-slate-900 font-mono">{user?.mobile || '—'}</strong>
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
            <span className="font-mono text-slate-500 text-xs">{user?.id || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs block mb-0.5">شناسه تیم (Tenant ID):</span>
            <span className="font-mono text-slate-500 text-xs">{user?.teamId || 'فاقد تیم'}</span>
          </div>
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
              <span>رمزنگاری با سالت و توکن‌های یکبار مصرف (Web Crypto & OTP)</span>
            </div>
            <p>
              احراز هویت پیامکی از طریق Edge Function اختصاصی و رمزنگاری SHA-256 هش شده و پس از تایید، نشست رسمی JWT از طریق Supabase Auth ایجاد می‌گردد.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 text-xs leading-relaxed text-slate-700 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>سیاست‌های امنیت در سطح سطر (PostgreSQL Row-Level Security)</span>
            </div>
            <p>
              در لایه مدل داده، هیچ رکوردی بدون بررسی شناسه مالک (<code className="font-mono bg-slate-200 px-1 py-0.5 rounded">owner_id</code>) یا تطابق تیم سازمانی لود نمی‌شود. شماره تماس متقاضیان و مالکین برای همکاران و مدیران ماسک می‌گردد.
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
          تمامی رویدادهای ورود، خروج و تغییر سطح محرمانگی فایل‌ها به صورت تغییرناپذیر (Append-Only) در جدول <code className="font-mono">audit_logs</code> ذخیره می‌شوند:
        </p>

        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              هنوز رویدادی ثبت نشده است. پس از ورود به سیستم، وقایع امنیتی به طور زنده در این بخش نمایش می‌یابند.
            </div>
          ) : (
            logs.map((log) => (
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
                </div>
              </div>
            ))
          )}
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
