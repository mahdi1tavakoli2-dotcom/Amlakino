import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  text = 'در حال بارگذاری اطلاعات...',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center text-slate-500 ${className}`}>
      <Loader2 className={`${sizeStyles[size]} animate-spin text-emerald-600 mb-3`} />
      {text && <p className="text-xs sm:text-sm font-medium text-slate-600">{text}</p>}
    </div>
  );
};
