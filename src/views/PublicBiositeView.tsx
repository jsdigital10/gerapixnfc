import React, { useEffect, useState } from 'react';
import { fetchPublicBiosite } from '../lib/firebase';
import { BiositeItem } from '../types';
import { BRAZILIAN_BANKS, BankLogoIcon } from '../lib/bankLogos';
import {
  normalizeTheme,
  formatWhatsappUrl,
  formatInstagramUrl,
  normalizeExternalUrl,
} from '../lib/biositeHtmlGenerator';
import {
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  MessageCircle,
  Instagram,
  ExternalLink,
} from 'lucide-react';

interface PublicBiositeViewProps {
  biositeId: string;
}

export function PublicBiositeView({ biositeId }: PublicBiositeViewProps) {
  const [biosite, setBiosite] = useState<BiositeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPublicBiosite(biositeId)
      .then((item) => {
        if (active) {
          setBiosite(item);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [biositeId]);

  const handleCopyKey = () => {
    if (!biosite) return;
    const key = biosite.pixKey.trim();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(key);
    } else {
      const ta = document.createElement('textarea');
      ta.value = key;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (navigator.vibrate) {
      try {
        navigator.vibrate(50);
      } catch {}
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05080F] text-white flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-neutral-300">
          <RefreshCw className="w-5 h-5 animate-spin text-[#00BFFF]" />
          <span>Carregando página...</span>
        </div>
      </div>
    );
  }

  if (!biosite) {
    return (
      <div className="min-h-screen bg-[#05080F] text-white flex items-center justify-center p-4">
        <div className="bg-[#111827] border border-[#1E293B] rounded-3xl p-8 max-w-sm w-full text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h1 className="text-lg font-black">Biosite não encontrado</h1>
          <p className="text-xs text-neutral-400">
            Verifique o link gravado na tag NFC.
          </p>
        </div>
      </div>
    );
  }

  const normalized = normalizeTheme(biosite.theme);
  const isLight = normalized === 'white_luxury';
  const accent = biosite.accentColor || '#00BFFF';
  const bank = BRAZILIAN_BANKS.find((b) => b.id === biosite.bank) || BRAZILIAN_BANKS[0];
  const displayName = biosite.businessName?.trim() || biosite.receiverName;
  const waUrl = formatWhatsappUrl(biosite.whatsapp);
  const igUrl = formatInstagramUrl(biosite.instagram);
  const customButtons = (biosite.customButtons || []).filter((b) => b.label.trim() && b.url.trim());

  const pageBg = isLight
    ? 'bg-[#F8FAFC] text-[#0F172A]'
    : normalized === 'glass_finance'
    ? 'bg-[#030712] text-white'
    : normalized === 'cyber_pix'
    ? 'bg-black text-white'
    : 'bg-[#05080F] text-white';

  const cardStyle: React.CSSProperties =
    normalized === 'cyber_pix'
      ? { borderColor: accent, boxShadow: `0 0 32px ${accent}33` }
      : normalized === 'neon_banking'
      ? { borderColor: `${accent}66`, boxShadow: `0 25px 60px rgba(0,0,0,0.9), 0 0 30px ${accent}25` }
      : {};

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${pageBg}`}>
      <div
        style={cardStyle}
        className={`w-full max-w-sm rounded-[30px] p-7 text-center border transition-all ${
          isLight
            ? 'bg-white border-slate-200 shadow-xl'
            : normalized === 'glass_finance'
            ? 'bg-slate-900/70 backdrop-blur-xl border-white/15 shadow-2xl'
            : normalized === 'executive_card'
            ? 'bg-gradient-to-br from-[#1A202C] via-[#0F141F] to-[#161D2B] border-white/15 shadow-2xl'
            : 'bg-[#0A0F1D] border-[#1E293B]'
        }`}
      >
        <div
          style={{ borderColor: `${accent}88` }}
          className={`w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden border-2 flex items-center justify-center ${
            isLight ? 'bg-white' : 'bg-[#05080F]'
          }`}
        >
          {biosite.logoUrl ? (
            <img
              src={biosite.logoUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <BankLogoIcon bankId={bank.id} className="w-full h-full rounded-xl" />
          )}
        </div>

        <h1 className="text-xl font-black tracking-tight mb-1">{displayName}</h1>

        {biosite.description && (
          <p className={`text-xs leading-relaxed mb-3 ${isLight ? 'text-slate-600' : 'text-neutral-400'}`}>
            {biosite.description}
          </p>
        )}

        <p
          style={{ color: accent }}
          className="text-[11px] uppercase tracking-wider font-extrabold mb-5"
        >
          {bank.name}
        </p>

        <div
          className={`p-3.5 rounded-2xl text-left mb-4 border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
              isLight ? 'text-slate-500' : 'text-neutral-400'
            }`}
          >
            Chave Pix
          </span>
          <div className="font-mono text-xs font-bold break-all">{biosite.pixKey}</div>
        </div>

        <button
          type="button"
          onClick={handleCopyKey}
          style={copied ? undefined : { backgroundColor: accent, color: '#05080F' }}
          className={`w-full py-3.5 px-5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg active:scale-95 ${
            copied ? 'bg-emerald-500 text-white' : ''
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>CHAVE COPIADA!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>COPIAR CHAVE PIX</span>
            </>
          )}
        </button>

        {(waUrl || igUrl) && (
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            )}
            {igUrl && (
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-3 rounded-xl bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Instagram className="w-4 h-4" />
                <span>Instagram</span>
              </a>
            )}
          </div>
        )}

        {customButtons.length > 0 && (
          <div className="space-y-2 mt-3">
            {customButtons.map((btn, idx) => (
              <a
                key={idx}
                href={normalizeExternalUrl(btn.url)}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900'
                    : 'bg-white/5 hover:bg-white/10 border-white/15 text-white'
                }`}
              >
                <span>{btn.label}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
