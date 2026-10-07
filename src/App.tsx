import React, { useState, useEffect } from 'react';
import { appState } from './services/appStateService';
import { ModeBanner } from './components/ModeBanner';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';

// Modals
import { QuickAttendanceModal } from './components/QuickAttendanceModal';
import { QuickIncidentModal } from './components/QuickIncidentModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { AuthModal } from './components/AuthModal';
import { ToastContainer } from './components/ToastContainer';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { ClassManagementPage } from './pages/ClassManagementPage';
import { StudentsPage } from './pages/StudentsPage';
import { GroupsPage } from './pages/GroupsPage';
import { SeatingPage } from './pages/SeatingPage';
import { AttendancePage } from './pages/AttendancePage';
import { IncidentsPage } from './pages/IncidentsPage';
import { RewardsPage } from './pages/RewardsPage';
import { TasksPage } from './pages/TasksPage';
import { ScoringPage } from './pages/ScoringPage';
import { PendingRulesPage } from './pages/PendingRulesPage';
import { PeriodLockPage } from './pages/PeriodLockPage';
import { QualitativePage } from './pages/QualitativePage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditPage } from './pages/AuditPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals state
  const [showQuickAttendance, setShowQuickAttendance] = useState(false);
  const [showQuickIncident, setShowQuickIncident] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(() => {
    // Show login window initially if not authenticated as officer
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('VTT_OFFICER_SESSION');
    }
    return true;
  });
  const [pendingTabAfterAuth, setPendingTabAfterAuth] = useState<NavTab | null>(null);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(null);

  // Subscribe to appState updates for reactivity & Auto-fetch Supabase Cloud data
  const [, setTick] = useState(0);
  useEffect(() => {
    appState.initSupabaseData();
    return appState.subscribe(() => setTick((t) => t + 1));
  }, []);

  const pendingIncidentsCount = appState.incidents.filter((i) => i.incident_status === 'pending_verification').length;
  const pendingRewardsCount = appState.rewards.filter((r) => r.status === 'pending').length;
  const unresolvedRulesCount = appState.pendingRules.filter((r) => r.status === 'unresolved').length;

  const RESTRICTED_TABS: Record<string, { label: string; minRole: 'officer' | 'gvcn' }> = {
    pending_rules: { label: '9 Quy tắc chờ GVCN', minRole: 'officer' },
    period_locks: { label: 'Khóa / Mở kỳ đánh giá', minRole: 'officer' },
    audit: { label: 'Nhật ký kiểm toán', minRole: 'officer' },
    settings: { label: 'Cài đặt & Cơ sở dữ liệu', minRole: 'gvcn' },
  };

  const handleSelectTab = (tab: NavTab) => {
    const isOfficer = appState.currentUser.isAuthenticatedOfficer;
    const isGvcn = appState.currentUser.role === 'gvcn';

    if (RESTRICTED_TABS[tab]) {
      const config = RESTRICTED_TABS[tab];
      if (!isOfficer) {
        setPendingTabAfterAuth(tab);
        setAuthPromptMessage(
          `🔒 Thẻ [${config.label}] yêu cầu quyền Ban Cán sự hoặc GVCN. Vui lòng đăng nhập để mở khóa truy cập!`
        );
        setShowAuthModal(true);
        appState.showToast(`Khu vực bảo mật: Vui lòng đăng nhập để mở khóa [${config.label}].`, 'warn');
        return;
      }

      if (config.minRole === 'gvcn' && !isGvcn) {
        appState.showToast(`Chỉ Giáo viên Chủ nhiệm (GVCN) mới có quyền truy cập mục [${config.label}].`, 'error');
        return;
      }
    }

    setActiveTab(tab);
  };

  const handleOpenAttendance = () => {
    if (!appState.currentUser.isAuthenticatedOfficer) {
      setAuthPromptMessage('🔒 Chức năng Điểm danh yêu cầu quyền Ban Cán sự hoặc GVCN. Vui lòng đăng nhập!');
      setShowAuthModal(true);
      return;
    }
    setShowQuickAttendance(true);
  };

  const handleOpenIncident = () => {
    if (!appState.currentUser.isAuthenticatedOfficer) {
      setAuthPromptMessage('🔒 Chức năng Báo sự việc vi phạm yêu cầu quyền Ban Cán sự hoặc GVCN. Vui lòng đăng nhập!');
      setShowAuthModal(true);
      return;
    }
    setShowQuickIncident(true);
  };

  const handleOpenExcelImport = () => {
    if (!appState.currentUser.isAuthenticatedOfficer) {
      setAuthPromptMessage('🔒 Chức năng Nhập Excel yêu cầu quyền Ban Cán sự hoặc GVCN. Vui lòng đăng nhập!');
      setShowAuthModal(true);
      return;
    }
    setShowExcelImport(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Prominent Mode Banner */}
      <ModeBanner />

      {/* Main Header / Navbar */}
      <Navbar
        onOpenQuickAttendance={handleOpenAttendance}
        onOpenQuickIncident={handleOpenIncident}
        onOpenExcelImport={handleOpenExcelImport}
        onOpenAuthModal={() => {
          setAuthPromptMessage(null);
          setShowAuthModal(true);
        }}
        onToggleSidebar={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Main Application Body */}
      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            pendingIncidentsCount={pendingIncidentsCount}
            pendingRewardsCount={pendingRewardsCount}
            unresolvedRulesCount={unresolvedRulesCount}
          />
        </div>

        {/* Mobile Sidebar Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-50 w-72 bg-slate-900 h-full shadow-2xl">
              <Sidebar
                activeTab={activeTab}
                onSelectTab={handleSelectTab}
                pendingIncidentsCount={pendingIncidentsCount}
                pendingRewardsCount={pendingRewardsCount}
                unresolvedRulesCount={unresolvedRulesCount}
                onCloseMobile={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Page Content Container */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto pb-24 md:pb-8">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigate={handleSelectTab}
              onOpenQuickAttendance={handleOpenAttendance}
              onOpenQuickIncident={handleOpenIncident}
              onOpenExcelImport={handleOpenExcelImport}
              onOpenAuthModal={() => {
                setAuthPromptMessage(null);
                setShowAuthModal(true);
              }}
            />
          )}

          {activeTab === 'class_info' && (
            <ClassManagementPage
              onNavigate={handleSelectTab}
              onOpenAuthModal={() => {
                setAuthPromptMessage(null);
                setShowAuthModal(true);
              }}
            />
          )}

          {activeTab === 'students' && <StudentsPage />}
          {activeTab === 'groups' && <GroupsPage />}
          {activeTab === 'seating' && <SeatingPage />}
          {activeTab === 'attendance' && (
            <AttendancePage onOpenQuickAttendance={handleOpenAttendance} />
          )}
          {activeTab === 'incidents' && (
            <IncidentsPage onOpenQuickIncident={handleOpenIncident} />
          )}
          {activeTab === 'rewards' && <RewardsPage />}
          {activeTab === 'tasks' && <TasksPage />}
          {activeTab === 'scoring' && <ScoringPage />}
          {activeTab === 'pending_rules' && <PendingRulesPage />}
          {activeTab === 'period_locks' && <PeriodLockPage />}
          {activeTab === 'qualitative' && <QualitativePage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'audit' && <AuditPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenQuickIncident={handleOpenIncident}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        pendingIncidentsCount={pendingIncidentsCount}
      />

      {/* Global Interactive Modals */}
      <QuickAttendanceModal
        isOpen={showQuickAttendance}
        onClose={() => setShowQuickAttendance(false)}
      />

      <QuickIncidentModal
        isOpen={showQuickIncident}
        onClose={() => setShowQuickIncident(false)}
      />

      <ExcelImportModal
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
      />

      <AuthModal
        isOpen={showAuthModal}
        promptMessage={authPromptMessage}
        onSuccess={() => {
          if (pendingTabAfterAuth) {
            setActiveTab(pendingTabAfterAuth);
            setPendingTabAfterAuth(null);
          }
        }}
        onClose={() => {
          setShowAuthModal(false);
          setAuthPromptMessage(null);
        }}
      />

      {/* Global In-App Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default App;
