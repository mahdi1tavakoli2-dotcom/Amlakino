import React, { useState, useEffect } from 'react';
import {
  Users,
  Phone,
  MapPin,
  Sparkles,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Plus,
  Shield,
  Lock,
  Unlock,
  EyeOff,
  UserCheck,
  Edit,
  Archive,
  RefreshCw,
  Send,
  MessageSquare,
  Briefcase,
  Clock,
  ExternalLink,
  Flame,
  Check,
  Tag,
} from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { clientService } from '../services/clientService';
import { matchService } from '../services/matchService';
import { storageService } from '../services/storageService';
import { Client, Match, ClientStatus, ClientUrgency } from '../types';
import {
  toPersianDigits,
  formatPriceToman,
  getDealTypeLabel,
  getClientStatusLabel,
  getPropertyTypeLabel,
} from '../utils/formatters';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingState } from '../components/common/LoadingState';
import { useToast } from '../components/common/Toast';

export const ClientDetailView: React.FC = () => {
  const { params, navigate, goBack } = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // New Note
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Quick Follow-up modal/inline
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [followupText, setFollowupText] = useState('');
  const [followupDate, setFollowupDate] = useState('فردا ساعت ۱۱:۰۰');

  const loadClient = async () => {
    if (!params.id) return;
    try {
      setLoading(true);
      const cli = await clientService.getById(params.id, user);
      if (cli) {
        setClient(cli);
        const foundMatches = await matchService.findMatchesForClient(cli.id, user);
        setMatches(foundMatches);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'خطا در دریافت اطلاعات متقاضی');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
  }, [params.id, user]);

  const handleTogglePrivacy = async () => {
    if (!client || !user) return;
    try {
      setActionLoading(true);
      const updated = await clientService.togglePrivacy(client.id, user);
      if (updated) {
        setClient(updated);
        toast.success(
          (updated.privacyStatus || updated.privacyState) === 'shared'
            ? 'نیازمندی‌های متقاضی با دپارتمان به اشتراک گذاشته شد (اطلاعات تماس محفوظ ماند)'
            : 'پرونده متقاضی به وضعیت کاملاً خصوصی بازگردانده شد'
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'خطا در تغییر وضعیت محرمانگی');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!client || !user) return;
    try {
      setActionLoading(true);
      const isCurrentlyArchived = client.status === 'archived';
      if (isCurrentlyArchived) {
        const restored = await clientService.restore(client.id, user);
        if (restored) {
          setClient(restored);
          toast.success('پرونده متقاضی از بایگانی خارج و فعال گردید');
        }
      } else {
        const archived = await clientService.archive(client.id, user);
        if (archived) {
          setClient(archived);
          toast.success('پرونده متقاضی به بخش بایگانی منتقل شد');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'خطا در تغییر وضعیت بایگانی');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: ClientStatus) => {
    if (!client || !user) return;
    try {
      setActionLoading(true);
      const updated = await clientService.updateStatus(client.id, newStatus, user);
      if (updated) {
        setClient(updated);
        toast.success(`وضعیت پرونده به "${getClientStatusLabel(newStatus).label}" تغییر یافت`);
      }
    } catch (err: any) {
      toast.error(err.message || 'خطا در بروزرسانی وضعیت');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !client) return;
    try {
      setSubmittingNote(true);
      const updated = await clientService.addNote(client.id, newNote.trim(), user);
      if (updated) {
        setClient(updated);
        setNewNote('');
        toast.success('یادداشت جدید با موفقیت ثبت شد');
      }
    } catch (err: any) {
      toast.error(err.message || 'خطا در افزودن یادداشت');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleCreateOpportunity = () => {
    if (!client) return;
    navigate('/opportunities');
    toast.success(`پایپ‌لاین معاملات برای متقاضی «${client.name || client.fullName}» باز شد.`);
  };

  const handleCreateFollowup = () => {
    if (!followupText.trim() || !client) return;
    const noteEntry = `[پیگیری و هماهنگی]: ${followupText.trim()} (زمان: ${followupDate})`;
    clientService.addNote(client.id, noteEntry, user).then((updated) => {
      if (updated) setClient(updated);
      setFollowupText('');
      setShowFollowupForm(false);
      toast.success('یادآوری پیگیری با موفقیت ثبت گردید');
    });
  };

  if (loading) {
    return <LoadingState text="در حال بررسی مجوزها و بارگذاری پرونده مشتری..." className="py-20" />;
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 mb-4">مشتری مورد نظر یافت نشد یا دسترسی به پرونده او محدود است.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/clients')}>
          بازگشت به لیست مشتریان
        </Button>
      </div>
    );
  }

  const isOwner = client.ownerId === user?.id;
  const isManager = user?.role === 'manager';
  const isPhoneMasked = (client.phone || client.mobile || '').includes('***');
  const isArchived = client.status === 'archived';
  const statusInfo = getClientStatusLabel(client.status);

  const urgencyBadge = {
    urgent: { label: 'بسیار فوری', color: 'bg-rose-100 text-rose-800 border-rose-300' },
    high: { label: 'فوریت بالا', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    medium: { label: 'عادی / متوسط', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    low: { label: 'کم / بلندمدت', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  }[client.urgency || 'medium'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Top Back Action & Management Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به متقاضیان</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Selector for Owner */}
          {isOwner && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
              <span className="text-[11px] text-slate-400">مرحله:</span>
              <select
                value={client.status}
                onChange={(e) => handleStatusChange(e.target.value as ClientStatus)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="active">فعال و پیگیر</option>
                <option value="lead">سرنخ (Lead)</option>
                <option value="negotiation">در حال مذاکره</option>
                <option value="contracted">قرارداد منعقد شد</option>
                <option value="lost">انصراف / بسته شد</option>
                <option value="archived">بایگانی شده</option>
              </select>
            </div>
          )}

          {/* Privacy Toggle Button */}
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePrivacy}
              isLoading={actionLoading}
              rightIcon={
                (client.privacyStatus || client.privacyState) === 'shared' ? (
                  <Unlock className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                )
              }
            >
              {(client.privacyStatus || client.privacyState) === 'shared'
                ? 'اشتراک تقاضا با تیم (فعال)'
                : 'تقاضای خصوصی'}
            </Button>
          )}

          {/* Edit Button */}
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/clients/${client.id}/edit`)}
              rightIcon={<Edit className="w-3.5 h-3.5" />}
            >
              ویرایش پرونده
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
              {isArchived ? 'بازیابی پرونده' : 'بایگانی'}
            </Button>
          )}

          {/* Direct Phone / Masked Indicator */}
          {!isPhoneMasked ? (
            <a
              href={`tel:${client.phone || client.mobile}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>تماس تلفنی</span>
            </a>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-medium border border-slate-200">
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span>شماره محفوظ است</span>
            </div>
          )}
        </div>
      </div>

      {/* Archived banner */}
      {isArchived && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
            <Archive className="w-4 h-4 text-amber-700" />
            <span>این پرونده در وضعیت بایگانی قرار دارد.</span>
          </div>
          {isOwner && (
            <button
              onClick={handleArchiveToggle}
              className="text-xs font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
            >
              بازیابی فوری پرونده
            </button>
          )}
        </div>
      )}

      {/* Manager Privacy Notice Banner */}
      {isManager && (
        <div className="p-4 rounded-2xl bg-linear-to-r from-blue-50 via-slate-50 to-indigo-50 border border-blue-200/90 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed space-y-0.5">
            <div className="font-bold text-slate-900">
              حالت نظارت دپارتمان — اصل تفکیک و استقلال مشتریان مشاور
            </div>
            <p>
              شماره تلفن واقعی، نام خانوادگی کامل و یادداشت‌های خصوصی متقاضی برای حفظ حریم مشاور و جلوگیری از تصاحب مشتری ماسک شده است. هماهنگی صرفاً از طریق مشاور مسئول پرونده انجام می‌شود.
            </p>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                {client.name || client.fullName}
              </h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyBadge.color}`}>
                {urgencyBadge.label}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  (client.privacyStatus || client.privacyState) === 'shared'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {(client.privacyStatus || client.privacyState) === 'shared' ? 'اشتراکی تیم' : 'اختصاصی مشاور'}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-mono">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{client.phone || client.mobile}</span>
            </p>
          </div>

          <div className="text-right sm:text-left text-xs text-slate-500">
            <div>ثبت پرونده: {client.createdAt}</div>
            <div className="font-bold text-slate-800 mt-0.5">
              مشاور مسئول: {client.agentName || 'مشاور املاک'}
            </div>
          </div>
        </div>

        {/* Requirements Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm">
          <div className="p-3 bg-slate-50 rounded-xl space-y-1">
            <span className="text-slate-400 text-xs block">نوع تقاضا و بودجه:</span>
            <div className="font-bold text-emerald-800">
              {getDealTypeLabel(client.transactionType || client.desiredDealType)} •{' '}
              {client.maxBudget || client.budgetMax ? (
                <span>سقف {formatPriceToman(client.maxBudget || client.budgetMax || 0)}</span>
              ) : (
                <span>ودیعه {formatPriceToman(client.maxDeposit || 0)}</span>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-1">
            <span className="text-slate-400 text-xs block">متراژ و خواب مدنظر:</span>
            <div className="font-bold text-slate-800">
              {toPersianDigits(client.minArea || 60)} تا {toPersianDigits(client.maxArea || 150)} متر • حداقل{' '}
              {toPersianDigits(client.bedrooms || client.minBedrooms || 1)} خواب
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-1">
            <span className="text-slate-400 text-xs block">محله‌های هدف:</span>
            <div className="font-bold text-slate-800 truncate">
              {(client.preferredRegions || client.desiredDistricts || []).join('، ') || 'تهران'}
            </div>
          </div>
        </div>

        {/* Specific Requirements Chips */}
        {client.requirements && client.requirements.length > 0 && (
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-400 block mb-2">
              شروط و نیازمندی‌های اولویت‌دار متقاضی:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {client.requirements.map((req, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-medium flex items-center gap-1"
                >
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>{req}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick Follow-up and Opportunity Action Row */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateOpportunity}
              rightIcon={<Briefcase className="w-3.5 h-3.5 text-emerald-700" />}
            >
              ایجاد فرصت فروش / پیگیری پایپ‌لاین
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFollowupForm(!showFollowupForm)}
              rightIcon={<Clock className="w-3.5 h-3.5 text-blue-600" />}
            >
              ثبت پیگیری و قرار بازدید
            </Button>
          </div>
        </div>

        {/* Inline Follow-up Form */}
        {showFollowupForm && (
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
            <span className="text-xs font-bold text-blue-900 block">ثبت یادآوری پیگیری و قرار</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={followupText}
                onChange={(e) => setFollowupText(e.target.value)}
                placeholder="موضوع پیگیری (تماس، هماهنگی بازدید...)"
                className="sm:col-span-2 px-3 py-1.5 text-xs rounded-lg border border-blue-300 bg-white"
              />
              <input
                type="text"
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
                placeholder="زمان یا تاریخ هماهنگ‌شده..."
                className="px-3 py-1.5 text-xs rounded-lg border border-blue-300 bg-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFollowupForm(false)}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
              >
                انصراف
              </button>
              <Button size="sm" onClick={handleCreateFollowup}>
                ثبت یادآوری
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Notes Section with Timestamped Log */}
      <Card padding="none">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">یادداشت‌ها و تاریخچه تعاملات</h3>
          </div>
          <span className="text-xs text-slate-400">محفوظ نزد مشاور</span>
        </div>

        <div className="p-4 space-y-4">
          {isOwner ? (
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="افزودن یادداشت جدید (نتیجه تماس، سلایق خاص مشتری، تغییر بودجه...)"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <Button type="submit" size="sm" isLoading={submittingNote} rightIcon={<Send className="w-3.5 h-3.5" />}>
                ثبت
              </Button>
            </form>
          ) : (
            <p className="text-xs text-slate-400 italic">
              یادداشت‌های این متقاضی محرمانه بوده و فقط برای مشاور مالک پرونده قابل مشاهده است.
            </p>
          )}

          {client.notes ? (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
              {client.notes}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-3">تاکنون یادداشتی ثبت نشده است.</p>
          )}
        </div>
      </Card>

      {/* Smart Matches For This Client */}
      <Card padding="none">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                فایل‌های ملکی متناسب با تقاضای {client.name || client.fullName} ({toPersianDigits(matches.length)} فایل)
              </h3>
              <p className="text-xs text-slate-400">
                فایل‌های موجود که با شرایط بودجه، منطقه و متراژ این متقاضی انطباق دارند
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {matches.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400">
              در حال حاضر ملک منطبقی با بودجه و ویژگی‌های درخواستی این مشتری یافت نشد.
            </p>
          ) : (
            matches.map((m) => (
              <div
                key={m.id}
                onClick={() => navigate(`/properties/${m.property.id}`)}
                className="p-3.5 rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{m.property.title}</span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {toPersianDigits(m.matchScore)}٪ تطابق
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">
                      کد {m.property.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {m.property.neighborhood || m.property.district} • {toPersianDigits(m.property.area)} متر •{' '}
                    {toPersianDigits(m.property.bedrooms)} خواب
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

                <div className="text-right sm:text-left">
                  <div className="font-bold text-emerald-700 text-xs sm:text-sm font-mono">
                    {formatPriceToman(
                      m.property.price || m.property.totalPrice || m.property.deposit || 0
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    مشاور فایل: {m.property.agentName || 'همکار'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
