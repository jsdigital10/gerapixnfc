import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BiositeItem, BiositeTheme, BiositeCustomButton } from '../types';
import { BRAZILIAN_BANKS, BankLogoIcon } from '../lib/bankLogos';
import {
  generateBiositeHtml,
  normalizeTheme,
  getBiositePublicUrl,
} from '../lib/biositeHtmlGenerator';
import { saveBiosite, logActivity } from '../lib/firebase';
import { detectPixKeyType } from '../lib/pix';
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
  ShieldCheck,
  Upload,
  Trash2,
  Plus,
  Link as LinkIcon,
  ExternalLink,
  MessageCircle,
  Instagram,
} from 'lucide-react';

const ULTRA_BIOSITE_THEMES: {
  id: BiositeTheme;
  title: string;
  name: string;
  badge: string;
  borderPreview: string;
}[] = [
  {
    id: 'neon_banking',
    title: 'Modelo 01',
    name: 'Neon Banking',
    badge: '3D Glow',
    borderPreview: 'border-[#00BFFF] bg-[#05080F]',
  },
  {
    id: 'white_luxury',
    title: 'Modelo 02',
    name: 'White Luxury',
    badge: 'Clean Luxe',
    borderPreview: 'border-slate-300 bg-white text-slate-900',
  },
  {
    id: 'glass_finance',
    title: 'Modelo 03',
    name: 'Glass Finance',
    badge: 'Glass',
    borderPreview: 'border-blue-400/40 bg-blue-950/40 backdrop-blur-md',
  },
  {
    id: 'cyber_pix',
    title: 'Modelo 04',
    name: 'Cyber Pix',
    badge: 'Cyber',
    borderPreview: 'border-[#00BFFF] bg-black',
  },
  {
    id: 'executive_card',
    title: 'Modelo 05',
    name: 'Executive Card',
    badge: 'Metal',
    borderPreview: 'border-amber-500/40 bg-gradient-to-br from-[#1A202C] to-[#0B0E17]',
  },
];

