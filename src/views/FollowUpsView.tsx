import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Check, Clock, Phone, AlertCircle, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import { FollowUp, FollowUpType, FollowUpPriority } from '../types';
import {
  toPersianDigits,
  getFollowUpTypeLabel,
  getPriorityLabel,
} from '../utils/formatters';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

export const FollowUpsView: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue' | 'completed'>('today');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New follow-up state
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [type, setType] = useState<FollowUpType>('call');
  const [dueDate, setDueDate] = useState('امروز');
  const [dueTime, setDueTime] = useState('16:00');
  const [priority, setPriority] = useState<FollowUpPriority>('high');

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const data = await storageService.getFollowUps();
      setFollowUps(data);
    } catch (e) {
      console.error(e);
      toast.error('خطا در بارگذاری لیست پیگیری‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      await storageService.toggleFollowUpStatus(id);
      toast.success('وضعیت پیگیری به‌روزرسانی شد');
      fetchFollowUps();
    } catch {
      toast.error('خطا در تغییر وضعیت');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('لطفاً عنوان پیگیری را وارد کنید');
      return;
    }

    try {
      await storageService.createFollowUp({
        title,
        clientName: clientName || undefined,
        type,
        dueAt: `${dueDate} ساعت ${dueTime}`,
        dueDate,
        dueTime,
        priority,
        status: 'pending',
        privacyState: 'private',
        agentId: user?.id || 'usr_101',
      }, user);
      toast.success('پیگیری جدید با موفقیت ایجاد شد');
      setIsModalOpen(false);
      setTitle('');
      setClientName('');
      fetchFollowUps();
    } catch {
      toast.error('خطا در ایجاد پیگیری');
    }
  };

  const filteredItems = followUps.filter((item) => {
    if (filter === 'today') return item.dueDate === 'امروز' && item.status !== 'completed';
    if (filter === 'overdue') return item.status === 'overdue';
    if (filter === 'completed') return item.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-20">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">پیگیری‌ها و تسک‌های مشاور</h2>
          <p className="text-xs text-slate-500">مدیریت تماس‌ها، جلسات و یادآوری‌های روزانه</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          rightIcon={<Plus className="w-4 h-4" />}
        >
          پیگیری جدید
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'today', label: 'امروز' },
          { id: 'overdue', label: 'معوقه' },
          { id: 'all', label: 'همه پیگیری‌ها' },
          { id: 'completed', label: 'انجام شده' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`
              px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors
              ${
                filter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState text="در حال بارگذاری پیگیری‌ها..." className="py-16" />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-8 h-8" />}
          title="پیگیری فعالی در این دسته‌بندی نیست"
          description="همه موارد با موفقیت تکمیل شده‌اند یا پیگیری جدیدی ثبت نشده است."
          actionLabel="ثبت پیگیری جدید"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => {
            const prio = getPriorityLabel(item.priority);
            const isDone = item.status === 'completed';

            return (
              <Card
                key={item.id}
                padding="none"
                className={`p-3.5 flex items-start justify-between gap-3 transition-colors ${
                  isDone ? 'bg-slate-50/60 opacity-60' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggle(item.id)}
                    className={`
                      mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0
                      ${
                        isDone
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-emerald-600 hover:bg-emerald-50'
                      }
                    `}
                  >
                    {isDone && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <div>
                    <h4
                      className={`text-xs sm:text-sm font-bold text-slate-900 ${
                        isDone ? 'line-through text-slate-500' : ''
                      }`}
                    >
                      {item.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Clock className="w-3 h-3 text-slate-400" />
                        موعد: {item.dueDate} ساعت {toPersianDigits(item.dueTime)}
                      </span>
                      <span>•</span>
                      <span>{getFollowUpTypeLabel(item.type)}</span>
                      {item.clientName && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">مشتری: {item.clientName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${prio.color}`}>
                  {prio.label}
                </span>
              </Card>
            );
          })}
        </div>
      )}

      {/* New FollowUp Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="ثبت پیگیری و یادآوری جدید">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="عنوان پیگیری"
            placeholder="مثال: تماس مجدد جهت دریافت پیش‌نویس قرارداد"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Input
            label="نام متقاضی یا طرف معامله (اختیاری)"
            placeholder="مثال: آقای مرادی"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="نوع اقدام"
              value={type}
              onChange={(e) => setType(e.target.value as FollowUpType)}
              options={[
                { value: 'phone_call', label: 'تماس تلفنی (Phone Call)' },
                { value: 'client_followup', label: 'پیگیری متقاضی (Client Follow-up)' },
                { value: 'property_followup', label: 'پیگیری فایل ملکی (Property Follow-up)' },
                { value: 'visit_reminder', label: 'یادآوری بازدید (Visit Reminder)' },
                { value: 'negotiation_reminder', label: 'یادآوری مذاکره و نشست (Negotiation Reminder)' },
                { value: 'contract_reminder', label: 'یادآوری قرارداد (Contract Reminder)' },
                { value: 'custom_reminder', label: 'یادآور سفارشی (Custom Reminder)' },
                { value: 'call', label: 'تماس عمومی' },
                { value: 'meeting', label: 'جلسه حضوری' },
              ]}
            />

            <Select
              label="اولویت"
              value={priority}
              onChange={(e) => setPriority(e.target.value as FollowUpPriority)}
              options={[
                { value: 'high', label: 'فوری / بالا' },
                { value: 'medium', label: 'متوسط' },
                { value: 'low', label: 'عادی' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="تاریخ موعد"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="مثال: امروز یا فردا"
            />
            <Input
              label="ساعت موعد"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              placeholder="17:30"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              انصراف
            </Button>
            <Button variant="primary" type="submit">
              ذخیره پیگیری
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
