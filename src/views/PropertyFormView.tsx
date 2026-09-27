import React, { useState, useEffect } from 'react';
import {
  Building2,
  ArrowRight,
  Save,
  Check,
  MapPin,
  Maximize2,
  BedDouble,
  DollarSign,
  Sparkles,
  Upload,
  Image as ImageIcon,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Shield,
  Layers,
  Home,
  CheckCircle2,
} from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { propertyService } from '../services/propertyService';
import { DealType, PropertyType, Property, AvailabilityStatus, PrivacyStatus, PropertyStatus } from '../types';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useToast } from '../components/common/Toast';
import { formatPriceToman, toPersianDigits } from '../utils/formatters';

interface PropertyFormViewProps {
  isEditMode?: boolean;
}

const COMMON_FEATURES = [
  'پارکینگ سندی',
  'آسانسور',
  'انباری سندی',
  'بالکن / تراس',
  'مستر روم',
  'لابی مجلل',
  'سرایدار مقیم',
  'استخر و سونا',
  'روف گاردن',
  'سیستم هوشمند',
  'سند تک‌برگ',
  'ویو بدون مشرف',
];

const TEHRAN_DISTRICTS = [
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
  'یوسف‌آباد',
  'مرزداران',
  'صادقیه',
  'پونک',
  'جنت‌آباد',
  'تهرانپارس',
  'ستارخان',
];

