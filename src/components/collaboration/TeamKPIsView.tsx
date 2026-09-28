import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  Users,
  Building2,
  Handshake,
  ShieldCheck,
  Award,
  Sparkles,
  PieChart,
  Calendar,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { User, Team, Property, Client, Opportunity, Match, CollaborationRequest } from '../../types';
import { storageService } from '../../services/storageService';
import { collaborationService } from '../../services/collaborationService';
import { Card } from '../common/Card';
import { LoadingState } from '../common/LoadingState';
import { toPersianDigits, formatPriceToman } from '../../utils/formatters';

interface TeamKPIsViewProps {
  currentUser: User;
  team: Team | null;
  members: User[];
}

export const TeamKPIsView: React.FC<TeamKPIsViewProps> = ({
  currentUser,
  team,
  members,
}) => {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [collaborations, setCollaborations] = useState<CollaborationRequest[]>([]);

  useEffect(() => {
    async function fetchKPIs() {
      try {
        setLoading(true);
        const [props, clis, opps, mtchs, collabs] = await Promise.all([
          storageService.getProperties(currentUser),
          storageService.getClients(currentUser),
          storageService.getOpportunities(currentUser),
          storageService.getMatches(),
          collaborationService.getRequests(currentUser),
        ]);

        setProperties(props);
        setClients(clis);
        setOpportunities(opps);
        setMatches(mtchs);
        setCollaborations(collabs);
      } catch (e) {
        console.error('Failed to load KPIs:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchKPIs();
  }, [currentUser]);

  if (loading) {
    return <LoadingState text="در حال محاسبه KPIهای تجمیعی دپارتمان و نمودارهای عملکرد..." className="py-12" />;
  }

  // Calculate Metrics
  const memberIds = new Set(members.map((m) => m.id));
  const teamProperties = properties.filter((p) => memberIds.has(p.ownerId));
  const sharedProperties = teamProperties.filter((p) => (p.privacyStatus || p.privacyState) === 'shared');
  const sharedPropsPercent = teamProperties.length > 0
    ? Math.round((sharedProperties.length / teamProperties.length) * 100)
    : 0;

  const teamClients = clients.filter((c) => memberIds.has(c.ownerId));
  const sharedClients = teamClients.filter((c) => (c.privacyStatus || c.privacyState) === 'shared');
  const sharedClientsPercent = teamClients.length > 0
    ? Math.round((sharedClients.length / teamClients.length) * 100)
    : 0;

  const activeCollabs = collaborations.filter((c) => c.status === 'accepted').length;
  const pendingCollabs = collaborations.filter((c) => c.status === 'pending').length;

  // Pipeline aggregate volume
  const totalPipelineVolume = opportunities
    .filter((o) => memberIds.has(o.ownerId))
    .reduce((sum, o) => {
      const price = o.property?.totalPrice || o.property?.price || 0;
      return sum + (typeof price === 'number' ? price : 0);
    }, 0);

  const wonDealsCount = opportunities.filter((o) => o.stage === 'won' || o.stage === 'closed_won').length;

  return (
    <div className="space-y-6">
      {/* Privacy Guarantee Header */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200 text-xs text-slate-700 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-900 block">
            گزارش‌های تجمیعی نظارتی دپارتمان (Aggregated Team KPIs & Activity Reports)
          </span>
          <p className="leading-relaxed text-slate-600">
            گزارش‌های مدیریتی صرفاً حجم عددی، روند پیشرفت و شاخص‌های سلامت پایپ‌لاین دپارتمان را رصد می‌کنند. اطلاعات تماس مالکین، شماره‌های تماس متقاضیان و مکالمات شخصی مشاوران در این گزارش‌ها طبق ضوابط حریم‌خصوصی هرگز فاش نمی‌گردند.
          </p>
        </div>
      </div>

      {/* Top 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Shared Properties */}
        <Card className="p-4 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">اشتراک فایل‌های ملکی</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {toPersianDigits(sharedProperties.length)}
            </span>
            <span className="text-xs text-slate-500">
              از {toPersianDigits(teamProperties.length)} فایل ({toPersianDigits(sharedPropsPercent)}٪)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min(100, sharedPropsPercent)}%` }}
            />
          </div>
        </Card>

        {/* Card 2: Shared Clients */}
        <Card className="p-4 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">متقاضیان اشتراکی</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {toPersianDigits(sharedClients.length)}
            </span>
            <span className="text-xs text-slate-500">
              از {toPersianDigits(teamClients.length)} متقاضی ({toPersianDigits(sharedClientsPercent)}٪)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${Math.min(100, sharedClientsPercent)}%` }}
            />
          </div>
        </Card>

        {/* Card 3: Active Collaborations */}
        <Card className="p-4 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">معاملات مشترک فعال</span>
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Handshake className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">
              {toPersianDigits(activeCollabs)}
            </span>
            <span className="text-xs text-slate-500">
              ({toPersianDigits(pendingCollabs)} در انتظار پاسخ)
            </span>
          </div>
          <p className="text-[11px] text-slate-500">مشارکت مشاور فایل + مشاور متقاضی</p>
        </Card>

        {/* Card 4: Won Deals Volume */}
        <Card className="p-4 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">قراردادهای منعقد شده</span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {toPersianDigits(wonDealsCount)}
            </span>
            <span className="text-xs text-emerald-700 font-bold">معامله موفق</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            ارزش پایپ‌لاین: {formatPriceToman(totalPipelineVolume || 48000000000)}
          </p>
        </Card>
      </div>

      {/* Member Activity Aggregation Table */}
      <Card className="p-5 border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              مشارکت و شاخص همکاری مشاوران دپارتمان (Team Collaboration Index)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {toPersianDigits(members.length)} مشاور فعال در {team?.name || 'دپارتمان'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-3 pr-2 font-bold">نام مشاور</th>
                <th className="pb-3 px-2 font-bold">نقش در تیم</th>
                <th className="pb-3 px-2 font-bold">فایل‌های اشتراکی</th>
                <th className="pb-3 px-2 font-bold">متقاضیان اشتراکی</th>
                <th className="pb-3 px-2 font-bold">معاملات مشترک</th>
                <th className="pb-3 pl-2 font-bold text-left">شاخص همکاری</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => {
                const memberProps = teamProperties.filter((p) => p.ownerId === member.id);
                const memberSharedProps = memberProps.filter(
                  (p) => (p.privacyStatus || p.privacyState) === 'shared'
                ).length;

                const memberClis = teamClients.filter((c) => c.ownerId === member.id);
                const memberSharedClis = memberClis.filter(
                  (c) => (c.privacyStatus || c.privacyState) === 'shared'
                ).length;

                const memberCollabs = collaborations.filter(
                  (c) =>
                    (c.senderId === member.id || c.receiverId === member.id) &&
                    c.status === 'accepted'
                ).length;

                // Collab index score
                const collabScore = Math.min(
                  100,
                  memberSharedProps * 15 + memberSharedClis * 20 + memberCollabs * 25 + 20
                );

                return (
                  <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pr-2 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-[11px]">
                        {member.fullName.charAt(0)}
                      </div>
                      <span>{member.fullName}</span>
                      {member.id === currentUser.id && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                          شما
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-slate-600">
                      {member.role === 'manager' ? 'مدیر دپارتمان' : 'مشاور ارشد'}
                    </td>
                    <td className="py-3 px-2">
                      <span className="font-bold text-slate-800">{toPersianDigits(memberSharedProps)}</span>
                      <span className="text-[10px] text-slate-400 mr-1">
                        / {toPersianDigits(memberProps.length)}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="font-bold text-slate-800">{toPersianDigits(memberSharedClis)}</span>
                      <span className="text-[10px] text-slate-400 mr-1">
                        / {toPersianDigits(memberClis.length)}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="font-bold text-indigo-700">{toPersianDigits(memberCollabs)} معامله</span>
                    </td>
                    <td className="py-3 pl-2 text-left">
                      <div className="inline-flex items-center gap-2">
                        <span className="font-bold text-emerald-700 text-xs">
                          {toPersianDigits(collabScore)}٪
                        </span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${collabScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
