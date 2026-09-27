import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Building2,
  Users,
  Phone,
  Calendar,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sliders,
  Filter,
  Search,
  ExternalLink,
  ShieldCheck,
  Info,
  Flame,
} from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { matchService, DEFAULT_MATCH_WEIGHTS } from '../services/matchService';
import { opportunityService } from '../services/opportunityService';
import { Match } from '../types';
import {
  toPersianDigits,
  formatPriceToman,
  getDealTypeLabel,
  getPropertyTypeLabel,
} from '../utils/formatters';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

export const MatchesView: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'strong' | 'partial' | 'my'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWeightsInfo, setShowWeightsInfo] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        setLoading(true);
        const data = await matchService.getAll(user);
        setMatches(data);
      } catch (e) {
        console.error(e);
        toast.error('خطا در محاسبه تطابق‌های هوشمند');
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, [user]);

  // Tab Filtering & Search
  const filteredMatches = useMemo(() => {
    let list = [...matches];

    // Tab filter
    if (activeTab === 'strong') {
      list = list.filter((m) => m.matchScore >= 80);
    } else if (activeTab === 'partial') {
      list = list.filter((m) => m.matchScore >= 50 && m.matchScore < 80);
    } else if (activeTab === 'my' && user) {
      list = list.filter(
        (m) =>
          m.property.ownerId === user.id ||
          m.property.agentId === user.id ||
          m.client.ownerId === user.id ||
          m.client.agentId === user.id
      );
    }

    // Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.property.title.toLowerCase().includes(q) ||
          m.property.code.toLowerCase().includes(q) ||
          (m.property.district && m.property.district.toLowerCase().includes(q)) ||
          m.client.fullName.toLowerCase().includes(q) ||
          (m.client.name && m.client.name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [matches, activeTab, searchQuery, user]);

  const toggleExpand = (id: string) => {
    setExpandedMatchId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-24">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-emerald-50 via-white to-slate-50 p-5 rounded-2xl border border-emerald-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900">
                  موتور تطابق هوشمند املاک و متقاضیان (Amlakino Matching Engine)
                </h1>
                <Badge variant="success" size="sm">
                  وزن‌دهی واقعی
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                محاسبه چندمعیاره بر اساس انحراف بودجه (۲۵٪)، لوکیشن (۲۰٪)، متراژ (۱۵٪)، نوع ملک (۱۰٪)، نوع معامله (۱۰٪)، خواب (۱۰٪) و امکانات (۱۰٪).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWeightsInfo((prev) => !prev)}
              rightIcon={<Sliders className="w-3.5 h-3.5" />}
            >
              {showWeightsInfo ? 'بستن اوزان' : 'مشاهده اوزان معیارها'}
            </Button>
          </div>
        </div>

        {/* Expandable Criteria Weights Info */}
        {showWeightsInfo && (
          <div className="mt-4 pt-4 border-t border-emerald-100/80 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 mb-2.5 text-xs font-bold text-slate-800">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>فرمول و ضرایب تأثیرگذاری در محاسبه درصد سازگاری:</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center">
                <span className="text-[11px] text-slate-500 block">بودجه مالی</span>
                <span className="text-xs font-black text-emerald-700">{DEFAULT_MATCH_WEIGHTS.budget}٪</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center">
                <span className="text-[11px] text-slate-500 block">موقعیت مکانی</span>
                <span className="text-xs font-black text-emerald-700">{DEFAULT_MATCH_WEIGHTS.location}٪</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center">
                <span className="text-[11px] text-slate-500 block">متراژ فضا</span>
                <span className="text-xs font-black text-emerald-700">{DEFAULT_MATCH_WEIGHTS.area}٪</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center">
                <span className="text-[11px] text-slate-500 block">نوع ملک</span>
                <span className="text-xs font-black text-emerald-700">{DEFAULT_MATCH_WEIGHTS.propertyType}٪</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center">
                <span className="text-[11px] text-slate-500 block">نوع معامله</span>
                <span className="text-xs font-black text-emerald-700">{DEFAULT_MATCH_WEIGHTS.transactionType}٪</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center">
                <span className="text-[11px] text-slate-500 block">تعداد خواب</span>
                <span className="text-xs font-black text-emerald-700">{DEFAULT_MATCH_WEIGHTS.bedrooms}٪</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center">
                <span className="text-[11px] text-slate-500 block">امکانات کلیدی</span>
                <span className="text-xs font-black text-emerald-700">{DEFAULT_MATCH_WEIGHTS.features}٪</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-2">
              * انطباق‌های نسبی بر مبنای نرخ خطای مجاز محاسبه می‌شوند؛ به عنوان مثال اختلاف جزئی متراژ یا قیمت موجب صفر شدن درصد تطابق نخواهد شد.
            </p>
          </div>
        )}
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            همه موارد ({toPersianDigits(matches.length)})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('strong')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'strong'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>انطباق قوی (&ge; ۸۰٪)</span>
            <span className="text-[10px] bg-emerald-700/60 text-white px-1.5 py-0.2 rounded-full">
              {toPersianDigits(matches.filter((m) => m.matchScore >= 80).length)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('partial')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'partial'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>انطباق نسبی (۵۰٪ - ۷۹٪)</span>
            <span className="text-[10px] bg-amber-700/60 text-white px-1.5 py-0.2 rounded-full">
              {toPersianDigits(matches.filter((m) => m.matchScore >= 50 && m.matchScore < 80).length)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'my'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            فایل‌ها و متقاضیان من
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در فایل‌ها یا متقاضیان..."
            className="w-full pr-9 pl-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-800"
          />
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <LoadingState text="در حال پردازش ماتریس تطابق هوشمند فایل‌ها با متقاضیان..." className="py-20" />
      ) : filteredMatches.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="w-8 h-8" />}
          title="موردی با این فیلتر یافت نشد"
          description={
            searchQuery
              ? 'هیچ تطابقی با عبارت جستجو شده همخوانی ندارد.'
              : 'هنوز تطابقی در این دسته‌بندی وجود ندارد.'
          }
          actionLabel="ثبت فایل یا متقاضی جدید"
          onAction={() => navigate('/properties/new')}
        />
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => {
            const isExpanded = expandedMatchId === match.id;
            const isHighMatch = match.matchScore >= 80;
            const weakList = match.weakFactors || match.unmatchedFactors || [];

            return (
              <Card key={match.id} padding="none" className="overflow-hidden border-slate-200/90 shadow-2xs">
                <div className="p-4 sm:p-5">
                  {/* Header score & status */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-sm sm:text-base font-black px-3.5 py-1 rounded-full border ${
                          isHighMatch
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {toPersianDigits(match.matchScore)}٪ سازگاری
                      </span>
                      <span className="text-xs text-slate-400">
                        {isHighMatch ? 'تطابق پیشنهادی قطعی' : 'تطابق با انحراف جزئی / قابل مذاکره'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {getDealTypeLabel(match.property.dealType || match.property.transactionType)}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {getPropertyTypeLabel(match.property.propertyType)}
                      </span>
                    </div>
                  </div>

                  {/* 2 Column Comparison: Property vs Client */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Property Card */}
                    <div
                      onClick={() => navigate(`/properties/${match.property.id}`)}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-emerald-300 transition-all cursor-pointer space-y-1.5 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          مشخصات فایل ({match.property.code})
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                        {match.property.title}
                      </h4>
                      <p className="text-xs text-emerald-700 font-extrabold">
                        {formatPriceToman(match.property.totalPrice || match.property.price || match.property.deposit)}
                      </p>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 pt-0.5">
                        <span>{toPersianDigits(match.property.area)} متر</span>
                        <span>•</span>
                        <span>{toPersianDigits(match.property.bedrooms)} خواب</span>
                        <span>•</span>
                        <span>{match.property.district || match.property.neighborhood}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block pt-1">
                        مشاور فایل: {match.property.agentName || 'همکار'}
                      </span>
                    </div>

                    {/* Client Card */}
                    <div
                      onClick={() => navigate(`/clients/${match.client.id}`)}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-emerald-300 transition-all cursor-pointer space-y-1.5 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          نیازمندی خریدار / متقاضی
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {match.client.fullName || match.client.name}
                      </h4>
                      <p className="text-xs text-slate-700 font-bold">
                        سقف بودجه: {formatPriceToman(match.client.budgetMax || match.client.maxBudget || match.client.maxDeposit)}
                      </p>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 pt-0.5">
                        <span>
                          بازه متراژ: {toPersianDigits(match.client.minArea || 0)} تا {toPersianDigits(match.client.maxArea || 'نامحدود')} متر
                        </span>
                        <span>•</span>
                        <span>حداقل {toPersianDigits(match.client.minBedrooms || match.client.bedrooms || 1)} خواب</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        مناطق انتخابی: {(match.client.preferredRegions || match.client.desiredDistricts || []).join('، ')}
                      </p>
                    </div>
                  </div>

                  {/* Reasons and Factors List */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">توضیحات و دلایل انطباق سیستم:</span>
                      <button
                        type="button"
                        onClick={() => toggleExpand(match.id)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'بستن ریز نمرات' : 'مشاهده ریز نمرات معیارها'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {/* Positive matched factors */}
                      {match.matchedFactors.map((factor, idx) => (
                        <span
                          key={`pos-${idx}`}
                          className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200/90 px-2.5 py-1 rounded-lg"
                        >
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{factor.replace(/^[✓\s]+/, '')}</span>
                        </span>
                      ))}

                      {/* Weak or deviation factors */}
                      {weakList.map((weak, idx) => (
                        <span
                          key={`weak-${idx}`}
                          className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{weak.replace(/^[△✗\s]+/, '')}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Detailed Score Breakdown (Accordion) */}
                  {isExpanded && match.criteriaBreakdown && (
                    <div className="mt-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs space-y-2.5 animate-in fade-in duration-150">
                      <h5 className="font-bold text-slate-800 text-[11px]">
                        آنالیز امتیازی ۷ معیار وزنی:
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(match.criteriaBreakdown).map(([key, item]) => {
                          const percentage = Math.round((item.rawScore || 0) * 100);
                          return (
                            <div key={key} className="p-2 bg-white rounded-lg border border-slate-200/80 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-700">{item.label}</span>
                                <span className="font-mono text-emerald-700 font-bold">
                                  {toPersianDigits(item.weightedScore)} / {toPersianDigits(item.maxWeight)} نمره
                                </span>
                              </div>
                              {/* Mini progress bar */}
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    percentage >= 80
                                      ? 'bg-emerald-500'
                                      : percentage >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-red-400'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-slate-500 line-clamp-1">{item.explanation}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="px-5 py-3 bg-slate-50/90 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <a
                    href={`tel:${match.client.mobile || match.client.phone}`}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>تماس با {match.client.fullName || match.client.name} ({match.client.mobile || match.client.phone})</span>
                  </a>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await opportunityService.create(
                            {
                              client: match.client,
                              property: match.property,
                              priority: match.matchScore >= 85 ? 'high' : 'medium',
                              nextAction: 'تماس اولیه و هماهنگی بازدید با متقاضی',
                              nextFollowUp: 'امروز ساعت ۱۷:۰۰',
                            },
                            user
                          );
                          toast.success('فرصت جدید در پایپ‌لاین معاملات ثبت شد');
                          navigate('/opportunities');
                        } catch (err: any) {
                          toast.error(err?.message || 'خطا در ثبت فرصت');
                        }
                      }}
                      rightIcon={<Flame className="w-3.5 h-3.5 text-amber-500" />}
                    >
                      افزودن به پایپ‌لاین فرصت‌ها
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/visits')}
                      rightIcon={<Calendar className="w-3.5 h-3.5" />}
                    >
                      هماهنگی بازدید
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        toast.success(`پیشنهاد فایل ${match.property.code} برای ${match.client.fullName || match.client.name} ارسال شد`);
                      }}
                    >
                      ارسال پیشنهاد به متقاضی
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
