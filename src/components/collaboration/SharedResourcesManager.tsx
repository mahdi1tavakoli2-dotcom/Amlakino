import React, { useState, useEffect } from 'react';
import {
  Share2,
  Lock,
  Unlock,
  ShieldCheck,
  Building2,
  Users,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { Property, Client, User } from '../../types';
import { storageService } from '../../services/storageService';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { LoadingState } from '../common/LoadingState';
import { useToast } from '../common/Toast';
import {
  toPersianDigits,
  formatPriceToman,
  getDealTypeLabel,
  getPropertyTypeLabel,
} from '../../utils/formatters';

interface SharedResourcesManagerProps {
  currentUser: User;
  onUpdated?: () => void;
}

export const SharedResourcesManager: React.FC<SharedResourcesManagerProps> = ({
  currentUser,
  onUpdated,
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'properties' | 'clients'>('properties');
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [myClients, setMyClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [props, clients] = await Promise.all([
        storageService.getProperties(currentUser),
        storageService.getClients(currentUser),
      ]);
      // Filter items owned by currentUser
      setMyProperties(props.filter((p) => p.ownerId === currentUser.id));
      setMyClients(clients.filter((c) => c.ownerId === currentUser.id));
    } catch (e) {
      console.error(e);
      toast.error('خطا در بارگذاری اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleToggleProperty = async (prop: Property) => {
    try {
      setTogglingId(prop.id);
      const updated = await storageService.togglePropertyPrivacy(prop.id, currentUser);
      if (updated) {
        toast.success(
          updated.privacyState === 'shared'
            ? `فایل «${prop.title}» با دپارتمان به اشتراک گذاشته شد. مشخصات تماس مالک و آدرس دقیق پلاک ماسک و محفوظ ماند.`
            : `فایل «${prop.title}» به وضعیت کاملاً خصوصی بازگردانده شد.`
        );
        await loadData();
        onUpdated?.();
      }
    } catch (err: any) {
      toast.error(err.message || 'خطا در تغییر وضعیت اشتراک فایل');
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleClient = async (cli: Client) => {
    try {
      setTogglingId(cli.id);
      const updated = await storageService.toggleClientPrivacy(cli.id, currentUser);
      if (updated) {
        toast.success(
          (updated.privacyStatus || updated.privacyState) === 'shared'
            ? `نیازمندی‌های متقاضی با همکاران به اشتراک گذاشته شد. شماره تماس و یادداشت‌های خصوصی محفوظ ماند.`
            : `پرونده متقاضی به وضعیت کاملاً خصوصی بازگردانده شد.`
        );
        await loadData();
        onUpdated?.();
      }
    } catch (err: any) {
      toast.error(err.message || 'خطا در تغییر وضعیت اشتراک متقاضی');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return <LoadingState text="در حال بررسی فایل‌ها و مشتریان شخصی شما..." className="py-12" />;
  }

  const sharedPropsCount = myProperties.filter((p) => p.privacyState === 'shared').length;
  const sharedClientsCount = myClients.filter(
    (c) => (c.privacyStatus || c.privacyState) === 'shared'
  ).length;

  return (
    <div className="space-y-4">
      {/* Rule Definition Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 text-xs text-slate-700 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-900 block">
            کنترل دقیق حریم خصوصی در اشتراک‌گذاری (Granular Privacy Rules)
          </span>
          <p className="leading-relaxed">
            شما تعیین می‌کنید کدام فایل‌ها یا مشتریان برای موتور تطابق دپارتمان باز باشند. سیستم به صورت خودکار اطلاعات تماس، هویت و یادداشت‌های خصوصی شما را ماسکه کرده و تنها مشخصات فنی ملکی را به اشتراک می‌گذارد.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('properties')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'properties'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>فایل‌های من ({toPersianDigits(myProperties.length)})</span>
          <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">
            {toPersianDigits(sharedPropsCount)} اشتراکی
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clients')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'clients'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>متقاضیان من ({toPersianDigits(myClients.length)})</span>
          <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">
            {toPersianDigits(sharedClientsCount)} اشتراکی
          </span>
        </button>
      </div>

      {/* Properties Tab */}
      {activeTab === 'properties' && (
        <div className="space-y-3">
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-950 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">قانون اشتراک فایل ملکی (Shared Property):</span>
              <br />
              <span className="text-emerald-700 font-semibold">نمایش به همکاران:</span> منطقه، نوع ملک، نوع معامله، قیمت، متراژ، خواب و امکانات.
              <br />
              <span className="text-rose-700 font-semibold">پنهان و محرمانه:</span> نام مالک، شماره تلفن مالک، آدرس دقیق پلاک و یادداشت‌های داخلی مشاور.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {myProperties.map((prop) => {
              const isShared = (prop.privacyStatus || prop.privacyState) === 'shared';

              return (
                <Card
                  key={prop.id}
                  className={`p-4 space-y-3 border transition-all ${
                    isShared ? 'border-emerald-300 bg-emerald-50/15' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                          {prop.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isShared
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isShared ? 'اشتراک‌گذاری شده در تیم' : 'فایل کاملاً خصوصی'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">{prop.title}</h4>
                    </div>

                    <Button
                      variant={isShared ? 'outline' : 'primary'}
                      size="sm"
                      isLoading={togglingId === prop.id}
                      onClick={() => handleToggleProperty(prop)}
                      rightIcon={isShared ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <Share2 className="w-3.5 h-3.5" />}
                    >
                      {isShared ? 'لغو اشتراک' : 'اشتراک‌گذاری فایل'}
                    </Button>
                  </div>

                  <div className="text-xs text-slate-600 grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">منطقه:</span>
                      <span>{prop.district || prop.neighborhood || 'تهران'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">قیمت / ودیعه:</span>
                      <span className="font-bold text-emerald-700">
                        {formatPriceToman(prop.price || prop.totalPrice || prop.deposit)}
                      </span>
                    </div>
                  </div>

                  {/* Masking Preview */}
                  <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-500 space-y-1 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span>دیدگاه همکاران از آدرس:</span>
                      <span className="font-medium text-slate-700">{prop.district || 'محدوده منطقه'} (پلاک مخفی)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>دیدگاه همکاران از تلفن مالک:</span>
                      <span className="font-mono text-emerald-700 font-bold">محفوظ و ماسک‌شده [🔒]</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="space-y-3">
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-950 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">قانون اشتراک متقاضی (Shared Client):</span>
              <br />
              <span className="text-emerald-700 font-semibold">نمایش به همکاران:</span> منطقه مورد تقاضا، نوع ملک، نوع معامله، بودجه، متراژ، تعداد خواب و نیازمندی‌ها.
              <br />
              <span className="text-rose-700 font-semibold">پنهان و محرمانه:</span> نام متقاضی، شماره تلفن همراه، یادداشت‌های خصوصی و سابقه پیگیری‌ها.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {myClients.map((client) => {
              const isShared = (client.privacyStatus || client.privacyState) === 'shared';

              return (
                <Card
                  key={client.id}
                  className={`p-4 space-y-3 border transition-all ${
                    isShared ? 'border-emerald-300 bg-emerald-50/15' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isShared
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isShared ? 'اشتراک‌گذاری شده در تیم' : 'پرونده متقاضی خصوصی'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{client.fullName || client.name}</h4>
                    </div>

                    <Button
                      variant={isShared ? 'outline' : 'primary'}
                      size="sm"
                      isLoading={togglingId === client.id}
                      onClick={() => handleToggleClient(client)}
                      rightIcon={isShared ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <Share2 className="w-3.5 h-3.5" />}
                    >
                      {isShared ? 'لغو اشتراک' : 'اشتراک‌گذاری مشتری'}
                    </Button>
                  </div>

                  <div className="text-xs text-slate-600 grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">نوع معامله:</span>
                      <span>{getDealTypeLabel(client.transactionType || client.desiredDealType)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">حداکثر بودجه:</span>
                      <span className="font-bold text-emerald-700">
                        {client.budgetMax || client.maxBudget
                          ? formatPriceToman(client.budgetMax || client.maxBudget || 0)
                          : 'تعیین‌نشده'}
                      </span>
                    </div>
                  </div>

                  {/* Masking Preview */}
                  <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-500 space-y-1 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span>نام نمایشی به همکاران:</span>
                      <span className="font-medium text-slate-700">متقاضی محترم (مستعار)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>دیدگاه همکاران از شماره تلفن:</span>
                      <span className="font-mono text-emerald-700 font-bold">محفوظ و ماسک‌شده [🔒]</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
