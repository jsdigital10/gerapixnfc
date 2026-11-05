import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BiositeItem, BiositeTheme, PixKeyType } from '../types';
import { BRAZILIAN_BANKS, BankLogoIcon } from '../lib/bankLogos';
import { generateBiositeHtml, normalizeTheme } from '../lib/biositeHtmlGenerator';
import { saveBiosite, logActivity } from '../lib/firebase';
import { formatPixKey, validatePixKey } from '../lib/pix';
import {
  Smartphone,
  Copy,
  Check,
  Download,
  Search,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CreditCard,
} from 'lucide-react';

const ULTRA_BIOSITE_THEMES: {
  id: BiositeTheme;
  title: string;
  name: string;
  desc: string;
  badge: string;
  borderPreview: string;
}[] = [
  {
    id: 'neon_banking',
    title: 'Modelo 01',
    name: 'Neon Banking',
    desc: 'Preto profundo, azul elétrico brilhante, cartão 3D com glow suave e botão volumétrico.',
    badge: '3D Glow',
    borderPreview: 'border-[#00BFFF] bg-[#05080F]',
  },
  {
    id: 'white_luxury',
    title: 'Modelo 02',
    name: 'White Luxury',
    desc: 'Branco minimalista premium, grafite nobre e cartão flutuante com sombra multicamada.',
    badge: 'Clean Luxe',
    borderPreview: 'border-slate-300 bg-white text-slate-900',
  },
  {
    id: 'glass_finance',
    title: 'Modelo 03',
    name: 'Glass Finance',
    desc: 'Azul-marinho profundo, vidro translúcido (glassmorphism), reflexos sutis e profundidade.',
    badge: 'Glassmorphism',
    borderPreview: 'border-blue-400/40 bg-blue-950/40 backdrop-blur-md',
  },
  {
    id: 'cyber_pix',
    title: 'Modelo 04',
    name: 'Cyber Pix',
    desc: 'Preto puro, azul neon intenso, malha sutil e botão tátil 3D com efeito de pressão.',
    badge: 'Cyber Tech',
    borderPreview: 'border-[#00BFFF] bg-black',
  },
  {
    id: 'executive_card',
    title: 'Modelo 05',
    name: 'Executive Card',
    desc: 'Visual de cartão Black/Metal com chip inteligente realista dourado e layout assimétrico.',
    badge: 'Black Metal',
    borderPreview: 'border-amber-500/40 bg-gradient-to-br from-[#1A202C] to-[#0B0E17]',
  },
];

interface CreateBiositeViewProps {
  onSuccessNavigate?: (tab: string) => void;
}

