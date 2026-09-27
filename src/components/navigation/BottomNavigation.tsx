import React, { useState } from 'react';
import { Home, Building2, Users, Sparkles, MoreHorizontal, Calendar, CheckSquare, BarChart3, Bell, Settings, ShieldCheck, Plus } from 'lucide-react';
import { Drawer } from '../common/Drawer';

export interface BottomNavigationProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  unreadMatchesCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentPath,
  onNavigate,
  unreadMatchesCount = 0,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainItems = [
    {
      id: 'home',
      label: 'خانه',
      path: '/dashboard',
      icon: Home,
    },
    {
      id: 'properties',
      label: 'فایل‌ها',
      path: '/properties',
      icon: Building2,
    },
    {
      id: 'clients',
      label: 'مشتریان',
      path: '/clients',
      icon: Users,
    },
    {
      id: 'matches',
      label: 'مچ‌ها',
      path: '/matches',
      icon: Sparkles,
      badge: unreadMatchesCount > 0 ? unreadMatchesCount : undefined,
    },
    {
      id: 'more',
      label: 'بیشتر',
      icon: MoreHorizontal,
      onClick: () => setIsMoreOpen(true),
      isActive: ['/opportunities', '/follow-ups', '/visits', '/team', '/reports', '/settings', '/notifications'].includes(currentPath),
    },
  ];

  const moreMenuSections = [
    {
      title: 'پیگیری و جلسات',
      items: [
        { label: 'پیگیری‌ها و تسک‌ها', path: '/follow-ups', icon: CheckSquare },
        { label: 'بازدیدهای هماهنگ‌شده', path: '/visits', icon: Calendar },
        { label: 'فرصت‌ها و پایپ‌لاین فروش', path: '/opportunities', icon: Sparkles },
      ],
    },
    {
      title: 'مدیریت و گزارش‌ها',
      items: [
        { label: 'تیم و مشاوران آژانس', path: '/team', icon: ShieldCheck },
        { label: 'گزارش‌های عملکرد و مالی', path: '/reports', icon: BarChart3 },
        { label: 'اعلان‌ها و رویدادها', path: '/notifications', icon: Bell },
        { label: 'تنظیمات حساب و آژانس', path: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 md:hidden safe-area-bottom shadow-lg">
        <div className="flex items-center justify-around h-16 px-1">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path ? currentPath === item.path || (item.path !== '/dashboard' && currentPath.startsWith(item.path)) : item.isActive;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.onClick) {
                    item.onClick();
                  } else if (item.path) {
                    onNavigate(item.path);
                  }
                }}
                className={`
                  relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors cursor-pointer select-none
                  ${isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'}
                `}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Drawer for "بیشتر" */}
      <Drawer isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} title="سایر بخش‌های املاکینو">
        <div className="space-y-6 pb-6">
          {moreMenuSections.map((section, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 px-2">{section.title}</h4>
              <div className="grid grid-cols-1 gap-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isCurrent = currentPath === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        setIsMoreOpen(false);
                        onNavigate(item.path);
                      }}
                      className={`
                        flex items-center gap-3 p-3 rounded-xl text-right transition-colors cursor-pointer
                        ${isCurrent ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'hover:bg-slate-50 text-slate-700'}
                      `}
                    >
                      <div className={`p-2 rounded-lg ${isCurrent ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick Add Buttons Inside Drawer */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setIsMoreOpen(false);
                onNavigate('/properties/new');
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت فایل جدید</span>
            </button>
            <button
              onClick={() => {
                setIsMoreOpen(false);
                onNavigate('/clients/new');
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت مشتری جدید</span>
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
};
