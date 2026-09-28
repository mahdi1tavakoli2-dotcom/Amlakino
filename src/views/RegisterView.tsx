import React, { useState } from 'react';
import { Building, UserCheck, ShieldCheck, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useToast } from '../components/common/Toast';
import { UserRole } from '../types';

export const RegisterView: React.FC = () => {
  const { register } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const [role, setRole] = useState<UserRole>('agent');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error('لطفاً نام، ایمیل و رمز عبور را تکمیل فرمایید.');
      return;
    }
    if (password.length < 6) {
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    try {
      setLoading(true);
      await register({
        fullName,
        mobile,
        email: email || undefined,
        role,
        password,
        licenseCode: licenseCode || undefined,
      });
      toast.success('ثبت‌نام با موفقیت انجام شد. خوش آمدید!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'خطا در ثبت‌نام');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 select-none">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-md">
          <Building className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black text-slate-900">ثبت‌نام در سامانه املاکینو</h2>
        <p className="text-xs text-slate-500 font-medium">
          زیرساخت اختصاصی ابری مشاوران و تیم‌های املاک سراسر کشور
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="p-6 sm:p-7 space-y-5 shadow-sm border-slate-200/90">
          {/* Role Choice */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">نوع حساب کاربری:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('agent')}
                className={`py-2.5 px-3 rounded-xl border text-right transition-all cursor-pointer ${
                  role === 'agent'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold">مشاور املاک (Agent)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">مدیریت فایل‌ها و مشتریان شخصی</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('manager')}
                className={`py-2.5 px-3 rounded-xl border text-right transition-all cursor-pointer ${
                  role === 'manager'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold">مدیر دپارتمان (Manager)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">تشکیل تیم و نظارت بر KPI</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-3.5">
            <Input
              label="نام و نام خانوادگی"
              placeholder="مثال: رضا مرادی"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="شماره تلفن همراه"
              type="tel"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />

            <Input
              label="ایمیل (شناسه ورود)"
              type="email"
              placeholder="name@agency.ir"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="رمز عبور"
              type="password"
              placeholder="حداقل ۶ کاراکتر"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="رمز عبور با الگوریتم سالت‌شده رمزنگاری می‌شود."
              required
            />

            {role === 'manager' ? (
              <Input
                label="نام آژانس یا دپارتمان املاک"
                placeholder="مثال: دپارتمان املاک آسمان"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
              />
            ) : (
              <Input
                label="کد پروانه یا کارت صنفی (اختیاری)"
                placeholder="مثال: A-8840"
                value={licenseCode}
                onChange={(e) => setLicenseCode(e.target.value)}
              />
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">اصل تضمین حریم خصوصی:</span> تمامی فایل‌ها و مشخصات مشتریان در مالکیت مطلق شما قرار دارند و حتی در صورت تغییر دپارتمان، اطلاعات محفوظ خواهد ماند.
            </div>

            <Button variant="primary" type="submit" className="w-full" size="lg" isLoading={loading}>
              ثبت‌نام و ورود به میز کار
            </Button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              قبلاً ثبت‌نام کرده‌اید؟{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                ورود به حساب
              </button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