const ACCENT_PRESETS = ['#00BFFF', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#FFFFFF'];

interface CreateBiositeViewProps {
  onSuccessNavigate?: (tab: string) => void;
  editingBiosite?: BiositeItem | null;
  onFinishEditing?: () => void;
}

export function CreateBiositeView({
  onSuccessNavigate,
  editingBiosite,
  onFinishEditing,
}: CreateBiositeViewProps) {
  const { currentUser } = useAuth();

  const [businessName, setBusinessName] = useState(
    editingBiosite?.businessName || editingBiosite?.receiverName || ''
  );
  const [description, setDescription] = useState(editingBiosite?.description || '');
  const [logoUrl, setLogoUrl] = useState(editingBiosite?.logoUrl || '');
  const [bankId, setBankId] = useState(editingBiosite?.bank || 'nubank');
  const [pixKey, setPixKey] = useState(editingBiosite?.pixKey || '');
  const [whatsapp, setWhatsapp] = useState(editingBiosite?.whatsapp || '');
  const [instagram, setInstagram] = useState(editingBiosite?.instagram || '');
  const [accentColor, setAccentColor] = useState(editingBiosite?.accentColor || '#00BFFF');
  const [theme, setTheme] = useState<BiositeTheme>(editingBiosite?.theme || 'neon_banking');
  const [customButtons, setCustomButtons] = useState<BiositeCustomButton[]>(
    editingBiosite?.customButtons || []
  );

  const [savedBiositeId, setSavedBiositeId] = useState<string | null>(editingBiosite?.id || null);
  const [bankSearch, setBankSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTest, setCopiedTest] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (editingBiosite) {
      setBusinessName(editingBiosite.businessName || editingBiosite.receiverName || '');
      setDescription(editingBiosite.description || '');
      setLogoUrl(editingBiosite.logoUrl || '');
      setBankId(editingBiosite.bank || 'nubank');
      setPixKey(editingBiosite.pixKey || '');
      setWhatsapp(editingBiosite.whatsapp || '');
      setInstagram(editingBiosite.instagram || '');
      setAccentColor(editingBiosite.accentColor || '#00BFFF');
      setTheme(editingBiosite.theme || 'neon_banking');
      setCustomButtons(editingBiosite.customButtons || []);
      setSavedBiositeId(editingBiosite.id);
    }
  }, [editingBiosite]);

  const detectedKeyInfo = useMemo(() => detectPixKeyType(pixKey), [pixKey]);

  const filteredBanks = BRAZILIAN_BANKS.filter(
    (b) =>
      b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
      b.code.includes(bankSearch)
  );

  const selectedBank = BRAZILIAN_BANKS.find((b) => b.id === bankId) || BRAZILIAN_BANKS[0];
  const activeNormalizedTheme = normalizeTheme(theme);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 256;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setLogoUrl(canvas.toDataURL('image/jpeg', 0.85));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddButton = () => {
    if (customButtons.length >= 6) return;
    setCustomButtons([...customButtons, { label: '', url: '' }]);
  };

  const handleUpdateButton = (idx: number, field: 'label' | 'url', val: string) => {
    setCustomButtons(
      customButtons.map((btn, i) => (i === idx ? { ...btn, [field]: val } : btn))
    );
  };

  const handleRemoveButton = (idx: number) => {
    setCustomButtons(customButtons.filter((_, i) => i !== idx));
  };

  const handleTestCopy = () => {
    if (navigator.clipboard && pixKey.trim()) {
      navigator.clipboard.writeText(pixKey.trim());
      setCopiedTest(true);
      setTimeout(() => setCopiedTest(false), 2000);
    }
  };

  const handleCopyPublicUrl = (id: string) => {
    const url = getBiositePublicUrl(id);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSaveAndExport = async (mode: 'save_only' | 'download_html') => {
    setValidationError(null);

    if (!businessName.trim()) {
      setValidationError('Informe o nome do negócio ou recebedor.');
      return;
    }

    const detected = detectPixKeyType(pixKey);
    if (!detected.isValid) {
      setValidationError(detected.message || 'Informe uma chave Pix válida.');
      return;
    }

    setSaving(true);
    const biositeId =
      editingBiosite?.id ||
      savedBiositeId ||
      `bio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const cleanKey = detected.formattedKey || pixKey.trim();

    const biosite: BiositeItem = {
      id: biositeId,
      userId: currentUser?.uid || 'guest',
      receiverName: businessName.trim(),
      businessName: businessName.trim(),
      description: description.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
      bank: bankId,
      pixType: detected.type,
      pixKey: cleanKey,
      whatsapp: whatsapp.trim() || undefined,
      instagram: instagram.trim() || undefined,
      accentColor,
      customButtons: customButtons.filter((b) => b.label.trim() && b.url.trim()),
      theme,
      createdAt: editingBiosite?.createdAt || now,
      updatedAt: now,
    };

    try {
      await saveBiosite(biosite);
      setSavedBiositeId(biositeId);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);

      if (currentUser) {
        logActivity(
          editingBiosite ? 'Editou Biosite NFC' : 'Criou Biosite NFC',
          `${biosite.receiverName} (${selectedBank.name})`,
          { uid: currentUser.uid, name: currentUser.displayName || 'Usuário' }
        );
      }

      if (mode === 'download_html') {
        const htmlContent = generateBiositeHtml(biosite);
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `biosite_${biosite.receiverName.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      setValidationError('Erro ao salvar biosite.');
    } finally {
      setSaving(false);
    }
  };

  const finalBiositeUrl = savedBiositeId ? getBiositePublicUrl(savedBiositeId) : null;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00BFFF] mb-1">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Módulo NFC Exclusivo</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            {editingBiosite ? 'Editar Biosite NFC' : 'Criar Biosite NFC'}
          </h1>
          <p className="text-xs md:text-sm text-neutral-400">
            Personalize sua página para gravar o link em tags NFC (aproximação).
          </p>
        </div>

        {editingBiosite && onFinishEditing && (
          <button
            type="button"
            onClick={() => {
              onFinishEditing();
              if (onSuccessNavigate) onSuccessNavigate('my-biosites');
            }}
            className="px-4 py-2 bg-[#0A0E17] hover:bg-[#1E293B] text-neutral-300 border border-[#1E293B] rounded-xl text-xs font-bold self-start cursor-pointer"
          >
            Voltar para Meus Biosites
          </button>
        )}
      </div>

      {validationError && (
        <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-red-200 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {savedSuccess && finalBiositeUrl && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-600/60 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Biosite salvo! Copie o link abaixo para gravar na tag NFC:</span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={finalBiositeUrl}
              className="flex-1 bg-black/50 border border-emerald-800/60 rounded-xl py-2 px-3 text-xs font-mono text-white"
            />
            <button
              type="button"
              onClick={() => handleCopyPublicUrl(savedBiositeId!)}
              className="px-4 py-2 bg-[#00BFFF] text-black font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link NFC'}</span>
            </button>
            <a
              href={finalBiositeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#0A0E17] text-white border border-[#1E293B] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#00BFFF]" />
              <span>Abrir</span>
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 sm:p-6 space-y-5">
            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                Logo ou Imagem do Negócio (Opcional)
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#0A0E17] border border-[#1E293B] overflow-hidden flex items-center justify-center shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <BankLogoIcon bankId={selectedBank.id} className="w-full h-full" />
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <label className="px-3.5 py-2 bg-[#0A0E17] hover:bg-[#1E293B] text-white border border-[#1E293B] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#00BFFF]" />
                    <span>Enviar Imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="px-3 py-2 bg-red-950/40 hover:bg-red-950/70 text-red-300 border border-red-900/50 rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Nome do negócio & Descrição */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Nome do Negócio / Recebedor
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ex: Barbearia VIP ou Café Central"
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-[#00BFFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Pagamento rápido via Pix e nossos canais de atendimento."
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-[#00BFFF] resize-none"
                />
              </div>
            </div>

            {/* Instituição Financeira */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Instituição Financeira
              </label>

              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                <input
                  type="text"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Pesquisar banco..."
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#00BFFF]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
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
                      <div className="text-[11px] leading-tight truncate">{b.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chave Pix */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Chave Pix
                </label>
                {pixKey.trim() && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 ${
                      detectedKeyInfo.isValid
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    {detectedKeyInfo.label}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Celular, CPF, CNPJ, E-mail ou Chave Aleatória"
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-[#00BFFF]"
              />
            </div>

            {/* WhatsApp & Instagram */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  WhatsApp (Opcional)
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-[#00BFFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Instagram (Opcional)
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="Ex: @sualoja"
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-[#00BFFF]"
                />
              </div>
            </div>

            {/* Botões personalizados */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300">
                  Botões Personalizados (Opcional)
                </label>
                <button
                  type="button"
                  onClick={handleAddButton}
                  disabled={customButtons.length >= 6}
                  className="px-3 py-1 bg-[#0A0E17] hover:bg-[#1E293B] text-[#00BFFF] border border-[#1E293B] rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar Botão</span>
                </button>
              </div>

              {customButtons.map((btn, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Texto do botão (ex: Catálogo)"
                    value={btn.label}
                    onChange={(e) => handleUpdateButton(idx, 'label', e.target.value)}
                    className="sm:w-40 bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2 px-3 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Link (https://...)"
                    value={btn.url}
                    onChange={(e) => handleUpdateButton(idx, 'url', e.target.value)}
                    className="flex-1 bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2 px-3 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveButton(idx)}
                    className="p-2 bg-[#0A0E17] hover:bg-red-950/60 text-neutral-400 hover:text-red-400 rounded-xl border border-[#1E293B] cursor-pointer self-end sm:self-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Cor de Destaque & Modelo Visual */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Cor de Destaque
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {ACCENT_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccentColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-lg border-2 cursor-pointer transition ${
                        accentColor.toLowerCase() === c.toLowerCase()
                          ? 'border-white scale-110'
                          : 'border-white/20'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    title="Cor personalizada"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Modelo Visual
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ULTRA_BIOSITE_THEMES.map((th) => {
                    const isThemeSelected = normalizeTheme(theme) === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => setTheme(th.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          isThemeSelected
                            ? 'border-[#00BFFF] bg-[#00BFFF]/10'
                            : 'border-[#1E293B] bg-[#0A0E17] hover:border-neutral-700'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg border shrink-0 flex items-center justify-center ${th.borderPreview}`}
                        >
                          {th.id === 'executive_card' ? (
                            <CreditCard className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-[#00BFFF]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{th.name}</div>
                          <div className="text-[10px] text-[#00BFFF]">{th.badge}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => handleSaveAndExport('save_only')}
              disabled={saving}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] active:scale-[0.98] text-black font-black rounded-xl transition shadow-[0_4px_25px_rgba(0,191,255,0.35)] text-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{editingBiosite ? 'Salvar Alterações do Biosite' : 'Gerar & Salvar Biosite NFC'}</span>
            </button>

            <button
              onClick={() => handleSaveAndExport('download_html')}
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-5 bg-[#0A0E17] hover:bg-[#111827] text-white font-bold rounded-xl border border-[#1E293B] transition text-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#00BFFF]" />
              <span>Baixar HTML</span>
            </button>
          </div>
        </div>

        {/* Right column: Live Smartphone Mockup */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[340px]">
            <div className="text-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Prévia no Smartphone (NFC)
              </span>
            </div>

            <div className="relative bg-[#0d0d0d] p-3 rounded-[42px] border-4 border-[#1E293B] shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
              <div className="w-24 h-4 bg-black rounded-full mx-auto mb-4 border border-neutral-900" />

              <div
                style={{
                  borderColor:
                    activeNormalizedTheme === 'cyber_pix' || activeNormalizedTheme === 'neon_banking'
                      ? `${accentColor}88`
                      : undefined,
                }}
                className={`rounded-[28px] p-5 text-center transition-all duration-300 min-h-[460px] flex flex-col justify-between ${
                  activeNormalizedTheme === 'white_luxury'
                    ? 'bg-[#F8FAFC] text-[#0F172A]'
                    : activeNormalizedTheme === 'glass_finance'
                    ? 'bg-[#030712] text-white border border-white/10'
                    : activeNormalizedTheme === 'cyber_pix'
                    ? 'bg-black text-white border-2'
                    : activeNormalizedTheme === 'executive_card'
                    ? 'bg-gradient-to-br from-[#161C28] via-[#0B0E17] to-[#161D2B] text-white border border-white/10'
                    : 'bg-[#05080F] text-white border'
                }`}
              >
                <div>
                  <div
                    style={{ borderColor: `${accentColor}66` }}
                    className="w-16 h-16 mx-auto mb-3 rounded-2xl overflow-hidden border-2 flex items-center justify-center bg-black/20"
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <BankLogoIcon bankId={selectedBank.id} className="w-full h-full rounded-xl" />
                    )}
                  </div>

                  <h3 className="font-black text-base tracking-tight mb-1">
                    {businessName || 'Nome do Negócio'}
                  </h3>

                  {description && (
                    <p
                      className={`text-[11px] leading-snug mb-2 ${
                        activeNormalizedTheme === 'white_luxury' ? 'text-slate-600' : 'text-neutral-400'
                      }`}
                    >
                      {description}
                    </p>
                  )}

                  <p
                    style={{ color: accentColor }}
                    className="text-[11px] uppercase tracking-wider font-bold mb-4"
                  >
                    {selectedBank.name}
                  </p>

                  <div
                    className={`p-3 rounded-xl text-left mb-3 ${
                      activeNormalizedTheme === 'white_luxury'
                        ? 'bg-slate-100 border border-slate-200 text-slate-900'
                        : 'bg-black/40 border border-white/10'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase opacity-60 mb-0.5">
                      Chave Pix
                    </div>
                    <div className="font-mono text-xs font-bold break-all">
                      {pixKey || 'Informe sua chave Pix'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestCopy}
                    style={copiedTest ? undefined : { backgroundColor: accentColor, color: '#05080F' }}
                    className={`w-full py-3 px-4 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                      copiedTest ? 'bg-emerald-500 text-white' : ''
                    }`}
                  >
                    {copiedTest ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedTest ? 'CHAVE COPIADA!' : 'COPIAR CHAVE PIX'}</span>
                  </button>

                  {(whatsapp.trim() || instagram.trim()) && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {whatsapp.trim() && (
                        <div className="py-2 px-2 rounded-xl bg-[#16A34A] text-white text-[11px] font-bold flex items-center justify-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </div>
                      )}
                      {instagram.trim() && (
                        <div className="py-2 px-2 rounded-xl bg-gradient-to-r from-[#F58529] to-[#DD2A7B] text-white text-[11px] font-bold flex items-center justify-center gap-1">
                          <Instagram className="w-3.5 h-3.5" />
                          <span>Instagram</span>
                        </div>
                      )}
                    </div>
                  )}

                  {customButtons.filter((b) => b.label.trim()).length > 0 && (
                    <div className="space-y-1.5 mt-2.5">
                      {customButtons
                        .filter((b) => b.label.trim())
                        .map((b, i) => (
                          <div
                            key={i}
                            className={`py-2 px-3 rounded-xl text-[11px] font-bold border ${
                              activeNormalizedTheme === 'white_luxury'
                                ? 'bg-slate-100 border-slate-300 text-slate-900'
                                : 'bg-white/5 border-white/15 text-white'
                            }`}
                          >
                            {b.label}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {finalBiositeUrl && (
                  <div className="mt-4 pt-3 border-t border-white/10 text-[10px] font-mono opacity-70 truncate flex items-center justify-center gap-1">
                    <LinkIcon className="w-3 h-3 shrink-0" />
                    <span className="truncate">{finalBiositeUrl}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
