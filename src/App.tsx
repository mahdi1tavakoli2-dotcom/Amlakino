import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { ToastProvider } from './components/common/Toast';
import { Sidebar } from './components/navigation/Sidebar';
import { BottomNavigation } from './components/navigation/BottomNavigation';
import { Header } from './components/navigation/Header';
import { OfflineBanner } from './components/common/OfflineBanner';
import { storageService } from './services/storageService';

// Views
import { DashboardView } from './views/DashboardView';
import { PropertiesListView } from './views/PropertiesListView';
import { PropertyDetailView } from './views/PropertyDetailView';
import { PropertyFormView } from './views/PropertyFormView';
import { ClientsListView } from './views/ClientsListView';
import { ClientDetailView } from './views/ClientDetailView';
import { ClientFormView } from './views/ClientFormView';
import { MatchesView } from './views/MatchesView';
import { OpportunitiesView } from './views/OpportunitiesView';
import { FollowUpsView } from './views/FollowUpsView';
import { VisitsView } from './views/VisitsView';
import { TeamView } from './views/TeamView';
import { ReportsView } from './views/ReportsView';
import { NotificationsView } from './views/NotificationsView';
import { SettingsView } from './views/SettingsView';
import { SecurityTestsView } from './views/SecurityTestsView';
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';

const AppContent: React.FC = () => {
  const { user, team, isAuthenticated, isLoading, logout } = useAuth();
  const { path, navigate, goBack } = useRouter();

  const [unreadMatchesCount, setUnreadMatchesCount] = useState(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      storageService.getDashboardStats().then((stats) => {
        setUnreadMatchesCount(stats.newMatchesCount);
      });
      storageService.getNotifications().then((notifs) => {
        setUnreadNotifsCount(notifs.filter((n) => !n.read).length);
      });
    }
  }, [isAuthenticated, path]);

  // Auth pages
  if (path === '/login') {
    return <LoginView />;
  }
  if (path === '/register') {
    return <RegisterView />;
  }
  if (path === '/settings' && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900">
        <Header
          title="تنظیمات سامانه و اتصال دیتابیس"
          showBack={true}
          onBack={() => navigate('/login')}
          onNavigate={navigate}
          unreadNotificationsCount={0}
          user={null}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-4xl mx-auto w-full">
          <SettingsView />
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium text-sm">
        در حال راه‌اندازی میز کار املاکینو...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Determine page title & back button state
  const getPageInfo = () => {
    if (path === '/dashboard') return { title: 'داشبورد مشاور', showBack: false };
    if (path === '/properties') return { title: 'فایل‌های ملکی', showBack: false };
    if (path === '/properties/new') return { title: 'ثبت فایل جدید', showBack: true };
    if (path.startsWith('/properties/') && path.endsWith('/edit')) return { title: 'ویرایش فایل ملکی', showBack: true };
    if (path.startsWith('/properties/')) return { title: 'مشخصات فایل ملکی', showBack: true };
    if (path === '/clients') return { title: 'مشتریان و متقاضیان', showBack: false };
    if (path === '/clients/new') return { title: 'ثبت متقاضی جدید', showBack: true };
    if (path.startsWith('/clients/') && path.endsWith('/edit')) return { title: 'ویرایش پرونده متقاضی', showBack: true };
    if (path.startsWith('/clients/')) return { title: 'پرونده مشتری', showBack: true };
    if (path === '/matches') return { title: 'مچ‌های هوشمند', showBack: false };
    if (path === '/opportunities') return { title: 'پایپ‌لاین فرصت‌ها', showBack: false };
    if (path === '/follow-ups') return { title: 'پیگیری‌ها و تسک‌ها', showBack: false };
    if (path === '/visits') return { title: 'برنامه بازدیدها', showBack: false };
    if (path === '/team') return { title: 'تیم و مشاوران', showBack: false };
    if (path === '/reports') return { title: 'گزارش‌های عملکرد', showBack: false };
    if (path === '/notifications') return { title: 'اعلان‌ها و رویدادها', showBack: false };
    if (path === '/security-tests') return { title: 'آزمایشگاه امنیت و حریم‌خصوصی', showBack: false };
    if (path === '/settings') return { title: 'تنظیمات سامانه', showBack: false };
    return { title: 'املاکینو', showBack: false };
  };

  const pageInfo = getPageInfo();

  // Render current view
  const renderView = () => {
    if (path === '/dashboard') return <DashboardView />;
    if (path === '/properties') return <PropertiesListView />;
    if (path === '/properties/new') return <PropertyFormView />;
    if (path.startsWith('/properties/') && path.endsWith('/edit')) return <PropertyFormView isEditMode={true} />;
    if (path.startsWith('/properties/')) return <PropertyDetailView />;
    if (path === '/clients') return <ClientsListView />;
    if (path === '/clients/new') return <ClientFormView />;
    if (path.startsWith('/clients/') && path.endsWith('/edit')) return <ClientFormView isEditMode={true} />;
    if (path.startsWith('/clients/')) return <ClientDetailView />;
    if (path === '/matches') return <MatchesView />;
    if (path === '/opportunities') return <OpportunitiesView />;
    if (path === '/follow-ups') return <FollowUpsView />;
    if (path === '/visits') return <VisitsView />;
    if (path === '/team') return <TeamView />;
    if (path === '/reports') return <ReportsView />;
    if (path === '/notifications') return <NotificationsView />;
    if (path === '/security-tests') return <SecurityTestsView />;
    if (path === '/settings') return <SettingsView />;
    return <DashboardView />;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <OfflineBanner />
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Desktop Sidebar */}
        <Sidebar
          currentPath={path}
          onNavigate={navigate}
          user={user}
          team={team}
          unreadMatchesCount={unreadMatchesCount}
          unreadNotifsCount={unreadNotifsCount}
          onLogout={logout}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
          {/* Top Header */}
          <Header
            title={pageInfo.title}
            showBack={pageInfo.showBack}
            onBack={goBack}
            onNavigate={navigate}
            unreadNotificationsCount={unreadNotifsCount}
            user={user}
          />

          {/* Dynamic Route View */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {renderView()}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNavigation
          currentPath={path}
          onNavigate={navigate}
          unreadMatchesCount={unreadMatchesCount}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </RouterProvider>
    </AuthProvider>
  );
}
