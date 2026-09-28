import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Sparkles,
  CheckSquare,
  Calendar,
  Plus,
  ArrowLeft,
  Phone,
  Clock,
  MapPin,
  Check,
  AlertTriangle,
  Flame,
  ChevronLeft,
  ShieldCheck,
  Award,
  TrendingUp,
  BarChart2,
  Lock,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { storageService } from '../services/storageService';
import { Property, Client, FollowUp, Opportunity, Match, Visit, DashboardStats, User } from '../types';
import {
  toPersianDigits,
  formatPriceToman,
  getDealTypeLabel,
  getFollowUpTypeLabel,
  getPriorityLabel,
} from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { LoadingState } from '../components/common/LoadingState';
import { useToast } from '../components/common/Toast';
import { isSupabaseConfigured } from '../lib/supabase';

export const DashboardView: React.FC = () => {
  const { user, team, switchDemoUser } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayFollowUps, setTodayFollowUps] = useState<FollowUp[]>([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState<FollowUp[]>([]);
  const [futureFollowUps, setFutureFollowUps] = useState<FollowUp[]>([]);
  const [followUpTab, setFollowUpTab] = useState<'today' | 'overdue' | 'future'>('today');
  const [newMatches, setNewMatches] = useState<Match[]>([]);
  const [activeOpportunities, setActiveOpportunities] = useState<Opportunity[]>([]);
  const [upcomingVisits, setUpcomingVisits] = useState<Visit[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const loadData = async () => {
    try {
      setLoading(true);
      const [allFollowUps, allMatches, allOpportunities, allVisits, dashboardStats, allUsers] = await Promise.all([
        storageService.getFollowUps(user),
        storageService.getMatches(),
        storageService.getOpportunities(user),
        storageService.getVisits(user),
        storageService.getDashboardStats(user),
        storageService.getUsers(),
      ]);

      setStats(dashboardStats);
      const isCompleted = (f: FollowUp) => f.status === 'completed' || f.status === 'Completed';
      const isOverdue = (f: FollowUp) => f.status === 'overdue' || f.status === 'Overdue' || f.dueDate === 'دیروز';
      const isToday = (f: FollowUp) =>
        !isCompleted(f) &&
        !isOverdue(f) &&
        (f.dueDate === 'امروز' || (f.dueAt && f.dueAt.includes('امروز')));

      setTodayFollowUps(allFollowUps.filter(isToday));
      setOverdueFollowUps(allFollowUps.filter((f) => !isCompleted(f) && isOverdue(f)));
      setFutureFollowUps(allFollowUps.filter((f) => !isCompleted(f) && !isOverdue(f) && !isToday(f)));
      setNewMatches(allMatches.slice(0, 3));
      setActiveOpportunities(allOpportunities.filter((o) => o.stage !== 'closed_lost'));
      setUpcomingVisits(allVisits.filter((v) => v.status === 'scheduled'));
      setTeamMembers(allUsers.filter((u) => u.teamId === (team?.id || 'team_tehran_1')));
    } catch (e) {
      console.error('Error loading dashboard data:', e);
      toast.error('خطا در بارگذاری اطلاعات داشبورد');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleToggleFollowUp = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await storageService.toggleFollowUpStatus(id, user);
      toast.success('وضعیت پیگیری به‌روزرسانی شد');
      loadData();
    } catch {
      toast.error('خطا در تغییر وضعیت پیگیری');
    }
  };

  const handleQuickSwitch = async (userId: string, label: string) => {
    try {
      await switchDemoUser(userId);
      toast.success(`جابجایی به حساب: ${label}`);
    } catch {
      toast.error('خطا در جابجایی حساب');
    }
  };

  if (loading) {
    return <LoadingState text="در حال بارگذاری میز کار املاکینو..." className="py-24" />;
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Auth Session & Security Bar */}
      <div className="bg-slate-900 text-white p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
            RBAC
          </div>
          <div>
            <span className="text-xs text-slate-400 block">کاربر فعال احراز هویت شده:</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-300">
              {user?.fullName} ({user?.role === 'manager' ? 'مدیر دپارتمان' : 'مشاور املاک'})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSupabaseConfigured() ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 rounded-lg text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>نشست امن Supabase Auth</span>
            </div>
          ) : (
            <>
              <span className="text-[11px] text-slate-400">تغییر نقش تست:</span>
              <button
                type="button"
                onClick={() => handleQuickSwitch('usr_101', 'مشاور مهدی رضایی')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  user?.id === 'usr_101'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                مشاور ۱
              </button>
              <button
                type="button"
                onClick={() => handleQuickSwitch('usr_mgr_1', 'مدیر علیرضا تهرانی')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  user?.id === 'usr_mgr_1'
                    ? 'bg-blue-500 text-slate-950 shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                مدیر
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => navigate('/security-tests')}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>آزمایشگاه امنیت (۸ تست)</span>
          </button>
        </div>
      </div>

      {/* 1. Header & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              {team?.name || 'دفتر املاک'}
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500">چهارشنبه، ۴ مهر ۱۴۰۳</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            درود، {user?.fullName}؛ وقت بخیر
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isManager ? (
              <span>
                داشبورد نظارت بر عملکرد دپارتمان • <span className="font-bold text-slate-800">{toPersianDigits(teamMembers.length)} مشاور فعال</span> تحت پوشش نظارتی
              </span>
            ) : (
              <span>
                شما امروز <span className="font-bold text-slate-800">{toPersianDigits(todayFollowUps.length)} پیگیری</span> و{' '}
                <span className="font-bold text-slate-800">{toPersianDigits(upcomingVisits.length)} بازدید برنامه‌ریزی‌شده</span> در پیش دارید.
              </span>
            )}
          </p>
        </div>

        {/* Quick Actions Panel */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/properties/new')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت فایل</span>
          </button>
          <button
            onClick={() => navigate('/clients/new')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت مشتری</span>
          </button>
          {isManager ? (
            <button
              onClick={() => navigate('/team')}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span>مدیریت مشاوران</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/follow-ups')}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ایجاد پیگیری</span>
            </button>
          )}
          <button
            onClick={() => navigate('/matches')}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>مشاهده مچ‌ها</span>
          </button>
        </div>
      </div>

      {/* Manager Privacy Notice Banner */}
      {isManager && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 border border-blue-200/90 flex items-start gap-3">
          <EyeOff className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed space-y-0.5">
            <div className="font-bold text-slate-900">
              حالت نظارت دپارتمان (Department Supervisory Mode) — شماره‌های تماس محافظت‌شده
            </div>
            <p>
              مدیر گرامی، طبق الزامات عدم دسترسی خودکار به اطلاعات محرمانه، شماره تماس و اسامی مالکین و خریداران و یادداشت‌های خصوصی مشاوران در این پنل به صورت ماسک‌شده (<code className="font-mono bg-blue-100/70 px-1 py-0.5 rounded">۰۹۱۲***۸۸۹۹</code>) نمایش داده می‌شوند تا استقلال کاری مشاوران حفظ گردد.
            </p>
          </div>
        </div>
      )}

      {/* 2. Key Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => navigate('/properties')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{isManager ? 'کل فایل‌های دپارتمان' : 'فایل‌های فعال شما'}</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {toPersianDigits(stats?.activePropertiesCount || 0)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">آماده معامله</span>
        </div>

        <div
          onClick={() => navigate('/clients')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{isManager ? 'متقاضیان تحت پوشش' : 'مشتریان فعال شما'}</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {toPersianDigits(stats?.activeClientsCount || 0)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">خریدار و مستاجر</span>
        </div>

        <div
          onClick={() => navigate('/opportunities')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{isManager ? 'حجم پایپ‌لاین معاملات' : 'فرصت‌های فعال'}</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {isManager
              ? `${toPersianDigits(84.5)} م.ت`
              : toPersianDigits(stats?.activeOpportunitiesCount || 0)}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {isManager ? 'پیش‌بینی کمیسیون: ۴۲۲ م.ت' : 'در مرحله نشست و قرارداد'}
          </span>
        </div>

        <div
          onClick={() => navigate(isManager ? '/team' : '/matches')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{isManager ? 'مشاوران دپارتمان' : 'مچ‌های جدید'}</span>
            {isManager ? (
              <UserCheck className="w-4 h-4 text-blue-600" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {isManager
              ? toPersianDigits(teamMembers.length)
              : toPersianDigits(stats?.newMatchesCount || 0)}
          </div>
          <span className="text-[11px] text-emerald-700 font-bold">
            {isManager ? 'تیم فعال و هماهنگ' : 'تطابق هوشمند فایل'}
          </span>
        </div>
      </div>

      {/* 3. MANAGER SPECIAL SECTION: Team Rankings & Activity Trends */}
      {isManager && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Rankings */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>رتبه‌بندی و عملکرد مشاوران دپارتمان (Team Rankings)</span>
              </h3>
              <span className="text-xs text-slate-400">ماه جاری</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-amber-50/60 rounded-xl border border-amber-200/70">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                    ۱
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">مشاور مهدی رضایی</h4>
                    <p className="text-[11px] text-slate-500">سعادت‌آباد • ۳ فایل اختصاصی</p>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block font-mono">۲۴.۹ میلیارد تومان</span>
                  <span className="text-[10px] text-emerald-700 font-medium">۲ قرارداد در شرف امضا</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                    ۲
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">مشاور سارا امینی</h4>
                    <p className="text-[11px] text-slate-500">نیاوران و فرمانیه • ۲ فایل اختصاصی</p>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block font-mono">۸۵.۰ میلیارد تومان</span>
                  <span className="text-[10px] text-blue-700 font-medium">۱ ویلای لوکس در مرحله بازدید</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                    ۳
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">مشاور کامران یزدانی</h4>
                    <p className="text-[11px] text-slate-500">شهرک غرب • ۱ فایل اختصاصی</p>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block font-mono">۱۸.۲ میلیارد تومان</span>
                  <span className="text-[10px] text-slate-500 font-medium">در مرحله کارشناسی قیمت</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Activity Trends */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>روند فعالیت و پایش هفتگی تیم (Activity Trends)</span>
              </h3>
              <span className="text-xs text-slate-400">۷ روز گذشته</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-xs block mb-1">بازدیدهای انجام‌شده:</span>
                <div className="text-xl font-black text-slate-900 font-mono">۱۸ بازدید</div>
                <span className="text-[10px] text-emerald-600 font-medium">↑ ۲۲٪ رشد نسبت به هفته پیش</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-xs block mb-1">پیگیری‌های موفق:</span>
                <div className="text-xl font-black text-slate-900 font-mono">۴۲ تماس و جلسه</div>
                <span className="text-[10px] text-emerald-600 font-medium">نرخ پاسخگویی ۸۹٪</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-xs block mb-1">فایل‌های جدید ثبت‌شده:</span>
                <div className="text-xl font-black text-slate-900 font-mono">۷ فایل</div>
                <span className="text-[10px] text-slate-500">۴ مورد اشتراکی با تیم</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-xs block mb-1">نشست‌های تنظیم قرارداد:</span>
                <div className="text-xl font-black text-emerald-700 font-mono">۳ نشست</div>
                <span className="text-[10px] text-amber-600 font-medium">موعد پنج‌شنبه عصر</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 4. Overdue Follow-ups (Warn Banner if any) */}
      {overdueFollowUps.length > 0 && (
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 text-right">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-rose-900">
                پیگیری‌های معوقه ({toPersianDigits(overdueFollowUps.length)} مورد)
              </h3>
            </div>
            <button
              onClick={() => navigate('/follow-ups')}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
            >
              <span>مشاهده همه</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {overdueFollowUps.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate('/follow-ups')}
                className="bg-white p-3 rounded-xl border border-rose-100 flex items-center justify-between gap-3 text-xs cursor-pointer hover:border-rose-300 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="font-bold text-slate-800 truncate">{item.title}</span>
                  {item.clientName && (
                    <span className="text-slate-500 hidden sm:inline truncate">({item.clientName})</span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-rose-600 font-medium">
                    موعد: {item.dueDate} ساعت {item.dueTime}
                  </span>
                  <button
                    onClick={(e) => handleToggleFollowUp(item.id, e)}
                    className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                    title="ثبت به عنوان انجام‌شده"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Main Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Right 2 Columns: Agenda & Matches */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prominent Follow-ups Agenda Hub (Today, Overdue, Future) */}
          <Card className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  مرکز پیگیری‌های مشاور (Follow-ups Hub)
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFollowUpTab('today')}
                  className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    followUpTab === 'today'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>امروز</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      followUpTab === 'today' ? 'bg-slate-800 text-emerald-400' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {toPersianDigits(todayFollowUps.length)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFollowUpTab('overdue')}
                  className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    followUpTab === 'overdue'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <span>عقب‌افتاده</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      followUpTab === 'overdue' ? 'bg-rose-700 text-white' : 'bg-rose-200 text-rose-800'
                    }`}
                  >
                    {toPersianDigits(overdueFollowUps.length)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFollowUpTab('future')}
                  className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    followUpTab === 'future'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>آینده</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      followUpTab === 'future' ? 'bg-slate-800 text-cyan-400' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {toPersianDigits(futureFollowUps.length)}
                  </span>
                </button>

                <button
                  onClick={() => navigate('/follow-ups')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 mr-2 cursor-pointer"
                >
                  مشاهده همه
                </button>
              </div>
            </div>

            {/* Content for Active Tab */}
            {(() => {
              const activeList =
                followUpTab === 'today'
                  ? todayFollowUps
                  : followUpTab === 'overdue'
                  ? overdueFollowUps
                  : futureFollowUps;

              if (activeList.length === 0) {
                return (
                  <div className="py-8 text-center text-xs text-slate-400">
                    {followUpTab === 'today'
                      ? 'هیچ پیگیری موعد امروزی باقی نمانده است.'
                      : followUpTab === 'overdue'
                      ? 'عالی! هیچ پیگیری معوقه یا عقب‌افتاده‌ای ندارید.'
                      : 'پیگیری ثبت‌شده‌ای برای روزهای آینده وجود ندارد.'}
                  </div>
                );
              }

              return (
                <div className="divide-y divide-slate-100">
                  {activeList.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex items-start justify-between gap-3 text-xs hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          onClick={(e) => handleToggleFollowUp(item.id, e)}
                          className="mt-0.5 w-4 h-4 rounded border border-slate-300 hover:border-emerald-600 flex items-center justify-center shrink-0 cursor-pointer"
                          title="ثبت انجام پیگیری"
                        >
                          {item.status === 'completed' && <Check className="w-3 h-3 text-emerald-600" />}
                        </button>

                        <div className="space-y-1 min-w-0">
                          <div className="font-bold text-slate-900">{item.title}</div>
                          <div className="text-slate-500 flex flex-wrap items-center gap-2 text-[11px]">
                            {item.clientName && <span>مشتری: {item.clientName}</span>}
                            {item.clientPhone && (
                              <span className="font-mono text-slate-600">{item.clientPhone}</span>
                            )}
                            <Badge variant="default" size="sm">
                              {getFollowUpTypeLabel(item.type)}
                            </Badge>
                            {item.propertyTitle && (
                              <span className="text-slate-400">ملک: {item.propertyTitle}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <span className="font-mono font-bold text-slate-800 text-xs block">
                          {item.dueTime || '۱۷:۰۰'}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            followUpTab === 'overdue'
                              ? 'text-rose-600'
                              : followUpTab === 'future'
                              ? 'text-blue-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.dueDate || (item.dueAt ? item.dueAt.split(' ')[0] : 'امروز')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>

          {/* Smart Matches Preview */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">تطابق‌های هوشمند جدید (Smart Matches)</h3>
              </div>
              <button
                onClick={() => navigate('/matches')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                مشاهده همه مچ‌ها
              </button>
            </div>

            <div className="space-y-3">
              {newMatches.map((m) => (
                <div
                  key={m.id}
                  onClick={() => navigate('/matches')}
                  className="p-3.5 rounded-xl border border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs font-mono">
                        {toPersianDigits(m.matchScore)}٪ تطابق
                      </span>
                      <span className="text-xs font-bold text-slate-900">{m.property.title}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{m.createdAt}</span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center justify-between">
                    <span>متقاضی: {m.client.fullName}</span>
                    <span className="font-bold text-emerald-800">
                      {formatPriceToman(m.property.totalPrice || m.property.deposit || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Left 1 Column: Visits & Opportunities */}
        <div className="space-y-6">
          {/* Upcoming Visits */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">برنامه بازدیدها</h3>
              </div>
              <button
                onClick={() => navigate('/visits')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                تقویم بازدید
              </button>
            </div>

            {upcomingVisits.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                هیچ بازدیدی برای امروز هماهنگ نشده است.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingVisits.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => navigate('/visits')}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{v.propertyDistrict}</span>
                      <span className="text-[11px] font-mono text-emerald-700 font-bold">
                        {v.scheduledDate} ساعت {v.scheduledTime}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate">{v.propertyTitle}</p>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span>مشتری: {v.clientName}</span>
                      <span className="font-mono">{v.clientPhone}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Active Opportunities */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">فرصت‌های در جریان نشست</h3>
              </div>
              <button
                onClick={() => navigate('/opportunities')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                پایپ‌لاین کامل
              </button>
            </div>

            <div className="space-y-3">
              {activeOpportunities.slice(0, 3).map((opp) => (
                <div
                  key={opp.id}
                  onClick={() => navigate('/opportunities')}
                  className="p-3 rounded-xl border border-slate-200 space-y-2 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-xs text-slate-900">{opp.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      احتمال {toPersianDigits(opp.probabilityPercent)}٪
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>ارزش: {formatPriceToman(opp.estimatedValue)}</span>
                    <span className="text-[11px] text-slate-500">موعد: {opp.expectedCloseDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
