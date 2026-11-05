import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { PendingApprovalView, BlockedView } from './components/auth/ApprovalViews';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { DashboardView } from './views/DashboardView';
import { CreateBatchView } from './views/CreateBatchView';
import { MyBatchesView } from './views/MyBatchesView';
import { CreateBiositeView } from './views/CreateBiositeView';
import { MyBiositesView } from './views/MyBiositesView';
import { AccountView } from './views/AccountView';
import { AdminView } from './views/AdminView';
import { ProjectDownloadView } from './views/ProjectDownloadView';
import { PlaqueBatch } from './types';
import { PublicPlaquePointView } from './views/PublicPlaquePointView';
import { RefreshCw, QrCode } from 'lucide-react';

function AppContent() {
  const { currentUser, isApproved, isPending, isBlocked, isAdmin, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBatchForDetail, setSelectedBatchForDetail] = useState<PlaqueBatch | null>(null);

  // 1. Check for public dynamic pointing URL (/p/:id or ?p=:id)
  const pathname = window.location.pathname;
  let publicPlaqueId: string | null = null;
  if (pathname.startsWith('/p/')) {
    publicPlaqueId = pathname.replace('/p/', '').split('/')[0].trim();
  } else if (new URLSearchParams(window.location.search).has('p')) {
    publicPlaqueId = new URLSearchParams(window.location.search).get('p');
  }

  if (publicPlaqueId) {
    return <PublicPlaquePointView plaqueId={publicPlaqueId} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05080F] flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 bg-gradient-to-tr from-[#087CFF] to-[#00BFFF] rounded-2xl flex items-center justify-center text-black font-black shadow-[0_0_30px_rgba(0,191,255,0.4)] mb-4 animate-bounce">
          <QrCode className="w-8 h-8 stroke-[2.5]" />
        </div>
        <div className="flex items-center gap-2 text-white font-extrabold text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-[#00BFFF]" />
          <span>Iniciando GERAPIX PRO...</span>
        </div>
      </div>
    );
  }

  // If not logged in, show AuthScreen (Login / Cadastro / Recuperação)
  if (!currentUser) {
    return <AuthScreen />;
  }

  // If account is blocked
  if (isBlocked) {
    return <BlockedView />;
  }

  // If account is pending approval (admin Jeannmkt2@gmail.com is never pending)
  if (isPending && !isAdmin) {
    return <PendingApprovalView />;
  }

  return (
    <div className="min-h-screen bg-[#05080F] text-neutral-100 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onNavigateToDownload={() => setCurrentTab('download')}
      />

      <div className="flex-1 flex w-full">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigate={(tab) => setCurrentTab(tab)}
              onSelectBatchForDetail={(batch) => setSelectedBatchForDetail(batch)}
            />
          )}

          {currentTab === 'create-batch' && (
            <CreateBatchView onSuccessNavigate={(tab) => setCurrentTab(tab as any)} />
          )}

          {currentTab === 'my-batches' && (
            <MyBatchesView
              onNavigate={(tab) => setCurrentTab(tab)}
              initialSelectedBatch={selectedBatchForDetail}
            />
          )}

          {currentTab === 'create-biosite' && (
            <CreateBiositeView onSuccessNavigate={(tab) => setCurrentTab(tab as any)} />
          )}

          {currentTab === 'my-biosites' && (
            <MyBiositesView onNavigate={(tab) => setCurrentTab(tab)} />
          )}

          {currentTab === 'account' && <AccountView />}

          {currentTab === 'admin' && <AdminView />}

          {currentTab === 'download' && <ProjectDownloadView />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
