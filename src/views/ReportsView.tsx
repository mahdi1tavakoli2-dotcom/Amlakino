import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Award, Clock } from 'lucide-react';
import { Card } from '../components/common/Card';
import { formatPriceToman, toPersianDigits } from '../utils/formatters';

export const ReportsView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900">گزارش‌های تحلیلی و عملکرد</h2>
        <p className="text-xs text-slate-500">شاخص‌های کلیدی عملکرد آژانس (KPIs) در ماه جاری</p>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center p-4">
          <span className="text-xs text-slate-500 block mb-1">حجم معاملات محقق‌شده</span>
          <span className="text-lg sm:text-xl font-black text-slate-900">
            {formatPriceToman(42000000000)}
          </span>
          <span className="text-[11px] text-emerald-600 block mt-1">↑ ۱۸٪ رشد نسبت به ماه قبل</span>
        </Card>

        <Card className="text-center p-4">
          <span className="text-xs text-slate-500 block mb-1">کمیسیون خالص وصول‌شده</span>
          <span className="text-lg sm:text-xl font-black text-emerald-700">
            {formatPriceToman(210000000)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">نرخ تسویه ۹۵٪</span>
        </Card>

        <Card className="text-center p-4">
          <span className="text-xs text-slate-500 block mb-1">میانگین زمان فروش فایل</span>
          <span className="text-lg sm:text-xl font-black text-slate-900">
            {toPersianDigits(19)} روز
          </span>
          <span className="text-[11px] text-emerald-600 block mt-1">سریع‌تر از میانگین منطقه</span>
        </Card>

        <Card className="text-center p-4">
          <span className="text-xs text-slate-500 block mb-1">نرخ تبدیل مچ به بازدید</span>
          <span className="text-lg sm:text-xl font-black text-slate-900">
            {toPersianDigits(34)}٪
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">اثربخشی موتور هوشمند</span>
        </Card>
      </div>

      {/* Performance by Deal Type */}
      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">
          تفکیک معاملات بر اساس نوع قرارداد
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>فروش آپارتمان مسکونی (۶۲٪)</span>
              <span className="text-slate-600">{formatPriceToman(26000000000)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: '62%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>رهن و اجاره (۲۸٪)</span>
              <span className="text-slate-600">{formatPriceToman(11800000000)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-sky-600 rounded-full" style={{ width: '28%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>پیش‌فروش و مشارکت (۱۰٪)</span>
              <span className="text-slate-600">{formatPriceToman(4200000000)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '10%' }} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
