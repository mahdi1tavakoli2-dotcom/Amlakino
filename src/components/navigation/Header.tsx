import React from 'react';
import { ArrowRight, Bell, Sparkles, User as UserIcon } from 'lucide-react';
import { User } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  onNavigate: (path: string) => void;
  unreadNotificationsCount?: number;
  user?: User | null;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  onNavigate,
  unreadNotificationsCount = 0,
  user,
  rightAction,
}) => {
  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && onBack ? (
          <button
            onClick={onBack}
            className="p-2 -mr-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="بازگشت"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : null}

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <PWAInstallButton />

        {rightAction}

        {/* Matches Quick Link */}
        <button
          onClick={() => onNavigate('/matches')}
          title="مچ‌های هوشمند"
          className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors relative cursor-pointer"
        >
          <Sparkles className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button
          onClick={() => onNavigate('/notifications')}
          title="اعلان‌ها"
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative cursor-pointer"
        >
          <Bell className="w-5 h-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
          )}
        </button>

        {/* User Profile Mini (Mobile) */}
        <button
          onClick={() => onNavigate('/settings')}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
        >
          {user?.fullName ? (
            <span className="text-xs font-bold text-slate-800">{user.fullName[0]}</span>
          ) : (
            <UserIcon className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
};

