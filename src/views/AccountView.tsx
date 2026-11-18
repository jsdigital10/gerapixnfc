import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword } from 'firebase/auth';
import { auth, firebaseConfig } from '../lib/firebase';
import {
  fetchPixIntegrationConfig,
  savePixIntegrationConfig,
  testPspIntegrationEndpoint,
  EndpointTestResult,
  DEFAULT_INTEGRATION_CONFIG,
} from '../lib/pixIntegration';
import { PixIntegrationConfig, PixIntegrationProvider } from '../types';
import {
  UserCheck,
  ShieldCheck,
  Key,
  CheckCircle2,
  AlertCircle,
  Database,
  Plug,
  Save,
  RefreshCw,
} from 'lucide-react';

export function AccountView() {
  const { currentUser, userProfile, isAdmin } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Single-time Pix Default Receiver + Optional PSP Dynamic Integration
  const [pixConfig, setPixConfig] = useState<PixIntegrationConfig>(DEFAULT_INTEGRATION_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState(false);
  const [endpointTestResult, setEndpointTestResult] = useState<EndpointTestResult | null>(null);
  const [configMsg, setConfigMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchPixIntegrationConfig(currentUser.uid).then(setPixConfig);
    }
  }, [currentUser?.uid]);

  const handleSaveIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;
    setConfigMsg(null);
    setSavingConfig(true);
    try {
      await savePixIntegrationConfig(currentUser.uid, pixConfig);
      setConfigMsg({ text: 'Configurações Pix salvas com sucesso.', error: false });
    } catch {
      setConfigMsg({ text: 'Erro ao salvar configurações Pix.', error: true });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestEndpoint = async () => {
    setTestingEndpoint(true);
    setEndpointTestResult(null);
    try {
      const res = await testPspIntegrationEndpoint(pixConfig);
      setEndpointTestResult(res);
    } finally {
      setTestingEndpoint(false);
    }
  };

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
          Dados cadastrais, padrão de recebimento Pix e segurança.
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

      {/* Single-Time Pix Receiver Defaults & Real PSP Integration */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Plug className="w-4 h-4 text-[#00BFFF]" />
            <span>Dados Padrão do BR Code & Integração Pix PSP</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Configure uma única vez os campos EMV padrão. O nome real do titular da conta é consultado pelo app do banco no DICT após a leitura.
          </p>
        </div>

        {configMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              configMsg.error
                ? 'bg-red-950/40 border border-red-800/60 text-red-200'
                : 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-200'
            }`}
          >
            {configMsg.error ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{configMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveIntegration} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Rótulo EMV Padrão (opcional, máx 25)
              </label>
              <input
                type="text"
                maxLength={25}
                value={pixConfig.defaultReceiverName}
                onChange={(e) =>
                  setPixConfig({ ...pixConfig, defaultReceiverName: e.target.value })
                }
                placeholder="PIX"
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2 px-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Cidade Padrão (opcional, máx 15)
              </label>
              <input
                type="text"
                maxLength={15}
                value={pixConfig.defaultReceiverCity}
                onChange={(e) =>
                  setPixConfig({ ...pixConfig, defaultReceiverCity: e.target.value })
                }
                placeholder="BRASIL"
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2 px-3 text-xs text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 p-3 bg-[#0A0E17] rounded-xl border border-[#1E293B] cursor-pointer">
            <input
              type="checkbox"
              checked={pixConfig.enabled}
              onChange={(e) => setPixConfig({ ...pixConfig, enabled: e.target.checked })}
              className="w-4 h-4 accent-[#00BFFF] rounded"
            />
            <div>
              <span className="text-xs font-bold text-white block">
                Conectar API / Provedor Pix Dinâmico (PSP)
              </span>
              <span className="text-[11px] text-neutral-400 block">
                Ative apenas se possuir um gateway HTTP/HTTPS que emita locations dinâmicas BACEN (ID 01=12).
              </span>
            </div>
          </label>

          {pixConfig.enabled && (
            <div className="space-y-3 p-4 bg-[#0A0E17] border border-[#1E293B] rounded-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Provedor
                  </label>
                  <select
                    value={pixConfig.provider}
                    onChange={(e) =>
                      setPixConfig({
                        ...pixConfig,
                        provider: e.target.value as PixIntegrationProvider,
                      })
                    }
                    className="w-full bg-[#111827] border border-[#1E293B] rounded-xl py-2 px-3 text-xs text-white"
                  >
                    <option value="efi">Efí Bank (Gerencianet)</option>
                    <option value="asaas">Asaas</option>
                    <option value="mercadopago">Mercado Pago</option>
                    <option value="openpix">OpenPix</option>
                    <option value="custom_bacen">API Pix BACEN Customizada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Ambiente
                  </label>
                  <select
                    value={pixConfig.environment}
                    onChange={(e) =>
                      setPixConfig({
                        ...pixConfig,
                        environment: e.target.value as 'sandbox' | 'production',
                      })
                    }
                    className="w-full bg-[#111827] border border-[#1E293B] rounded-xl py-2 px-3 text-xs text-white"
                  >
                    <option value="production">Produção</option>
                    <option value="sandbox">Sandbox</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Endpoint / URL da API PSP
                </label>
                <input
                  type="url"
                  value={pixConfig.apiEndpoint || ''}
                  onChange={(e) => {
                    setPixConfig({ ...pixConfig, apiEndpoint: e.target.value });
                    setEndpointTestResult(null);
                  }}
                  placeholder="https://sua-api-pix.exemplo.com/plaquinhas/sync"
                  className="w-full bg-[#111827] border border-[#1E293B] rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Token / API Key (Opcional)
                </label>
                <input
                  type="password"
                  value={pixConfig.apiKey || ''}
                  onChange={(e) => setPixConfig({ ...pixConfig, apiKey: e.target.value })}
                  placeholder="Bearer Token do seu servidor PSP"
                  className="w-full bg-[#111827] border border-[#1E293B] rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 bg-[#111827] rounded-xl border border-[#1E293B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(pixConfig.supportsReceiverSwap)}
                  onChange={(e) =>
                    setPixConfig({ ...pixConfig, supportsReceiverSwap: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#00BFFF] rounded mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Provedor suporta alteração autorizada de recebedor/chave em QR já impresso
                  </span>
                  <span className="text-[11px] text-neutral-400 block leading-relaxed">
                    Contas PSP comuns emitem QR apenas para a própria conta titular (mTLS). Marque apenas se o seu gateway possuir subcontas/split com permissão de roteamento. Sem confirmação real da API, plaquinhas pré-impressas não são marcadas como prontas.
                  </span>
                </div>
              </label>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestEndpoint}
                  disabled={testingEndpoint || !pixConfig.apiEndpoint?.trim()}
                  className="px-3 py-2 bg-[#111827] hover:bg-[#1E293B] text-[#00BFFF] border border-[#1E293B] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingEndpoint ? 'animate-spin' : ''}`} />
                  <span>{testingEndpoint ? 'Testando...' : 'Testar Endpoint PSP'}</span>
                </button>
              </div>

              {endpointTestResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    endpointTestResult.ok
                      ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-200'
                      : 'bg-amber-950/40 border border-amber-800/60 text-amber-200'
                  }`}
                >
                  {endpointTestResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <span>{endpointTestResult.message}</span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={savingConfig}
            className="px-4 py-2 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] text-black font-black text-xs rounded-xl shadow cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingConfig ? 'Salvando...' : 'Salvar Configurações'}</span>
          </button>
        </form>
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
          <h3 className="text-sm font-bold text-white">Conexão Firebase</h3>
        </div>
        <div className="p-3 bg-[#0A0E17] rounded-xl border border-[#1E293B] text-[11px] font-mono text-neutral-300 space-y-1">
          <div>Projeto ID: <strong className="text-white">{firebaseConfig.projectId}</strong></div>
          <div>Banco: <strong className="text-emerald-400">Cloud Firestore</strong></div>
        </div>
      </div>
    </div>
  );
}
