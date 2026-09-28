/**
 * Utility functions for Persian formatting, numerals, currency, and real-estate metrics.
 */

import { DealType, PropertyType, FollowUpPriority, FollowUpType, OpportunityStage, ClientStatus, VisitStatus } from '../types';

export const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return '';
  const str = String(n);
  return str.replace(/[0-9]/g, (w) => PERSIAN_DIGITS[+w]);
}

export function formatNumberWithCommas(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return '';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '';
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '،');
  return toPersianDigits(parts.join('.'));
}

/**
 * Formats price in Iranian Toman with smart scale (میلیارد تومان, میلیون تومان)
 */
export function formatPriceToman(amount?: number): string {
  if (!amount || amount === 0) return 'توافقی';
  
  if (amount >= 1_000_000_000) {
    const billions = amount / 1_000_000_000;
    const formatted = Number.isInteger(billions) ? billions.toString() : billions.toFixed(1);
    return `${toPersianDigits(formatted)} میلیارد تومان`;
  }

  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = Number.isInteger(millions) ? millions.toString() : millions.toFixed(1);
    return `${toPersianDigits(formatted)} میلیون تومان`;
  }

  return `${formatNumberWithCommas(amount)} تومان`;
}

export function getDealTypeLabel(dealType: DealType): string {
  switch (dealType) {
    case 'sale':
      return 'فروش';
    case 'rent':
      return 'رهن و اجاره';
    case 'presale':
      return 'پیش‌فروش';
    default:
      return dealType;
  }
}

export function getPropertyTypeLabel(propertyType: PropertyType): string {
  switch (propertyType) {
    case 'apartment':
      return 'آپارتمان';
    case 'villa':
      return 'ویلایی / کلنگی';
    case 'office':
      return 'موقعیت اداری';
    case 'store':
      return 'مغازه / تجاری';
    case 'land':
      return 'زمین / مشارکت';
    case 'penthouse':
      return 'پنت‌هاوس';
    default:
      return propertyType;
  }
}

export function getPriorityLabel(priority: FollowUpPriority): { label: string; color: string } {
  switch (priority) {
    case 'high':
      return { label: 'فوری و مهم', color: 'text-rose-700 bg-rose-50 border-rose-200' };
    case 'medium':
      return { label: 'متوسط', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    case 'low':
      return { label: 'عادی', color: 'text-slate-600 bg-slate-100 border-slate-200' };
  }
}

export function getFollowUpTypeLabel(type: FollowUpType): string {
  switch (type) {
    case 'phone_call':
    case 'call':
      return 'تماس تلفنی';
    case 'client_followup':
      return 'پیگیری متقاضی';
    case 'property_followup':
      return 'پیگیری فایل ملکی';
    case 'visit_reminder':
    case 'visit':
      return 'یادآوری بازدید';
    case 'negotiation_reminder':
    case 'meeting':
      return 'یادآوری مذاکره و نشست';
    case 'contract_reminder':
    case 'contract':
      return 'یادآوری قرارداد';
    case 'custom_reminder':
    case 'message':
      return 'یادآور سفارشی';
    default:
      return 'پیگیری';
  }
}

export function getOpportunityStageLabel(stage: OpportunityStage): { label: string; step: number; color: string } {
  switch (stage) {
    case 'new_match':
    case 'lead':
      return { label: 'تطابق جدید (New Match)', step: 1, color: 'bg-slate-100 text-slate-700' };
    case 'contacted':
      return { label: 'تماس اولیه (Contacted)', step: 2, color: 'bg-blue-100 text-blue-800' };
    case 'interested':
      return { label: 'ابراز تمایل (Interested)', step: 3, color: 'bg-cyan-100 text-cyan-800' };
    case 'visit_scheduled':
    case 'viewing_scheduled':
      return { label: 'هماهنگی بازدید (Visit Scheduled)', step: 4, color: 'bg-sky-100 text-sky-800' };
    case 'visited':
      return { label: 'بازدید انجام شد (Visited)', step: 5, color: 'bg-indigo-100 text-indigo-800' };
    case 'negotiation':
      return { label: 'مذاکره و قیمت (Negotiation)', step: 6, color: 'bg-amber-100 text-amber-800' };
    case 'contract':
    case 'contract_pending':
      return { label: 'تنظیم قرارداد (Contract)', step: 7, color: 'bg-purple-100 text-purple-800' };
    case 'won':
    case 'closed_won':
      return { label: 'معامله موفق (Won)', step: 8, color: 'bg-emerald-100 text-emerald-800' };
    case 'lost':
    case 'closed_lost':
      return { label: 'ناموفق / لغو (Lost)', step: 0, color: 'bg-rose-100 text-rose-800' };
    default:
      return { label: String(stage), step: 1, color: 'bg-slate-100 text-slate-700' };
  }
}

export function getClientStatusLabel(status: ClientStatus): { label: string; color: string } {
  switch (status) {
    case 'lead':
      return { label: 'سرنخ اولیه', color: 'bg-slate-100 text-slate-700' };
    case 'active':
      return { label: 'مشتری فعال', color: 'bg-emerald-100 text-emerald-800' };
    case 'negotiation':
      return { label: 'در حال مذاکره', color: 'bg-amber-100 text-amber-800' };
    case 'contracted':
      return { label: 'معامله انجام‌شده', color: 'bg-indigo-100 text-indigo-800' };
    case 'lost':
      return { label: 'انصرافی / راکد', color: 'bg-rose-100 text-rose-800' };
    case 'archived':
      return { label: 'بایگانی شده', color: 'bg-slate-100 text-slate-600' };
    default:
      return { label: 'نامشخص', color: 'bg-slate-100 text-slate-600' };
  }
}

export function getVisitStatusLabel(status: VisitStatus): { label: string; color: string } {
  const norm = String(status).toLowerCase();
  switch (norm) {
    case 'scheduled':
      return { label: 'برنامه‌ریزی‌شده', color: 'bg-sky-100 text-sky-800' };
    case 'completed':
      return { label: 'انجام شد', color: 'bg-emerald-100 text-emerald-800' };
    case 'cancelled':
      return { label: 'لغو شد', color: 'bg-slate-100 text-slate-600' };
    case 'no_show':
    case 'no-show':
      return { label: 'عدم حضور (No-show)', color: 'bg-rose-100 text-rose-800' };
    default:
      return { label: String(status), color: 'bg-slate-100 text-slate-600' };
  }
}
