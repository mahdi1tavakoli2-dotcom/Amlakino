import React, { useState } from 'react';
import { Building, Phone, KeyRound, ShieldCheck, UserCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useToast } from '../components/common/Toast';
import { otpService } from '../services/otpService';
import { isSupabaseConfigured } from '../lib/supabase';

export const LoginView: React.FC = () => {
  const { login, loginWithOtp, switchDemoUser, availableUsers } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || !password) {
      toast.error('لطفاً شماره موبایل یا ایمیل و رمز عبور را وارد کنید.');
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) {
      toast.error('لطفاً شماره موبایل معتبر وارد نمایید.');
      return;
    }
    try {
      setLoading(true);
      const res = await otpService.sendOtp(mobile);
      setOtpStep('code');
      toast.success(res.message || 'کد تایید پیامکی ارسال شد.');
    } catch (err: any) {
      toast.error(err.message || 'خطا در ارسال پیامک');
    } finally {
      setLoading(false);
    }
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
                helperText="رمز عبور حساب کاربری املاکینو"
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

          {/* Live Supabase Connection Badge & Settings Link */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-medium">
              <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{isSupabaseConfigured() ? 'متصل به Supabase PostgreSQL' : 'پایگاه‌داده ابری در انتظار اتصال'}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
            >
              تنظیمات دیتابیس
            </button>
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
