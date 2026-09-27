import React, { useState, useEffect } from 'react';
import { Calendar, Phone, MapPin, Check, Plus, Clock, Building2 } from 'lucide-react';
import { storageService } from '../services/storageService';
import { Visit } from '../types';
import { toPersianDigits } from '../utils/formatters';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

export const VisitsView: React.FC = () => {
  const toast = useToast();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const data = await storageService.getVisits();
      setVisits(data);
    } catch (e) {
      console.error(e);
      toast.error('خطا در بارگذاری برنامه بازدیدها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const handleComplete = (id: string) => {
    setVisits((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'completed' } : v))
    );
    toast.success('بازدید به عنوان انجام‌شده ثبت شد');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">برنامه سرویس و بازدیدهای ملکی</h2>
          <p className="text-xs text-slate-500">هماهنگی ساعت حضور متقاضی و مالک در محل ملک</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => toast.info('امکان زمان‌بندی هوشمند بازدید از صفحه هر فایل یا مشتری در دسترس است')}
          rightIcon={<Plus className="w-4 h-4" />}
        >
          هماهنگی بازدید جدید
        </Button>
      </div>

      {loading ? (
        <LoadingState text="در حال دریافت لیست بازدیدها..." className="py-16" />
      ) : visits.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8" />}
          title="بازدیدی برنامه‌ریزی نشده است"
          description="برای امروز و روزهای آینده بازدیدی در تقویم شما ثبت نیست."
        />
      ) : (
        <div className="space-y-3">
          {visits.map((v) => {
            const isDone = v.status === 'completed';

            return (
              <Card
                key={v.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  isDone ? 'bg-slate-50/70 border-slate-200' : 'bg-white'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {v.propertyTitle}
                    </span>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {v.propertyDistrict}
                    </span>
                    {isDone && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        انجام شد
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">
                    مشتری: <strong className="text-slate-800">{v.clientName}</strong> • تلفن: {v.clientPhone}
                  </p>

                  {v.feedback && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-md">
                      {v.feedback}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-right sm:text-left">
                    <div className="text-xs font-black text-slate-800 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{v.scheduledDate}</span>
                    </div>
                    <div className="text-xs text-emerald-700 font-bold">
                      ساعت {toPersianDigits(v.scheduledTime)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${v.clientPhone}`}
                      className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                      title="تماس با مشتری"
                    >
                      <Phone className="w-4 h-4" />
                    </a>

                    {!isDone && (
                      <button
                        onClick={() => handleComplete(v.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>ثبت نتیجه</span>
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
