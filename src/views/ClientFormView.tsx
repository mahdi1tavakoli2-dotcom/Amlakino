import React, { useState, useEffect } from 'react';
import {
  Users,
  ArrowRight,
  Save,
  Check,
  Shield,
  Phone,
  Sparkles,
  MapPin,
  Maximize2,
  DollarSign,
  AlertCircle,
  Plus,
  X,
} from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { clientService } from '../services/clientService';
import { Client, DealType, PropertyType, ClientUrgency, ClientStatus, PrivacyStatus } from '../types';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useToast } from '../components/common/Toast';
import { formatPriceToman, toPersianDigits } from '../utils/formatters';

interface ClientFormViewProps {
  isEditMode?: boolean;
}

const COMMON_REQUIREMENTS = [
  'حتماً پارکینگ سندی',
  'حتماً دارای آسانسور',
  'انباری سندی',
  'نورگیر جنوب / آفتابگیر',
  'سند تک‌برگ رسمی',
  'کم‌واحد (حداکثر ۱۰ واحد)',
  'نوساز یا زیر ۵ سال',
  'مستر روم',
  'بالکن قابل چیدمان',
  'دسترسی سریع به مترو/اتوبان',
  'آرام و دنج',
];

const POPULAR_REGIONS = [
  'سعادت‌آباد',
  'شهرک غرب',
  'نیاوران',
  'فرمانیه',
  'زعفرانیه',
  'ولنجک',
  'پاسداران',
  'الهیه',
  'قیطریه',
  'جردن',
  'ونک',
  'مرزداران',
  'صادقیه',
  'پونک',
  'جنت‌آباد',
  'یوسف‌آباد',
];

