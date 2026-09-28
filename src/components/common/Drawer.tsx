import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  position?: 'bottom' | 'right';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'bottom',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer content */}
      {position === 'bottom' ? (
        <div
          className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl z-10 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200"
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
          <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto flex-1">{children}</div>
        </div>
      ) : (
        <div
          className="fixed right-0 inset-y-0 w-80 max-w-full bg-white shadow-2xl z-10 flex flex-col animate-in slide-in-from-right duration-200"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto flex-1">{children}</div>
        </div>
      )}
    </div>
  );
};
