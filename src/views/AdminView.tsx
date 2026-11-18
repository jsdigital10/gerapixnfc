import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile, UserStatus, PlaqueModelConfig, ActivityLog, QRWhiteBox } from '../types';
import {
  fetchAllUsers,
  updateUserStatus,
  fetchRecentActivities,
  logActivity,
  ADMIN_EMAIL,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  DEFAULT_PLAQUE_MODELS,
  getStoredModelConfigs,
  saveStoredModelConfigs,
} from '../lib/modelsData';
import { renderPlaqueCanvas } from '../lib/pdfGenerator';
import {
  ShieldAlert,
  Users,
  CheckCircle,
  RefreshCw,
  Search,
  Sliders,
  History,
  Sparkles,
  Lock,
  Unlock,
  Save,
  Code,
  Activity,
  CheckCircle2,
  AlertCircle,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

export function AdminView() {
  const { currentUser, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'models' | 'logs' | 'setup' | 'connection'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Connection test state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Model calibration state
  const [modelConfigs, setModelConfigs] = useState<PlaqueModelConfig[]>(getStoredModelConfigs());
  const [selectedModelIdx, setSelectedModelIdx] = useState<number>(0);
  const [calibratingModel, setCalibratingModel] = useState<PlaqueModelConfig>(modelConfigs[0]);
  const [calibrationPreviewUrl, setCalibrationPreviewUrl] = useState<string | null>(null);
  const [savedCalibrationNotice, setSavedCalibrationNotice] = useState(false);

  const loadData = async () => {
    setLoadingUsers(true);
    try {
      const [uList, aList] = await Promise.all([
        fetchAllUsers(),
        fetchRecentActivities(),
      ]);
      setUsers(uList);
      setActivities(aList);
    } catch (err) {
      console.error('Error loading admin view data:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  useEffect(() => {
    setCalibratingModel(modelConfigs[selectedModelIdx]);
  }, [selectedModelIdx, modelConfigs]);

  useEffect(() => {
    let active = true;
    const updatePreview = async () => {
      try {
        const dummyPlaque = {
          id: 'test_preview',
          batchId: 'test_batch',
          userId: 'admin',
          number: '#001',
          modelId: calibratingModel.id,
          pixType: 'phone' as const,
          pixKey: '+5511999999999',
          receiverName: 'ADMIN TESTE CALIBRACAO',
          receiverCity: 'SAO PAULO',
          payload: '00020126360014br.gov.bcb.pix0114+55119999999995204000053039865802BR5922ADMIN TESTE CALIBRACAO6009SAO PAULO62070503***6304CA27',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const url = await renderPlaqueCanvas(dummyPlaque, calibratingModel);
        if (active) setCalibrationPreviewUrl(url);
      } catch (err) {
        console.warn('Preview render notice:', err);
      }
    };
    updatePreview();
    return () => {
      active = false;
    };
  }, [calibratingModel]);

  const handleStatusChange = async (targetUid: string, targetName: string, newStatus: UserStatus) => {
    setActionInProgress(targetUid);
    try {
      await updateUserStatus(targetUid, newStatus);
      setUsers(users.map((u) => (u.uid === targetUid ? { ...u, status: newStatus } : u)));

      const actionText =
        newStatus === 'active'
          ? 'Aprovou / Reativou Usuário'
          : newStatus === 'blocked'
          ? 'Bloqueou Usuário'
          : 'Alterou Status';

      if (currentUser) {
        logActivity(
          actionText,
          `Usuário ${targetName} (${targetUid.slice(0, 8)}...) agora está: ${newStatus}`,
          { uid: currentUser.uid, name: currentUser.displayName || 'Admin' }
        );
      }
    } catch (err) {
      alert('Falha ao atualizar status do usuário.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCalibratingModel((prev) => ({
          ...prev,
          imageUrl: dataUrl,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const updateWhiteBox = (patch: Partial<QRWhiteBox>) => {
    const currentWb = calibratingModel.whiteBox || {
      boxX: 468,
      boxY: 432,
      boxWidth: 220,
      boxHeight: 220,
      innerPadding: 16,
      boxBg: '#FFFFFF',
    };
    setCalibratingModel((prev) => ({
      ...prev,
      whiteBox: {
        ...currentWb,
        ...patch,
      },
    }));
  };

  const handleSaveModelCalibration = () => {
    const updated = [...modelConfigs];
    updated[selectedModelIdx] = calibratingModel;
    setModelConfigs(updated);
    saveStoredModelConfigs(updated);

    if (currentUser) {
      logActivity(
        'Calibrou Modelo Gráfico',
        `Ajustou coordenadas e máscara do ${calibratingModel.name}`,
        { uid: currentUser.uid, name: currentUser.displayName || 'Admin' }
      );
    }

    setSavedCalibrationNotice(true);
    setTimeout(() => setSavedCalibrationNotice(false), 2500);
  };

  const runConnectionDiagnostic = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    const res = await testFirestoreConnection();
    setConnectionResult(res);
    setTestingConnection(false);
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      u.uid.includes(userSearch);
    const matchStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const activeCount = users.filter((u) => u.status === 'active').length;
  const blockedCount = users.filter((u) => u.status === 'blocked').length;

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-[#111827] border border-red-950 rounded-3xl max-w-md mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito ao Administrador</h2>
        <p className="text-xs text-neutral-400">
          Esta área é de acesso exclusivo para o administrador oficial ({ADMIN_EMAIL}).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#00BFFF] mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Área de Comando Restrita</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Painel do Administrador Oficial
          </h1>
          <p className="text-xs text-neutral-400">
            Aprovação de usuários, bloqueio/reativação, calibração visual dos 8 modelos e auditoria.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loadingUsers}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#0B1120] hover:bg-[#111827] text-neutral-300 text-xs font-bold rounded-xl border border-[#1E293B] cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#111827] border border-[#1E293B] p-4 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Usuários</span>
          <div className="text-2xl font-black text-white mt-1">{users.length}</div>
        </div>
        <div className="bg-[#111827] border border-[#00BFFF]/30 p-4 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#00BFFF]">Aguardando Liberação</span>
          <div className="text-2xl font-black text-[#00BFFF] mt-1">{pendingCount}</div>
        </div>
        <div className="bg-[#111827] border border-emerald-900/40 p-4 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Ativos / Aprovados</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{activeCount}</div>
        </div>
        <div className="bg-[#111827] border border-red-950 p-4 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Bloqueados</span>
          <div className="text-2xl font-black text-red-400 mt-1">{blockedCount}</div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-[#1E293B] gap-2 overflow-x-auto pb-1">
        {[
          { id: 'users', label: '1. Gestão de Usuários', icon: Users, badge: pendingCount > 0 ? pendingCount : null },
          { id: 'models', label: '2. Calibração dos 8 Modelos QR', icon: Sliders, badge: null },
          { id: 'connection', label: '3. Diagnóstico Firebase', icon: Activity, badge: null },
          { id: 'logs', label: '4. Log de Atividades', icon: History, badge: null },
          { id: 'setup', label: '5. Setup Admin & Claims', icon: Code, badge: null },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#00BFFF] to-[#087CFF] text-black shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-[#0B1120]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {t.badge && (
                <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-black">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-[#111827] p-4 rounded-2xl border border-[#1E293B]">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar por nome, e-mail ou UID..."
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#00BFFF]"
              />
            </div>

            <div className="flex gap-1.5 w-full sm:w-auto">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'pending', label: 'Pendentes' },
                { id: 'active', label: 'Ativos' },
                { id: 'blocked', label: 'Bloqueados' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setUserStatusFilter(f.id)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    userStatusFilter === f.id
                      ? 'bg-[#1E293B] text-white border border-[#00BFFF]/40'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B1120] border-b border-[#1E293B] text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">Função</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Data Cadastro</th>
                    <th className="py-3 px-4 text-right">Ações Administrativas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-500">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isTargetAdmin =
                        (u.email || '').toLowerCase() === ADMIN_EMAIL || u.role === 'admin';
                      const inProgress = actionInProgress === u.uid;

                      return (
                        <tr key={u.uid} className="hover:bg-[#0B1120]/60 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{u.name || 'Sem Nome'}</div>
                            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{u.email}</div>
                            <div className="text-[9px] text-neutral-500 font-mono">UID: {u.uid}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            {isTargetAdmin ? (
                              <span className="px-2 py-0.5 bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30 rounded text-[10px] font-black uppercase">
                                ADMIN
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-[#0A0E17] text-neutral-300 rounded text-[10px] font-bold uppercase border border-[#1E293B]">
                                USUÁRIO
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {u.status === 'active' ? (
                              <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full font-bold uppercase text-[10px]">
                                Ativo
                              </span>
                            ) : u.status === 'blocked' ? (
                              <span className="px-2.5 py-0.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-full font-bold uppercase text-[10px]">
                                Bloqueado
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30 rounded-full font-bold uppercase text-[10px]">
                                Pendente
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-neutral-400">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {isTargetAdmin ? (
                              <span className="text-[10px] text-neutral-500 italic">
                                Administrador Oficial
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                {u.status === 'pending' && (
                                  <button
                                    onClick={() => handleStatusChange(u.uid, u.name, 'active')}
                                    disabled={inProgress}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow"
                                    title="Aprovar Acesso"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Aprovar</span>
                                  </button>
                                )}

                                {u.status === 'active' && (
                                  <button
                                    onClick={() => handleStatusChange(u.uid, u.name, 'blocked')}
                                    disabled={inProgress}
                                    className="px-3 py-1 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                                    title="Bloquear Acesso"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Bloquear</span>
                                  </button>
                                )}

                                {u.status === 'blocked' && (
                                  <button
                                    onClick={() => handleStatusChange(u.uid, u.name, 'active')}
                                    disabled={inProgress}
                                    className="px-3 py-1 bg-[#087CFF] hover:bg-[#00BFFF] text-black font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                                    title="Reativar Conta"
                                  >
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>Reativar</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MODEL CALIBRATION & ARTWORK REPLACEMENT */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          <div className="bg-[#111827] border border-[#1E293B] p-6 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">
                  Gerenciamento de Artes & Container do QR Code
                </h2>
                <p className="text-xs text-neutral-400">
                  Substitua os arquivos de imagem das artes oficiais e calibre o box container branco onde o QR Code bancário é renderizado sem cobrir nenhum texto.
                </p>
              </div>

              <label className="flex items-center gap-2 px-4 py-2.5 bg-[#00BFFF] hover:bg-[#38BDF8] text-black font-black text-xs rounded-xl transition cursor-pointer shadow-[0_2px_15px_rgba(0,191,255,0.35)] shrink-0">
                <Upload className="w-4 h-4" />
                <span>Substituir Imagem da Arte</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-4">
              {modelConfigs.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModelIdx(idx)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    selectedModelIdx === idx
                      ? 'border-[#00BFFF] bg-[#00BFFF]/10 text-white font-bold'
                      : 'border-[#1E293B] bg-[#0A0E17] text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="text-[11px] font-black truncate">{m.name.split('—')[0]}</div>
                  <div className="text-[9px] text-neutral-500 truncate">{m.name.split('—')[1]?.trim() || ''}</div>
                </button>
              ))}
            </div>
          </div>

          {savedCalibrationNotice && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Configuração do modelo salva com sucesso! O novo layout já está ativo para todos os lotes e impressões.</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 bg-[#111827] border border-[#1E293B] p-5 rounded-2xl flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#00BFFF]">
                  Prévia Fiel em Tempo Real
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">10x10 cm • 1200 DPI</span>
              </div>

              {calibrationPreviewUrl ? (
                <div className="w-full max-w-[340px] aspect-square rounded-2xl overflow-hidden bg-black border border-[#1E293B] shadow-2xl relative">
                  <img
                    src={calibrationPreviewUrl}
                    alt="Prévia Calibrada"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full max-w-[340px] aspect-square rounded-2xl bg-[#0A0E17] flex items-center justify-center text-xs text-neutral-500">
                  Renderizando preview...
                </div>
              )}

              {/* Safety clearances verification */}
              <div className="w-full mt-4 bg-[#0A0E17] border border-[#1E293B] rounded-xl p-3 space-y-2 text-[11px]">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verificação de Espaçamento Seguro:</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Abaixo de "PAGUE COM PIX":</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    +{(calibratingModel.whiteBox?.boxY ?? 570) - 500}px de folga
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Acima de "APONTE A SUA CÂMERA":</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    +{1050 - ((calibratingModel.whiteBox?.boxY ?? 570) + (calibratingModel.whiteBox?.boxHeight ?? 460))}px de folga
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-[#111827] border border-[#1E293B] p-6 rounded-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <h3 className="text-sm font-bold text-white">
                  Geometria do Box Container Branco
                </h3>
                <span className="text-xs text-[#00BFFF] font-mono">{calibratingModel.name}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-neutral-300">Posição Horizontal (boxX):</span>
                    <span className="text-[#00BFFF] font-mono">{calibratingModel.whiteBox?.boxX ?? 650}px</span>
                  </div>
                  <input
                    type="range"
                    min="450"
                    max="850"
                    value={calibratingModel.whiteBox?.boxX ?? 650}
                    onChange={(e) => updateWhiteBox({ boxX: parseInt(e.target.value) })}
                    className="w-full accent-[#00BFFF] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-neutral-300">Posição Vertical (boxY):</span>
                    <span className="text-[#00BFFF] font-mono">{calibratingModel.whiteBox?.boxY ?? 570}px</span>
                  </div>
                  <input
                    type="range"
                    min="450"
                    max="750"
                    value={calibratingModel.whiteBox?.boxY ?? 570}
                    onChange={(e) => updateWhiteBox({ boxY: parseInt(e.target.value) })}
                    className="w-full accent-[#00BFFF] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-neutral-300">Largura do Container (boxWidth):</span>
                    <span className="text-[#00BFFF] font-mono">{calibratingModel.whiteBox?.boxWidth ?? 480}px</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="600"
                    value={calibratingModel.whiteBox?.boxWidth ?? 480}
                    onChange={(e) => updateWhiteBox({ boxWidth: parseInt(e.target.value) })}
                    className="w-full accent-[#00BFFF] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-neutral-300">Altura do Container (boxHeight):</span>
                    <span className="text-[#00BFFF] font-mono">{calibratingModel.whiteBox?.boxHeight ?? 460}px</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="600"
                    value={calibratingModel.whiteBox?.boxHeight ?? 460}
                    onChange={(e) => updateWhiteBox({ boxHeight: parseInt(e.target.value) })}
                    className="w-full accent-[#00BFFF] cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1E293B]">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-neutral-300">Margem Interna Segura (innerPadding):</span>
                    <span className="text-[#00BFFF] font-mono">{calibratingModel.whiteBox?.innerPadding ?? 24}px</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="48"
                    value={calibratingModel.whiteBox?.innerPadding ?? 24}
                    onChange={(e) => updateWhiteBox({ innerPadding: parseInt(e.target.value) })}
                    className="w-full accent-[#00BFFF] cursor-pointer"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Mantém os módulos do QR afastados das bordas do container.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Cor de Fundo do Box:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={calibratingModel.whiteBox?.boxBg || '#FFFFFF'}
                      onChange={(e) => updateWhiteBox({ boxBg: e.target.value })}
                      className="w-9 h-9 rounded border border-[#1E293B] bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={calibratingModel.whiteBox?.boxBg || '#FFFFFF'}
                      onChange={(e) => updateWhiteBox({ boxBg: e.target.value })}
                      className="flex-1 bg-[#0A0E17] border border-[#1E293B] rounded-lg p-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1E293B]">
                <h4 className="text-xs font-bold text-white mb-3">Posicionamento da Numeração Serial</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-neutral-300">Posição Horizontal (X):</span>
                      <span className="text-[#00BFFF] font-mono">{calibratingModel.numberX}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={calibratingModel.numberX}
                      onChange={(e) =>
                        setCalibratingModel({ ...calibratingModel, numberX: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[#00BFFF] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-neutral-300">Posição Vertical (Y):</span>
                      <span className="text-[#00BFFF] font-mono">{calibratingModel.numberY}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={calibratingModel.numberY}
                      onChange={(e) =>
                        setCalibratingModel({ ...calibratingModel, numberY: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[#00BFFF] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setCalibratingModel(DEFAULT_PLAQUE_MODELS[selectedModelIdx])}
                  className="px-4 py-2 bg-[#0A0E17] hover:bg-[#1E293B] text-neutral-400 hover:text-white rounded-xl text-xs font-bold border border-[#1E293B] transition cursor-pointer"
                >
                  Restaurar Padrão
                </button>

                <button
                  type="button"
                  onClick={handleSaveModelCalibration}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] active:scale-[0.98] text-black font-black text-xs rounded-xl shadow-[0_2px_15px_rgba(0,191,255,0.35)] transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Configurações do Modelo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REAL FIREBASE CONNECTION DIAGNOSTIC */}
      {activeTab === 'connection' && (
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00BFFF]" />
                <span>Diagnóstico Real de Conexão com Firebase</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Executa teste de ping direto com os servidores do Cloud Firestore no projeto <strong>gera-pix-pro</strong>.
              </p>
            </div>

            <button
              onClick={runConnectionDiagnostic}
              disabled={testingConnection}
              className="flex items-center gap-2 px-4 py-2 bg-[#00BFFF] hover:bg-[#38BDF8] text-black font-black text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
              <span>{testingConnection ? 'Testando Conexão...' : 'Executar Teste Real'}</span>
            </button>
          </div>

          {connectionResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                connectionResult.success
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                  : 'bg-red-950/40 border-red-800 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {connectionResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                <span>{connectionResult.message}</span>
              </div>
              {connectionResult.details && (
                <div className="text-[11px] font-mono opacity-80 mt-1">
                  Detalhes técnicos: {connectionResult.details}
                </div>
              )}
            </div>
          )}

          <div className="p-4 bg-[#0A0E17] rounded-xl border border-[#1E293B] text-xs space-y-2">
            <span className="font-bold text-white block">Status da Conexão no Google AI Studio:</span>
            <p className="text-neutral-400 leading-relaxed">
              O ambiente solicitou a conexão e verificou a autorização de termos no Google AI Studio. Como o projeto <code>gera-pix-pro</code> pertence à conta externa do proprietário sem credenciais IAM de serviço injetadas no container, o frontend conecta-se via Web SDK Client.
            </p>
            <div className="pt-2 text-neutral-300">
              Para liberar gravação e autenticação oficial:
              <ul className="list-disc pl-5 mt-1 space-y-1 text-neutral-400">
                <li>Publique o arquivo <code>firestore.rules</code> no Console do Firebase (aba Firestore Database &gt; Regras).</li>
                <li>Ative o provedor <strong>E-mail/Senha</strong> no Console (Authentication &gt; Sign-in method).</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Registro de Auditoria do Sistema</h2>
          <div className="divide-y divide-[#1E293B] max-h-[500px] overflow-y-auto">
            {activities.length === 0 ? (
              <p className="text-xs text-neutral-500 py-6 text-center">Nenhum evento registrado ainda.</p>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="py-3 flex items-start justify-between text-xs gap-3">
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{act.action}</span>
                      <span className="text-[10px] text-neutral-500 font-normal">por {act.userName}</span>
                    </div>
                    <div className="text-neutral-400 text-[11px] mt-0.5">{act.details}</div>
                  </div>
                  <div className="text-neutral-500 text-[10px] shrink-0 font-mono">
                    {act.createdAt ? new Date(act.createdAt).toLocaleString('pt-BR') : '—'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SETUP ADMIN */}
      {activeTab === 'setup' && (
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/30 flex items-center justify-center text-[#00BFFF]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Rotina de Inicialização do Administrador Oficial
              </h2>
              <p className="text-xs text-neutral-400">
                Instruções para concessão definitiva de custom claim <code className="text-[#00BFFF]">admin: true</code> via Firebase Admin SDK.
              </p>
            </div>
          </div>

          <div className="bg-[#0A0E17] border border-[#1E293B] rounded-xl p-4 text-xs text-neutral-300 space-y-3">
            <p>
              O sistema GERAPIX PRO já identifica e autoriza automaticamente o e-mail oficial <strong className="text-white">Jeannmkt2@gmail.com</strong> em todas as camadas de segurança.
            </p>
            <p>
              Para conceder o token de Custom Claim em nível de infraestrutura Google Cloud / Firebase Admin, execute o script seguro localizado em <code className="text-[#00BFFF]">scripts/set-admin-claims.js</code>:
            </p>

            <pre className="bg-black/80 border border-[#1E293B] p-3 rounded-lg font-mono text-[11px] text-[#00BFFF] overflow-x-auto">
{`# 1. Obtenha a credencial de conta de serviço no Console Firebase:
#    Configurações do Projeto > Contas de serviço > Gerar nova chave privada
# 2. Salve como serviceAccountKey.json na pasta scripts/
# 3. Execute:
node scripts/set-admin-claims.js Jeannmkt2@gmail.com`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
