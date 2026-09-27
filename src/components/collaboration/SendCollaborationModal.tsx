import React, { useState } from 'react';
import { Send, ShieldCheck, Clock, Percent, AlertCircle } from 'lucide-react';
import { Property, Client, User } from '../../types';
import { collaborationService } from '../../services/collaborationService';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useToast } from '../common/Toast';

interface SendCollaborationModalProps {
  property: Property;
  client: Client;
  sender: User;
  receiverId: string;
  receiverName: string;
  matchScore: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SendCollaborationModal: React.FC<SendCollaborationModalProps> = ({
  property,
  client,
  sender,
  receiverId,
  receiverName,
  matchScore,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [commissionSplit, setCommissionSplit] = useState('50/50 (تسهیم برابر کمیسیون)');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await collaborationService.sendRequest({
        sender,
        receiverId,
        receiverName,
        propertyId: property.id,
        propertyTitle: property.title,
        propertyDistrict: property.district || property.neighborhood,
        clientId: client.id,
        clientSummary: `${client.role === 'buyer' ? 'متقاضی خرید' : 'متقاضی رهن/اجاره'} • بودجه حداکثر ${client.budgetMax ? client.budgetMax.toLocaleString() : 'تعیین‌نشده'}`,
        matchScore,
        commissionSplit,
        notes: notes.trim() || undefined,
      });

      toast.success(`درخواست همکاری در معامله با موفقیت برای ${receiverName} ارسال شد.`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ارسال درخواست همکاری');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-xl border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ارسال درخواست همکاری در معامله</h3>
              <p className="text-xs text-slate-500">هماهنگی دو مشاور جهت انعقاد قرارداد و تسهیم کارمزد</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Privacy First Notice */}
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold block">حفظ حریم خصوصی تا زمان تایید دوطرفه:</span>
            صرف ارسال این درخواست اطلاعات تماس مالک یا مشتری را افشا نمی‌کند. پس از تایید توسط{' '}
            <span className="font-bold">{receiverName}</span>، دسترسی طرفین به جزئیات هماهنگی معامله باز خواهد شد.
          </div>
        </div>

        {/* Match Summary Pill */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
          <div className="flex items-center justify-between font-bold text-slate-800">
            <span>فایل: {property.title}</span>
            <span className="text-emerald-700">{matchScore}٪ تطابق</span>
          </div>
          <div className="text-slate-600 flex items-center justify-between text-[11px]">
            <span>متقاضی: {client.fullName || client.name}</span>
            <span>دریافت‌کننده پیشنهاد: {receiverName}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-slate-500" />
              <span>پیشنهاد درصد تسهیم کمیسیون (Commission Split)</span>
            </label>
            <select
              value={commissionSplit}
              onChange={(e) => setCommissionSplit(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="50/50 (تسهیم برابر کمیسیون)">۵۰٪ مشاور فایل / ۵۰٪ مشاور متقاضی (تسهیم استاندارد)</option>
              <option value="60/40 (۶۰٪ مشاور فایل / ۴۰٪ مشاور متقاضی)">۶۰٪ مشاور فایل / ۴۰٪ مشاور متقاضی</option>
              <option value="40/60 (۴۰٪ مشاور فایل / ۶۰٪ مشاور متقاضی)">۴۰٪ مشاور فایل / ۶۰٪ مشاور متقاضی</option>
              <option value="توافقی در جلسه قرارداد">تعیین سهم در زمان نگارش قرارداد</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              پیام هماهنگی برای همکار (اختیاری)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: خریدار تا پایان هفته امکان بازدید دارد و شرایط پرداخت کاملاً نقدی است..."
              rows={3}
              className="w-full text-xs bg-white border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>مهلت اعتبار درخواست: ۷ روز (انقضای خودکار در صورت عدم پاسخ)</span>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="primary"
              type="submit"
              className="flex-1"
              isLoading={loading}
              rightIcon={<Send className="w-3.5 h-3.5" />}
            >
              ارسال درخواست به {receiverName}
            </Button>
            <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
              انصراف
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
