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
import { PlaqueBatch, BiositeItem } from './types';
import { PublicPlaquePointView } from './views/PublicPlaquePointView';
import { PublicBiositeView } from './views/PublicBiositeView';
import { RefreshCw, QrCode } from 'lucide-react';

function AppContent() {
  const { currentUser, isPending, isBlocked, isAdmin, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('create-batch');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBatchForDetail, setSelectedBatchForDetail] = useState<PlaqueBatch | null>(null);
  const [editingBiosite, setEditingBiosite] = useState<BiositeItem | null>(null);

  // 1. Check for public NFC Biosite URL (/b/:id or ?b=:id)
  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);

  let publicBiositeId: string | null = null;
  if (pathname.startsWith('/b/')) {
    publicBiositeId = pathname.replace('/b/', '').split('/')[0].trim();
  } else if (searchParams.has('b')) {
    publicBiositeId = searchParams.get('b');
  }

  if (publicBiositeId) {
    return <PublicBiositeView biositeId={publicBiositeId} />;
  }

  // 2. Legacy public plaque lookup (/p/:id or ?p=:id)
  let publicPlaqueId: string | null = null;
  if (pathname.startsWith('/p/')) {
    publicPlaqueId = pathname.replace('/p/', '').split('/')[0].trim();
  } else if (searchParams.has('p')) {
    publicPlaqueId = searchParams.get('p');
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

  if (!currentUser) {
    return <AuthScreen />;
  }

  if (isBlocked) {
    return <BlockedView />;
  }

  if (isPending && !isAdmin) {
    return <PendingApprovalView />;
  }

  return (
    <div className="min-h-screen bg-[#05080F] text-neutral-100 flex flex-col">
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onNavigateToDownload={() => setCurrentTab('download')}
      />

      <div className="flex-1 flex w-full">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab !== 'create-biosite') {
              setEditingBiosite(null);
            }
            setSelectedBatchForDetail(null);
            setCurrentTab(tab);
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

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
              onClearInitialBatch={() => setSelectedBatchForDetail(null)}
            />
          )}

          {currentTab === 'create-biosite' && (
            <CreateBiositeView
              editingBiosite={editingBiosite}
              onFinishEditing={() => setEditingBiosite(null)}
              onSuccessNavigate={(tab) => setCurrentTab(tab as any)}
            />
          )}

          {currentTab === 'my-biosites' && (
            <MyBiositesView
              onNavigate={(tab) => setCurrentTab(tab)}
              onEditBiosite={(biosite) => {
                setEditingBiosite(biosite);
                setCurrentTab('create-biosite');
              }}
            />
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
