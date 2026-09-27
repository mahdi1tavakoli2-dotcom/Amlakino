import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Building,
  Send,
  Clock,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Info,
  Copy,
  LogOut,
  Users,
  Handshake,
  Share2,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { User, Team, Invitation } from '../types';
import { toPersianDigits } from '../utils/formatters';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { LoadingState } from '../components/common/LoadingState';
import { useToast } from '../components/common/Toast';
import { CollaborationRequestsList } from '../components/collaboration/CollaborationRequestsList';
import { SharedResourcesManager } from '../components/collaboration/SharedResourcesManager';
import { TeamKPIsView } from '../components/collaboration/TeamKPIsView';
import { SecurityTestSuiteModal } from '../components/collaboration/SecurityTestSuiteModal';

export const TeamView: React.FC = () => {
  const { user, refreshTeam } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'members' | 'collab' | 'sharing' | 'kpis' | 'security'>('members');
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeMobile, setInviteeMobile] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Create team modal (manager)
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCity, setNewTeamCity] = useState('تهران');
  const [newTeamLicense, setNewTeamLicense] = useState('ص/۱۴۰۳/۸۸۲');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Leave team modal (agent)
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leavingTeam, setLeavingTeam] = useState(false);

  // Accept invite input (for agent)
  const [inviteTokenInput, setInviteTokenInput] = useState('');
  const [acceptLoading, setAcceptLoading] = useState(false);

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const loadData = async () => {
    try {
      setLoading(true);
      const [t, allUsers, invs] = await Promise.all([
        storageService.getTeam(),
        storageService.getUsers(),
        storageService.getInvitations(),
      ]);
      setTeam(t);
      const teamMems = allUsers.filter((u) => u.teamId === t.id);
      setMembers(teamMems);
      setInvitations(invs);
    } catch (e) {
      console.error(e);
      toast.error('خطا در بارگذاری اطلاعات تیم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !team) return;
    if (!inviteeName || !inviteeMobile) {
      toast.error('نام و شماره همراه مشاور را وارد کنید.');
      return;
    }

    try {
      setInviteLoading(true);
      const newInv = await storageService.createInvitation({
        managerUser: user,
        teamId: team.id,
        inviteeName,
        inviteeMobile,
        inviteeEmail: inviteeEmail || undefined,
      });

      toast.success(`دعوت‌نامه برای ${inviteeName} ارسال شد.`);
      setShowInviteModal(false);
      setInviteeName('');
      setInviteeMobile('');
      setInviteeEmail('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ارسال دعوت‌نامه');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTeamName.trim()) return;

    try {
      setCreatingTeam(true);
      const created = await storageService.createTeam(
        {
          name: newTeamName.trim(),
          city: newTeamCity.trim(),
          licenseNumber: newTeamLicense.trim(),
        },
        user
      );
      toast.success(`دپارتمان "${created.name}" با موفقیت تأسیس گردید.`);
      setShowCreateTeamModal(false);
      await refreshTeam();
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در تأسیس دپارتمان');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!user) return;
    try {
      setLeavingTeam(true);
      await storageService.leaveTeam(user);
      toast.info('شما با حفظ ۱۰۰٪ مالکیت فایل‌ها و مشتریان خود از تیم خارج شدید. مهلت ۳۰ روزه انتقال آغاز گردید.');
      setShowLeaveModal(false);
      await refreshTeam();
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در خروج از تیم');
    } finally {
      setLeavingTeam(false);
    }
  };

  const handleRemoveMember = async (memberUser: User) => {
    if (!user || !team) return;
    if (memberUser.id === user.id) {
      toast.error('شما نمی‌توانید حساب خودتان را از تیم حذف کنید.');
      return;
    }

    const confirm = window.confirm(
      `آیا از حذف ${memberUser.fullName} از دپارتمان اطمینان دارید؟\n\nطبق اصل مالکیت داده‌ها، کلیه فایل‌ها و متقاضیان این مشاور نزد وی باقی مانده و وارد مهلت ۳۰ روزه انتقال می‌گردد.`
    );
    if (!confirm) return;

    try {
      await storageService.removeTeamMember(team.id, memberUser.id, user);
      toast.info(`مشاور ${memberUser.fullName} با حفظ مالکیت فایل‌هایش از تیم حذف شد.`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در حذف عضو');
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!user) return;
    try {
      await storageService.cancelInvitation(inviteId, user);
      toast.info('دعوت‌نامه لغو شد.');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در لغو');
    }
  };

  const handleAcceptInvite = async (token: string) => {
    if (!user) return;
    try {
      setAcceptLoading(true);
      const res = await storageService.acceptInvitation(token, user);
      toast.success(`شما با موفقیت به تیم "${res.teamName}" ملحق شدید!`);
      setInviteTokenInput('');
      await refreshTeam();
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در پذیرش دعوت‌نامه');
    } finally {
      setAcceptLoading(false);
    }
  };

  const copyInviteToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success('توکن دعوت‌نامه در کلیپ‌بورد کپی شد.');
  };

  if (loading) {
    return <LoadingState text="در حال بارگذاری اطلاعات تیم و مجوزهای دسترسی..." className="py-20" />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Header & Department Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">{team?.name || 'دپارتمان املاک'}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {team?.city || 'تهران'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            کد رهگیری دپارتمان: <span className="font-mono text-slate-700">{team?.licenseNumber || team?.code || 'AML-TM-01'}</span> • مدیریت مشاوران، درخواست‌های همکاری و تفکیک مالکیت
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isManager ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateTeamModal(true)}
                rightIcon={<Building className="w-3.5 h-3.5" />}
              >
                تأسیس / تغییر دپارتمان
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowInviteModal(true)}
                rightIcon={<Plus className="w-4 h-4" />}
              >
                دعوت از مشاور جدید
              </Button>
            </>
          ) : user?.teamId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLeaveModal(true)}
              className="text-rose-600 hover:bg-rose-50 border-rose-200"
              rightIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              خروج از دپارتمان
            </Button>
          ) : null}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'members'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>اعضای دپارتمان ({toPersianDigits(members.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('collab')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'collab'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Handshake className="w-4 h-4 text-emerald-400" />
          <span>درخواست‌های همکاری در معامله</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sharing')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'sharing'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Share2 className="w-4 h-4 text-blue-400" />
          <span>اشتراک‌گذاری فایل‌ها و متقاضیان</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kpis')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'kpis'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <span>KPIها و گزارش‌های تجمیعی</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'security'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>آزمون امنیتی و مهلت ۳۰ روزه</span>
        </button>
      </div>

      {/* Tab 1: Members & Invitations */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Privacy Protocol Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 text-xs text-slate-700 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-900 block">
                معماری حفظ حریم خصوصی مشاور و دپارتمان (Data Sovereignty Protocol)
              </span>
              <p className="leading-relaxed">
                طبق پروتکل املاکینو، فایل‌ها و مشتریان شخصی هر مشاور کاملاً متعلق به همان مشاور هستند و در دیتابیس جداگانه نگهداری می‌شوند. مدیر دپارتمان تنها به فایل‌ها و متقاضیانی دسترسی دارد که خود مشاور با اختیار خود «اشتراکی» کرده باشد.
              </p>
            </div>
          </div>

          {/* Invitation Acceptance Box for Agents without team */}
          {!isManager && !user?.teamId && (
            <Card className="p-5 border-amber-200 bg-amber-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-bold text-slate-900">پیوستن به دپارتمان با توکن دعوت‌نامه</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                اگر مدیر دپارتمان شما کد دعوت ارسال کرده است، توکن دریافتی از پیامک را در کادر زیر وارد کنید تا به دپارتمان متصل شوید:
              </p>
              <div className="flex gap-2 max-w-md">
                <Input
                  placeholder="مثال: inv_tok_991823"
                  value={inviteTokenInput}
                  onChange={(e) => setInviteTokenInput(e.target.value)}
                  className="font-mono text-xs"
                />
                <Button
                  variant="primary"
                  onClick={() => handleAcceptInvite(inviteTokenInput)}
                  isLoading={acceptLoading}
                  disabled={!inviteTokenInput.trim()}
                >
                  پذیرش دعوت
                </Button>
              </div>
            </Card>
          )}

          {/* Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>مشاوران عضو دپارتمان ({toPersianDigits(members.length)})</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {members.map((member) => {
                const isMe = member.id === user?.id;
                const isMemberManager = member.role === 'manager' || member.role === 'admin';

                return (
                  <Card key={member.id} className="p-4 space-y-3 border-slate-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                          {member.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-slate-900">{member.fullName}</h4>
                            {isMe && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                شما
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {isMemberManager ? 'مدیر دپارتمان' : 'مشاور ارشد'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          member.agentMode === 'read_only'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {member.agentMode === 'read_only' ? 'فقط خواندنی' : 'عضو فعال'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1.5 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{member.mobile || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{member.email || '—'}</span>
                      </div>
                    </div>

                    {isManager && !isMe && !isMemberManager && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-rose-50"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>حذف مشاور از دپارتمان</span>
                        </button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Invitations Section (Manager only) */}
          {isManager && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>دعوت‌نامه‌های ارسالی ({toPersianDigits(invitations.length)})</span>
                </h2>
              </div>

              {invitations.length === 0 ? (
                <Card className="p-6 text-center text-xs text-slate-500">
                  هیچ دعوت‌نامه‌ای در حال حاضر ثبت نشده است. با کلیک بر روی «دعوت از مشاور جدید» همکاران خود را به تیم اضافه کنید.
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {invitations.map((inv) => (
                    <Card key={inv.id} className="p-4 space-y-3 border-slate-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{inv.inviteeName}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{inv.inviteeMobile}</p>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            inv.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inv.status === 'accepted' ? 'پذیرفته‌شده' : inv.status === 'pending' ? 'در انتظار تایید' : 'لغو شده'}
                        </span>
                      </div>

                      <div className="p-2 bg-slate-50 rounded-xl flex items-center justify-between text-xs font-mono text-slate-700">
                        <span className="truncate max-w-[200px]">توکن: {inv.token}</span>
                        <button
                          type="button"
                          onClick={() => copyInviteToken(inv.token)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                          title="کپی توکن"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>تاریخ ارسال: {inv.createdAt}</span>
                        {inv.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleCancelInvite(inv.id)}
                            className="text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                          >
                            لغو دعوت‌نامه
                          </button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Collaboration Requests */}
      {activeTab === 'collab' && user && (
        <CollaborationRequestsList currentUser={user} onCollaborationUpdated={loadData} />
      )}

      {/* Tab 3: Shared Properties & Clients Management */}
      {activeTab === 'sharing' && user && (
        <SharedResourcesManager currentUser={user} onUpdated={loadData} />
      )}

      {/* Tab 4: Team KPIs & Aggregated Activity */}
      {activeTab === 'kpis' && user && (
        <TeamKPIsView currentUser={user} team={team} members={members} />
      )}

      {/* Tab 5: Security Test Suite & 30-Day Grace Period Simulator */}
      {activeTab === 'security' && user && (
        <SecurityTestSuiteModal currentUser={user} onUserUpdated={loadData} />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>دعوت از مشاور جدید به دپارتمان</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-3.5">
              <Input
                label="نام و نام خانوادگی مشاور"
                placeholder="مثال: رضا حسینی"
                value={inviteeName}
                onChange={(e) => setInviteeName(e.target.value)}
                required
              />

              <Input
                label="شماره تلفن همراه"
                type="tel"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                value={inviteeMobile}
                onChange={(e) => setInviteeMobile(e.target.value)}
                helperText="کد دعوت به همراه لینک مستقیم به این شماره پیامک می‌شود."
                required
              />

              <Input
                label="ایمیل (اختیاری)"
                type="email"
                placeholder="reza@gmail.com"
                value={inviteeEmail}
                onChange={(e) => setInviteeEmail(e.target.value)}
              />

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                مشاور پس از پذیرش دعوت، به شبکه داخلی دپارتمان وصل خواهد شد. فایل‌های شخصی وی خصوصی مانده و فقط مواردی که با رضایت خود وی «اشتراکی» گردند در دپارتمان قابل مشاهده خواهند بود.
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="primary"
                  type="submit"
                  className="flex-1"
                  isLoading={inviteLoading}
                >
                  ارسال دعوت‌نامه پیامکی
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                >
                  انصراف
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Create / Edit Team Modal (Manager) */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                <span>تأسیس یا تغییر نام دپارتمان</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateTeamModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-3.5">
              <Input
                label="نام دپارتمان یا آژانس املاک"
                placeholder="مثال: گروه مشاورین املاک بارمان"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                required
              />

              <Input
                label="شهر محل فعالیت"
                value={newTeamCity}
                onChange={(e) => setNewTeamCity(e.target.value)}
                required
              />

              <Input
                label="شماره پروانه کسب / کد اتحادیه"
                value={newTeamLicense}
                onChange={(e) => setNewTeamLicense(e.target.value)}
                required
              />

              <div className="flex gap-2 pt-2">
                <Button
                  variant="primary"
                  type="submit"
                  className="flex-1"
                  isLoading={creatingTeam}
                >
                  ثبت دپارتمان
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                >
                  انصراف
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Leave Team Modal (Agent) */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 shadow-xl border-rose-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>خروج از دپارتمان املاک</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-2 leading-relaxed">
              <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                <ShieldCheck className="w-4 h-4" />
                <span>تضمین صددرصدی مالکیت اطلاعات مشاور:</span>
              </span>
              <p>
                طبق قانون مالکیت داده‌های املاکینو، ۱۰۰٪ فایل‌ها و پرونده‌های مشتریان ثبت‌شده توسط شما همراه حساب شخصی شما باقی مانده و دپارتمان به اطلاعات شخصی آن‌ها دسترسی نخواهد داشت.
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold block">مهلت ۳۰ روزه انتقال (Grace Period):</span>
              <p>
                شما ۳۰ روز فرصت دارید تا به دپارتمان جدیدی ملحق شده یا اشتراک مستقل تهیه نمایید. پس از ۳۰ روز اگر اشتراک مستقل تهیه نکنید، سیستم بدون حذف فایل‌ها به حالت فقط‌خواندنی (Read-Only) منتقل خواهد شد.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 text-rose-700 border-rose-300 hover:bg-rose-50"
                onClick={handleLeaveTeam}
                isLoading={leavingTeam}
              >
                تایید و خروج از دپارتمان
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setShowLeaveModal(false)}
                disabled={leavingTeam}
              >
                انصراف
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
