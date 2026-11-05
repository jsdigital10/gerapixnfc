import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserBatches, fetchUserBiosites } from '../lib/firebase';
import { PlaqueBatch, BiositeItem } from '../types';
import {
  Layers,
  Smartphone,
  QrCode,
  ArrowRight,
  Sparkles,
  PlusCircle,
} from 'lucide-react';
import { DEFAULT_PLAQUE_MODELS } from '../lib/modelsData';

interface DashboardViewProps {
  onNavigate: (tab: any) => void;
  onSelectBatchForDetail?: (batch: PlaqueBatch) => void;
}

export function DashboardView({ onNavigate, onSelectBatchForDetail }: DashboardViewProps) {
  const { currentUser } = useAuth();
  const [batches, setBatches] = useState<PlaqueBatch[]>([]);
  const [biosites, setBiosites] = useState<BiositeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      try {
        const [bList, bioList] = await Promise.all([
          fetchUserBatches(currentUser.uid),
          fetchUserBiosites(currentUser.uid),
        ]);
        setBatches(bList);
        setBiosites(bioList);
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const totalPlaquesCount = batches.reduce((acc, b) => acc + (b.quantity || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B1120] via-[#111827] to-[#0A0E17] border border-[#00BFFF]/30 p-6 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(0,191,255,0.1)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00BFFF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00BFFF]/15 border border-[#00BFFF]/40 rounded-full text-[#00BFFF] text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sistema Profissional de Impressão & NFC</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
            Bem-vindo ao <span className="text-[#00BFFF]">GERAPIX PRO</span>
          </h1>

          <p className="text-neutral-400 text-sm md:text-base leading-relaxed mb-6">
            Gere lotes de plaquinhas Pix no padrão gráfico oficial (PDF A4 10x10 cm, 4 por folha) com QR Code real Banco Central (EMV) e biosites ultra rápidos para tags NFC.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('create-batch')}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] active:scale-[0.98] text-black font-extrabold rounded-xl transition shadow-[0_4px_25px_rgba(0,191,255,0.35)] text-sm cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>Criar Lote Pix (10x10cm)</span>
            </button>

            <button
              onClick={() => onNavigate('create-biosite')}
              className="flex items-center gap-2 px-5 py-3 bg-[#0B1120] hover:bg-[#111827] text-white font-bold rounded-xl border border-[#1E293B] transition text-sm cursor-pointer hover:border-[#00BFFF]/50"
            >
              <Smartphone className="w-4 h-4 text-[#00BFFF]" />
              <span>Gerar Biosite NFC</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Lotes */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 hover:border-[#00BFFF]/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Total de Lotes
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {loading ? '—' : batches.length}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">Lotes cadastrados no sistema</span>
        </div>

        {/* Total Plaquinhas */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 hover:border-[#00BFFF]/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Plaquinhas Geradas
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#087CFF]/15 border border-[#087CFF]/30 flex items-center justify-center text-[#00BFFF]">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {loading ? '—' : totalPlaquesCount}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">Unidades 10x10 cm prontas</span>
        </div>

        {/* Total Biosites */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 hover:border-[#00BFFF]/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Biosites NFC
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {loading ? '—' : biosites.length}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">Links de aproximação</span>
        </div>
      </div>

      {/* Two columns: Recent Batches & Recent Biosites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Batches Card */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-white">Últimos Lotes Pix</h2>
              <p className="text-xs text-neutral-400">Seus projetos de impressão mais recentes</p>
            </div>
            <button
              onClick={() => onNavigate('my-batches')}
              className="text-xs font-bold text-[#00BFFF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {batches.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-[#1E293B] rounded-xl bg-[#0A0E17]/50">
              <Layers className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-xs text-neutral-400 mb-3">Nenhum lote criado ainda.</p>
              <button
                onClick={() => onNavigate('create-batch')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00BFFF] text-black text-xs font-bold rounded-lg cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Criar Primeiro Lote
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.slice(0, 3).map((batch) => {
                const model = DEFAULT_PLAQUE_MODELS.find((m) => m.id === batch.modelId) || DEFAULT_PLAQUE_MODELS[0];
                return (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between p-3.5 bg-[#0A0E17] border border-[#1E293B] rounded-xl hover:border-[#00BFFF]/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={model.imageUrl}
                        alt={model.name}
                        className="w-11 h-11 rounded-lg object-cover border border-[#1E293B] bg-black shrink-0"
                      />
                      <div>
                        <div className="text-xs font-bold text-white line-clamp-1">{batch.name}</div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                          <span className="text-[#00BFFF] font-semibold">{batch.quantity} unidades</span>
                          <span>•</span>
                          <span>{model.name.split('—')[0]}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (onSelectBatchForDetail) onSelectBatchForDetail(batch);
                        onNavigate('my-batches');
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-[#111827] hover:bg-[#1E293B] text-white rounded-lg border border-[#1E293B] transition cursor-pointer"
                    >
                      Abrir
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Biosites Card */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-white">Últimos Biosites NFC</h2>
              <p className="text-xs text-neutral-400">Páginas de cópia de chave Pix</p>
            </div>
            <button
              onClick={() => onNavigate('my-biosites')}
              className="text-xs font-bold text-[#00BFFF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {biosites.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-[#1E293B] rounded-xl bg-[#0A0E17]/50">
              <Smartphone className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-xs text-neutral-400 mb-3">Nenhum biosite gerado ainda.</p>
              <button
                onClick={() => onNavigate('create-biosite')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00BFFF] text-black text-xs font-bold rounded-lg cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Criar Primeiro Biosite
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {biosites.slice(0, 3).map((bio) => (
                <div
                  key={bio.id}
                  className="flex items-center justify-between p-3.5 bg-[#0A0E17] border border-[#1E293B] rounded-xl hover:border-[#00BFFF]/50 transition"
                >
                  <div>
                    <div className="text-xs font-bold text-white line-clamp-1">{bio.receiverName}</div>
                    <div className="text-[11px] text-neutral-400 font-mono mt-0.5 truncate max-w-[180px]">
                      {bio.pixKey}
                    </div>
                  </div>

                  <span className="text-[10px] uppercase font-bold px-2 py-1 bg-[#111827] text-neutral-300 rounded border border-[#1E293B]">
                    {bio.theme.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
