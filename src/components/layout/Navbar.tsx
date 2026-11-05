import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { QrCode, ShieldCheck, User, LogOut, Menu, Download } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  onNavigateToDownload: () => void;
}

export function Navbar({ onToggleSidebar, onNavigateToDownload }: NavbarProps) {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-[#05080F]/90 backdrop-blur-md border-b border-[#1E293B] px-4 lg:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-neutral-400 hover:text-white rounded-lg bg-[#0B1120] border border-[#1E293B] cursor-pointer"
          aria-label="Alternar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-tr from-[#087CFF] to-[#00BFFF] rounded-xl flex items-center justify-center text-black font-black shadow-[0_0_15px_rgba(0,191,255,0.4)]">
            <QrCode className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold text-white text-base tracking-tight">GERAPIX</span>
              <span className="text-[#00BFFF] font-black text-base">PRO</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-medium hidden sm:inline">Plaquinhas & NFC</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Project ZIP button */}
        <button
          onClick={onNavigateToDownload}
          className="hidden sm:flex items-center gap-1.5 py-1.5 px-3 bg-[#0B1120] hover:bg-[#111827] border border-[#1E293B] rounded-xl text-xs font-semibold text-neutral-200 transition cursor-pointer"
          title="Baixar arquivos do projeto para Vercel"
        >
          <Download className="w-3.5 h-3.5 text-[#00BFFF]" />
          <span>Baixar ZIP</span>
        </button>

        {/* User Info Badge */}
        <div className="flex items-center gap-2.5 bg-[#0B1120] border border-[#1E293B] py-1.5 px-3 rounded-xl">
          <div className="w-7 h-7 rounded-lg bg-[#111827] flex items-center justify-center text-neutral-300 font-bold text-xs border border-[#1E293B]">
            {isAdmin ? (
              <ShieldCheck className="w-4 h-4 text-[#00BFFF]" />
            ) : (
              <User className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </div>

          <div className="text-left hidden md:block">
            <div className="text-xs font-bold text-white leading-tight truncate max-w-[140px]">
              {userProfile?.name || currentUser?.displayName || 'Usuário'}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
              {isAdmin ? (
                <span className="text-[#00BFFF] font-black">ADMINISTRADOR</span>
              ) : (
                <span className="text-emerald-400">ATIVO</span>
              )}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => logout()}
          className="p-2 text-neutral-400 hover:text-white bg-[#0B1120] hover:bg-[#111827] border border-[#1E293B] rounded-xl transition cursor-pointer"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
