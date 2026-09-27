import React, { useState } from 'react';
import { Building, Phone, KeyRound, ShieldCheck, UserCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useToast } from '../components/common/Toast';

export const LoginView: React.FC = () => {
  const { login, loginWithOtp, switchDemoUser, availableUsers } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [mobile, setMobile] = useState('۰۹۱۲۳۴۵۶۷۸۹');
  const [password, setPassword] = useState('123456');
  const [otpCode, setOtpCode] = useState('1234');
  const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || !password) {
      toast.error('لطفاً شماره موبایل و رمز عبور را وارد کنید.');
      return;
    }
    try {
      setLoading(true);
      await login(mobile, password);
      toast.success('ورود امن با موفقیت انجام شد');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'اطلاعات ورود نادرست است');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) {
      toast.error('لطفاً شماره موبایل معتبر وارد نمایید.');
      return;
    }
    setOtpStep('code');
    toast.info('کد یک‌بارمصرف آزمایشی: ۱۲۳۴');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await loginWithOtp(mobile, otpCode);
      toast.success('ورود با موفقیت انجام شد');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'کد تایید نادرست است');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSwitch = async (userId: string, roleName: string) => {
    try {
      setLoading(true);
      await switchDemoUser(userId);
      toast.success(`ورود با نقش: ${roleName}`);
      navigate('/dashboard');
    } catch {
      toast.error('خطا در ورود به حساب آزمایشی');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 select-none">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-md">
          <Building className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">املاکینو — AMLAKINO</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            سامانه امن مدیریت املاک و مشتریان با حفظ حریم خصوصی و مالکیت مطلق داده‌ها
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="p-6 sm:p-7 space-y-5 shadow-sm border-slate-200/90">
          {/* Auth Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setAuthMode('password')}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                authMode === 'password' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              ورود با رمز عبور
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('otp');
                setOtpStep('phone');
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                authMode === 'otp' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              پیامک یک‌بارمصرف (OTP)
            </button>
          </div>

          {authMode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <Input
                label="شماره موبایل"
                type="tel"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
              />

              <Input
                label="رمز عبور"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="رمز عبور پیش‌فرض دمو: 123456"
                required
              />

              <Button variant="primary" type="submit" className="w-full" size="lg" isLoading={loading}>
                ورود امن به سامانه
              </Button>
            </form>
          ) : (
            <div>
              {otpStep === 'phone' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <Input
                    label="شماره تلفن همراه"
                    type="tel"
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    helperText="کد تایید ۴ رقمی به این شماره ارسال خواهد شد."
                    required
                  />

                  <Button variant="primary" type="submit" className="w-full" size="lg">
                    ارسال کد تایید
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="text-center pb-1">
                    <span className="text-xs text-slate-500">کد ورود ارسال شده به {mobile}:</span>
                  </div>

                  <Input
                    label="کد تایید پیامک‌شده"
                    type="text"
                    placeholder="1234"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                  />

                  <Button variant="primary" type="submit" className="w-full" size="lg" isLoading={loading}>
                    ورود به سامانه
                  </Button>

                  <button
                    type="button"
                    onClick={() => setOtpStep('phone')}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-800 pt-1 cursor-pointer"
                  >
                    ویرایش شماره تلفن
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Quick Demo Switcher (Instant Evaluation for RBAC & Privacy) */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>ورود سریع آزمایشی برای ارزیابی دسترسی‌ها:</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSwitch('usr_101', 'مشاور مهدی رضایی (Agent)')}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-medium text-right transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-bold">مهدی رضایی (مشاور املاک)</div>
                  <div className="text-[10px] text-slate-500">فایل‌های شخصی، متقاضیان اختصاصی و پیگیری‌ها</div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                  AGENT
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSwitch('usr_mgr_1', 'مدیر دپارتمان (Manager)')}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-900 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-medium text-right transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-bold">مهندس علیرضا تهرانی (مدیر دپارتمان)</div>
                  <div className="text-[10px] text-slate-500">داشبورد تیمی، شاخص‌ها + شماره‌های محافظت‌شده مشتریان</div>
                </div>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                  MANAGER
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSwitch('usr_102', 'مشاور سارا امینی (Agent 2)')}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-purple-50 text-slate-800 hover:text-purple-900 border border-slate-200 hover:border-purple-300 rounded-xl text-xs font-medium text-right transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-bold">سارا امینی (مشاور همکار)</div>
                  <div className="text-[10px] text-slate-500">ارزیابی تفکیک و ایزوله‌سازی فایل‌های دو مشاور در یک تیم</div>
                </div>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">
                  AGENT
                </span>
              </button>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              حساب کاربری جدید می‌خواهید؟{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                ثبت‌نام مشاور یا مدیر دپارتمان
              </button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
