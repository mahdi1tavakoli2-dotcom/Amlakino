import React from 'react';
import {
  Home,
  Building2,
  Users,
  Sparkles,
  Calendar,
  CheckSquare,
  BarChart3,
  Bell,
  Settings,
  ShieldCheck,
  Shield,
  Plus,
  LogOut,
  Building,
} from 'lucide-react';
import { User, Team } from '../../types';

export interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  user: User | null;
  team: Team | null;
  unreadMatchesCount?: number;
  unreadNotifsCount?: number;
  onLogout?: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  user,
  team,
  unreadMatchesCount = 0,
  unreadNotifsCount = 0,
  onLogout,
  className = '',
}) => {
  const navSections = [
    {
      title: 'میز کار اصلی',
      items: [
        { label: 'خانه و داشبورد', path: '/dashboard', icon: Home },
        { label: 'فایل‌های ملکی', path: '/properties', icon: Building2 },
        { label: 'مشتریان و متقاضیان', path: '/clients', icon: Users },
        {
          label: 'مچ‌های هوشمند',
          path: '/matches',
          icon: Sparkles,
          badge: unreadMatchesCount > 0 ? unreadMatchesCount : undefined,
          badgeColor: 'bg-emerald-100 text-emerald-800',
        },
      ],
    },
    {
      title: 'پیگیری‌ها و معاملات',
      items: [
        { label: 'پیگیری‌ها و تسک‌ها', path: '/follow-ups', icon: CheckSquare },
        { label: 'بازدیدهای ملکی', path: '/visits', icon: Calendar },
        { label: 'فرصت‌ها و قراردادها', path: '/opportunities', icon: Sparkles },
      ],
    },
    {
      title: 'دپارتمان و تنظیمات',
      items: [
        { label: 'تیم و مشاوران', path: '/team', icon: ShieldCheck },
        { label: 'آزمایشگاه امنیت', path: '/security-tests', icon: Shield },
        { label: 'گزارش‌های تحلیلی', path: '/reports', icon: BarChart3 },
        {
          label: 'اعلان‌ها',
          path: '/notifications',
          icon: Bell,
          badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined,
          badgeColor: 'bg-rose-100 text-rose-800',
        },
        { label: 'تنظیمات سامانه', path: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={`
        hidden md:flex flex-col w-64 lg:w-72 bg-white border-l border-slate-200/80 h-screen sticky top-0 z-30 select-none
        ${className}
      `}
    >
      {/* Brand Logo Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-xs">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900">املاکینو</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                CRM
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">نرم‌افزار جامع دفاتر املاک</p>
          </div>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="p-4 border-b border-slate-100">
        <button
          onClick={() => onNavigate('/properties/new')}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت فایل جدید</span>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section, sIndex) => (
          <div key={sIndex} className="space-y-1">
            <h4 className="text-[11px] font-bold text-slate-400 px-3 mb-2 tracking-wider">
              {section.title}
            </h4>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/dashboard'
                  ? currentPath === '/dashboard'
                  : currentPath === item.path || currentPath.startsWith(`${item.path}/`);

              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all text-right cursor-pointer
                    ${
                      isActive
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User & Agency Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70">
        <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
              {user?.fullName ? user.fullName[0] : 'م'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.fullName || 'کاربر سیستم'}</p>
              <p className="text-[11px] text-slate-500 truncate">{team?.name || 'دفتر سعادت‌آباد'}</p>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="خروج از حساب کاربری"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
