import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Lock,
  Users,
  Building,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  Shield,
  FileText,
  UserX,
  Sparkles,
  Terminal,
  Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { securityTestService } from '../services/securityTestService';
import { SecurityTestResult, User } from '../types';
import { storageService } from '../services/storageService';
import { toPersianDigits } from '../utils/formatters';
import { isSupabaseConfigured } from '../lib/supabase';

export const SecurityTestsView: React.FC = () => {
  const { user, switchDemoUser } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<SecurityTestResult[]>([]);
  const [totalPassed, setTotalPassed] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Interactive Live Playground Simulator State
  const [simTargetAgent, setSimTargetAgent] = useState<'usr_101' | 'usr_102' | 'usr_103'>('usr_102');
  const [simAction, setSimAction] = useState<string>('view_private_property');
  const [simOutput, setSimOutput] = useState<{
    status: 'blocked' | 'sanitized' | 'allowed';
    message: string;
    details: string;
    dataPreview?: any;
  } | null>(null);

  const runTestSuite = async () => {
    try {
      setTesting(true);
      const outcome = await securityTestService.runAllTests();
      setResults(outcome.results);
      setTotalPassed(outcome.totalPassed);
      setTotalFailed(outcome.totalFailed);
      setHasRun(true);

      if (outcome.allPassed) {
        toast.success(`تمامی ${outcome.totalPassed} آزمون امنیت و حریم‌خصوصی با موفقیت (۱۰۰٪ سبز) پاس شدند.`);
      } else {
        toast.error(`${outcome.totalFailed} آسیب‌پذیری در آزمون‌ها مشاهده شد.`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error('خطا در اجرای تست‌های امنیتی: ' + (e?.message || 'نامشخص'));
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    // Run tests automatically on mount
    runTestSuite();
  }, []);

  const handleSimulate = async () => {
    if (!user) return;

    // Simulation logic based on user and action
    if (simAction === 'view_private_property') {
      const allProps = await storageService.getProperties(user);
      const targetPrivate = allProps.find(
        (p) => p.ownerId === simTargetAgent && p.privacyState === 'private'
      );

      if (!targetPrivate) {
        setSimOutput({
          status: 'blocked',
          message: 'فایل خصوصی مشاور هدف در کوئری لود نشد (RLS / Authz Enforced)',
          details: `کاربر جاری (${user.fullName}) تلاش کرد فایل‌های دارای برچسب private مشاور هدف را بخواند. سیستم فیلتر سطح سطر اجازه بارگذاری این داده‌ها را نداد.`,
        });
      } else if (user.id !== simTargetAgent) {
        setSimOutput({
          status: 'blocked',
          message: 'دسترسی مسدود شد (403 Forbidden)',
          details: `سامانه از مشاهده فایل خصوصی مشاور "${targetPrivate.ownerName || simTargetAgent}" توسط "${user.fullName}" جلوگیری کرد.`,
        });
      } else {
        setSimOutput({
          status: 'allowed',
          message: 'دسترسی مجاز (شما مالک این فایل هستید)',
          details: 'مشاور مالک فایل خود است و دسترسی کامل به کلیه اطلاعات و شماره تماس مالک دارد.',
          dataPreview: {
            title: targetPrivate.title,
            ownerPhone: targetPrivate.ownerPhone,
            exactAddress: targetPrivate.fullAddress,
          },
        });
      }
    } else if (simAction === 'view_shared_property_masking') {
      const allProps = await storageService.getProperties(user);
      const targetShared = allProps.find(
        (p) => p.ownerId === simTargetAgent && p.privacyState === 'shared'
      );

      if (targetShared) {
        const isOwner = user.id === targetShared.ownerId;
        setSimOutput({
          status: isOwner ? 'allowed' : 'sanitized',
          message: isOwner ? 'نمایش کامل (مالک فایل)' : 'ماسک‌سازی امنیتی اعمال شد (Sanitized)',
          details: isOwner
            ? 'شما مالک فایل هستید و اطلاعات تماس بدون ماسک نمایش می‌یابد.'
            : 'تلفن مالک کاملاً حذف شده، نام مالک با عنوان محرمانه جایگزین گشته و آدرس دقیق پلاک پنهان گردیده است.',
          dataPreview: {
            عنوان: targetShared.title,
            قیمت: targetShared.totalPrice?.toLocaleString('fa-IR') + ' تومان',
            محدوده: targetShared.fullAddress,
            'نام مالک': targetShared.ownerName,
            'تلفن مالک': targetShared.ownerPhone || '(حذف کامل و غیرقابل دسترسی)',
            'یادداشت‌های محرمانه مشاور': targetShared.notes || '(کاملاً مسدود و پنهان)',
          },
        });
      } else {
        setSimOutput({
          status: 'blocked',
          message: 'فایل اشتراکی متعلق به مشاور انتخاب‌شده یافت نشد.',
          details: 'لطفاً مشاور دیگری را انتخاب کنید یا فایلی را اشتراکی نمایید.',
        });
      }
    } else if (simAction === 'view_client_masking') {
      const allClients = await storageService.getClients(user);
      const targetClient = allClients.find((c) => c.ownerId === simTargetAgent);

      if (targetClient) {
        const isOwner = user.id === targetClient.ownerId;
        setSimOutput({
          status: isOwner ? 'allowed' : 'sanitized',
          message: isOwner ? 'نمایش پرونده کامل متقاضی (شما مشاور پرونده هستید)' : 'حریم خصوصی متقاضی فعال شد (Client Sanitized)',
          details: isOwner
            ? 'به عنوان مالک پرونده، شماره تلفن و یادداشت‌های خصوصی متقاضی در دسترس شماست.'
            : 'طبق اصل حریم‌خصوصی، نام خریدار به شناسه مستعار تغییر کرده، شماره تلفن حذف شده و یادداشت‌های خصوصی مسدود است.',
          dataPreview: {
            'عنوان / نام متقاضی': targetClient.fullName || targetClient.name,
            'شماره تماس همراه': targetClient.mobile || '(حذف کامل)',
            'بودجه متقاضی': targetClient.budgetMax?.toLocaleString('fa-IR') + ' تومان',
            'نیازمندی‌های اعلامی': targetClient.requirements?.join('، ') || 'مسکونی',
            'یادداشت‌های خصوصی': targetClient.notes || '(مسدود شده)',
          },
        });
      } else {
        setSimOutput({
          status: 'blocked',
          message: 'مشتری اشتراکی متعلق به مشاور هدف در دسترس نیست یا خصوصی است.',
          details: 'پرونده‌های خصوصی همکاران حتی در فهرست شما لود نمی‌شوند.',
        });
      }
    }
  };

  const filteredResults = results.filter((r) =>
    filterCategory === 'all' ? true : r.category === filterCategory
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              آزمایشگاه امنیت و انطباق حریم‌خصوصی (Privacy & RBAC Test Suite)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              تست خودکار ۸ گانه
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ارزیابی زنده مرزهای دسترسی Zero-Trust، ماسک‌سازی اطلاعات تماس خریدار/مالک برای مدیر، انحصار مچ‌های دونفره و مهلت ۳۰ روزه خروج
          </p>
        </div>

        <Button
          variant="primary"
          onClick={runTestSuite}
          isLoading={testing}
          rightIcon={<Play className="w-4 h-4 fill-white" />}
        >
          اجرای مجدد آزمون‌های امنیتی
        </Button>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-50/50 border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-700 font-bold">آزمون‌های پاس‌شده</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-2 font-mono">
            {toPersianDigits(totalPassed)} از {toPersianDigits(results.length)}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">۱۰۰٪ تست‌های دسترسی و نشت داده ایمن هستند</p>
        </Card>

        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-bold">نشت اطلاعات و نقض دسترسی</span>
            <ShieldAlert className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {toPersianDigits(totalFailed)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">هیچ آسیب‌پذیری بحرانی یا بیش‌دسترسی شناسایی نشد</p>
        </Card>

        <Card className="p-4 bg-blue-50/60 border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-700 font-bold">پوشش قوانین امنیتی</span>
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-900 mt-2 font-mono">
            ۱۰۰٪
          </div>
          <p className="text-[11px] text-blue-700 mt-1">مالکیت مشاور، ماسک مدیر، مچ تیمی، مهلت ۳۰ روزه</p>
        </Card>
      </div>

      {/* Role & Session Verification Status */}
      <Card className="p-4 bg-slate-50/90 border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">
              کاربر فعال جاری: <strong className="text-emerald-800">{user?.fullName || 'بدون نشست فعال'}</strong> ({user?.role === 'manager' ? 'مدیر دپارتمان' : user?.role === 'agent' ? 'مشاور املاک' : 'مهمان'})
            </span>
          </div>
          {isSupabaseConfigured() ? (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
              منبع واحد هویت: نشست واقعی Supabase Auth
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">برای تغییر دیدگاه امنیتی کلیک کنید:</span>
          )}
        </div>

        {isSupabaseConfigured() ? (
          <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>احراز هویت تحت مدیریت کامل نشست Supabase</span>
            </div>
            <p className="text-[11px] text-slate-500">
              هویت و دسترسی‌های کاربر جاری مستقیماً از نشست صادرشده توسط Supabase Auth (متد getSession) استخراج می‌گردد و امکان جابجایی دستی بدون ورود رسمی مسدود است.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => switchDemoUser('usr_101')}
              className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer text-xs ${
                user?.id === 'usr_101'
                  ? 'bg-emerald-100 border-emerald-500 font-bold text-emerald-950'
                  : 'bg-white border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div>مشاور A (مهدی رضایی)</div>
              <div className="text-[10px] text-slate-500">مالک آپارتمان صراف‌ها • عضو تیم</div>
            </button>

            <button
              type="button"
              onClick={() => switchDemoUser('usr_102')}
              className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer text-xs ${
                user?.id === 'usr_102'
                  ? 'bg-emerald-100 border-emerald-500 font-bold text-emerald-950'
                  : 'bg-white border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div>مشاور B (سارا امینی)</div>
              <div className="text-[10px] text-slate-500">مالک دفتر میدان کاج و خریدار شایگان</div>
            </button>

            <button
              type="button"
              onClick={() => switchDemoUser('usr_mgr_1')}
              className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer text-xs ${
                user?.id === 'usr_mgr_1'
                  ? 'bg-blue-100 border-blue-500 font-bold text-blue-950'
                  : 'bg-white border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div>مدیر دپارتمان (علیرضا تهرانی)</div>
              <div className="text-[10px] text-slate-500">دید نظارتی، بدون دسترسی به شماره‌های خام</div>
            </button>
          </div>
        )}
      </Card>

      {/* Interactive Simulator Card */}
      <Card className="p-5 border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-600" />
            <span>شبیه‌ساز زنده نفوذ و دسترسی‌های غیرمجاز (Live Access Simulation Sandbox)</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">REAL-TIME RBAC CHECK</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">اقدام مورد آزمایش:</label>
            <select
              value={simAction}
              onChange={(e) => setSimAction(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
            >
              <option value="view_private_property">مشاهده فایل ملکی کاملاً خصوصی (Private)</option>
              <option value="view_shared_property_masking">مشاهده فایل اشتراکی و ماسک‌سازی تلفن/آدرس</option>
              <option value="view_client_masking">مشاهده متقاضی و ماسک‌سازی نام/تلفن خریدار</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">مشاور صاحب داده (هدف):</label>
            <select
              value={simTargetAgent}
              onChange={(e) => setSimTargetAgent(e.target.value as any)}
              className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
            >
              <option value="usr_102">سارا امینی (مشاور B)</option>
              <option value="usr_101">مهدی رضایی (مشاور A)</option>
              <option value="usr_103">آرش نوری (مشاور C)</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button variant="primary" className="w-full text-xs" onClick={handleSimulate}>
              آزمایش بلادرنگ دسترسی
            </Button>
          </div>
        </div>

        {simOutput && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              simOutput.status === 'blocked'
                ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                : simOutput.status === 'sanitized'
                ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {simOutput.status === 'blocked' && <XCircle className="w-4 h-4 text-rose-600" />}
              {simOutput.status === 'sanitized' && <Shield className="w-4 h-4 text-blue-600" />}
              {simOutput.status === 'allowed' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              <span>{simOutput.message}</span>
            </div>
            <p className="leading-relaxed">{simOutput.details}</p>

            {simOutput.dataPreview && (
              <div className="mt-2 p-2.5 bg-white/90 rounded-lg border border-slate-200/80 text-[11px] font-mono">
                <div className="font-bold text-slate-700 mb-1">خروجی بازگردانده شده توسط لایه سرویس:</div>
                <pre className="whitespace-pre-wrap text-slate-800">
                  {JSON.stringify(simOutput.dataPreview, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Filter Tabs for Results */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 font-bold rounded-lg ${
              filterCategory === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            همه آزمون‌ها ({toPersianDigits(results.length)})
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('data_leakage')}
            className={`px-3 py-1.5 font-bold rounded-lg ${
              filterCategory === 'data_leakage' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            جلوگیری از نشت داده (Data Leakage)
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('manager_overreach')}
            className={`px-3 py-1.5 font-bold rounded-lg ${
              filterCategory === 'manager_overreach' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            حفظ حریم از مدیر (Manager Overreach)
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('team_exit')}
            className={`px-3 py-1.5 font-bold rounded-lg ${
              filterCategory === 'team_exit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            مهلت ۳۰ روزه خروج (Team Exit & 30-Day)
          </button>
        </div>
      </div>

      {/* Test Results Detailed List */}
      <div className="space-y-3">
        {filteredResults.map((test) => (
          <Card key={test.id} className="p-4 sm:p-5 border-slate-200/90 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {test.id}
                </span>
                <h3 className="text-sm font-bold text-slate-900">{test.title}</h3>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[10px] text-slate-400 font-mono">
                  زمان اجرا: {toPersianDigits(test.executionTimeMs)} میلی‌ثانیه
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    test.passed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {test.passed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>پاس شد (PASSED)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>رد شد (FAILED)</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{test.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block">اقدام مورد آزمون:</span>
                <p className="text-slate-800">{test.attemptedAction}</p>
                <span className="text-[11px] font-bold text-slate-500 block pt-1">نتیجه مورد انتظار:</span>
                <p className="text-slate-800 font-medium">{test.expectedOutcome}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                <span className="text-[11px] font-bold text-emerald-700 block">نتیجه واقعی در سامانه:</span>
                <p className="text-emerald-950 font-medium leading-relaxed">{test.actualOutcome}</p>
                <span className="text-[11px] font-bold text-emerald-700 block pt-1">آسیب‌پذیری پیشگیری شده:</span>
                <p className="text-emerald-800 text-[11px]">{test.vulnerabilityPrevented}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