export function CreateBiositeView({ onSuccessNavigate }: CreateBiositeViewProps) {
  const { currentUser } = useAuth();

  const [receiverName, setReceiverName] = useState('Jean Carlos');
  const [bankId, setBankId] = useState('nubank');
  const [pixType, setPixType] = useState<PixKeyType>('phone');
  const [pixKey, setPixKey] = useState('11999999999');
  const [theme, setTheme] = useState<BiositeTheme>('neon_banking');

  const [bankSearch, setBankSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedTest, setCopiedTest] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const filteredBanks = BRAZILIAN_BANKS.filter((b) =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
    b.code.includes(bankSearch)
  );

  const selectedBank = BRAZILIAN_BANKS.find((b) => b.id === bankId) || BRAZILIAN_BANKS[0];
  const activeNormalizedTheme = normalizeTheme(theme);

  const handleTestCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pixKey);
      setCopiedTest(true);
      setTimeout(() => setCopiedTest(false), 2200);
    }
  };

  const handleSaveAndExport = async (mode: 'save_only' | 'download_html') => {
    setValidationError(null);

    const val = validatePixKey(pixType, pixKey);
    if (!val.valid) {
      setValidationError(val.message || 'Chave Pix inválida.');
      return;
    }

    if (!receiverName.trim()) {
      setValidationError('Informe o nome do recebedor.');
      return;
    }

    setSaving(true);
    const biositeId = `bio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const biosite: BiositeItem = {
      id: biositeId,
      userId: currentUser?.uid || 'guest',
      receiverName: receiverName.trim(),
      bank: bankId,
      pixType,
      pixKey: formatPixKey(pixType, pixKey),
      theme,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await saveBiosite(biosite);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);

      if (currentUser) {
        logActivity(
          'Criou Biosite NFC',
          `${biosite.receiverName} (${selectedBank.name}, Tema: ${theme})`,
          { uid: currentUser.uid, name: currentUser.displayName || 'Usuário' }
        );
      }

      if (mode === 'download_html') {
        const htmlContent = generateBiositeHtml(biosite);
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `index_${biosite.receiverName.replace(/[^a-zA-Z0-9]/g, '_')}_biosite.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      setValidationError('Erro ao salvar biosite no sistema.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00BFFF] mb-1">
          <Smartphone className="w-3.5 h-3.5" />
          <span>Tecnologia de Aproximação NFC</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Gerador de Biosite NFC Ultra Premium
        </h1>
        <p className="text-xs md:text-sm text-neutral-400">
          Crie páginas ultrarrápidas, elegantes e objetivas, com efeitos 3D e iluminação profissional, para gravação em tags NFC físicas.
        </p>
      </div>

      {validationError && (
        <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-red-200 text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {savedSuccess && (
        <div className="flex items-center gap-2 p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Biosite salvo com sucesso no banco de dados!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Nome do Recebedor / Estabelecimento
              </label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="Ex: Jean Carlos ou Barbearia VIP"
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-[#00BFFF]"
              />
            </div>

            {/* Banco Searchable Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Instituição Financeira
                </label>
                <span className="text-[11px] text-neutral-500">14 bancos disponíveis</span>
              </div>

              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                <input
                  type="text"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Pesquisar banco por nome ou código..."
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#00BFFF]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                {filteredBanks.map((b) => {
                  const isSelected = b.id === bankId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBankId(b.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-[#00BFFF] bg-[#00BFFF]/10 text-white font-bold'
                          : 'border-[#1E293B] bg-[#0A0E17] text-neutral-400 hover:text-white'
                      }`}
                    >
                      <BankLogoIcon bankId={b.id} className="w-6 h-6 shrink-0" />
                      <div className="text-[11px] leading-tight truncate">
                        {b.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tipo de Chave & Chave */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Tipo de Chave Pix
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mb-2.5">
                {[
                  { id: 'phone', label: 'Celular' },
                  { id: 'cpf', label: 'CPF' },
                  { id: 'cnpj', label: 'CNPJ' },
                  { id: 'email', label: 'E-mail' },
                  { id: 'random', label: 'Aleatória' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPixType(t.id as any)}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      pixType === t.id
                        ? 'bg-[#00BFFF] text-black border-[#00BFFF]'
                        : 'bg-[#0A0E17] text-neutral-400 border-[#1E293B] hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Informe sua chave Pix"
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-[#00BFFF]"
              />
            </div>

            {/* 5 Ultra Premium Biosite Themes */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                Escolha o Modelo Visual (5 Estilos 3D / Premium):
              </label>
              <div className="space-y-2">
                {ULTRA_BIOSITE_THEMES.map((th) => {
                  const isThemeSelected = normalizeTheme(theme) === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setTheme(th.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-2xl border text-left transition cursor-pointer ${
                        isThemeSelected
                          ? 'border-[#00BFFF] bg-[#00BFFF]/10 shadow-[0_0_20px_rgba(0,191,255,0.2)]'
                          : 'border-[#1E293B] bg-[#0A0E17] hover:border-neutral-700'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl border shrink-0 flex items-center justify-center font-black text-xs ${th.borderPreview}`}
                      >
                        {th.id === 'executive_card' ? (
                          <CreditCard className="w-5 h-5 text-amber-400" />
                        ) : (
                          <Sparkles className="w-5 h-5 text-[#00BFFF]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">
                            {th.title} — {th.name}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-[#00BFFF]">
                            {th.badge}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                          {th.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => handleSaveAndExport('download_html')}
              disabled={saving}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] active:scale-[0.98] text-black font-black rounded-xl transition shadow-[0_4px_25px_rgba(0,191,255,0.35)] text-sm cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>BAIXAR BIOSITE HTML (Pronto para Vercel)</span>
            </button>

            <button
              onClick={() => handleSaveAndExport('save_only')}
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-5 bg-[#0A0E17] hover:bg-[#111827] text-white font-bold rounded-xl border border-[#1E293B] transition text-sm cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#00BFFF]" />
              <span>Salvar Projeto</span>
            </button>
          </div>
        </div>

        {/* Right column: Live Smartphone Mockup */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[340px]">
            <div className="text-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Prévia Fiel no Smartphone (NFC)
              </span>
              <p className="text-[11px] text-neutral-500">
                Visualização em tempo real do arquivo HTML exportado
              </p>
            </div>

            {/* Smartphone Outer Bezel */}
            <div className="relative bg-[#0d0d0d] p-3 rounded-[42px] border-4 border-[#1E293B] shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_25px_rgba(0,191,255,0.15)]">
              {/* Dynamic Island */}
              <div className="w-24 h-4 bg-black rounded-full mx-auto mb-4 border border-neutral-900 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800" />
              </div>

              {/* Screen View reflecting the selected theme */}
              <div
                className={`rounded-[28px] p-6 text-center transition-all duration-300 min-h-[460px] flex flex-col justify-between ${
                  activeNormalizedTheme === 'white_luxury'
                    ? 'bg-[#F8FAFC] text-[#0F172A]'
                    : activeNormalizedTheme === 'glass_finance'
                    ? 'bg-[#030712] text-white border border-white/10'
                    : activeNormalizedTheme === 'cyber_pix'
                    ? 'bg-black text-white border-2 border-[#00BFFF]'
                    : activeNormalizedTheme === 'executive_card'
                    ? 'bg-gradient-to-br from-[#161C28] via-[#0B0E17] to-[#161D2B] text-white border border-white/10'
                    : 'bg-[#05080F] text-white border border-[#00BFFF]/40 shadow-[0_0_30px_rgba(0,191,255,0.2)]'
                }`}
              >
                <div>
                  {/* Model 05: Asymmetric Header with Smart EMV Chip */}
                  {activeNormalizedTheme === 'executive_card' ? (
                    <div className="flex items-center justify-between mb-4">
                      {/* Realistic Chip */}
                      <div
                        className="w-10 h-7 rounded bg-gradient-to-br from-[#ECC94B] via-[#D69E2E] to-[#975A16] border border-white/30 shadow-md relative overflow-hidden"
                        title="EMV Chip"
                      >
                        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black/30" />
                        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-black/30" />
                      </div>
                      <div className="w-12 h-12">
                        <BankLogoIcon bankId={selectedBank.id} className="w-full h-full rounded-xl" />
                      </div>
                    </div>
                  ) : (
                    /* Centered Logo for other models */
                    <div
                      className={`w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-2xl p-1 ${
                        activeNormalizedTheme === 'white_luxury'
                          ? 'bg-white shadow-md border border-slate-200'
                          : activeNormalizedTheme === 'neon_banking'
                          ? 'border border-[#00BFFF]/60 shadow-[0_0_20px_rgba(0,191,255,0.4)]'
                          : activeNormalizedTheme === 'cyber_pix'
                          ? 'border border-[#00BFFF] shadow-[0_0_15px_#00BFFF]'
                          : 'bg-white/10 backdrop-blur-md border border-white/20'
                      }`}
                    >
                      <BankLogoIcon bankId={selectedBank.id} className="w-full h-full rounded-xl" />
                    </div>
                  )}

                  {/* 2. Nome do recebedor */}
                  <h3
                    className={`font-black tracking-tight mb-1 ${
                      activeNormalizedTheme === 'executive_card'
                        ? 'text-left text-base uppercase tracking-wider'
                        : 'text-lg'
                    }`}
                  >
                    {receiverName || 'Nome do Recebedor'}
                  </h3>

                  {/* 3. Nome do banco */}
                  <p
                    className={`text-xs uppercase tracking-wider font-semibold mb-5 ${
                      activeNormalizedTheme === 'executive_card'
                        ? 'text-left text-neutral-400'
                        : activeNormalizedTheme === 'white_luxury'
                        ? 'text-[#087CFF]'
                        : 'text-[#00BFFF]'
                    }`}
                  >
                    {selectedBank.name}
                  </p>

                  {/* 4. Chave Pix */}
                  <div
                    className={`p-3 rounded-xl text-left mb-6 ${
                      activeNormalizedTheme === 'white_luxury'
                        ? 'bg-slate-100 border border-slate-200 text-slate-900'
                        : activeNormalizedTheme === 'cyber_pix'
                        ? 'bg-[#020408] border border-[#00BFFF]'
                        : 'bg-black/40 border border-white/10'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
                      Chave Pix ({pixType.toUpperCase()})
                    </div>
                    <div className="font-mono text-xs font-bold break-all">
                      {pixKey || '000.000.000-00'}
                    </div>
                  </div>
                </div>

                {/* 5. Botão COPIAR CHAVE PIX */}
                <button
                  type="button"
                  onClick={handleTestCopy}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 ${
                    copiedTest
                      ? 'bg-emerald-500 text-white'
                      : activeNormalizedTheme === 'white_luxury'
                      ? 'bg-slate-900 text-white shadow-slate-900/30'
                      : activeNormalizedTheme === 'glass_finance'
                      ? 'bg-gradient-to-r from-[#087CFF] to-[#0284C7] text-white shadow-blue-500/40'
                      : activeNormalizedTheme === 'cyber_pix'
                      ? 'bg-[#00BFFF] text-black shadow-[0_4px_0_#0080b3]'
                      : activeNormalizedTheme === 'executive_card'
                      ? 'bg-gradient-to-r from-[#2D3748] to-[#1A202C] text-white border border-white/20'
                      : 'bg-gradient-to-r from-[#00BFFF] to-[#087CFF] text-black shadow-[0_0_25px_rgba(0,191,255,0.4)]'
                  }`}
                >
                  {copiedTest ? (
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
