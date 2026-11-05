import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword } from 'firebase/auth';
import { auth, firebaseConfig } from '../lib/firebase';
import { UserCheck, ShieldCheck, Key, CheckCircle2, AlertCircle, Database } from 'lucide-react';

export function AccountView() {
  const { currentUser, userProfile, isAdmin } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (newPassword.length < 6) {
      setMsg({ text: 'A nova senha deve ter no mínimo 6 caracteres.', error: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ text: 'As senhas não coincidem.', error: true });
      return;
    }

    if (!auth.currentUser) return;

    setUpdating(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      setMsg({ text: 'Senha alterada com sucesso!', error: false });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMsg({ text: err.message || 'Erro ao alterar senha. Reautentique-se e tente novamente.', error: true });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00BFFF] mb-1">
          <UserCheck className="w-3.5 h-3.5" />
          <span>Configurações Pessoais</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Minha Conta</h1>
        <p className="text-xs text-neutral-400">
          Dados cadastrais, status da conta e configurações de segurança.
        </p>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-4 border-b border-[#1E293B] pb-4">
          <div className="w-14 h-14 rounded-2xl bg-[#00BFFF]/15 border border-[#00BFFF]/30 flex items-center justify-center text-[#00BFFF] font-black text-xl shadow-[0_0_20px_rgba(0,191,255,0.2)]">
            {isAdmin ? <ShieldCheck className="w-8 h-8" /> : (userProfile?.name?.[0] || 'U')}
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{userProfile?.name || currentUser?.displayName || 'Usuário'}</span>
              {isAdmin && (
                <span className="px-2 py-0.5 bg-[#00BFFF] text-black text-[10px] font-black rounded uppercase">
                  ADMINISTRADOR
                </span>
              )}
            </h2>
            <p className="text-xs text-neutral-400 font-mono">{currentUser?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#0A0E17] p-3 rounded-xl border border-[#1E293B]">
            <span className="text-neutral-500 block text-[10px] font-bold uppercase">Status</span>
            <span className="text-emerald-400 font-bold uppercase mt-0.5 block">
              {userProfile?.status || 'Ativo'}
            </span>
          </div>

          <div className="bg-[#0A0E17] p-3 rounded-xl border border-[#1E293B]">
            <span className="text-neutral-500 block text-[10px] font-bold uppercase">Função</span>
            <span className="text-white font-bold uppercase mt-0.5 block">
              {userProfile?.role || (isAdmin ? 'Admin' : 'Usuário')}
            </span>
          </div>

          <div className="bg-[#0A0E17] p-3 rounded-xl border border-[#1E293B]">
            <span className="text-neutral-500 block text-[10px] font-bold uppercase">ID Único (UID)</span>
            <span className="text-neutral-400 font-mono text-[10px] truncate block mt-0.5">
              {currentUser?.uid}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-[#00BFFF]" />
          <span>Alterar Senha</span>
        </h3>

        {msg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              msg.error
                ? 'bg-red-950/40 border border-red-800/60 text-red-200'
                : 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-200'
            }`}
          >
            {msg.error ? <AlertCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Nova Senha
            </label>
            <input
              type="password"
              required
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2 px-3 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              required
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2 px-3 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            disabled={updating}
            className="px-4 py-2 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] text-black font-black text-xs rounded-xl shadow cursor-pointer disabled:opacity-50"
          >
            {updating ? 'Alterando...' : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#00BFFF]" />
          <h3 className="text-sm font-bold text-white">Conexão Firebase Oficial</h3>
        </div>
        <p className="text-xs text-neutral-400">
          O GERAPIX PRO está apontado para o projeto oficial do Google Firebase.
        </p>

        <div className="p-3 bg-[#0A0E17] rounded-xl border border-[#1E293B] text-[11px] font-mono text-neutral-300 space-y-1">
          <div>Projeto ID: <strong className="text-white">{firebaseConfig.projectId}</strong></div>
          <div>Domínio Auth: <strong className="text-white">{firebaseConfig.authDomain}</strong></div>
          <div>Banco: <strong className="text-emerald-400">Cloud Firestore</strong></div>
        </div>
      </div>
    </div>
  );
}
