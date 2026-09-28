import React, { useState, useEffect } from 'react';
import {
  Flame,
  Plus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageSquare,
  Calendar,
  CheckSquare,
  Clock,
  AlertCircle,
  AlertTriangle,
  Building2,
  Users,
  Sparkles,
  Award,
  Lock,
  EyeOff,
  FileText,
  Check,
  X,
  Search,
  Filter,
  DollarSign,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { opportunityService } from '../services/opportunityService';
import { storageService } from '../services/storageService';
import {
  Opportunity,
  OpportunityStage,
  FollowUp,
  FollowUpType,
  FollowUpPriority,
  FollowUpStatus,
  Visit,
  VisitStatus,
  Activity,
  ActivityType,
  Client,
  Property,
} from '../types';
import {
  toPersianDigits,
  formatPriceToman,
  getOpportunityStageLabel,
  getPriorityLabel,
  getFollowUpTypeLabel,
  getVisitStatusLabel,
} from '../utils/formatters';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

// Pipeline Stages as explicitly requested
const STAGES: { stage: OpportunityStage; label: string; color: string }[] = [
  { stage: 'new_match', label: 'تطابق جدید (New Match)', color: 'border-slate-300 bg-slate-100 text-slate-800' },
  { stage: 'contacted', label: 'تماس اولیه (Contacted)', color: 'border-blue-300 bg-blue-50 text-blue-800' },
  { stage: 'interested', label: 'ابراز تمایل (Interested)', color: 'border-cyan-300 bg-cyan-50 text-cyan-800' },
  { stage: 'visit_scheduled', label: 'هماهنگی بازدید (Visit Scheduled)', color: 'border-sky-300 bg-sky-50 text-sky-800' },
  { stage: 'visited', label: 'بازدید انجام شد (Visited)', color: 'border-indigo-300 bg-indigo-50 text-indigo-800' },
  { stage: 'negotiation', label: 'مذاکره و نشست (Negotiation)', color: 'border-amber-300 bg-amber-50 text-amber-800' },
  { stage: 'contract', label: 'تنظیم قرارداد (Contract)', color: 'border-purple-300 bg-purple-50 text-purple-800' },
  { stage: 'won', label: 'معامله موفق (Won)', color: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  { stage: 'lost', label: 'لغو شده (Lost)', color: 'border-rose-300 bg-rose-50 text-rose-800' },
];

export const OpportunitiesView: React.FC = () => {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Mobile active stage tab
  const [mobileActiveStage, setMobileActiveStage] = useState<OpportunityStage>('new_match');

  // Selected Opportunity Detail Modal
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'followups' | 'visits' | 'activities'>('overview');
  const [oppFollowUps, setOppFollowUps] = useState<FollowUp[]>([]);
  const [oppVisits, setOppVisits] = useState<Visit[]>([]);
  const [oppActivities, setOppActivities] = useState<Activity[]>([]);

  // Create Opportunity Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [newClientId, setNewClientId] = useState('');
  const [newPropertyId, setNewPropertyId] = useState('');
  const [newPriority, setNewPriority] = useState<FollowUpPriority>('high');
  const [newNextAction, setNewNextAction] = useState('');
  const [newNextFollowUp, setNewNextFollowUp] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Follow-up Creation Sub-form inside Modal
  const [isAddFollowUpOpen, setIsAddFollowUpOpen] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpDesc, setFollowUpDesc] = useState('');
  const [followUpType, setFollowUpType] = useState<FollowUpType>('phone_call');
  const [followUpDueAt, setFollowUpDueAt] = useState('امروز ساعت ۱۷:۰۰');
  const [followUpPriority, setFollowUpPriority] = useState<FollowUpPriority>('high');

  // Visit Scheduling Sub-form inside Modal
  const [isAddVisitOpen, setIsAddVisitOpen] = useState(false);
  const [visitDate, setVisitDate] = useState('امروز');
  const [visitTime, setVisitTime] = useState('۱۸:۰۰');
  const [visitNotes, setVisitNotes] = useState('');

  // Complete Visit Modal
  const [completingVisitId, setCompletingVisitId] = useState<string | null>(null);
  const [visitFeedback, setVisitFeedback] = useState('');

  // Convert to Deal Modal
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [dealFinalPrice, setDealFinalPrice] = useState('');
  const [dealNotes, setDealNotes] = useState('');

  // New Activity Note Sub-form
  const [newActivityText, setNewActivityText] = useState('');
  const [newActivityType, setNewActivityType] = useState<ActivityType>('note');
  const [isPrivateNote, setIsPrivateNote] = useState(false);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const data = await opportunityService.getAll(user);
      setOpportunities(data);
    } catch (e) {
      console.error(e);
      toast.error('خطا در دریافت لیست فرصت‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [user]);

  // Load clients and properties when opening create modal
  const handleOpenCreateModal = async () => {
    try {
      const [cList, pList] = await Promise.all([
        storageService.getClients(user),
        storageService.getProperties(user),
      ]);
      setAvailableClients(cList);
      setAvailableProperties(pList);
      if (cList.length > 0) setNewClientId(cList[0].id);
      if (pList.length > 0) setNewPropertyId(pList[0].id);
      setNewNextAction('تماس اولیه جهت ارائه مشخصات فایل');
      setNewNextFollowUp('امروز ساعت ۱۷:۰۰');
      setIsCreateModalOpen(true);
    } catch (e) {
      console.error(e);
      toast.error('خطا در بارگذاری اطلاعات پیش‌نیاز');
    }
  };

  // Open Opportunity Detail Drawer/Modal
  const handleSelectOpportunity = async (opp: Opportunity) => {
    setSelectedOpp(opp);
    setDetailTab('overview');
    await loadOpportunitySubData(opp.id);
  };

  const loadOpportunitySubData = async (oppId: string) => {
    try {
      const [allFollowUps, allVisits, activities] = await Promise.all([
        storageService.getFollowUps(user),
        storageService.getVisits(user),
        opportunityService.getActivities(oppId, user),
      ]);
      setOppFollowUps(allFollowUps.filter((f) => f.opportunityId === oppId));
      setOppVisits(allVisits.filter((v) => v.opportunityId === oppId));
      setOppActivities(activities);
    } catch (e) {
      console.error(e);
    }
  };

  // Move stage
  const handleStageChange = async (oppId: string, nextStage: OpportunityStage, notes?: string) => {
    try {
      const updated = await opportunityService.updateStage(oppId, nextStage, user, notes);
      toast.success(`مرحله به «${getOpportunityStageLabel(nextStage).label}» تغییر یافت`);
      setOpportunities((prev) => prev.map((o) => (o.id === oppId ? updated : o)));
      if (selectedOpp?.id === oppId) {
        setSelectedOpp(updated);
        await loadOpportunitySubData(oppId);
      }
    } catch (err: any) {
      toast.error(err?.message || 'خطا در تغییر مرحله');
    }
  };

  // Create Opportunity
  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = availableClients.find((c) => c.id === newClientId);
    const property = availableProperties.find((p) => p.id === newPropertyId);

    if (!client || !property) {
      toast.error('لطفاً مشتری و فایل ملکی را انتخاب کنید.');
      return;
    }

    try {
      const created = await opportunityService.create(
        {
          client,
          property,
          priority: newPriority,
          nextAction: newNextAction,
          nextFollowUp: newNextFollowUp,
          notes: newNotes,
        },
        user
      );
      toast.success('فرصت جدید با موفقیت به پایپ‌لاین افزوده شد');
      setIsCreateModalOpen(false);
      setNewNotes('');
      fetchOpportunities();
      handleSelectOpportunity(created);
    } catch (err: any) {
      toast.error(err?.message || 'خطا در ثبت فرصت');
    }
  };

  // Create Follow-up for current opportunity
  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp) return;
    if (!followUpTitle.trim()) {
      toast.error('عنوان پیگیری را وارد کنید.');
      return;
    }

    try {
      await opportunityService.createFollowUp(
        {
          opportunityId: selectedOpp.id,
          title: followUpTitle,
          description: followUpDesc,
          dueAt: followUpDueAt,
          priority: followUpPriority,
          type: followUpType,
          clientId: selectedOpp.clientId,
          clientName: selectedOpp.clientName || selectedOpp.client?.fullName || 'مشتری',
          propertyId: selectedOpp.propertyId,
          propertyTitle: selectedOpp.propertyTitle || selectedOpp.property?.title || 'ملک',
        },
        user
      );
      toast.success('پیگیری جدید برای این فرصت ثبت شد');
      setIsAddFollowUpOpen(false);
      setFollowUpTitle('');
      setFollowUpDesc('');
      await loadOpportunitySubData(selectedOpp.id);
      fetchOpportunities();
    } catch (err: any) {
      toast.error(err?.message || 'خطا در ایجاد پیگیری');
    }
  };

  // Toggle follow-up status
  const handleToggleFollowUp = async (followUpId: string) => {
    if (!selectedOpp) return;
    try {
      await opportunityService.completeFollowUp(followUpId, 'انجام شد طبق هماهنگی', user);
      toast.success('وضعیت پیگیری به انجام‌شده تغییر یافت');
      await loadOpportunitySubData(selectedOpp.id);
    } catch (err: any) {
      toast.error(err?.message || 'خطا در بروزرسانی پیگیری');
    }
  };

  // Schedule Visit for current opportunity
  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp) return;

    const oppClient = selectedOpp.client || availableClients.find((c) => c.id === selectedOpp.clientId);
    const oppProperty = selectedOpp.property || availableProperties.find((p) => p.id === selectedOpp.propertyId);

    if (!oppClient || !oppProperty) {
      toast.error('اطلاعات متقاضی یا فایل برای ثبت بازدید ناقص است');
      return;
    }

    try {
      await opportunityService.scheduleVisit(
        {
          opportunityId: selectedOpp.id,
          client: oppClient,
          property: oppProperty,
          date: visitDate,
          time: visitTime,
          notes: visitNotes,
        },
        user
      );
      toast.success('بازدید با موفقیت زمان‌بندی شد و مرحله فرصت به «هماهنگی بازدید» منتقل شد');
      setIsAddVisitOpen(false);
      setVisitNotes('');
      // Reload opp and data
      const updatedOpp = await opportunityService.getById(selectedOpp.id, user);
      if (updatedOpp) setSelectedOpp(updatedOpp);
      await loadOpportunitySubData(selectedOpp.id);
      fetchOpportunities();
    } catch (err: any) {
      toast.error(err?.message || 'خطا در ثبت بازدید');
    }
  };

  // Complete Visit
  const handleCompleteVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingVisitId || !selectedOpp) return;

    try {
      await opportunityService.completeVisit(completingVisitId, visitFeedback, user);
      toast.success('بازدید با موفقیت انجام شد و مرحله فرصت به «بازدید انجام شد» ارتقا یافت');
      setCompletingVisitId(null);
      setVisitFeedback('');
      const updatedOpp = await opportunityService.getById(selectedOpp.id, user);
      if (updatedOpp) setSelectedOpp(updatedOpp);
      await loadOpportunitySubData(selectedOpp.id);
      fetchOpportunities();
    } catch (err: any) {
      toast.error(err?.message || 'خطا در تکمیل بازدید');
    }
  };

  // Convert Opportunity to Deal
  const handleConvertToDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp) return;

    const numPrice = Number(dealFinalPrice.replace(/[^0-9]/g, '')) || selectedOpp.estimatedValue || 0;

    try {
      await opportunityService.convertToDeal(
        {
          opportunityId: selectedOpp.id,
          finalPrice: numPrice,
          notes: dealNotes,
        },
        user
      );
      toast.success('تبریک! معامله قطعی با موفقیت ثبت شد و فرصت به مرحله «معامله موفق» منتقل شد');
      setIsDealModalOpen(false);
      const updatedOpp = await opportunityService.getById(selectedOpp.id, user);
      if (updatedOpp) setSelectedOpp(updatedOpp);
      await loadOpportunitySubData(selectedOpp.id);
      fetchOpportunities();
    } catch (err: any) {
      toast.error(err?.message || 'خطا در ثبت معامله');
    }
  };

  // Add Activity / Private Note
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp) return;
    if (!newActivityText.trim()) return;

    try {
      await opportunityService.addActivity(
        {
          opportunityId: selectedOpp.id,
          type: newActivityType,
          description: newActivityText,
          isPrivate: isPrivateNote,
        },
        user
      );
      toast.success(isPrivateNote ? 'یادداشت محرمانه شخصی ثبت شد' : 'فعالیت در تایم‌لاین ثبت شد');
      setNewActivityText('');
      setIsPrivateNote(false);
      await loadOpportunitySubData(selectedOpp.id);
    } catch (err: any) {
      toast.error(err?.message || 'خطا در ثبت فعالیت');
    }
  };

  // Filtered Opportunities
  const filteredOpps = opportunities.filter((o) => {
    const matchesSearch =
      !searchQuery ||
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.clientName || o.client?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.propertyTitle || o.property?.title || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority = priorityFilter === 'all' || o.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-24 text-right">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <span>پایپ‌لاین مدیریت فرصت‌ها و معاملات (CRM Pipeline)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            جریان کسب‌وکار: متقاضی → فایل ملکی → فرصت → پیگیری → بازدید → مذاکره → معامله
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/matches')}
            rightIcon={<Sparkles className="w-4 h-4 text-emerald-600" />}
          >
            تطابق‌های هوشمند
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            rightIcon={<Plus className="w-4 h-4" />}
          >
            ایجاد فرصت جدید
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجوی مشتری، فایل ملکی یا عنوان فرصت..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 shrink-0">فیلتر اولویت:</span>
          <div className="flex items-center gap-1">
            {(['all', 'high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                  priorityFilter === p
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p === 'all' ? 'همه' : p === 'high' ? 'فوری' : p === 'medium' ? 'متوسط' : 'عادی'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE STAGE SELECTOR (Horizontally scrollable stages) */}
      <div className="block lg:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {STAGES.map(({ stage, label }) => {
            const count = filteredOpps.filter((o) => o.stage === stage).length;
            const isActive = mobileActiveStage === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setMobileActiveStage(stage)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{label.split(' ')[0]}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {toPersianDigits(count)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <LoadingState text="در حال بارگذاری پایپ‌لاین و تطابق‌ها..." className="py-24" />
      ) : filteredOpps.length === 0 && searchQuery ? (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="فرصتی با این مشخصات یافت نشد"
          description="کلمات جستجو یا فیلتر اولویت را تغییر دهید."
        />
      ) : (
        <>
          {/* DESKTOP KANBAN PIPELINE (Horizontally scrollable with all 9 stages) */}
          <div className="hidden lg:block overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-[2100px]">
              {STAGES.map(({ stage, label, color }) => {
                const stageOpps = filteredOpps.filter((o) => o.stage === stage);
                const stageValue = stageOpps.reduce((sum, o) => sum + (o.estimatedValue || 0), 0);

                return (
                  <div
                    key={stage}
                    className="w-[280px] shrink-0 bg-slate-50/90 rounded-2xl p-3 border border-slate-200/90 flex flex-col justify-between min-h-[580px]"
                  >
                    <div>
                      {/* Column Header */}
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                          <h4 className="text-xs font-black text-slate-800">{label}</h4>
                        </div>
                        <span className="text-[11px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                          {toPersianDigits(stageOpps.length)}
                        </span>
                      </div>

                      {/* Total Stage Volume */}
                      {stageValue > 0 && (
                        <div className="mb-2.5 text-[11px] text-slate-500 font-medium">
                          ارزش مرحله: <strong className="text-slate-800">{formatPriceToman(stageValue)}</strong>
                        </div>
                      )}

                      {/* Cards in this stage */}
                      <div className="space-y-3">
                        {stageOpps.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/50">
                            فرصتی در این مرحله نیست
                          </div>
                        ) : (
                          stageOpps.map((opp) => (
                            <OpportunityCard
                              key={opp.id}
                              opportunity={opp}
                              onClick={() => handleSelectOpportunity(opp)}
                              onAdvance={(nextStage) => handleStageChange(opp.id, nextStage)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MOBILE LIST VIEW FOR ACTIVE STAGE */}
          <div className="block lg:hidden space-y-3">
            {filteredOpps.filter((o) => o.stage === mobileActiveStage).length === 0 ? (
              <EmptyState
                icon={<Flame className="w-8 h-8" />}
                title="موردی در این مرحله وجود ندارد"
                description="از بخش بالای صفحه مرحله دیگری را انتخاب کنید یا فرصت جدیدی ثبت نمایید."
              />
            ) : (
              filteredOpps
                .filter((o) => o.stage === mobileActiveStage)
                .map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onClick={() => handleSelectOpportunity(opp)}
                    onAdvance={(nextStage) => handleStageChange(opp.id, nextStage)}
                  />
                ))
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* OPPORTUNITY DETAIL MODAL / DRAWER */}
      {/* ========================================================================= */}
      {selectedOpp && (
        <Modal
          isOpen={!!selectedOpp}
          onClose={() => setSelectedOpp(null)}
          title={`فرصت معامله: ${selectedOpp.propertyTitle || selectedOpp.property?.title}`}
          maxWidth="xl"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOpp(null)}
                >
                  بستن
                </Button>
                {selectedOpp.stage !== 'lost' && selectedOpp.stage !== 'won' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-rose-700 hover:bg-rose-50 border-rose-200"
                    onClick={() => {
                      if (confirm('آیا از اعلام لغو این فرصت اطمینان دارید؟')) {
                        handleStageChange(selectedOpp.id, 'lost', 'انصراف متقاضی یا فروش ملک');
                      }
                    }}
                  >
                    اعلام لغو (Lost)
                  </Button>
                )}
              </div>

              {selectedOpp.stage !== 'won' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setDealFinalPrice(String(selectedOpp.estimatedValue || ''));
                    setIsDealModalOpen(true);
                  }}
                  rightIcon={<Award className="w-4 h-4 text-emerald-300" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  تبدیل به معامله قطعی (Convert to Deal)
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4 text-right">
            {/* Header info badge bar */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {toPersianDigits(selectedOpp.matchScore)}٪ امتیاز سازگاری
                </span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${getPriorityLabel(selectedOpp.priority || 'medium').color}`}>
                  اولویت: {getPriorityLabel(selectedOpp.priority || 'medium').label}
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-200 text-slate-800">
                  مرحله: {getOpportunityStageLabel(selectedOpp.stage).label}
                </span>
              </div>

              {/* Stage change dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">تغییر مرحله:</span>
                <select
                  value={selectedOpp.stage}
                  onChange={(e) => handleStageChange(selectedOpp.id, e.target.value as OpportunityStage)}
                  className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-1"
                >
                  {STAGES.map((s) => (
                    <option key={s.stage} value={s.stage}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-slate-200 gap-2">
              <button
                type="button"
                onClick={() => setDetailTab('overview')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  detailTab === 'overview'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                مشخصات و مقایسه
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('followups')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'followups'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>پیگیری‌ها</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                  {toPersianDigits(oppFollowUps.length)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('visits')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'visits'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>بازدیدها</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                  {toPersianDigits(oppVisits.length)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('activities')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'activities'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>تایم‌لاین و یادداشت‌ها</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                  {toPersianDigits(oppActivities.length)}
                </span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {detailTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Property Box */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-bold text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        مشخصات فایل ملکی
                      </span>
                      <span className="font-mono text-[11px]">{selectedOpp.property?.code}</span>
                    </div>
                    <h5 className="text-sm font-bold text-slate-900">{selectedOpp.property?.title}</h5>
                    <div className="text-xs text-emerald-800 font-extrabold">
                      {formatPriceToman(
                        selectedOpp.property?.totalPrice ||
                          selectedOpp.property?.price ||
                          selectedOpp.property?.deposit ||
                          selectedOpp.estimatedValue ||
                          0
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 flex flex-wrap gap-2 pt-1 border-t border-slate-200/80">
                      <span>متراژ: {toPersianDigits(selectedOpp.property?.area || 0)} متر</span>
                      <span>•</span>
                      <span>خواب: {toPersianDigits(selectedOpp.property?.bedrooms || 0)}</span>
                      <span>•</span>
                      <span>محله: {selectedOpp.property?.district || selectedOpp.property?.neighborhood}</span>
                    </div>
                  </div>

                  {/* Client Box */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-bold text-slate-700">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        اطلاعات خریدار / متقاضی
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200">
                        {selectedOpp.client?.role === 'buyer' ? 'خریدار' : 'مستاجر'}
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-slate-900">
                      {selectedOpp.client?.fullName || selectedOpp.client?.name}
                    </h5>
                    <div className="text-xs font-mono text-slate-700 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{selectedOpp.client?.mobile || selectedOpp.client?.phone || 'شماره محفوظ'}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex flex-wrap gap-2 pt-1 border-t border-slate-200/80">
                      <span>بودجه: {formatPriceToman(selectedOpp.client?.budgetMax || selectedOpp.client?.maxDeposit || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Next Action & Next FollowUp */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      اقدام بعدی (Next Action):
                    </span>
                    <span className="font-bold text-amber-800 text-[11px]">
                      موعد پیگیری: {selectedOpp.nextFollowUp || 'تعیین‌نشده'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium">
                    {selectedOpp.nextAction || 'اقدامی ثبت نشده است'}
                  </p>
                </div>

                {/* Private Notes Section */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      یادداشت‌های محرمانه مشاور:
                    </span>
                    <span className="text-[10px] text-slate-400">
                      تنها مشاور ثبت‌کننده مجاز به مشاهده است
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-line">
                    {selectedOpp.notes || 'یادداشتی ثبت نشده است.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: FOLLOW-UPS */}
            {detailTab === 'followups' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800">
                    پیگیری‌های متصل به این معامله
                  </h5>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddFollowUpOpen(!isAddFollowUpOpen)}
                    rightIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    {isAddFollowUpOpen ? 'بستن فرم' : 'ایجاد پیگیری جدید'}
                  </Button>
                </div>

                {/* Subform to create follow-up */}
                {isAddFollowUpOpen && (
                  <form onSubmit={handleCreateFollowUp} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">نوع پیگیری:</label>
                        <select
                          value={followUpType}
                          onChange={(e) => setFollowUpType(e.target.value as FollowUpType)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="phone_call">تماس تلفنی (Phone Call)</option>
                          <option value="client_followup">پیگیری متقاضی (Client Follow-up)</option>
                          <option value="property_followup">پیگیری فایل ملکی (Property Follow-up)</option>
                          <option value="visit_reminder">یادآوری بازدید (Visit Reminder)</option>
                          <option value="negotiation_reminder">یادآوری مذاکره و نشست (Negotiation Reminder)</option>
                          <option value="contract_reminder">یادآوری قرارداد (Contract Reminder)</option>
                          <option value="custom_reminder">یادآور سفارشی (Custom Reminder)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">اولویت:</label>
                        <select
                          value={followUpPriority}
                          onChange={(e) => setFollowUpPriority(e.target.value as FollowUpPriority)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="high">فوری و مهم (High)</option>
                          <option value="medium">متوسط (Medium)</option>
                          <option value="low">عادی (Low)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">عنوان پیگیری:</label>
                      <input
                        type="text"
                        placeholder="مثال: تماس جهت هماهنگی قیمت نشست با خریدار"
                        value={followUpTitle}
                        onChange={(e) => setFollowUpTitle(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">موعد انجام (dueAt):</label>
                        <input
                          type="text"
                          placeholder="مثال: امروز ساعت ۱۸:۳۰"
                          value={followUpDueAt}
                          onChange={(e) => setFollowUpDueAt(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">توضیحات تکمیلی:</label>
                        <input
                          type="text"
                          placeholder="توضیحات اختیاری..."
                          value={followUpDesc}
                          onChange={(e) => setFollowUpDesc(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsAddFollowUpOpen(false)}>
                        انصراف
                      </Button>
                      <Button type="submit" variant="primary" size="sm">
                        ثبت پیگیری
                      </Button>
                    </div>
                  </form>
                )}

                {/* Follow-ups list */}
                {oppFollowUps.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    هیچ پیگیری فعالی برای این معامله ثبت نشده است.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {oppFollowUps.map((flw) => {
                      const isCompleted = flw.status === 'Completed' || flw.status === 'completed';
                      return (
                        <div
                          key={flw.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                            isCompleted ? 'bg-slate-50/70 border-slate-200 opacity-80' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleToggleFollowUp(flw.id)}
                              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                                isCompleted
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 hover:border-emerald-600'
                              }`}
                            >
                              {isCompleted && <Check className="w-3 h-3" />}
                            </button>
                            <div>
                              <h6 className={`font-bold ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                {flw.title}
                              </h6>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span>نوع: {getFollowUpTypeLabel(flw.type)}</span>
                                <span>•</span>
                                <span>موعد: {flw.dueAt || flw.dueDate}</span>
                              </div>
                              {flw.description && (
                                <p className="text-[11px] text-slate-600 mt-1">{flw.description}</p>
                              )}
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : flw.status === 'Overdue' || flw.status === 'overdue'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isCompleted ? 'انجام شد' : flw.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: VISITS */}
            {detailTab === 'visits' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800">
                    برنامه بازدیدهای حضوری
                  </h5>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddVisitOpen(!isAddVisitOpen)}
                    rightIcon={<Calendar className="w-3.5 h-3.5" />}
                  >
                    {isAddVisitOpen ? 'بستن فرم' : 'هماهنگی بازدید جدید'}
                  </Button>
                </div>

                {/* Subform to schedule visit */}
                {isAddVisitOpen && (
                  <form onSubmit={handleScheduleVisit} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">تاریخ بازدید (date):</label>
                        <input
                          type="text"
                          placeholder="مثال: امروز یا فردا پنج‌شنبه"
                          value={visitDate}
                          onChange={(e) => setVisitDate(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">ساعت بازدید (time):</label>
                        <input
                          type="text"
                          placeholder="مثال: ۱۷:۳۰"
                          value={visitTime}
                          onChange={(e) => setVisitTime(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">یادداشت هماهنگی (تلفن سرایداری، کلید، همراهان):</label>
                      <input
                        type="text"
                        placeholder="مثال: هماهنگ با سرایدار آقای بهرامی، کلید در نگهبانی است."
                        value={visitNotes}
                        onChange={(e) => setVisitNotes(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsAddVisitOpen(false)}>
                        انصراف
                      </Button>
                      <Button type="submit" variant="primary" size="sm">
                        ثبت و ارتقا به مرحله هماهنگی بازدید
                      </Button>
                    </div>
                  </form>
                )}

                {/* Complete Visit Feedback Form */}
                {completingVisitId && (
                  <form onSubmit={handleCompleteVisitSubmit} className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                    <h6 className="text-xs font-bold text-emerald-900">
                      ثبت نتیجه و بازخورد بازدید
                    </h6>
                    <textarea
                      placeholder="نظر متقاضی در مورد نقشه، نور، قیمت و آمادگی برای نشست..."
                      value={visitFeedback}
                      onChange={(e) => setVisitFeedback(e.target.value)}
                      rows={2}
                      className="w-full text-xs p-2 rounded-lg border border-emerald-300 bg-white"
                      required
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setCompletingVisitId(null)}>
                        انصراف
                      </Button>
                      <Button type="submit" variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        تکمیل و ارتقا به مرحله Visited
                      </Button>
                    </div>
                  </form>
                )}

                {/* Visits List */}
                {oppVisits.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    هیچ بازدیدی برای این فرصت ثبت نشده است.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {oppVisits.map((v) => {
                      const isDone = v.status === 'Completed' || v.status === 'completed';
                      return (
                        <div
                          key={v.id}
                          className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-bold text-slate-900">
                                تاریخ: {v.date || v.scheduledDate} ساعت {v.time || v.scheduledTime}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-sky-100 text-sky-800'
                                }`}
                              >
                                {getVisitStatusLabel(v.status).label}
                              </span>
                            </div>
                            {v.notes && <p className="text-slate-500 text-[11px]">{v.notes}</p>}
                            {v.feedback && (
                              <p className="text-emerald-800 bg-emerald-50/70 p-1.5 rounded text-[11px] border border-emerald-100">
                                بازخورد: {v.feedback}
                              </p>
                            )}
                          </div>

                          {!isDone && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCompletingVisitId(v.id)}
                              className="text-emerald-700 hover:bg-emerald-50 border-emerald-300 shrink-0"
                            >
                              ثبت انجام و بازخورد
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: ACTIVITIES & PRIVATE NOTES */}
            {detailTab === 'activities' && (
              <div className="space-y-4">
                {/* Form to add note or activity */}
                <form onSubmit={handleAddActivity} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      افزودن رویداد به تاریخچه پرونده
                    </span>

                    <div className="flex items-center gap-2">
                      <select
                        value={newActivityType}
                        onChange={(e) => setNewActivityType(e.target.value as ActivityType)}
                        className="text-xs p-1 rounded-md border border-slate-300 bg-white"
                      >
                        <option value="note">یادداشت (Note)</option>
                        <option value="call">تماس (Call)</option>
                        <option value="message">پیام (Message)</option>
                        <option value="visit">بازدید (Visit)</option>
                        <option value="followup">پیگیری (Follow-up)</option>
                      </select>

                      <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isPrivateNote}
                          onChange={(e) => setIsPrivateNote(e.target.checked)}
                          className="rounded border-slate-300 text-slate-900"
                        />
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>یادداشت محرمانه (فقط من ببینم)</span>
                      </label>
                    </div>
                  </div>

                  <textarea
                    placeholder="شرح تماس، جزئیات نشست، یا یادداشت محرمانه درباره رفتار مشتری..."
                    value={newActivityText}
                    onChange={(e) => setNewActivityText(e.target.value)}
                    rows={2}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    required
                  />

                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" size="sm">
                      ثبت در تاریخچه پرونده
                    </Button>
                  </div>
                </form>

                {/* Timeline display */}
                <div className="space-y-3">
                  {oppActivities.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      هنوز فعالیتی برای این فرصت ثبت نشده است.
                    </div>
                  ) : (
                    oppActivities.map((act) => (
                      <div
                        key={act.id}
                        className={`p-3 rounded-xl border flex items-start gap-3 text-xs ${
                          act.isPrivate
                            ? 'bg-amber-50/50 border-amber-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div
                          className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                            act.isPrivate
                              ? 'bg-amber-100 text-amber-800'
                              : act.type === 'deal_won'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {act.isPrivate ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : act.type === 'call' ? (
                            <Phone className="w-3.5 h-3.5" />
                          ) : act.type === 'message' ? (
                            <MessageSquare className="w-3.5 h-3.5" />
                          ) : act.type === 'visit' || act.type === 'visit_done' ? (
                            <Calendar className="w-3.5 h-3.5" />
                          ) : act.type === 'deal_won' ? (
                            <Award className="w-3.5 h-3.5" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">
                              {act.userName}
                              {act.isPrivate && (
                                <span className="text-[10px] font-bold text-amber-800 mr-2 bg-amber-100 px-1.5 py-0.2 rounded">
                                  یادداشت محرمانه شخصی
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{act.timestamp}</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed whitespace-pre-line">{act.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* CONVERT TO DEAL MODAL */}
      {/* ========================================================================= */}
      {isDealModalOpen && selectedOpp && (
        <Modal
          isOpen={isDealModalOpen}
          onClose={() => setIsDealModalOpen(false)}
          title="ثبت قرارداد نهایی و تبدیل به معامله (Deal Won)"
          maxWidth="md"
        >
          <form onSubmit={handleConvertToDeal} className="space-y-4 text-right">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
              با ثبت این مرحله، معامله به عنوان <strong>موفق (Won)</strong> علامت‌گذاری شده و در گزارش عملکرد مشاور محاسبه می‌گردد.
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">مبلغ نهایی توافق‌شده (تومان):</label>
              <input
                type="text"
                value={dealFinalPrice}
                onChange={(e) => setDealFinalPrice(e.target.value)}
                placeholder="مثال: ۲۲,۵۰۰,۰۰۰,۰۰۰"
                className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-slate-300"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">توضیحات و شماره قرارداد/مبایعه‌نامه:</label>
              <textarea
                value={dealNotes}
                onChange={(e) => setDealNotes(e.target.value)}
                placeholder="شماره قرارداد، نحوه پرداخت ثمن معامله یا توافقات ویژه..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDealModalOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                تایید و بستن معامله
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* CREATE NEW OPPORTUNITY MODAL */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="ثبت فرصت معامله جدید در پایپ‌لاین"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateOpportunity} className="space-y-4 text-right">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">انتخاب متقاضی (Client):</label>
                <select
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                  required
                >
                  {availableClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || c.name} ({c.role === 'buyer' ? 'خریدار' : 'مستاجر'}) — {c.desiredDistricts?.join('، ') || 'تهران'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">انتخاب فایل ملکی (Property):</label>
                <select
                  value={newPropertyId}
                  onChange={(e) => setNewPropertyId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                  required
                >
                  {availableProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.title} ({toPersianDigits(p.area)}متر، {p.district || p.neighborhood})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">اولویت پیگیری:</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as FollowUpPriority)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="high">فوری و مهم (High)</option>
                  <option value="medium">متوسط (Medium)</option>
                  <option value="low">عادی (Low)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">موعد پیگیری اولیه (nextFollowUp):</label>
                <input
                  type="text"
                  value={newNextFollowUp}
                  onChange={(e) => setNewNextFollowUp(e.target.value)}
                  placeholder="مثال: امروز ساعت ۱۷:۰۰"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">اقدام بعدی (nextAction):</label>
              <input
                type="text"
                value={newNextAction}
                onChange={(e) => setNewNextAction(e.target.value)}
                placeholder="مثال: تماس اولیه جهت هماهنگی بازدید با مشتری"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">یادداشت اولیه:</label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="نکات مهم راجع به توافق خریدار و مالک..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" variant="primary" size="sm">
                ثبت فرصت معامله
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// =========================================================================
// OPPORTUNITY CARD COMPONENT (Meets exact prompt requirements)
// client, property, match score, stage, priority, next action, next follow-up
// =========================================================================
interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick: () => void;
  onAdvance: (nextStage: OpportunityStage) => void;
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity: opp,
  onClick,
  onAdvance,
}) => {
  const priorityInfo = getPriorityLabel(opp.priority || 'medium');
  const stageInfo = getOpportunityStageLabel(opp.stage);

  // Logical next stage
  const stageFlow: OpportunityStage[] = [
    'new_match',
    'contacted',
    'interested',
    'visit_scheduled',
    'visited',
    'negotiation',
    'contract',
    'won',
  ];
  const currentIndex = stageFlow.indexOf(opp.stage);
  const nextStage = currentIndex >= 0 && currentIndex < stageFlow.length - 1 ? stageFlow[currentIndex + 1] : null;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer space-y-2.5 text-right"
    >
      {/* Badges: Match Score & Priority */}
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono">
          {toPersianDigits(opp.matchScore)}٪ تطابق
        </span>

        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${priorityInfo.color}`}>
          {priorityInfo.label}
        </span>
      </div>

      {/* Property & Client Names */}
      <div className="space-y-1">
        <h5 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
          {opp.propertyTitle || opp.property?.title}
        </h5>
        <p className="text-[11px] text-slate-500 line-clamp-1">
          متقاضی: <strong className="text-slate-700">{opp.clientName || opp.client?.fullName || opp.client?.name}</strong>
        </p>
      </div>

      {/* Next Action & Follow-up */}
      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-1 text-[11px]">
        <div className="text-slate-700 line-clamp-1">
          <span className="font-bold text-slate-800">اقدام بعدی: </span>
          {opp.nextAction || 'تعیین‌نشده'}
        </div>
        <div className="text-amber-700 font-medium flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="truncate">پیگیری: {opp.nextFollowUp || 'امروز'}</span>
        </div>
      </div>

      {/* Footer Stage & Quick Advance Button */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${stageInfo.color}`}>
          {stageInfo.label.split(' ')[0]}
        </span>

        {nextStage && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(nextStage);
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
            title="انتقال به مرحله بعد"
          >
            <span>ارتقا مرحله</span>
            <ChevronLeft className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
