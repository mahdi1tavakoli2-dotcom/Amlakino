import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  BedDouble,
  Maximize2,
  Calendar,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  Share2,
  Edit,
  ArrowRight,
  Shield,
  Lock,
  Unlock,
  UserCheck,
  Archive,
  RefreshCw,
  Plus,
  MessageSquare,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Send,
  UserPlus,
} from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { propertyService } from '../services/propertyService';
import { matchService } from '../services/matchService';
import { Property, Match, AvailabilityStatus } from '../types';
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
import { useToast } from '../components/common/Toast';

export const PropertyDetailView: React.FC = () => {
  const { params, navigate, goBack } = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [property, setProperty] = useState<Property | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOwnerPhone, setShowOwnerPhone] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Note addition state
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Media addition state
  const [showAddMedia, setShowAddMedia] = useState(false);
  const [newMediaUrl, setNewMediaUrl] = useState('');

  const loadProperty = async () => {
    if (!params.id) return;
    try {
      setLoading(true);
      const prop = await propertyService.getById(params.id, user);
      if (prop) {
        setProperty(prop);
        const foundMatches = await matchService.findMatchesForProperty(prop.id, user);
        setMatches(foundMatches);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'خطا در دریافت مشخصات فایل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperty();
  }, [params.id, user]);

  const handleTogglePrivacy = async () => {
    if (!property || !user) return;
    try {
      setActionLoading(true);
      const updated = await propertyService.togglePrivacy(property.id, user);
      if (updated) {
        setProperty(updated);
        toast.success(
          updated.privacyState === 'shared'
            ? 'فایل با اعضای تیم به اشتراک گذاشته شد (اطلاعات تماس مالک ماسک و محفوظ است)'
            : 'فایل به حالت خصوصی بازگردانده شد'
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'خطا در تغییر سطح دسترسی');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAvailabilityChange = async (newStatus: AvailabilityStatus) => {
    if (!property || !user) return;
    try {
      setActionLoading(true);
      const updated = await propertyService.updateAvailability(property.id, newStatus, user);
      if (updated) {
        setProperty(updated);
        const statusLabels: Record<AvailabilityStatus, string> = {
          available: 'موجود و فعال',
          reserved: 'رزرو / در حال مذاکره',
          sold: 'فروخته شد',
          rented: 'اجاره داده شد',
          archived: 'بایگانی شد',
        };
        toast.success(`وضعیت موجودی به "${statusLabels[newStatus]}" تغییر یافت`);
      }
    } catch (err: any) {
      toast.error(err.message || 'خطا در تغییر وضعیت');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!property || !user) return;
    try {
      setActionLoading(true);
      const isCurrentlyArchived = property.availabilityStatus === 'archived' || property.status === 'archived';
      if (isCurrentlyArchived) {
        const restored = await propertyService.restore(property.id, user);
        if (restored) {
          setProperty(restored);
          toast.success('فایل ملکی از بایگانی بازیابی شد و فعال گردید');
        }
      } else {
        const archived = await propertyService.archive(property.id, user);
        if (archived) {
          setProperty(archived);
          toast.success('فایل ملکی با موفقیت بایگانی شد');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'خطا در تغییر وضعیت بایگانی');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !property) return;
    try {
      setSubmittingNote(true);
      const updated = await propertyService.addNote(property.id, newNote.trim(), user);
      if (updated) {
        setProperty(updated);
        setNewNote('');
        toast.success('یادداشت جدید با برچسب زمانی ثبت شد');
      }
    } catch (err: any) {
      toast.error(err.message || 'خطا در ثبت یادداشت');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleAddMediaUrl = async () => {
    if (!newMediaUrl.trim() || !property) return;
    try {
      setActionLoading(true);
      const updated = await propertyService.addMedia(property.id, [newMediaUrl.trim()], user);
      if (updated) {
        setProperty(updated);
        setNewMediaUrl('');
        setShowAddMedia(false);
        toast.success('تصویر جدید به فایل ملکی افزوده شد');
      }
    } catch (err: any) {
      toast.error(err.message || 'خطا در افزودن تصویر');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !property) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        if (uploadEvent.target?.result) {
          const base64 = uploadEvent.target.result as string;
          const updated = await propertyService.addMedia(property.id, [base64], user);
          if (updated) {
            setProperty(updated);
            toast.success('تصویر بارگذاری شد');
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  if (loading) {
    return <LoadingState text="در حال بررسی مجوزها و بارگذاری فایل..." className="py-20" />;
  }

  if (!property) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 mb-4">فایل مورد نظر یافت نشد یا شما اجازه مشاهده آن را ندارید.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/properties')}>
          بازگشت به فایل‌ها
        </Button>
      </div>
    );
  }

  const isOwner = property.ownerId === user?.id;
  const isManager = user?.role === 'manager';
  const isArchived = property.availabilityStatus === 'archived' || property.status === 'archived';

  const availabilityOptions: { id: AvailabilityStatus; label: string; color: string }[] = [
    { id: 'available', label: 'موجود و فعال', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
    { id: 'reserved', label: 'رزرو / در حال توافق', color: 'bg-amber-50 text-amber-700 border-amber-300' },
    { id: 'sold', label: 'فروخته شد', color: 'bg-purple-50 text-purple-700 border-purple-300' },
    { id: 'rented', label: 'اجاره داده شد', color: 'bg-blue-50 text-blue-700 border-blue-300' },
    { id: 'archived', label: 'بایگانی شده', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Top Bar with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به فایل‌ها</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Availability Status Selector */}
          {isOwner && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
              <span className="text-[11px] text-slate-400">وضعیت:</span>
              <select
                value={property.availabilityStatus || 'available'}
                onChange={(e) => handleAvailabilityChange(e.target.value as AvailabilityStatus)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                {availabilityOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Privacy state toggle button for owner agent */}
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePrivacy}
              isLoading={actionLoading}
              rightIcon={
                property.privacyState === 'shared' ? (
                  <Unlock className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                )
              }
            >
              {property.privacyState === 'shared' ? 'اشتراک با تیم (فعال)' : 'فایل خصوصی'}
            </Button>
          )}

          {/* Edit Property */}
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/properties/${property.id}/edit`)}
              rightIcon={<Edit className="w-3.5 h-3.5" />}
            >
              ویرایش
            </Button>
          )}

          {/* Archive / Restore Button */}
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchiveToggle}
              className={isArchived ? 'text-emerald-700 border-emerald-300' : 'text-slate-600'}
              rightIcon={
                isArchived ? <RefreshCw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />
              }
            >
              {isArchived ? 'بازیابی از بایگانی' : 'بایگانی'}
            </Button>
          )}

          {/* Share Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
              }
              toast.success('لینک اشتراک‌گذاری فایل کپی شد');
            }}
            rightIcon={<Share2 className="w-3.5 h-3.5" />}
          >
            اشتراک
          </Button>
        </div>
      </div>

      {/* Archived banner */}
      {isArchived && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
            <Archive className="w-4 h-4 text-amber-700" />
            <span>این فایل در وضعیت بایگانی قرار دارد و در فهرست فعال نمایش داده نمی‌شود.</span>
          </div>
          {isOwner && (
            <button
              onClick={handleArchiveToggle}
              className="text-xs font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
            >
              بازیابی فوری
            </button>
          )}
        </div>
      )}

      {/* Main Property Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        {/* Images Carousel / Preview */}
        <div className="relative h-64 sm:h-80 w-full bg-slate-900">
          {property.images && property.images[0] ? (
            <img
              src={property.images[0]}
              alt={property.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              <Building2 className="w-16 h-16" />
            </div>
          )}

          <div className="absolute top-4 right-4 flex gap-2">
            <Badge variant="default" className="bg-slate-900/85 backdrop-blur-xs text-white border-0 text-xs px-3 py-1 font-bold">
              {getDealTypeLabel(property.transactionType || property.dealType)}
            </Badge>
            <Badge variant="default" className="bg-white/95 backdrop-blur-xs text-slate-800 border-0 text-xs px-3 py-1 font-bold">
              {getPropertyTypeLabel(property.propertyType)}
            </Badge>
          </div>

          <div className="absolute bottom-4 right-4 flex flex-wrap items-center gap-2">
            <div className="bg-slate-900/80 backdrop-blur-xs text-white px-3 py-1 rounded-lg text-xs font-mono">
              کد فایل: {property.code}
            </div>
            <div
              className={`backdrop-blur-xs px-3 py-1 rounded-lg text-xs font-bold ${
                property.privacyState === 'shared' ? 'bg-blue-600/85 text-white' : 'bg-emerald-600/85 text-white'
              }`}
            >
              {property.privacyState === 'shared' ? 'فایل اشتراکی دپارتمان' : 'فایل شخصی و محرمانه'}
            </div>
            {property.availabilityStatus && property.availabilityStatus !== 'available' && (
              <div className="bg-amber-600/90 text-white backdrop-blur-xs px-3 py-1 rounded-lg text-xs font-bold">
                {property.availabilityStatus === 'reserved'
                  ? 'رزرو شده'
                  : property.availabilityStatus === 'sold'
                  ? 'فروخته شد'
                  : property.availabilityStatus === 'rented'
                  ? 'اجاره رفت'
                  : 'بایگانی'}
              </div>
            )}
          </div>

          {/* Add image quick button on cover */}
          {isOwner && (
            <div className="absolute top-4 left-4">
              <button
                onClick={() => setShowAddMedia(!showAddMedia)}
                className="bg-black/60 hover:bg-black/80 text-white px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 backdrop-blur-xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن تصویر</span>
              </button>
            </div>
          )}
        </div>

        {/* Media Gallery / Upload Section */}
        {showAddMedia && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">افزودن تصویر جدید به فایل</span>
              <button
                onClick={() => setShowAddMedia(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                بستن
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl text-xs text-slate-700 cursor-pointer bg-white">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>انتخاب از گالری دستگاه</span>
                <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={newMediaUrl}
                  onChange={(e) => setNewMediaUrl(e.target.value)}
                  placeholder="آدرس اینترنتی تصویر..."
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white w-56"
                />
                <Button size="sm" onClick={handleAddMediaUrl}>
                  ثبت تصویر
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Details & Specs */}
        <div className="p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{property.title}</h1>
              <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>
                  {property.city || 'تهران'}، {property.region || ''}،{' '}
                  {property.neighborhood || property.district}
                </span>
              </p>
            </div>

            <div className="text-right sm:text-left">
              {(property.transactionType === 'rent' || property.dealType === 'rent') ? (
                <div>
                  <div className="text-lg sm:text-xl font-black text-emerald-700">
                    ودیعه: {formatPriceToman(property.deposit || property.depositPrice || 0)}
                  </div>
                  <div className="text-sm font-bold text-slate-600">
                    اجاره: {formatPriceToman(property.rent || property.monthlyRent || property.rentPrice || 0)}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700">
                    {formatPriceToman(property.price || property.totalPrice || 0)}
                  </div>
                  {property.area > 0 && (
                    <div className="text-xs text-slate-500 font-mono">
                      متری:{' '}
                      {formatPriceToman(
                        Math.round((property.price || property.totalPrice || 0) / property.area)
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-100 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-slate-400" />
              <span>
                متراژ: <strong>{toPersianDigits(property.area)} متر</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-slate-400" />
              <span>
                خواب: <strong>{toPersianDigits(property.bedrooms)} خوابه</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                سال ساخت: <strong>{toPersianDigits(property.yearBuilt || 1400)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-slate-400" />
              <span>
                مشاور مسئول: <strong>{property.agentName || 'مشاور املاک'}</strong>
              </span>
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              امکانات و امتیازات واحد
            </h3>
            <div className="flex flex-wrap gap-2">
              {property.features.map((feat, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
                >
                  ✓ {feat}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              توضیحات و یادداشت‌های کارشناسی
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {property.description}
            </p>
          </div>

          {/* Owner Info with Strict Data Privacy */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">
                  اطلاعات مالک (حفظ حریم خصوصی و مالکیت داده)
                </span>
              </div>
              {isOwner && (
                <button
                  onClick={() => setShowOwnerPhone(!showOwnerPhone)}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  {showOwnerPhone ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showOwnerPhone ? 'مخفی‌سازی' : 'نمایش شماره کامل'}</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
              <div>
                <span className="text-slate-500">نام مالک: </span>
                <strong className="text-slate-800">{property.ownerName}</strong>
              </div>
              <div>
                <span className="text-slate-500">شماره تماس: </span>
                {isOwner ? (
                  showOwnerPhone ? (
                    <a
                      href={`tel:${property.ownerPhone}`}
                      className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 font-mono"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{property.ownerPhone}</span>
                    </a>
                  ) : (
                    <span className="font-mono text-slate-500">{property.ownerPhone}</span>
                  )
                ) : (
                  <span className="font-mono text-slate-500 px-2 py-0.5 bg-slate-200 rounded">
                    {property.ownerPhone} (ماسک‌شده برای حفظ حریم خصوصی)
                  </span>
                )}
              </div>
            </div>

            {isManager && (
              <div className="p-2.5 bg-blue-50/70 rounded-lg text-[11px] text-blue-900 border border-blue-200/80">
                🔒 طبق اصل عدم دسترسی خودکار مدیر به اطلاعات محرمانه، شماره تماس مالک و نشانی دقیق ماسک شده و ارتباط با مالک منحصراً از طریق مشاور ثبت‌کننده فایل انجام می‌شود.
              </div>
            )}

            {property.address && isOwner && (
              <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                <span className="text-slate-400">نشانی دقیق (فقط مشاور): </span>
                <span>{property.address}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property Notes Section */}
      <Card padding="none">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">دفترچه یادداشت‌های پیگیری فایل</h3>
          </div>
          <span className="text-xs text-slate-400">یادداشت‌های اختصاصی مشاور</span>
        </div>

        <div className="p-4 space-y-4">
          {isOwner ? (
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="افزودن یادداشت جدید (مثلاً تماس با مالک گرفته شد، تخفیف ۵ درصدی داد...)"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <Button type="submit" size="sm" isLoading={submittingNote} rightIcon={<Send className="w-3.5 h-3.5" />}>
                ثبت
              </Button>
            </form>
          ) : (
            <p className="text-xs text-slate-400 italic">
              یادداشت‌های این فایل شخصی بوده و فقط برای مشاور مالک قابل نمایش و ویرایش است.
            </p>
          )}

          {property.notes ? (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
              {property.notes}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-3">تاکنون یادداشتی برای این ملک ثبت نشده است.</p>
          )}
        </div>
      </Card>

      {/* Matching Clients Section */}
      <Card padding="none">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                مشتریان و متقاضیان منطبق با این ملک ({toPersianDigits(matches.length)} خریدار/مستاجر)
              </h3>
              <p className="text-xs text-slate-400">
                مشتریانی که بودجه و منطقه درخواستی آن‌ها با این فایل همخوانی بالایی دارد
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {matches.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400">
              در حال حاضر متقاضی منطبقی در سیستم ثبت نشده است.
            </p>
          ) : (
            matches.map((m) => (
              <div
                key={m.id}
                onClick={() => navigate(`/clients/${m.client.id}`)}
                className="p-3.5 rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{m.client.fullName || m.client.name}</span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {toPersianDigits(m.matchScore)}٪ تطابق
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      مشاور: {m.client.agentName || 'همکار'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    تقاضای{' '}
                    {(m.client.transactionType || m.client.desiredDealType) === 'rent' ? 'اجاره' : 'خرید'} در محله‌های{' '}
                    {(m.client.preferredRegions || m.client.desiredDistricts || []).join('، ')}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.matchedFactors.map((f, i) => (
                      <span key={`f-${i}`} className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {f.startsWith('✓') ? f : `✓ ${f}`}
                      </span>
                    ))}
                    {(m.weakFactors || m.unmatchedFactors || []).map((w, i) => (
                      <span key={`w-${i}`} className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {w.startsWith('△') || w.startsWith('✗') ? w : `△ ${w}`}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/opportunities`);
                      toast.info(`هدایت به پایپ‌لاین فرصت برای متقاضی ${m.client.fullName || m.client.name}`);
                    }}
                    rightIcon={<UserPlus className="w-3 h-3" />}
                  >
                    ایجاد فرصت
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