export const ClientFormView: React.FC<ClientFormViewProps> = ({ isEditMode: propEditMode }) => {
  const { params, navigate, goBack } = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const isEdit = propEditMode || params.mode === 'edit';
  const clientId = params.id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  // Client Basic Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Transaction & Property Type
  const [transactionType, setTransactionType] = useState<DealType>('sale');
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment');

  // Location Preferences
  const [preferredCity, setPreferredCity] = useState('تهران');
  const [preferredRegions, setPreferredRegions] = useState<string[]>(['سعادت‌آباد']);
  const [customRegion, setCustomRegion] = useState('');

  // Specifications
  const [minArea, setMinArea] = useState('90');
  const [maxArea, setMaxArea] = useState('140');
  const [bedrooms, setBedrooms] = useState(2);

  // Budget
  const [minBudget, setMinBudget] = useState('9000000000'); // 9 billion
  const [maxBudget, setMaxBudget] = useState('14000000000'); // 14 billion

  // Requirements & Tags
  const [requirements, setRequirements] = useState<string[]>([
    'حتماً پارکینگ سندی',
    'حتماً دارای آسانسور',
  ]);
  const [customRequirement, setCustomRequirement] = useState('');

  // Urgency & Notes & Status
  const [urgency, setUrgency] = useState<ClientUrgency>('high');
  const [status, setStatus] = useState<ClientStatus>('active');
  const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus>('private');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isEdit || !clientId) return;

    const fetchClient = async () => {
      try {
        setInitialLoading(true);
        const c = await clientService.getById(clientId, user);
        if (!c) {
          toast.error('پرونده متقاضی یافت نشد یا دسترسی ویرایش ندارید');
          goBack();
          return;
        }

        setName(c.name || c.fullName || '');
        setPhone(c.phone || c.mobile || '');
        setTransactionType(c.transactionType || c.desiredDealType || 'sale');
        setPropertyType((c.propertyType || c.desiredPropertyTypes?.[0] || 'apartment') as PropertyType);
        setPreferredCity(c.preferredCity || 'تهران');
        setPreferredRegions(c.preferredRegions || c.desiredDistricts || ['سعادت‌آباد']);
        setMinArea(String(c.minArea ?? ''));
        setMaxArea(String(c.maxArea ?? ''));
        setBedrooms(c.bedrooms ?? c.minBedrooms ?? 2);

        const bMin = c.minBudget ?? c.budgetMin ?? 0;
        const bMax = c.maxBudget ?? c.budgetMax ?? 0;
        if (bMin > 0) setMinBudget(String(bMin));
        if (bMax > 0) setMaxBudget(String(bMax));

        if (c.requirements && c.requirements.length > 0) {
          setRequirements(c.requirements);
        }
        setUrgency(c.urgency || 'medium');
        setStatus(c.status || 'active');
        setPrivacyStatus((c.privacyStatus || c.privacyState || 'private') as PrivacyStatus);
        setNotes(c.notes || '');
      } catch (err: any) {
        toast.error(err.message || 'خطا در دریافت اطلاعات متقاضی');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchClient();
  }, [isEdit, clientId, user]);

  const toggleRegion = (reg: string) => {
    if (preferredRegions.includes(reg)) {
      setPreferredRegions(preferredRegions.filter((r) => r !== reg));
    } else {
      setPreferredRegions([...preferredRegions, reg]);
    }
  };

  const handleAddCustomRegion = () => {
    if (customRegion.trim() && !preferredRegions.includes(customRegion.trim())) {
      setPreferredRegions([...preferredRegions, customRegion.trim()]);
      setCustomRegion('');
    }
  };

  const toggleRequirement = (req: string) => {
    if (requirements.includes(req)) {
      setRequirements(requirements.filter((r) => r !== req));
    } else {
      setRequirements([...requirements, req]);
    }
  };

  const handleAddCustomRequirement = () => {
    if (customRequirement.trim() && !requirements.includes(customRequirement.trim())) {
      setRequirements([...requirements, customRequirement.trim()]);
      setCustomRequirement('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('لطفاً نام و نام‌خانوادگی مشتری را وارد کنید');
      return;
    }

    if (!phone.trim()) {
      toast.error('شماره تماس مشتری الزامی است');
      return;
    }

    if (preferredRegions.length === 0) {
      toast.error('حداقل یک منطقه یا محله مورد تقاضا انتخاب کنید');
      return;
    }

    try {
      setLoading(true);

      const clientData = {
        name: name.trim(),
        fullName: name.trim(),
        phone: phone.trim(),
        mobile: phone.trim(),
        role: transactionType === 'sale' ? ('buyer' as const) : ('tenant' as const),
        transactionType,
        desiredDealType: transactionType,
        propertyType,
        desiredPropertyTypes: [propertyType],
        preferredCity,
        preferredRegions,
        desiredDistricts: preferredRegions,
        minArea: minArea ? Number(minArea) : undefined,
        maxArea: maxArea ? Number(maxArea) : undefined,
        bedrooms: Number(bedrooms),
        minBedrooms: Number(bedrooms),
        minBudget: minBudget ? Number(minBudget) : undefined,
        maxBudget: maxBudget ? Number(maxBudget) : undefined,
        budgetMin: minBudget ? Number(minBudget) : undefined,
        budgetMax: maxBudget ? Number(maxBudget) : undefined,
        requirements,
        urgency,
        notes: notes || 'متقاضی جدی و آماده تصمیم‌گیری',
        status,
        privacyStatus,
        privacyState: privacyStatus,
        agentId: user?.id || 'usr_101',
        agentName: user?.fullName || 'مشاور املاک',
        teamId: user?.teamId,
      };

      if (isEdit && clientId) {
        await clientService.update(clientId, clientData, user);
        toast.success('تغییرات پرونده متقاضی ذخیره شد');
        navigate(`/clients/${clientId}`);
      } else {
        const created = await clientService.create(clientData as any, user);
        toast.success('پرونده متقاضی جدید با موفقیت ثبت شد');
        navigate(`/clients/${created.id}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'خطا در ذخیره متقاضی');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">در حال دریافت پرونده متقاضی...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>انصراف و بازگشت</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full font-bold">
            مدیریت هوشمند متقاضی
          </span>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            {isEdit ? 'ویرایش پرونده مشتری' : 'ثبت متقاضی و خریدار جدید'}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. اطلاعات پایه تماس */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-700" />
              <span>مشخصات فردی متقاضی</span>
            </h3>
            <span className="text-[11px] text-slate-400">حفظ محرمانگی شماره برای شما</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نام و نام خانوادگی <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً دکتر کامران حسینی"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                شماره تماس مستقیم <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>شماره مشتری برای سایر مشاوران و مدیران ماسک می‌شود.</span>
              </p>
            </div>
          </div>
        </Card>

        {/* 2. نوع معامله و کاربری */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">نوع درخواست و کاربری</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">نوع معامله مطلوب</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'sale', label: 'خرید ملک (نقدی)', icon: '💰' },
                  { id: 'rent', label: 'رهن و اجاره', icon: '🔑' },
                  { id: 'presale', label: 'پیش‌خرید ساختمانی', icon: '🏗️' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTransactionType(t.id as DealType)}
                    className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      transactionType === t.id
                        ? 'border-emerald-600 bg-emerald-50/60 text-emerald-900 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span className="text-xs">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1.5">نوع ملک درخواستی</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { id: 'apartment', label: 'آپارتمان' },
                  { id: 'villa', label: 'ویلایی' },
                  { id: 'penthouse', label: 'پنت‌هاوس' },
                  { id: 'office', label: 'اداری' },
                  { id: 'store', label: 'مغازه' },
                  { id: 'land', label: 'زمین' },
                ].map((pt) => (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => setPropertyType(pt.id as PropertyType)}
                    className={`py-2 px-1 rounded-xl border text-center text-xs transition-all cursor-pointer ${
                      propertyType === pt.id
                        ? 'border-emerald-600 bg-emerald-700 text-white font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* 3. موقعیت و مناطق مدنظر */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-700" />
              <span>مناطق و محله‌های مورد نظر متقاضی</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              {toPersianDigits(preferredRegions.length)} منطقه انتخاب شده
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {POPULAR_REGIONS.map((reg) => {
              const selected = preferredRegions.includes(reg);
              return (
                <button
                  key={reg}
                  type="button"
                  onClick={() => toggleRegion(reg)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-all cursor-pointer flex items-center gap-1 ${
                    selected
                      ? 'border-emerald-600 bg-emerald-700 text-white font-bold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {selected && <Check className="w-3 h-3" />}
                  <span>{reg}</span>
                </button>
              );
            })}
          </div>

          {/* Add custom region */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={customRegion}
              onChange={(e) => setCustomRegion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomRegion();
                }
              }}
              placeholder="افزودن محله یا منطقه دیگر..."
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddCustomRegion}>
              افزودن
            </Button>
          </div>
        </Card>

        {/* 4. بودجه و توان مالی */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-700" />
              <span>
                {transactionType === 'sale'
                  ? 'سقف و محدوده بودجه خرید (تومان)'
                  : 'محدوده بودجه ودیعه و اجاره'}
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                حداقل بودجه (تومان)
              </label>
              <input
                type="number"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                placeholder="9000000000"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
              {minBudget && Number(minBudget) > 0 && (
                <p className="text-[11px] text-emerald-700 mt-1">
                  از: {formatPriceToman(Number(minBudget))}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                حداکثر سقف بودجه (تومان) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder="14000000000"
                className="w-full px-3 py-2 text-xs font-bold text-emerald-800 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
              {maxBudget && Number(maxBudget) > 0 && (
                <p className="text-[11px] text-emerald-700 mt-1 font-bold">
                  تا سقف: {formatPriceToman(Number(maxBudget))}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* 5. متراژ و تعداد خواب */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Maximize2 className="w-4 h-4 text-emerald-700" />
              <span>محدوده متراژ و اتاق خواب</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                حداقل متراژ (متر)
              </label>
              <input
                type="number"
                value={minArea}
                onChange={(e) => setMinArea(e.target.value)}
                placeholder="90"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                حداکثر متراژ (متر)
              </label>
              <input
                type="number"
                value={maxArea}
                onChange={(e) => setMaxArea(e.target.value)}
                placeholder="140"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                حداقل تعداد خواب
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBedrooms(b)}
                    className={`py-1.5 text-xs rounded-lg border font-bold cursor-pointer ${
                      bedrooms === b
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {toPersianDigits(b)} خواب
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* 6. نیازمندی‌ها و شروط اختصاصی */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              نیازمندی‌ها و شروط کلیدی متقاضی
            </h3>
            <span className="text-[11px] text-slate-400">
              {toPersianDigits(requirements.length)} شرط تعریف شده
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {COMMON_REQUIREMENTS.map((req) => {
              const selected = requirements.includes(req);
              return (
                <button
                  key={req}
                  type="button"
                  onClick={() => toggleRequirement(req)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs border transition-all cursor-pointer flex items-center gap-1.5 ${
                    selected
                      ? 'border-emerald-600 bg-emerald-700 text-white font-bold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5" />}
                  <span>{req}</span>
                </button>
              );
            })}
          </div>

          {/* Add custom requirement */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={customRequirement}
              onChange={(e) => setCustomRequirement(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomRequirement();
                }
              }}
              placeholder="افزودن شرط دلخواه (مثلاً روف‌گاردن یا طبقه آخر بودن...)"
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddCustomRequirement}>
              افزودن
            </Button>
          </div>
        </Card>

        {/* 7. فوریت، وضعیت و حریم خصوصی */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              فوریت، وضعیت پرونده و اشتراک تیمی
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                فوریت و جدیت خرید
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as ClientUrgency)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="urgent">فوری (آماده قرارداد ظرف چند روز)</option>
                <option value="high">بالا (ظرف ۲ تا ۳ هفته)</option>
                <option value="medium">متوسط (طی یک الی دو ماه)</option>
                <option value="low">کم (در حال بررسی بازار)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                وضعیت پرونده
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ClientStatus)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="active">فعال و در جریان</option>
                <option value="lead">سرنخ اولیه (Lead)</option>
                <option value="negotiation">در حال مذاکره</option>
                <option value="contracted">قرارداد منعقد شد</option>
                <option value="lost">انصراف / بسته شد</option>
                <option value="archived">بایگانی</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                سطح محرمانگی در تیم
              </label>
              <select
                value={privacyStatus}
                onChange={(e) => setPrivacyStatus(e.target.value as PrivacyStatus)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="private">شخصی و محفوظ (فقط من)</option>
                <option value="shared">اشتراک نیازمندی با همکاران</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              یادداشت‌های اختصاصی مشاور
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="نکات مهم در مورد رفتار، سلیقه و نوع پرداخت مشتری..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
          </div>
        </Card>

        {/* Submit */}
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-3 py-2 cursor-pointer"
          >
            انصراف
          </button>

          <Button
            type="submit"
            isLoading={loading}
            size="md"
            className="px-6 font-bold"
            rightIcon={<Save className="w-4 h-4" />}
          >
            {isEdit ? 'ذخیره تغییرات پرونده' : 'ثبت قطعی متقاضی'}
          </Button>
        </div>
      </form>
    </div>
  );
};
