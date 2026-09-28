import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Phone,
  Sparkles,
  MapPin,
  Shield,
  EyeOff,
  Lock,
  Unlock,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Archive,
  RefreshCw,
  Edit,
  DollarSign,
  Maximize2,
  Briefcase,
  Flame,
  Check,
} from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { clientService, ClientFilters, ClientSortOption } from '../services/clientService';
import { Client, DealType, PropertyType, ClientStatus, ClientUrgency, PrivacyStatus } from '../types';
import {
  toPersianDigits,
  formatPriceToman,
  getDealTypeLabel,
  getClientStatusLabel,
  getPropertyTypeLabel,
} from '../utils/formatters';
import { SearchInput } from '../components/common/SearchInput';
import { FilterBar } from '../components/common/FilterBar';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const ClientsListView: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDealType, setSelectedDealType] = useState<string>('all');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [selectedPrivacy, setSelectedPrivacy] = useState<string>('all');
  const [sortBy, setSortBy] = useState<ClientSortOption>('newest');
  const [showArchived, setShowArchived] = useState(false);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // Advanced filters
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  const fetchClients = async () => {
    try {
      setLoading(true);
      const filters: ClientFilters = {
        search,
        transactionType: selectedDealType === 'all' ? undefined : (selectedDealType as DealType),
        propertyType: selectedPropertyType === 'all' ? undefined : (selectedPropertyType as PropertyType),
        status: selectedStatus === 'all' ? undefined : (selectedStatus as ClientStatus),
        urgency: selectedUrgency === 'all' ? undefined : (selectedUrgency as ClientUrgency),
        privacyStatus: selectedPrivacy === 'all' ? undefined : (selectedPrivacy as PrivacyStatus),
        minBudget: minBudget ? Number(minBudget) : undefined,
        maxBudget: maxBudget ? Number(maxBudget) : undefined,
        minArea: minArea ? Number(minArea) : undefined,
        maxArea: maxArea ? Number(maxArea) : undefined,
        preferredRegions: regionFilter ? [regionFilter] : undefined,
        includeArchived: showArchived,
        sortBy,
      };

      const list = await clientService.getAll(filters, user);
      setClients(list);
    } catch (e) {
      console.error(e);
      toast.error('خطا در دریافت لیست مشتریان');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [
    search,
    selectedDealType,
    selectedPropertyType,
    selectedStatus,
    selectedUrgency,
    selectedPrivacy,
    minBudget,
    maxBudget,
    minArea,
    maxArea,
    regionFilter,
    showArchived,
    sortBy,
    user,
  ]);

  const dealTypeTabs = [
    { id: 'all', label: 'همه تقاضاها' },
    { id: 'sale', label: 'متقاضیان خرید' },
    { id: 'rent', label: 'متقاضیان رهن و اجاره' },
    { id: 'presale', label: 'پیش‌خرید' },
  ];

  const clearAllFilters = () => {
    setSelectedDealType('all');
    setSelectedPropertyType('all');
    setSelectedStatus('all');
    setSelectedUrgency('all');
    setSelectedPrivacy('all');
    setMinBudget('');
    setMaxBudget('');
    setMinArea('');
    setMaxArea('');
    setRegionFilter('');
    setShowArchived(false);
    setSearch('');
  };

  const handleTogglePrivacy = async (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    try {
      const updated = await clientService.togglePrivacy(client.id, user);
      if (updated) {
        toast.success(
          (updated.privacyStatus || updated.privacyState) === 'shared'
            ? `نیازمندی «${updated.name || updated.fullName}» با دپارتمان به اشتراک گذاشته شد`
            : `پرونده «${updated.name || updated.fullName}» به وضعیت شخصی بازگردانده شد`
        );
        fetchClients();
      }
    } catch (err: any) {
      toast.error(err.message || 'خطا در تغییر سطح دسترسی');
    }
  };

  const handleArchiveToggle = async (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    try {
      if (client.status === 'archived') {
        await clientService.restore(client.id, user);
        toast.success('پرونده متقاضی از بایگانی خارج شد');
      } else {
        await clientService.archive(client.id, user);
        toast.success('پرونده متقاضی بایگانی شد');
      }
      fetchClients();
    } catch (err: any) {
      toast.error(err.message || 'خطا در بایگانی پرونده');
    }
  };

  const hasActiveAdvancedFilters =
    selectedPropertyType !== 'all' ||
    selectedStatus !== 'all' ||
    selectedUrgency !== 'all' ||
    selectedPrivacy !== 'all' ||
    Boolean(minBudget) ||
    Boolean(maxBudget) ||
    Boolean(minArea) ||
    Boolean(maxArea) ||
    Boolean(regionFilter) ||
    showArchived;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Header & Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              مشتریان و متقاضیان
            </h1>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              {toPersianDigits(clients.length)} پرونده
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {user?.role === 'manager'
              ? 'نمای نظارتی دپارتمان — مدیریت و پایش متقاضیان فعال با حفظ محرمانگی مشاوران'
              : 'متقاضیان اختصاصی شما و تقاضاهای به اشتراک گذاشته شده'}
          </p>
        </div>

        <button
          onClick={() => navigate('/clients/new')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت متقاضی جدید</span>
        </button>
      </div>

      {user?.role === 'manager' && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/80 flex items-center gap-2.5 text-xs text-blue-900">
          <Shield className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            به عنوان مدیر، اطلاعات متقاضیان را مشاهده می‌کنید. شماره‌های تماس و نام‌های کامل جهت حفظ حقوق مشاوران به صورت ماسک‌شده نگهداری می‌شوند.
          </span>
        </div>
      )}

      {/* Search, Deal Type Tabs, Sort & Filter Drawer Toggle */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="جستجو بر اساس نام متقاضی، شماره همراه، منطقه یا شروط درخواستی..."
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Select */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ClientSortOption)}
                className="bg-transparent focus:outline-none font-semibold cursor-pointer text-xs"
              >
                <option value="newest">جدیدترین‌ها</option>
                <option value="urgency_desc">بیشترین فوریت</option>
                <option value="budget_desc">بودجه: بیشترین</option>
                <option value="budget_asc">بودجه: کمترین</option>
                <option value="name_asc">حروف الفبا</option>
              </select>
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${
                hasActiveAdvancedFilters
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>فیلترهای متقاضیان</span>
              {hasActiveAdvancedFilters && (
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Deal Type Tabs */}
        <FilterBar
          options={dealTypeTabs}
          selectedId={selectedDealType}
          onSelect={setSelectedDealType}
        />

        {/* Advanced Filters Expandable Panel */}
        {showFiltersDrawer && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>فیلترهای پیشرفته متقاضیان و خریداران</span>
              </span>
              {hasActiveAdvancedFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-rose-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>پاک کردن همه فیلترها</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* Urgency */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">میزان فوریت</label>
                <select
                  value={selectedUrgency}
                  onChange={(e) => setSelectedUrgency(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">همه</option>
                  <option value="urgent">بسیار فوری</option>
                  <option value="high">فوریت بالا</option>
                  <option value="medium">متوسط</option>
                  <option value="low">کم</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">وضعیت پرونده</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">همه پرونده‌ها</option>
                  <option value="active">فعال و پیگیر</option>
                  <option value="lead">سرنخ اولیه (Lead)</option>
                  <option value="negotiation">در حال مذاکره</option>
                  <option value="contracted">قرارداد منعقد شد</option>
                  <option value="lost">انصراف / بسته شد</option>
                  <option value="archived">بایگانی شده</option>
                </select>
              </div>

              {/* Privacy */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">حریم خصوصی تقاضا</label>
                <select
                  value={selectedPrivacy}
                  onChange={(e) => setSelectedPrivacy(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">همه</option>
                  <option value="private">شخصی و محفوظ</option>
                  <option value="shared">اشتراکی با تیم</option>
                </select>
              </div>

              {/* Target Region */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">منطقه / محله هدف</label>
                <input
                  type="text"
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  placeholder="مثلاً سعادت‌آباد..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                />
              </div>

              {/* Min Area */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">حداقل متراژ (متر)</label>
                <input
                  type="number"
                  value={minArea}
                  onChange={(e) => setMinArea(e.target.value)}
                  placeholder="مثلاً 90"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono"
                />
              </div>

              {/* Max Area */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">حداکثر متراژ (متر)</label>
                <input
                  type="number"
                  value={maxArea}
                  onChange={(e) => setMaxArea(e.target.value)}
                  placeholder="مثلاً 150"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono"
                />
              </div>

              {/* Show Archived Toggle */}
              <div className="col-span-2 flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="archivedClientCheck"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 cursor-pointer"
                />
                <label htmlFor="archivedClientCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  نمایش پرونده‌های بایگانی‌شده
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clients Grid (Mobile-First Cards) */}
      {loading ? (
        <LoadingState text="در حال دریافت پرونده‌های متقاضیان..." className="py-16" />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="متقاضی‌ای یافت نشد"
          description="با فیلترهای انتخابی یا در محدوده حساب کاربری شما پرونده‌ای پیدا نشد."
          actionLabel="ثبت اولین متقاضی"
          onAction={() => navigate('/clients/new')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => {
            const isOwner = c.ownerId === user?.id;
            const isArchived = c.status === 'archived';
            const statusInfo = getClientStatusLabel(c.status);
            const isPhoneMasked = (c.phone || c.mobile || '').includes('***');

            const urgencyTag = {
              urgent: { label: 'بسیار فوری', color: 'bg-rose-50 text-rose-700 border-rose-200' },
              high: { label: 'فوریت بالا', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              medium: { label: 'متوسط', color: 'bg-blue-50 text-blue-700 border-blue-200' },
              low: { label: 'کم', color: 'bg-slate-50 text-slate-600 border-slate-200' },
            }[c.urgency || 'medium'];

            return (
              <div
                key={c.id}
                onClick={() => navigate(`/clients/${c.id}`)}
                className={`bg-white rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between overflow-hidden cursor-pointer group ${
                  isArchived
                    ? 'border-amber-300/80 bg-amber-50/20 opacity-80'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="p-4 space-y-3">
                  {/* Top Bar: Name, Badges & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {c.name || c.fullName}
                        </h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyTag.color}`}>
                          {urgencyTag.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.phone || c.mobile}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          (c.privacyStatus || c.privacyState) === 'shared'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {(c.privacyStatus || c.privacyState) === 'shared' ? 'اشتراکی تیم' : 'فایل شخصی'}
                      </span>
                    </div>
                  </div>

                  {/* Demand & Budget */}
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">نوع تقاضا:</span>
                      <span className="font-bold text-slate-800">
                        {getDealTypeLabel(c.transactionType || c.desiredDealType)} (
                        {getPropertyTypeLabel(c.propertyType || c.desiredPropertyTypes?.[0] || 'apartment')})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">بودجه:</span>
                      <span className="font-extrabold text-emerald-700 font-mono">
                        {c.maxBudget || c.budgetMax
                          ? `تا ${formatPriceToman(c.maxBudget || c.budgetMax || 0)}`
                          : `ودیعه ${formatPriceToman(c.maxDeposit || 0)}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">متراژ و خواب:</span>
                      <span className="font-semibold text-slate-700">
                        {toPersianDigits(c.minArea || 60)} تا {toPersianDigits(c.maxArea || 140)} متر •{' '}
                        {toPersianDigits(c.bedrooms || c.minBedrooms || 1)} خواب
                      </span>
                    </div>
                  </div>

                  {/* Target Locations */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {(c.preferredRegions || c.desiredDistricts || []).join('، ') || 'تهران'}
                    </span>
                  </div>

                  {/* Requirements tags */}
                  {c.requirements && c.requirements.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {c.requirements.slice(0, 3).map((r, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          ✓ {r}
                        </span>
                      ))}
                      {c.requirements.length > 3 && (
                        <span className="text-[10px] text-slate-400">
                          +{toPersianDigits(c.requirements.length - 3)} شرط دیگر
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer with Owner controls */}
                <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {isOwner ? 'ثبت‌شده توسط شما' : c.agentName || 'مشاور همکار'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${c.id}/edit`);
                        }}
                        className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200/60"
                        title="ویرایش متقاضی"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isOwner && (
                      <button
                        onClick={(e) => handleTogglePrivacy(e, c)}
                        className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200/60"
                        title="تغییر وضعیت اشتراک با تیم"
                      >
                        {(c.privacyStatus || c.privacyState) === 'shared' ? (
                          <Unlock className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </button>
                    )}

                    {isOwner && (
                      <button
                        onClick={(e) => handleArchiveToggle(e, c)}
                        className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200/60"
                        title={isArchived ? 'بازیابی از بایگانی' : 'بایگانی'}
                      >
                        {isArchived ? (
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    {!isPhoneMasked && (
                      <a
                        href={`tel:${c.phone || c.mobile}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-emerald-600 hover:text-emerald-800 rounded hover:bg-emerald-50"
                        title="تماس مستقیم"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