export const PropertyFormView: React.FC<PropertyFormViewProps> = ({ isEditMode: propEditMode }) => {
  const { params, navigate, goBack } = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const isEdit = propEditMode || params.mode === 'edit';
  const propertyId = params.id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 1. نوع معامله
  const [transactionType, setTransactionType] = useState<DealType>('sale');

  // 2. نوع ملک
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment');

  // 3. موقعیت
  const [city, setCity] = useState('تهران');
  const [region, setRegion] = useState('منطقه ۲');
  const [neighborhood, setNeighborhood] = useState('سعادت‌آباد');
  const [address, setAddress] = useState('');

  // 4. مشخصات
  const [area, setArea] = useState('110');
  const [bedrooms, setBedrooms] = useState(2);
  const [floor, setFloor] = useState('3');
  const [totalFloors, setTotalFloors] = useState('5');
  const [yearBuilt, setYearBuilt] = useState('1402');

  // 5. قیمت
  const [price, setPrice] = useState('12500000000'); // 12.5 میلیارد تومان
  const [deposit, setDeposit] = useState('800000000');
  const [rent, setRent] = useState('25000000');

  // 6. امکانات
  const [features, setFeatures] = useState<string[]>([
    'پارکینگ سندی',
    'آسانسور',
    'انباری سندی',
    'بالکن / تراس',
  ]);
  const [customFeature, setCustomFeature] = useState('');

  // 7. توضیحات و اطلاعات مالک
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerName, setOwnerName] = useState('مالک محترم');
  const [ownerPhone, setOwnerPhone] = useState('09123456789');
  const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus>('private');
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>('available');

  // 8. تصاویر
  const [media, setMedia] = useState<string[]>([
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
  ]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Pre-load if edit mode
  useEffect(() => {
    if (!isEdit || !propertyId) return;

    const fetchProp = async () => {
      try {
        setInitialLoading(true);
        const p = await propertyService.getById(propertyId, user);
        if (!p) {
          toast.error('ملک یافت نشد یا دسترسی ویرایش ندارید');
          goBack();
          return;
        }

        setTransactionType(p.transactionType || p.dealType || 'sale');
        setPropertyType(p.propertyType || 'apartment');
        setCity(p.city || 'تهران');
        setRegion(p.region || 'منطقه ۲');
        setNeighborhood(p.neighborhood || p.district || 'سعادت‌آباد');
        setAddress(p.address || p.fullAddress || p.addressSummary || '');
        setArea(String(p.area || ''));
        setBedrooms(p.bedrooms ?? 2);
        setFloor(String(p.floor ?? '3'));
        setTotalFloors(String(p.totalFloors ?? '5'));
        setYearBuilt(String(p.yearBuilt ?? '1402'));

        if (p.price || p.totalPrice) setPrice(String(p.price || p.totalPrice));
        if (p.deposit || p.depositPrice) setDeposit(String(p.deposit || p.depositPrice));
        if (p.rent || p.monthlyRent || p.rentPrice) setRent(String(p.rent || p.monthlyRent || p.rentPrice));

        if (p.features && p.features.length > 0) setFeatures(p.features);
        setTitle(p.title || '');
        setDescription(p.description || '');
        setOwnerName(p.ownerName || '');
        setOwnerPhone(p.ownerPhone || '');
        setPrivacyStatus((p.privacyStatus || p.privacyState || 'private') as PrivacyStatus);
        setAvailabilityStatus((p.availabilityStatus || p.status || 'available') as AvailabilityStatus);

        const images = p.media || p.images || [];
        if (images.length > 0) setMedia(images);
      } catch (err: any) {
        toast.error(err.message || 'خطا در بارگذاری اطلاعات ملک');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchProp();
  }, [isEdit, propertyId, user]);

  // Quick auto-title suggestion
  const generateSuggestedTitle = () => {
    const typeLabel =
      propertyType === 'apartment'
        ? 'آپارتمان'
        : propertyType === 'villa'
        ? 'ویلایی'
        : propertyType === 'penthouse'
        ? 'پنت‌هاوس'
        : propertyType === 'office'
        ? 'واحد اداری'
        : propertyType === 'store'
        ? 'مغازه'
        : 'زمین';
    const dealLabel = transactionType === 'sale' ? 'فروش' : transactionType === 'rent' ? 'اجاره' : 'پیش‌فروش';
    return `${dealLabel} ${typeLabel} ${area} متری ${bedrooms > 0 ? `${bedrooms} خوابه` : ''} در ${neighborhood}`;
  };

  const handleApplySuggestedTitle = () => {
    setTitle(generateSuggestedTitle());
  };

  const toggleFeature = (feat: string) => {
    if (features.includes(feat)) {
      setFeatures(features.filter((f) => f !== feat));
    } else {
      setFeatures([...features, feat]);
    }
  };

  const handleAddCustomFeature = () => {
    if (customFeature.trim() && !features.includes(customFeature.trim())) {
      setFeatures([...features, customFeature.trim()]);
      setCustomFeature('');
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setMedia([...media, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Convert file to local preview URL
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setMedia((prev) => [...prev, uploadEvent.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    toast.success('تصویر با موفقیت بارگذاری شد');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalTitle = title.trim() || generateSuggestedTitle();

    if (!area || Number(area) <= 0) {
      toast.error('لطفاً متراژ ملک را به درستی وارد نمایید');
      return;
    }

    if (transactionType === 'sale' && (!price || Number(price) <= 0)) {
      toast.error('لطفاً قیمت کل فروش را تعیین کنید');
      return;
    }

    if (transactionType === 'rent' && (!deposit || Number(deposit) < 0)) {
      toast.error('لطفاً مبلغ ودیعه را وارد کنید');
      return;
    }

    if (!ownerPhone.trim()) {
      toast.error('شماره تماس مالک برای ثبت پرونده و تماس‌های شما الزامی است');
      return;
    }

    try {
      setLoading(true);

      const propData = {
        title: finalTitle,
        transactionType,
        dealType: transactionType,
        propertyType,
        city,
        region,
        neighborhood,
        district: neighborhood,
        address: address || `${city}، ${neighborhood}، نشانی در دسترس مشاور`,
        addressSummary: `${city}، ${neighborhood}`,
        area: Number(area),
        bedrooms: Number(bedrooms),
        floor: Number(floor) || 1,
        totalFloors: Number(totalFloors) || 5,
        yearBuilt: Number(yearBuilt) || 1400,
        price: transactionType === 'sale' ? Number(price) : undefined,
        totalPrice: transactionType === 'sale' ? Number(price) : undefined,
        deposit: transactionType === 'rent' ? Number(deposit) : undefined,
        rent: transactionType === 'rent' ? Number(rent) : undefined,
        monthlyRent: transactionType === 'rent' ? Number(rent) : undefined,
        features,
        description: description || `ملک ${finalTitle} با نورگیر عالی و امکانات کامل`,
        availabilityStatus,
        status: (availabilityStatus === 'archived'
          ? 'archived'
          : availabilityStatus === 'reserved'
          ? 'reserved'
          : availabilityStatus === 'sold' || availabilityStatus === 'rented'
          ? 'deal_closed'
          : 'active') as PropertyStatus,
        privacyStatus,
        privacyState: privacyStatus,
        media: media.length > 0 ? media : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80'],
        images: media.length > 0 ? media : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80'],
        ownerName: ownerName || 'مالک محترم',
        ownerPhone,
        agentId: user?.id || 'usr_101',
        agentName: user?.fullName || 'مشاور املاک',
        teamId: user?.teamId,
      };

      if (isEdit && propertyId) {
        await propertyService.update(propertyId, propData, user);
        toast.success('تغییرات فایل ملکی با موفقیت ذخیره شد');
        navigate(`/properties/${propertyId}`);
      } else {
        const created = await propertyService.create(propData as any, user);
        toast.success('فایل ملکی جدید با موفقیت ثبت شد');
        navigate(`/properties/${created.id}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'خطا در ثبت اطلاعات فایل');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">در حال آماده‌سازی اطلاعات فایل...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Top Header */}
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
            جریان ثبت سریع موبایل
          </span>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            {isEdit ? 'ویرایش پرونده فایل ملکی' : 'ثبت فایل ملکی جدید'}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* SECTION 1: نوع معامله */}
        <Card className="space-y-3" padding="md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                ۱
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">نوع معامله</h3>
            </div>
            <span className="text-[11px] text-slate-400">انتخاب جهت تطبیق سریع با مشتریان</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'sale', label: 'فروش (خرید نقدی)', icon: '💰' },
              { id: 'rent', label: 'رهن و اجاره', icon: '🔑' },
              { id: 'presale', label: 'پیش‌فروش ساختمانی', icon: '🏗️' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTransactionType(t.id as DealType)}
                className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  transactionType === t.id
                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-base">{t.icon}</span>
                <span className="text-xs leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* SECTION 2: نوع ملک */}
        <Card className="space-y-3" padding="md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                ۲
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">نوع کاربری ملک</h3>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { id: 'apartment', label: 'آپارتمان' },
              { id: 'villa', label: 'ویلایی' },
              { id: 'penthouse', label: 'پنت‌هاوس' },
              { id: 'office', label: 'اداری' },
              { id: 'store', label: 'مغازه/تجاری' },
              { id: 'land', label: 'زمین/کلنگی' },
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
        </Card>

        {/* SECTION 3: موقعیت */}
        <Card className="space-y-3" padding="md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                ۳
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">موقعیت و لوکیشن</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">شهر</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                placeholder="مثلاً تهران"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">منطقه شهرداری</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                placeholder="مثلاً منطقه ۲"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">محله / خیابان اصلی</label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-bold"
                placeholder="مثلاً سعادت‌آباد"
                required
              />
            </div>
          </div>

          {/* Quick neighborhood tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400">محله‌های سریع:</span>
            {TEHRAN_DISTRICTS.slice(0, 8).map((nh) => (
              <button
                key={nh}
                type="button"
                onClick={() => setNeighborhood(nh)}
                className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                  neighborhood === nh
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {nh}
              </button>
            ))}
          </div>

          {showAdvanced && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نشانی دقیق و پلاک (فقط برای شما قابل مشاهده است)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                placeholder="خیابان، کوچه، پلاک، طبقه و واحد"
              />
            </div>
          )}
        </Card>

        {/* SECTION 4: مشخصات */}
        <Card className="space-y-3" padding="md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                ۴
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">مشخصات متراژ و فضا</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                متراژ مفید (متر مربع) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-bold rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="110"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تعداد اتاق خواب</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 1, 2, 3, 4].map((bed) => (
                  <button
                    key={bed}
                    type="button"
                    onClick={() => setBedrooms(bed)}
                    className={`py-2 text-xs rounded-lg border font-bold cursor-pointer ${
                      bedrooms === bed
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {bed === 0 ? 'سوئیت' : `${toPersianDigits(bed)} خواب`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs text-slate-600 mb-1">طبقه واحد</label>
                <input
                  type="number"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">کل طبقات</label>
                <input
                  type="number"
                  value={totalFloors}
                  onChange={(e) => setTotalFloors(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">سال ساخت</label>
                <input
                  type="number"
                  value={yearBuilt}
                  onChange={(e) => setYearBuilt(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>
            </div>
          )}
        </Card>

        {/* SECTION 5: قیمت */}
        <Card className="space-y-3" padding="md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                ۵
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">قیمت‌گذاری و شرایط مالی</h3>
            </div>
          </div>

          {transactionType === 'sale' || transactionType === 'presale' ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                قیمت کل ملک (تومان) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-bold text-emerald-800 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="12500000000"
                required
              />
              {price && Number(price) > 0 && (
                <div className="p-2.5 bg-emerald-50 rounded-xl text-xs font-bold text-emerald-800 border border-emerald-100">
                  معادل: {formatPriceToman(Number(price))}
                  {area && Number(area) > 0 && (
                    <span className="text-slate-500 font-normal mr-2">
                      (متری: {formatPriceToman(Math.round(Number(price) / Number(area)))})
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  مبلغ ودیعه / رهن (تومان) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="800000000"
                  required
                />
                {deposit && Number(deposit) > 0 && (
                  <p className="text-[11px] text-emerald-700 font-medium">
                    {formatPriceToman(Number(deposit))}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  اجاره ماهیانه (تومان)
                </label>
                <input
                  type="number"
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="25000000"
                />
                {rent && Number(rent) > 0 && (
                  <p className="text-[11px] text-emerald-700 font-medium">
                    {formatPriceToman(Number(rent))}
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* SECTION 6: امکانات */}
        <Card className="space-y-3" padding="md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                ۶
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">امکانات و آپشن‌ها</h3>
            </div>
            <span className="text-[11px] text-slate-400">
              {toPersianDigits(features.length)} امکان انتخاب شده
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {COMMON_FEATURES.map((feat) => {
              const selected = features.includes(feat);
              return (
                <button
                  key={feat}
                  type="button"
                  onClick={() => toggleFeature(feat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                    selected
                      ? 'border-emerald-600 bg-emerald-700 text-white font-bold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5" />}
                  <span>{feat}</span>
                </button>
              );
            })}
          </div>

          {/* Add custom feature */}
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={customFeature}
              onChange={(e) => setCustomFeature(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomFeature();
                }
              }}
              placeholder="افزودن امکان دلخواه (مثلاً چیلر مرکزی، باربیکیو...)"
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCustomFeature}
            >
              افزودن
            </Button>
          </div>
        </Card>

        {/* SECTION 7: توضیحات و اطلاعات مالک */}
        <Card className="space-y-4" padding="md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                ۷
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">توضیحات و حریم خصوصی مالک</h3>
            </div>
            <button
              type="button"
              onClick={handleApplySuggestedTitle}
              className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>پیشنهاد هوشمند عنوان</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              عنوان فایل ملکی
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-bold"
              placeholder={generateSuggestedTitle()}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نام مالک
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                placeholder="مثلاً آقای خسروی"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                شماره تماس مالک <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-mono"
                placeholder="0912..."
                required
              />
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>شماره مالک برای مدیران و سایر مشاوران ماسک می‌شود.</span>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              توضیحات تکمیلی و نکات کارشناسی
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed"
              placeholder="توضیحات در مورد دسترسی‌ها، نور، نقشه و شرایط مالک..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                سطح محرمانگی در تیم
              </label>
              <select
                value={privacyStatus}
                onChange={(e) => setPrivacyStatus(e.target.value as PrivacyStatus)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="private">فایل شخصی و محرمانه (فقط من)</option>
                <option value="shared">اشتراک در دپارتمان (تلفن مالک پنهان است)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                وضعیت موجودی ملک
              </label>
              <select
                value={availabilityStatus}
                onChange={(e) => setAvailabilityStatus(e.target.value as AvailabilityStatus)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="available">موجود و آماده بازدید</option>
                <option value="reserved">رزرو شده / در حال مذاکره</option>
                <option value="sold">فروخته شده</option>
                <option value="rented">اجاره داده شده</option>
                <option value="archived">بایگانی شده</option>
              </select>
            </div>
          </div>
        </Card>

        {/* SECTION 8: تصاویر */}
        <Card className="space-y-3" padding="md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                ۸
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">تصاویر و مدیا</h3>
            </div>
            <span className="text-[11px] text-slate-400">
              {toPersianDigits(media.length)} تصویر موجود
            </span>
          </div>

          {/* Image preview grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {media.map((imgUrl, idx) => (
              <div
                key={idx}
                className="relative group rounded-xl overflow-hidden aspect-4/3 bg-slate-100 border border-slate-200"
              >
                <img
                  src={imgUrl}
                  alt={`تصویر ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                {idx === 0 && (
                  <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                    کاور اصلی
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1 left-1 bg-rose-600 text-white p-1 rounded-full opacity-80 hover:opacity-100 cursor-pointer shadow-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Add image actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl text-xs text-slate-600 hover:text-emerald-700 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>انتخاب عکس از حافظه دستگاه</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="flex gap-1">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="یا درج لینک عکس..."
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 w-44"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddImage}>
                افزودن
              </Button>
            </div>
          </div>
        </Card>

        {/* Toggle Advanced Fields */}
        <div className="flex items-center justify-center pt-1">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer py-1 px-3 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>مخفی‌سازی فیلدهای پیشرفته</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>نمایش فیلدهای پیشرفته (نشانی دقیق، سال ساخت، طبقات)</span>
              </>
            )}
          </button>
        </div>

        {/* Submit Bar */}
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-3 py-2"
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
            {isEdit ? 'ذخیره تغییرات ملک' : 'ثبت قطعی فایل ملکی'}
          </Button>
        </div>
      </form>
    </div>
  );
};
