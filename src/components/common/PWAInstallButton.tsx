import React, { useState } from 'react';
import { Download, Smartphone, Share, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Button } from './Button';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    try {
      setInstalling(true);
      await install();
    } finally {
      setInstalling(false);
    }
  };

  if (isInstallable) {
    if (variant === 'full') {
      return (
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-xs hover:shadow-md hover:brightness-105 transition-all cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>نصب نسخه اپلیکیشن املاکینو</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleInstall}
        disabled={installing}
        title="نصب اپلیکیشن PWA روی گوشی یا دسکتاپ"
        className={`flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${className}`}
      >
        <Download className="w-3.5 h-3.5 text-emerald-600" />
        <span className="hidden sm:inline">نصب اپلیکیشن</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${className}`}
          title="راهنمای افزودن به صفحه اصلی آیفون و آیپد"
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">نصب روی iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4 text-right">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">نصب املاکینو در آیفون / آیپد</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0 text-[11px]">
                    ۱
                  </span>
                  <div>
                    در نوار پایین مرورگر <strong>Safari</strong> روی دکمه{' '}
                    <span className="inline-flex items-center gap-1 font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded">
                      <Share className="w-3 h-3" /> اشتراک‌گذاری (Share)
                    </span>{' '}
                    بزنید.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0 text-[11px]">
                    ۲
                  </span>
                  <div>
                    به پایین صفحه رفته و گزینه{' '}
                    <strong className="text-slate-900">Add to Home Screen (افزودن به صفحه اصلی)</strong>{' '}
                    را لمس کنید.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0 text-[11px]">
                    ۳
                  </span>
                  <div>
                    در بالای صفحه روی <strong>Add</strong> بزنید تا آیکون املاکینو مانند یک برنامه بومی روی صفحه گوشی شما ظاهر شود.
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => setShowIOSGuide(false)}
              >
                متوجه شدم
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
