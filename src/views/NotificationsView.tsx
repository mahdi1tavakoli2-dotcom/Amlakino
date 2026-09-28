import React, { useState, useEffect } from 'react';
import { Bell, Sparkles, AlertCircle, CheckCircle2, Clock, Check } from 'lucide-react';
import { storageService } from '../services/storageService';
import { Notification } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

export const NotificationsView: React.FC = () => {
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const data = await storageService.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
      toast.error('خطا در دریافت اعلان‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await storageService.markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    toast.success('اعلان خوانده شد');
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">مرکز اعلان‌ها و یادآوری‌ها</h2>
          <p className="text-xs text-slate-500">هشدارهای سیستم و رویدادهای فایل‌ها و مشتریان</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            toast.success('همه اعلان‌ها خوانده شدند');
          }}
        >
          خواندن همه
        </Button>
      </div>

      {loading ? (
        <LoadingState text="در حال بارگذاری اعلان‌ها..." className="py-16" />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8" />}
          title="اعلان جدیدی وجود ندارد"
          description="تمامی پیام‌ها و هشدارهای سیستم بررسی شده‌اند."
        />
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              padding="none"
              className={`p-4 transition-colors flex items-start justify-between gap-3 ${
                notif.read ? 'bg-white opacity-70' : 'bg-white border-emerald-300 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                    notif.type === 'match'
                      ? 'bg-emerald-100 text-emerald-700'
                      : notif.type === 'followup'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-sky-100 text-sky-700'
                  }`}
                >
                  {notif.type === 'match' ? (
                    <Sparkles className="w-4 h-4" />
                  ) : notif.type === 'followup' ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">{notif.title}</h4>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                  <span className="text-[11px] text-slate-400 block pt-1">{notif.createdAt}</span>
                </div>
              </div>

              {!notif.read && (
                <button
                  onClick={() => handleMarkAsRead(notif.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors shrink-0"
                  title="علامت‌گذاری به عنوان خوانده‌شده"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
