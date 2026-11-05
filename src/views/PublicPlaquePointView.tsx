import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PlaqueItem } from '../types';
import { BRAZILIAN_BANKS, BankLogoIcon } from '../lib/bankLogos';
import { generatePixPayload } from '../lib/pix';
import {
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  QrCode,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Building2,
} from 'lucide-react';

interface PublicPlaquePointViewProps {
  plaqueId: string;
}

export function PublicPlaquePointView({ plaqueId }: PublicPlaquePointViewProps) {
  const [plaque, setPlaque] = useState<PlaqueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPlaqueData() {
      setLoading(true);
      setError(null);

      try {
        // 1. Try to read directly from Firestore /plaques/{plaqueId}
        const snap = await getDoc(doc(db, 'plaques', plaqueId));
        if (snap.exists()) {
          if (active) {
            setPlaque(snap.data() as PlaqueItem);
            setLoading(false);
          }
          return;
        }

        // 2. Try to search in local storage batches cache if offline or direct
        try {
          const raw = localStorage.getItem('gerapix_local_batches_cache_v2');
          if (raw) {
            const batches = JSON.parse(raw);
            for (const b of batches) {
              const found = (b.plaques || []).find((p: any) => p.id === plaqueId);
              if (found && active) {
                setPlaque(found);
                setLoading(false);
                return;
              }
            }
          }
        } catch {}

        if (active) {
          setError('Plaquinha Pix não encontrada ou desativada.');
          setLoading(false);
        }
      } catch (err: any) {
        console.warn('Error loading public plaque data:', err);
        // Fallback to local storage check
        try {
          const raw = localStorage.getItem('gerapix_local_batches_cache_v2');
          if (raw) {
            const batches = JSON.parse(raw);
            for (const b of batches) {
              const found = (b.plaques || []).find((p: any) => p.id === plaqueId);
              if (found && active) {
                setPlaque(found);
                setLoading(false);
                return;
              }
            }
          }
        } catch {}

        if (active) {
          setError('Não foi possível carregar os dados desta plaquinha Pix.');
          setLoading(false);
        }
      }
    }

    loadPlaqueData();

    return () => {
      active = false;
    };
  }, [plaqueId]);

  const handleCopyKey = () => {
    if (!plaque) return;
    const text = plaque.pixKey.trim();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    if (navigator.vibrate) {
      try { navigator.vibrate(50); } catch {}
    }

    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyPayload = () => {
    if (!plaque) return;
    const emv = plaque.payload || generatePixPayload({
      pixType: plaque.pixType,
      pixKey: plaque.pixKey,
      receiverName: plaque.receiverName,
      receiverCity: plaque.receiverCity || 'SAO PAULO',
      amount: plaque.amount,
      txId: plaque.txId,
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(emv);
    } else {
      const ta = document.createElement('textarea');
      ta.value = emv;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    if (navigator.vibrate) {
      try { navigator.vibrate(50); } catch {}
    }

    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  const bankAppDeepLinks = [
    { name: 'Nubank', scheme: 'nubank://', iconBg: 'bg-[#820AD1]', text: 'Nubank' },
    { name: 'Itaú', scheme: 'itau://', iconBg: 'bg-[#EC7000]', text: 'Itaú' },
    { name: 'Bradesco', scheme: 'bradesco://', iconBg: 'bg-[#CC092F]', text: 'Bradesco' },
    { name: 'Banco do Brasil', scheme: 'bancodobrasil://', iconBg: 'bg-[#FAF000] text-blue-900', text: 'BB' },
    { name: 'Inter', scheme: 'bancointer://', iconBg: 'bg-[#FF7A00]', text: 'Inter' },
    { name: 'Santander', scheme: 'santander://', iconBg: 'bg-[#EC0000]', text: 'Santander' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05080F] text-white flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#087CFF] to-[#00BFFF] flex items-center justify-center text-black font-black mb-4 shadow-[0_0_30px_rgba(0,191,255,0.4)] animate-pulse">
          <QrCode className="w-8 h-8 stroke-[2.5]" />
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-neutral-300">
          <RefreshCw className="w-4 h-4 animate-spin text-[#00BFFF]" />
          <span>Localizando chave do recebedor...</span>
        </div>
      </div>
    );
  }

  if (error || !plaque) {
    return (
      <div className="min-h-screen bg-[#05080F] text-white flex flex-col items-center justify-center p-4">
        <div className="bg-[#111827] border border-red-800/60 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-black text-white">Chave Não Disponível</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {error || 'Os dados desta plaquinha Pix não foram localizados.'}
          </p>
        </div>
      </div>
    );
  }

  const emvCode = plaque.payload || generatePixPayload({
    pixType: plaque.pixType,
    pixKey: plaque.pixKey,
    receiverName: plaque.receiverName,
    receiverCity: plaque.receiverCity || 'SAO PAULO',
    amount: plaque.amount,
    txId: plaque.txId,
  });

  return (
    <div className="min-h-screen bg-[#05080F] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-[#00BFFF]/15 to-transparent blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-4">
        {/* Main Payment Card */}
        <div className="bg-[#0B1120] border border-[#00BFFF]/40 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(0,191,255,0.2)] text-center relative overflow-hidden">
          {/* Subtle Top glow bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00BFFF] to-transparent" />

          {/* Secure Pix Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00BFFF]/10 border border-[#00BFFF]/30 text-[#00BFFF] text-[11px] font-bold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ponto de Pagamento Pix</span>
          </div>

          {/* Receiver Name */}
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">
            {plaque.receiverName}
          </h1>

          <p className="text-xs text-neutral-400 font-semibold mb-5 flex items-center justify-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#00BFFF]" />
            <span>{plaque.receiverCity || 'Brasil'} • Pagamento Instantâneo</span>
          </p>

          {/* Amount if defined */}
          {plaque.amount && plaque.amount > 0 && (
            <div className="bg-black/40 border border-[#00BFFF]/20 rounded-2xl p-3 mb-5">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                Valor Solicitado
              </span>
              <span className="text-2xl font-black text-[#00BFFF]">
                R$ {plaque.amount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}

          {/* Pix Key Display Box */}
          <div className="bg-[#05080F] border border-[#1E293B] rounded-2xl p-4 text-left mb-5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              <span>Chave Pix ({plaque.pixType.toUpperCase()})</span>
              <span className="text-[#00BFFF]">Toque para copiar</span>
            </div>
            <div
              onClick={handleCopyKey}
              className="font-mono text-sm font-bold text-white break-all cursor-pointer hover:text-[#00BFFF] transition"
              title="Clique para copiar a chave"
            >
              {plaque.pixKey}
            </div>
          </div>

          {/* Primary Action Button: COPIAR CHAVE PIX */}
          <button
            type="button"
            onClick={handleCopyKey}
            className={`w-full py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition cursor-pointer shadow-[0_10px_25px_rgba(0,191,255,0.35)] active:scale-98 ${
              copiedKey
                ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                : 'bg-gradient-to-r from-[#00BFFF] to-[#087CFF] text-black hover:from-[#38BDF8] hover:to-[#00BFFF]'
            }`}
          >
            {copiedKey ? (
              <>
                <Check className="w-5 h-5 stroke-[3]" />
                <span>CHAVE PIX COPIADA!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>COPIAR CHAVE PIX</span>
              </>
            )}
          </button>

          {/* Secondary Action: Copiar Código Pix Copia e Cola */}
          <button
            type="button"
            onClick={handleCopyPayload}
            className={`w-full mt-3 py-3 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
              copiedPayload
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                : 'bg-[#05080F] border-[#1E293B] text-neutral-300 hover:text-white hover:border-[#00BFFF]/40'
            }`}
          >
            {copiedPayload ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                <span>CÓDIGO PIX COPIADO!</span>
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4 text-[#00BFFF]" />
                <span>Copiar Código Pix Copia e Cola</span>
              </>
            )}
          </button>

          {/* Instruction */}
          <p className="text-[11px] text-neutral-400 mt-4 leading-relaxed">
            Abra o app do seu banco, escolha <strong className="text-white">Pix</strong> e cole a chave ou código copiado para pagar instantaneamente.
          </p>
        </div>

        {/* Banking App Shortcuts */}
        <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl p-4 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-3">
            Atalhos Rápidos para Apps Bancários
          </span>

          <div className="grid grid-cols-3 gap-2">
            {bankAppDeepLinks.map((b) => (
              <a
                key={b.name}
                href={b.scheme}
                className="p-2.5 bg-[#05080F] hover:bg-[#111827] border border-[#1E293B] hover:border-[#00BFFF]/40 rounded-xl flex items-center justify-center gap-1.5 transition text-xs font-bold text-white group"
              >
                <div className={`w-3.5 h-3.5 rounded-full ${b.iconBg}`} />
                <span className="truncate">{b.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
