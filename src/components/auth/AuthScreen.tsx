import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { QrCode, Lock, Mail, User as UserIcon, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

type AuthMode = 'login' | 'register';

export function AuthScreen() {
  const { login, register, error, clearError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Preencha seu e-mail e senha.');
        }
        await login(email, password);
      } else {
        if (!name.trim()) {
          throw new Error('Informe seu nome completo.');
        }
        if (!email.trim()) {
          throw new Error('Informe seu endereço de e-mail.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter no mínimo 6 caracteres.');
        }
        if (password !== confirmPassword) {
          throw new Error('As senhas digitadas não coincidem.');
        }
        await register(name, email, password);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Falha ao processar solicitação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05080F] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Neon Lighting Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#00BFFF]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-[#087CFF]/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#111827]/90 backdrop-blur-xl border border-[#00BFFF]/30 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(0,191,255,0.15)]">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-[#087CFF] to-[#00BFFF] rounded-2xl flex items-center justify-center text-black font-black shadow-[0_0_25px_rgba(0,191,255,0.5)] mb-3">
            <QrCode className="w-8 h-8 stroke-[2.5] text-black" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            GERAPIX <span className="text-[#00BFFF]">PRO</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1 font-medium text-center">
            Plaquinhas Pix em Lote & Biosites NFC Profissionais
          </p>
        </div>

        {/* Simplified Two-Tab Switcher: ENTRAR / CADASTRAR */}
        <div className="flex bg-[#0A0E17] p-1.5 rounded-xl mb-6 border border-[#1E293B]">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-[#00BFFF] text-black shadow-[0_2px_15px_rgba(0,191,255,0.35)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            ENTRAR
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-[#00BFFF] text-black shadow-[0_2px_15px_rgba(0,191,255,0.35)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            CADASTRAR
          </button>
        </div>

        {/* Error Feedback */}
        {(error || localError) && (
          <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-950/50 border border-red-800/80 rounded-xl text-red-200 text-xs leading-relaxed animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error || localError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Nome
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#00BFFF] focus:ring-1 focus:ring-[#00BFFF] transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#00BFFF] focus:ring-1 focus:ring-[#00BFFF] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="password"
                required
                placeholder="Sua senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#00BFFF] focus:ring-1 focus:ring-[#00BFFF] transition"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="password"
                  required
                  placeholder="Repita sua senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#00BFFF] focus:ring-1 focus:ring-[#00BFFF] transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] active:scale-[0.98] text-black font-black rounded-xl transition shadow-[0_4px_25px_rgba(0,191,255,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Entrar' : 'Criar conta'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {mode === 'register' && (
          <p className="text-[11px] text-neutral-500 text-center mt-5">
            Novos cadastros de usuários comuns passam por aprovação administrativa antes da liberação.
          </p>
        )}
      </div>
    </div>
  );
}
