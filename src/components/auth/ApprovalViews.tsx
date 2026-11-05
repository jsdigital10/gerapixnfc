import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert, RefreshCw, LogOut, Clock } from 'lucide-react';

export function PendingApprovalView() {
  const { userProfile, currentUser, logout, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    await refreshProfile();
    setTimeout(() => setChecking(false), 800);
  };

  return (
    <div className="min-h-screen bg-[#05080F] flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#111827]/90 backdrop-blur-xl border border-[#00BFFF]/30 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_30px_rgba(0,191,255,0.15)]">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#00BFFF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 bg-[#00BFFF]/10 border border-[#00BFFF]/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#00BFFF] shadow-[0_0_20px_rgba(0,191,255,0.25)]">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <span className="inline-block px-3 py-1 bg-[#00BFFF]/15 text-[#00BFFF] text-xs font-bold uppercase tracking-wider rounded-full mb-3 border border-[#00BFFF]/30">
          Cadastro em Análise
        </span>

        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          Aguardando Aprovação
        </h1>

        <p className="text-neutral-400 text-sm leading-relaxed mb-6">
          Olá, <strong className="text-white">{userProfile?.name || currentUser?.displayName || 'Usuário'}</strong>. Sua conta foi criada e está aguardando a liberação do administrador oficial (<strong className="text-neutral-300">Jeannmkt2@gmail.com</strong>).
        </p>

        <div className="bg-[#0A0E17] border border-[#1E293B] rounded-xl p-4 text-left mb-6 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-500">E-mail:</span>
            <span className="text-neutral-200 font-mono font-medium">{currentUser?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">ID da Conta:</span>
            <span className="text-neutral-400 font-mono text-[10px]">{currentUser?.uid}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Status Atual:</span>
            <span className="text-[#00BFFF] font-bold uppercase">Pendente</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] active:scale-[0.98] text-black font-extrabold rounded-xl transition shadow-[0_4px_20px_rgba(0,191,255,0.3)] cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Verificando Aprovação...' : 'Verificar Liberação'}
          </button>

          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-transparent hover:bg-[#0A0E17] text-neutral-400 hover:text-white font-medium rounded-xl border border-[#1E293B] transition cursor-pointer text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>

        <p className="text-[11px] text-neutral-500 mt-6">
          Assim que o administrador aprovar seu acesso, você poderá utilizar todas as ferramentas do GERAPIX PRO.
        </p>
      </div>
    </div>
  );
}

export function BlockedView() {
  const { currentUser, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#05080F] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111827] border border-red-950/60 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.2)]">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="inline-block px-3 py-1 bg-red-500/15 text-red-400 text-xs font-bold uppercase tracking-wider rounded-full mb-3 border border-red-500/30">
          Acesso Suspenso
        </span>

        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          Conta Bloqueada
        </h1>

        <p className="text-neutral-400 text-sm leading-relaxed mb-6">
          O acesso desta conta (<span className="text-neutral-200 font-mono text-xs">{currentUser?.email}</span>) foi suspenso pelo administrador da plataforma.
        </p>

        <div className="bg-[#0A0E17] border border-[#1E293B] rounded-xl p-4 text-xs text-neutral-400 text-left mb-6">
          Caso considere que isto é um engano, entre em contato com o suporte ou envie mensagem para o administrador do sistema (<strong className="text-white">Jeannmkt2@gmail.com</strong>).
        </div>

        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#0B1120] hover:bg-[#111827] text-white font-bold rounded-xl border border-[#1E293B] transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Voltar ao Início
        </button>
      </div>
    </div>
  );
}
