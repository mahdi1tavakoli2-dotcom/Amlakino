import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
  UserCheck,
  Briefcase,
  FileText,
} from 'lucide-react';
import { securityTestService } from '../../services/securityTestService';
import { storageService } from '../../services/storageService';
import { authzService } from '../../services/authzService';
import { SecurityTestResult, User } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';
import { toPersianDigits } from '../../utils/formatters';

interface SecurityTestSuiteModalProps {
  currentUser: User;
  onUserUpdated?: () => void;
}

export const SecurityTestSuiteModal: React.FC<SecurityTestSuiteModalProps> = ({
  currentUser,
  onUserUpdated,
}) => {
  const toast = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<SecurityTestResult[]>([]);
  const [totalPassed, setTotalPassed] = useState<number | null>(null);
  const [totalFailed, setTotalFailed] = useState<number | null>(null);

  // 30-Day Grace Period Simulator State
  const [simulatedMode, setSimulatedMode] = useState<string>(currentUser.agentMode || 'team_member');
  const [simulatingGrace, setSimulatingGrace] = useState(false);

  const runTests = async () => {
    try {
      setIsRunning(true);
      const res = await securityTestService.runAllTests();
      setTestResults(res.results);
      setTotalPassed(res.totalPassed);
      setTotalFailed(res.totalFailed);

      if (res.allPassed) {
        toast.success(`تمام ${toPersianDigits(res.results.length)} آزمون حریم خصوصی و امنیت با موفقیت پاس شدند!`);
      } else {
        toast.error(`${toPersianDigits(res.totalFailed)} مورد نقض امنیتی کشف شد!`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error('خطا در اجرای آزمون‌های امنیتی');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSimulateGraceExpiry = async (expireNow: boolean) => {
    try {
      setSimulatingGrace(true);
      const updated = await storageService.simulateGracePeriodExpiry(currentUser.id, expireNow);
      setSimulatedMode(updated.agentMode || 'team_member');
      toast.info(
        expireNow
          ? 'شبیه‌سازی: مهلت ۳۰ روزه منقضی شد. سیستم به حالت فقط خواندنی (Read-Only) منتقل شد.'
          : 'شبیه‌سازی: مهلت ۳۰ روزه ریست و تمدید شد.'
      );
      onUserUpdated?.();
    } catch (err: any) {
      toast.error(err.message || 'خطا در شبیه‌سازی');
    } finally {
      setSimulatingGrace(false);
    }
  };

  const handleSimulateSubscription = async (status: 'active' | 'none') => {
    try {
      setSimulatingGrace(true);
      const updated = await storageService.updateSubscriptionStatus(currentUser.id, status);
      setSimulatedMode(updated.agentMode || 'team_member');
      toast.success(
        status === 'active'
          ? 'اشتراک مستقل مشاور فعال شد (دسترسی کامل ثبت و ویرایش).'
          : 'اشتراک لغو شد.'
      );
      onUserUpdated?.();
    } catch (err: any) {
      toast.error(err.message || 'خطا در تغییر وضعیت اشتراک');
    } finally {
      setSimulatingGrace(false);
    }
  };

  const readOnlyCheck = authzService.canCreateOrEdit(currentUser);

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                موتور آزمون خودکار امنیت، تفکیک داده و حریم خصوصی (Security Verification Suite)
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                اعتبارسنجی صفر-اعتماد (Zero-Trust) لایه سرویس در برابر نشت داده میان مشاوران، مدیر دپارتمان و انقضای مهلت ۳۰ روزه
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={runTests}
            isLoading={isRunning}
            rightIcon={<Play className="w-4 h-4 fill-current" />}
            className="shrink-0"
          >
            اجرای آزمون کامل امنیتی
          </Button>
        </div>

        {totalPassed !== null && (
          <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 bg-slate-800/80 rounded-xl">
              <span className="text-[11px] text-slate-400 block">کل آزمون‌ها</span>
              <span className="text-base font-extrabold text-white">
                {toPersianDigits(testResults.length)}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl">
              <span className="text-[11px] text-emerald-400 block">موفق (Passed)</span>
              <span className="text-base font-extrabold text-emerald-400">
                {toPersianDigits(totalPassed)}
              </span>
            </div>
            <div className="p-2.5 bg-rose-950/40 border border-rose-800/50 rounded-xl">
              <span className="text-[11px] text-rose-400 block">ناموفق (Failed)</span>
              <span className="text-base font-extrabold text-rose-400">
                {toPersianDigits(totalFailed || 0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 30-Day Grace Period & Read-Only Mode Architecture Simulator */}
      <Card className="p-5 border-slate-200/90 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              معماری مهلت ۳۰ روزه خروج از تیم و حالت فقط‌خواندنی (Read-Only Mode)
            </h3>
          </div>
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              readOnlyCheck.allowed
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {readOnlyCheck.allowed ? 'دسترسی کامل (مجاز به ثبت و ویرایش)' : 'حالت فقط خواندنی (Read-Only)'}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          هنگامی که مشاوری از دپارتمان خارج می‌شود، طبق قانون مالکیت مطلق، ۱۰۰٪ فایل‌ها و متقاضیان نزد وی باقی می‌مانند. مشاور ۳۰ روز مهلت دارد تا نرم‌افزار را رایگان استفاده کند. پس از ۳۰ روز اگر پلن اشتراک مستقل تهیه نکند، سیستم وی بدون حذف اطلاعات به حالت <span className="font-bold text-rose-700">فقط‌خواندنی (Read-Only)</span> منتقل شده و ثبت یا ویرایش فایل جدید در لایه سرویس مسدود می‌گردد.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <span className="text-[10px] text-slate-400 block">وضعیت فعلی حساب شما:</span>
            <span className="font-bold text-slate-800">
              {currentUser.teamId ? 'عضو دپارتمان' : 'مشاور مستقل / خارج از دپارتمان'}
            </span>
            <div className="text-[11px] text-slate-500">
              مهلت انتقال: {currentUser.gracePeriodEndsAt ? 'تنظیم‌شده' : 'عضو فعال تیم'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <span className="text-[10px] text-slate-400 block">وضعیت اشتراک مستقل:</span>
            <span className="font-bold text-emerald-700">
              {currentUser.subscriptionStatus === 'active' ? 'دارای اشتراک فعال' : 'بدون اشتراک مستقل'}
            </span>
            <div className="text-[11px] text-slate-500">
              حالت کاربری: {currentUser.agentMode || 'عادی'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 block">آزمایش زنده معماری:</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] flex-1 text-rose-700 border-rose-200 hover:bg-rose-50"
                onClick={() => handleSimulateGraceExpiry(true)}
                isLoading={simulatingGrace}
              >
                انقضای مهلت ۳۰ روزه
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] flex-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                onClick={() => handleSimulateSubscription('active')}
                isLoading={simulatingGrace}
              >
                خرید اشتراک مستقل
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Test Results Display */}
      {testResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>نتایج ارزیابی برنامه‌ای پروتکل‌های امنیتی (Programmatic Assertions)</span>
          </h3>

          <div className="space-y-3">
            {testResults.map((t) => (
              <Card
                key={t.id}
                className={`p-4 sm:p-5 space-y-2.5 border transition-all ${
                  t.passed
                    ? 'border-emerald-200/90 bg-white hover:border-emerald-300'
                    : 'border-rose-300 bg-rose-50/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {t.id}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">{t.title}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {toPersianDigits(t.executionTimeMs)} میلی‌ثانیه
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        t.passed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {t.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{t.passed ? 'تایید شد (PASSED)' : 'رد شد (FAILED)'}</span>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600">{t.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-bold">اقدام شبیه‌سازی‌شده:</span>
                    <p className="text-slate-700 text-[11px]">{t.attemptedAction}</p>
                    <span className="text-[10px] text-emerald-700 block font-bold pt-0.5">نتیجه مورد انتظار:</span>
                    <p className="text-slate-600 text-[11px]">{t.expectedOutcome}</p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-bold">نتیجه واقعی در لایه سرویس:</span>
                    <p className="text-slate-800 text-[11px] font-medium">{t.actualOutcome}</p>
                    <span className="text-[10px] text-blue-700 block font-bold pt-0.5">آسیب‌پذیری مهار شده:</span>
                    <p className="text-blue-900 text-[11px]">{t.vulnerabilityPrevented}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
