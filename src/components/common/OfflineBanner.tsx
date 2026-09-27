import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { syncQueueService, SyncQueueItem } from '../../services/syncQueueService';
import { toPersianDigits } from '../../utils/formatters';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [justRestored, setJustRestored] = useState(false);

  useEffect(() => {
    const unsub = syncQueueService.subscribe((q) => setSyncQueue(q));
    return unsub;
  }, []);

  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      handleAutoSync();
    } else if (isOnline) {
      setJustRestored(true);
      const timer = setTimeout(() => setJustRestored(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const handleAutoSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncQueueService.processSyncQueue();
      setJustRestored(true);
      setTimeout(() => setJustRestored(false), 3500);
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingCount = syncQueue.filter((i) => i.status === 'pending').length;

  if (isOnline && !justRestored && pendingCount === 0) {
    return null;
  }

  if (!isOnline) {
    return (
      <div className="bg-amber-600 text-white text-xs px-4 py-2 flex items-center justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
          <span>
            حالت آفلاین (Offline): ارتباط اینترنت قطع است. داده‌ها از حافظه کش محلی لود شده و ویرایش‌ها در صف همگام‌سازی ذخیره می‌شوند.
          </span>
        </div>
        {pendingCount > 0 && (
          <span className="bg-amber-700/80 px-2 py-0.5 rounded-full font-bold text-[11px] whitespace-nowrap mr-2">
            {toPersianDigits(pendingCount)} تغییر در انتظار همگام‌سازی
          </span>
        )}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="bg-blue-600 text-white text-xs px-4 py-2 flex items-center justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>اتصال اینترنت برقرار شد. در حال همگام‌سازی امن اطلاعات با سرور ابری...</span>
        </div>
      </div>
    );
  }

  if (justRestored) {
    return (
      <div className="bg-emerald-600 text-white text-xs px-4 py-2 flex items-center justify-between shadow-md sticky top-0 z-50 transition-opacity">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>ارتباط اینترنت آنلاین و کلیه اطلاعات پایگاه داده به‌روزرسانی شد.</span>
        </div>
      </div>
    );
  }

  return null;
};
