import React, { useState, useEffect } from 'react';
import {
  Handshake,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Percent,
  Calendar,
  Building2,
  Users,
  MessageSquare,
  Lock,
  Unlock,
} from 'lucide-react';
import { CollaborationRequest, User } from '../../types';
import { collaborationService } from '../../services/collaborationService';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { useToast } from '../common/Toast';
import { toPersianDigits } from '../../utils/formatters';

interface CollaborationRequestsListProps {
  currentUser: User;
  onCollaborationUpdated?: () => void;
}

export const CollaborationRequestsList: React.FC<CollaborationRequestsListProps> = ({
  currentUser,
  onCollaborationUpdated,
}) => {
  const toast = useToast();
  const [requests, setRequests] = useState<CollaborationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'received' | 'sent' | 'active'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await collaborationService.getRequests(currentUser);
      setRequests(data);
    } catch (e) {
      console.error(e);
      toast.error('خطا در دریافت درخواست‌های همکاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [currentUser]);

  const handleRespond = async (requestId: string, decision: 'accept' | 'reject') => {
    try {
      setActionLoadingId(requestId);
      await collaborationService.respondToRequest(requestId, decision, currentUser);
      if (decision === 'accept') {
        toast.success('درخواست همکاری با موفقیت پذیرفته شد. دسترسی هماهنگی معامله فعال شد.');
      } else {
        toast.info('درخواست همکاری رد شد. اطلاعات همچنان کاملاً محرمانه باقی ماند.');
      }
      await loadRequests();
      onCollaborationUpdated?.();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ثبت پاسخ');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      setActionLoadingId(requestId);
      await collaborationService.cancelRequest(requestId, currentUser);
      toast.info('درخواست همکاری لغو شد.');
      await loadRequests();
      onCollaborationUpdated?.();
    } catch (err: any) {
      toast.error(err.message || 'خطا در لغو درخواست');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = requests.filter((r) => {
    if (filter === 'received') return r.receiverId === currentUser.id && r.status === 'pending';
    if (filter === 'sent') return r.senderId === currentUser.id && r.status === 'pending';
    if (filter === 'active') return r.status === 'accepted';
    return true;
  });

  const pendingReceivedCount = requests.filter(
    (r) => r.receiverId === currentUser.id && r.status === 'pending'
  ).length;

  const activeCount = requests.filter((r) => r.status === 'accepted').length;

  if (loading) {
    return <LoadingState text="در حال بررسی درخواست‌های همکاری و مجوزهای دسترسی..." className="py-12" />;
  }

  return (
    <div className="space-y-4">
      {/* Privacy First Rule Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 text-xs text-slate-700 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-900 block">
            سیستم همکاری دوجانبه در معاملات (Privacy-First Deal Collaboration)
          </span>
          <p className="leading-relaxed">
            کشف تطابق هوشمند به خودی خود اطلاعات شخصی را فاش نمی‌کند. تنها زمانی که هر دو مشاور همکاری در معامله را تایید کنند، اطلاعات لازم جهت هماهنگی معامله به اشتراک گذاشته می‌شود. درخواست‌های پاسخ‌داده‌نشده پس از ۷ روز به صورت خودکار منقضی می‌شوند.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            همه درخواست‌ها ({toPersianDigits(requests.length)})
          </button>
          <button
            type="button"
            onClick={() => setFilter('received')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === 'received'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>دریافتی‌های منتظر پاسخ</span>
            {pendingReceivedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                {toPersianDigits(pendingReceivedCount)}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'active'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            معاملات مشترک فعال ({toPersianDigits(activeCount)})
          </button>
          <button
            type="button"
            onClick={() => setFilter('sent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'sent'
                ? 'bg-slate-700 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ارسالی‌های من
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Handshake className="w-8 h-8" />}
          title="درخواستی وجود ندارد"
          description={
            filter === 'received'
              ? 'در حال حاضر هیچ درخواست همکاری جدیدی از همکاران دریافت نشده است.'
              : filter === 'active'
              ? 'هنوز معامله مشترک تاییدشده‌ای ثبت نشده است.'
              : 'هیچ درخواستی در این بخش یافت نشد.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((req) => {
            const isReceived = req.receiverId === currentUser.id;
            const isPending = req.status === 'pending';
            const isAccepted = req.status === 'accepted';
            const isRejected = req.status === 'rejected';
            const isExpired = req.status === 'expired';

            // Calculate remaining days
            const expTime = new Date(req.expiresAt).getTime();
            const nowTime = Date.now();
            const daysLeft = Math.max(0, Math.ceil((expTime - nowTime) / (1000 * 60 * 60 * 24)));

            return (
              <Card
                key={req.id}
                className={`p-4 sm:p-5 space-y-3.5 border transition-all ${
                  isPending && isReceived
                    ? 'border-emerald-300 bg-emerald-50/20 shadow-xs'
                    : isAccepted
                    ? 'border-blue-200 bg-blue-50/15'
                    : 'border-slate-200'
                }`}
              >
                {/* Header status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-xl text-white ${
                        isReceived ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      {isReceived ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {isReceived ? `درخواست از ${req.senderName}` : `ارسال‌شده به ${req.receiverName}`}
                      </h4>
                      <p className="text-[11px] text-slate-500">{req.createdAt}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      isAccepted
                        ? 'bg-blue-100 text-blue-800'
                        : isPending
                        ? 'bg-amber-100 text-amber-800'
                        : isExpired
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isAccepted && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                    {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                    {isRejected && <XCircle className="w-3 h-3 text-rose-600" />}
                    <span>
                      {isAccepted
                        ? 'همکاری فعال'
                        : isPending
                        ? 'در انتظار تایید'
                        : isExpired
                        ? 'منقضی شده'
                        : 'رد شده'}
                    </span>
                  </span>
                </div>

                {/* Deal Items Summary */}
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{req.propertyTitle}</span>
                    </span>
                    <span className="font-bold text-emerald-700">{toPersianDigits(req.matchScore)}٪ تطابق</span>
                  </div>
                  <div className="text-slate-600 flex items-center gap-1.5 text-[11px]">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{req.clientSummary}</span>
                  </div>
                </div>

                {/* Commission Split & Terms */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">تسهیم کارمزد:</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Percent className="w-3 h-3 text-emerald-600" />
                      <span>{req.commissionSplit}</span>
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">اعتبار ۷ روزه:</span>
                    <span className="font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span>{isPending ? `${toPersianDigits(daysLeft)} روز باقی‌مانده` : 'تکمیل'}</span>
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {req.notes && (
                  <div className="text-xs p-2.5 bg-slate-50 rounded-lg text-slate-600 flex items-start gap-2 border border-slate-100">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{req.notes}</span>
                  </div>
                )}

                {/* Privacy Badge Status */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-slate-500">
                    {isAccepted ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-blue-700 font-bold">دسترسی هماهنگی مشترک صادر شد</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>اطلاعات تماس شخصی محافظت‌شده</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {isPending && isReceived && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      isLoading={actionLoadingId === req.id}
                      onClick={() => handleRespond(req.id, 'accept')}
                      rightIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      پذیرش همکاری و تسهیم کارمزد
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={actionLoadingId === req.id}
                      onClick={() => handleRespond(req.id, 'reject')}
                      className="text-rose-600 hover:bg-rose-50 border-rose-200"
                    >
                      رد
                    </Button>
                  </div>
                )}

                {isPending && !isReceived && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleCancel(req.id)}
                      disabled={actionLoadingId === req.id}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                    >
                      لغو درخواست
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
