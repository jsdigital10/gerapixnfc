import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Layers,
  FolderOpen,
  Smartphone,
  Globe2,
  UserCheck,
  ShieldAlert,
  Download,
  X,
  Sparkles,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'create-batch'
  | 'my-batches'
  | 'create-biosite'
  | 'my-biosites'
  | 'account'
  | 'admin'
  | 'download';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ currentTab, onSelectTab, isOpen, onClose }: SidebarProps) {
  const { isAdmin } = useAuth();

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: '1. Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'create-batch' as NavTab,
      label: '2. Criar Lote Pix',
      icon: Layers,
      badge: '10x10cm',
    },
    {
      id: 'my-batches' as NavTab,
      label: '3. Meus Lotes',
      icon: FolderOpen,
      badge: null,
    },
    {
      id: 'create-biosite' as NavTab,
      label: '4. Gerar Biosite NFC',
      icon: Smartphone,
      badge: 'NFC',
    },
    {
      id: 'my-biosites' as NavTab,
      label: '5. Meus Biosites',
      icon: Globe2,
      badge: null,
    },
    {
      id: 'account' as NavTab,
      label: '6. Minha Conta',
      icon: UserCheck,
      badge: null,
    },
  ];

  const handleNav = (tab: NavTab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#05080F] border-r border-[#1E293B] p-4 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Mobile close button */}
          <div className="flex items-center justify-between lg:hidden mb-4 pb-3 border-b border-[#1E293B]">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Navegação
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-[#0B1120] border border-[#1E293B]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-2">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-3">
              Menu Principal
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#00BFFF] to-[#087CFF] text-black font-black shadow-[0_2px_15px_rgba(0,191,255,0.35)]'
                      : 'text-neutral-400 hover:text-white hover:bg-[#0B1120]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-neutral-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                        isActive
                          ? 'bg-black/20 text-black'
                          : 'bg-[#111827] text-neutral-400 border border-[#1E293B]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Exclusive Admin Section */}
          {isAdmin && (
            <div className="mt-6 pt-5 border-t border-[#1E293B]">
              <span className="text-[10px] font-black text-[#00BFFF] uppercase tracking-wider px-3 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3 text-[#00BFFF]" />
                Área Restrita
              </span>
              <button
                onClick={() => handleNav('admin')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentTab === 'admin'
                    ? 'bg-gradient-to-r from-[#00BFFF] to-[#087CFF] text-black font-black shadow-[0_2px_15px_rgba(0,191,255,0.35)]'
                    : 'text-[#00BFFF] bg-[#00BFFF]/10 hover:bg-[#00BFFF]/20 border border-[#00BFFF]/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>7. Administração</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 bg-black/30 text-[#00BFFF] rounded font-black border border-[#00BFFF]/40">
                  VIP
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="pt-4 border-t border-[#1E293B] space-y-2">
          <button
            onClick={() => handleNav('download')}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              currentTab === 'download'
                ? 'bg-white text-black font-bold'
                : 'text-neutral-300 hover:text-white bg-[#0B1120] hover:bg-[#111827] border border-[#1E293B]'
            }`}
          >
            <Download className="w-4 h-4 text-[#00BFFF]" />
            <div className="text-left">
              <div className="leading-tight">Download do Projeto</div>
              <div className="text-[10px] text-neutral-400 font-normal">Vercel & Firebase ZIP</div>
            </div>
          </button>

          <div className="px-3 py-2 rounded-xl bg-[#0B1120]/80 border border-[#1E293B] text-[10px] text-neutral-500">
            <div className="flex justify-between items-center text-neutral-400 font-mono mb-0.5">
              <span>GERAPIX PRO</span>
              <span className="text-[#00BFFF]">v2.0</span>
            </div>
            <div>A4 10x10cm & NFC Ready</div>
          </div>
        </div>
      </aside>
    </>
  );
}
