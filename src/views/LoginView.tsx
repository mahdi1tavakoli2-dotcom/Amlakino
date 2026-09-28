import React, { useState } from 'react';
import { Building, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useToast } from '../components/common/Toast';
import { isSupabaseConfigured } from '../lib/supabase';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrMobile || !password) {
      toast.error('لطفاً ایمیل / شماره موبایل و رمز عبور را وارد کنید.');
      return;
    }
    try {
      setLoading(true);
      await login(emailOrMobile, password);
      toast.success('ورود امن با موفقیت انجام شد');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'اطلاعات ورود نادرست است');
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
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <Input
              label="ایمیل یا شماره تلفن همراه"
              type="text"
              placeholder="name@example.com یا ۰۹۱۲۳۴۵۶۷۸۹"
              value={emailOrMobile}
              onChange={(e) => setEmailOrMobile(e.target.value)}
              helperText="شناسه کاربری ثبت‌شده در سامانه املاکینو"
              required
            />

            <Input
              label="رمز عبور"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="رمز عبور حساب کاربری"
              required
            />

            <Button variant="primary" type="submit" className="w-full" size="lg" isLoading={loading}>
              ورود امن به سامانه
            </Button>
          </form>

          {/* Live Supabase Connection Badge & Settings Link */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-medium">
              <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{isSupabaseConfigured() ? 'متصل به Supabase PostgreSQL' : 'پایگاه‌داده محلی / دمو'}</span>
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
