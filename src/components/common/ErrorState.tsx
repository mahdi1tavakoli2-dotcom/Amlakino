import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'خطا در ارتباط با سرور',
  message = 'در برقراری ارتباط مشکلی پیش آمده است. لطفاً اتصال اینترنت خود را بررسی کرده و مجدداً تلاش کنید.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center p-8 text-center bg-rose-50/50 rounded-2xl border border-rose-200
        ${className}
      `}
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-base font-bold text-slate-800 mb-1">{title}</h4>
      <p className="text-xs sm:text-sm text-slate-600 max-w-sm mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} rightIcon={<RotateCcw className="w-4 h-4" />}>
          تلاش مجدد
        </Button>
      )}
    </div>
  );
};
