import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Filter,
  MapPin,
  BedDouble,
  Maximize2,
  Sparkles,
  Share2,
  Lock,
  Unlock,
  Shield,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Archive,
  Eye,
} from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { propertyService, PropertyFilters, PropertySortOption } from '../services/propertyService';
import { Property, DealType, PropertyType, AvailabilityStatus, PrivacyStatus } from '../types';
import {
  toPersianDigits,
  formatPriceToman,
  getDealTypeLabel,
  getPropertyTypeLabel,
} from '../utils/formatters';
import { SearchInput } from '../components/common/SearchInput';
import { FilterBar } from '../components/common/FilterBar';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const PropertiesListView: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDealType, setSelectedDealType] = useState<string>('all');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('all');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [selectedPrivacy, setSelectedPrivacy] = useState<string>('all');
  const [sortBy, setSortBy] = useState<PropertySortOption>('newest');
  const [showArchived, setShowArchived] = useState(false);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // Advanced filters
  const [selectedBedrooms, setSelectedBedrooms] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minArea, setMinArea] = useState<string>('');
  const [maxArea, setMaxArea] = useState<string>('');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('');

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const filters: PropertyFilters = {
        search,
        transactionType: selectedDealType === 'all' ? undefined : (selectedDealType as DealType),
        propertyType: selectedPropertyType === 'all' ? undefined : (selectedPropertyType as PropertyType),
        availability: selectedAvailability === 'all' ? undefined : (selectedAvailability as AvailabilityStatus),
        privacyStatus: selectedPrivacy === 'all' ? undefined : (selectedPrivacy as PrivacyStatus),
        bedrooms: selectedBedrooms === 'all' ? undefined : Number(selectedBedrooms),
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        minArea: minArea ? Number(minArea) : undefined,
        maxArea: maxArea ? Number(maxArea) : undefined,
        neighborhood: neighborhoodFilter ? neighborhoodFilter : undefined,
        includeArchived: showArchived,
        sortBy,
      };

      const list = await propertyService.getAll(filters, user);
      setProperties(list);
    } catch (e) {
      console.error(e);
      toast.error('خطا در دریافت لیست املاک');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [
    search,
    selectedDealType,
    selectedPropertyType,
    selectedAvailability,
    selectedPrivacy,
    selectedBedrooms,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    neighborhoodFilter,
    showArchived,
    sortBy,
    user,
  ]);

  const dealTypeTabs = [
    { id: 'all', label: 'همه معاملات' },
    { id: 'sale', label: 'فروش و خرید' },
    { id: 'rent', label: 'رهن و اجاره' },
    { id: 'presale', label: 'پیش‌فروش' },
  ];

  const clearAllFilters = () => {
    setSelectedDealType('all');
    setSelectedPropertyType('all');
    setSelectedAvailability('all');
    setSelectedPrivacy('all');
    setSelectedBedrooms('all');
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setMaxArea('');
    setNeighborhoodFilter('');
    setShowArchived(false);
    setSearch('');
  };

  const hasActiveAdvancedFilters =
    selectedPropertyType !== 'all' ||
    selectedAvailability !== 'all' ||
    selectedPrivacy !== 'all' ||
    selectedBedrooms !== 'all' ||
    Boolean(minPrice) ||
    Boolean(maxPrice) ||
    Boolean(minArea) ||
    Boolean(maxArea) ||
    Boolean(neighborhoodFilter) ||
    showArchived;

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Header & Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              فایل‌های ملکی
            </h1>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              {toPersianDigits(properties.length)} ملک
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {user?.role === 'manager'
              ? 'نمای نظارتی دپارتمان — مدیریت و رصد فایل‌های ثبت‌شده در تیم با حفظ حریم مالکین'
              : 'فایل‌های اختصاصی شما و فایل‌های اشتراکی در دپارتمان'}
          </p>
        </div>

        <button
          onClick={() => navigate('/properties/new')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت فایل جدید</span>
        </button>
      </div>

      {user?.role === 'manager' && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/80 flex items-center gap-2.5 text-xs text-blue-900">
          <Shield className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            به عنوان مدیر دپارتمان، تمامی فایل‌های اشتراکی و تیمی را مشاهده می‌کنید. شماره تلفن مستقیم مالکین طبق مقررات محرمانگی ماسک گردیده‌اند.
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
              placeholder="جستجو بر اساس عنوان، کد فایل، محله، امکانات یا مشخصات..."
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Select */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as PropertySortOption)}
                className="bg-transparent focus:outline-none font-semibold cursor-pointer text-xs"
              >
                <option value="newest">جدیدترین‌ها</option>
                <option value="price_desc">قیمت: بیشترین</option>
                <option value="price_asc">قیمت: کمترین</option>
                <option value="area_desc">متراژ: بزرگترین</option>
                <option value="area_asc">متراژ: کوچکتریـن</option>
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
              <span>فیلترهای پیشرفته</span>
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
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                <span>فیلترهای تفصیلی فایل‌های ملکی</span>
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
              {/* Property Type */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">نوع کاربری ملک</label>
                <select
                  value={selectedPropertyType}
                  onChange={(e) => setSelectedPropertyType(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">همه کاربری‌ها</option>
                  <option value="apartment">آپارتمان</option>
                  <option value="villa">ویلایی</option>
                  <option value="penthouse">پنت‌هاوس</option>
                  <option value="office">اداری</option>
                  <option value="store">مغازه/تجاری</option>
                  <option value="land">زمین/کلنگی</option>
                </select>
              </div>

              {/* Availability Status */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">وضعیت موجودی</label>
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="available">موجود و فعال</option>
                  <option value="reserved">رزرو شده</option>
                  <option value="sold">فروخته شده</option>
                  <option value="rented">اجاره داده شده</option>
                  <option value="archived">بایگانی شده</option>
                </select>
              </div>

              {/* Privacy */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">حریم خصوصی در تیم</label>
                <select
                  value={selectedPrivacy}
                  onChange={(e) => setSelectedPrivacy(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">همه فایل‌ها</option>
                  <option value="private">شخصی و محفوظ</option>
                  <option value="shared">اشتراکی با تیم</option>
                </select>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">تعداد اتاق خواب</label>
                <select
                  value={selectedBedrooms}
                  onChange={(e) => setSelectedBedrooms(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">همه</option>
                  <option value="1">۱ خوابه</option>
                  <option value="2">۲ خوابه</option>
                  <option value="3">۳ خوابه</option>
                  <option value="4">۴ خوابه به بالا</option>
                </select>
              </div>

              {/* Neighborhood */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">محله / منطقه</label>
                <input
                  type="text"
                  value={neighborhoodFilter}
                  onChange={(e) => setNeighborhoodFilter(e.target.value)}
                  placeholder="مثلاً سعادت‌آباد..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                />
              </div>

              {/* Area Range */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">حداقل متراژ (متر)</label>
                <input
                  type="number"
                  value={minArea}
                  onChange={(e) => setMinArea(e.target.value)}
                  placeholder="مثلاً 80"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">حداکثر متراژ (متر)</label>
                <input
                  type="number"
                  value={maxArea}
                  onChange={(e) => setMaxArea(e.target.value)}
                  placeholder="مثلاً 200"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono"
                />
              </div>

              {/* Show Archived Toggle */}
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="archivedCheck"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 cursor-pointer"
                />
                <label htmlFor="archivedCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  نمایش فایل‌های بایگانی‌شده
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Properties Grid */}
      {loading ? (
        <LoadingState text="در حال دریافت فایل‌های ملکی مجاز..." className="py-16" />
      ) : properties.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-8 h-8" />}
          title="فایلی یافت نشد"
          description="هیچ فایل ملکی با فیلترهای انتخابی یا در محدوده دسترسی حساب شما پیدا نشد."
          actionLabel="ثبت فایل جدید"
          onAction={() => navigate('/properties/new')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {properties.map((prop) => {
            const isArchived = prop.availabilityStatus === 'archived' || prop.status === 'archived';
            const isOwner = prop.ownerId === user?.id;

            return (
              <div
                key={prop.id}
                onClick={() => navigate(`/properties/${prop.id}`)}
                className={`bg-white rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between overflow-hidden cursor-pointer group ${
                  isArchived ? 'border-amber-300/80 bg-amber-50/20 opacity-80' : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Image & Badges */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    {prop.images && prop.images[0] ? (
                      <img
                        src={prop.images[0]}
                        alt={prop.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Building2 className="w-12 h-12" />
                      </div>
                    )}

                    <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-xs text-white shadow-xs">
                        {getDealTypeLabel(prop.transactionType || prop.dealType)}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-white/90 backdrop-blur-xs text-slate-800 shadow-xs">
                        {getPropertyTypeLabel(prop.propertyType)}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="bg-white/90 backdrop-blur-xs text-slate-700 text-[11px] font-mono font-bold px-2 py-0.5 rounded">
                        {prop.code}
                      </span>
                      <span
                        className={`backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded ${
                          (prop.privacyStatus || prop.privacyState) === 'shared'
                            ? 'bg-blue-600/90 text-white'
                            : 'bg-emerald-600/90 text-white'
                        }`}
                      >
                        {(prop.privacyStatus || prop.privacyState) === 'shared' ? 'اشتراکی تیم' : 'فایل شخصی'}
                      </span>
                      {isArchived && (
                        <span className="bg-amber-600 text-white backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <Archive className="w-2.5 h-2.5" />
                          <span>بایگانی</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-2.5">
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1 leading-snug group-hover:text-emerald-700 transition-colors">
                      {prop.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {prop.city || 'تهران'}، {prop.region ? `${prop.region}، ` : ''}
                        {prop.neighborhood || prop.district}
                      </span>
                    </div>

                    {/* Pricing */}
                    <div className="pt-2 border-t border-slate-100">
                      {(prop.transactionType === 'rent' || prop.dealType === 'rent') ? (
                        <div className="text-xs sm:text-sm font-bold text-slate-800 space-y-0.5">
                          <div>
                            <span className="text-slate-500 font-normal">ودیعه: </span>
                            <span className="text-emerald-700 font-extrabold">
                              {formatPriceToman(prop.deposit || prop.depositPrice || 0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-normal">اجاره: </span>
                            <span className="text-slate-900 font-extrabold">
                              {formatPriceToman(prop.rent || prop.monthlyRent || prop.rentPrice || 0)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs text-slate-500">قیمت کل: </span>
                          <span className="text-sm sm:text-base font-extrabold text-emerald-700">
                            {formatPriceToman(prop.price || prop.totalPrice || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Specs Footer */}
                <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-medium">
                      <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                      {toPersianDigits(prop.area)} متر
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                      {toPersianDigits(prop.bedrooms)} خواب
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {isOwner ? 'ثبت‌شده توسط شما' : prop.agentName || 'مشاور همکار'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
