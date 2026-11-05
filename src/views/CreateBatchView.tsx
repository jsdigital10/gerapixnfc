import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  PlaqueBatch,
  PlaqueItem,
  PixKeyType,
  PixData,
  QrCodeMode,
} from '../types';
import { getStoredModelConfigs } from '../lib/modelsData';
import {
  generatePixPayload,
  validatePixKey,
  formatPixKey,
  parsePixPayload,
} from '../lib/pix';
import { savePlaqueBatch, logActivity } from '../lib/firebase';
import {
  generatePlaquesPdf,
  renderPlaqueCanvas,
  PdfGenerationProgress,
} from '../lib/pdfGenerator';
import {
  Layers,
  Check,
  ChevronRight,
  Download,
  Eye,
  Edit2,
  RefreshCw,
  Sparkles,
  AlertCircle,
  X,
  QrCode,
} from 'lucide-react';

interface CreateBatchViewProps {
  onSuccessNavigate?: (tab: string) => void;
}

export function CreateBatchView({ onSuccessNavigate }: CreateBatchViewProps) {
  const { currentUser } = useAuth();
  const models = getStoredModelConfigs();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Model Selection
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0].id);

  // Step 2: Quantity Selection (10, 30, 50, 100)
  const [quantity, setQuantity] = useState<10 | 30 | 50 | 100>(10);
  const [batchName, setBatchName] = useState<string>('Lote de Plaquinhas Pix #01');

  // Step 3: Base Pix Data
  const [pixType, setPixType] = useState<PixKeyType>('phone');
  const [pixKey, setPixKey] = useState<string>('11999999999');
  const [receiverName, setReceiverName] = useState<string>('LOJA EXEMPLO PRO');
  const [receiverCity, setReceiverCity] = useState<string>('SAO PAULO');
  const [amount, setAmount] = useState<string>('');
  const [txId, setTxId] = useState<string>('***');
  const [rawPayloadInput, setRawPayloadInput] = useState<string>('');
  const [qrMode, setQrMode] = useState<QrCodeMode>('dynamic_link');

  // Step 4: Generated Batch & Individual Plaques
  const [currentBatch, setCurrentBatch] = useState<PlaqueBatch | null>(null);
  const [plaquesList, setPlaquesList] = useState<PlaqueItem[]>([]);
  const [selectedPlaqueForEdit, setSelectedPlaqueForEdit] = useState<PlaqueItem | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  // Loading & Progress
  const [generating, setGenerating] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<PdfGenerationProgress | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

  const handleRawPayloadChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawPayloadInput(val);
    if (val.trim().startsWith('000201')) {
      const parsed = parsePixPayload(val);
      if (parsed) {
        if (parsed.pixKey) setPixKey(parsed.pixKey);
        if (parsed.receiverName) setReceiverName(parsed.receiverName);
        if (parsed.receiverCity) setReceiverCity(parsed.receiverCity);
        if (parsed.amount) setAmount(parsed.amount.toString());
      }
    }
  };

  const handleGenerateBatch = () => {
    setValidationError(null);

    if (pixType === 'payload') {
      if (!rawPayloadInput.trim().startsWith('000201')) {
        setValidationError('Informe um código Pix Copia e Cola válido (começa com 000201).');
        return;
      }
    } else {
      const val = validatePixKey(pixType, pixKey);
      if (!val.valid) {
        setValidationError(val.message || 'Chave Pix inválida.');
        return;
      }
    }

    if (!receiverName.trim()) {
      setValidationError('Informe o nome do recebedor.');
      return;
    }

    setGenerating(true);

    const basePix: PixData = {
      pixType,
      pixKey: pixType === 'payload' ? pixKey : formatPixKey(pixType, pixKey),
      receiverName: receiverName.trim(),
      receiverCity: receiverCity.trim() || 'BRASIL',
      amount: amount ? parseFloat(amount) : undefined,
      txId: txId.trim() || '***',
      rawPayload: pixType === 'payload' ? rawPayloadInput.trim() : undefined,
    };

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const items: PlaqueItem[] = [];
    for (let i = 1; i <= quantity; i++) {
      const numStr = `#${i.toString().padStart(3, '0')}`;
      const payload = generatePixPayload(basePix);

      const plaqueId = `plq_${batchId}_${i}`;
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gerapix.pro';
      const pointingUrl = `${origin}/p/${plaqueId}`;

      items.push({
        id: plaqueId,
        batchId,
        userId: currentUser?.uid || 'guest',
        number: numStr,
        modelId: selectedModelId,
        pixType: basePix.pixType,
        pixKey: basePix.pixKey,
        receiverName: basePix.receiverName,
        receiverCity: basePix.receiverCity,
        amount: basePix.amount,
        txId: basePix.txId,
        payload,
        qrMode,
        pointingUrl,
        createdAt: now,
        updatedAt: now,
      });
    }

    const newBatch: PlaqueBatch = {
      id: batchId,
      userId: currentUser?.uid || 'guest',
      name: batchName.trim() || `Lote Pix #${Date.now().toString().slice(-4)}`,
      modelId: selectedModelId,
      quantity,
      basePixData: basePix,
      qrMode,
      createdAt: now,
      updatedAt: now,
      plaques: items,
    };

    setCurrentBatch(newBatch);
    setPlaquesList(items);

    if (items.length > 0) {
      renderPlaqueCanvas(items[0], selectedModel).then(setPreviewDataUrl);
    }

    savePlaqueBatch(newBatch).catch((err) => {
      console.warn('Silent save notice:', err);
    });

    if (currentUser) {
      logActivity(
        'Criou Lote de Plaquinhas',
        `${newBatch.name} (${quantity} unidades, ${selectedModel.name})`,
        { uid: currentUser.uid, name: currentUser.displayName || 'Usuário' }
      );
    }

    setGenerating(false);
    setStep(4);
  };

  const handleUpdatePlaque = (updated: PlaqueItem) => {
    const newPayload = generatePixPayload({
      pixType: updated.pixType,
      pixKey: updated.pixKey,
      receiverName: updated.receiverName,
      receiverCity: updated.receiverCity,
      amount: updated.amount,
      txId: updated.txId,
    });

    const fixed: PlaqueItem = {
      ...updated,
      payload: newPayload,
      updatedAt: new Date().toISOString(),
    };

    const updatedList = plaquesList.map((p) => (p.id === fixed.id ? fixed : p));
    setPlaquesList(updatedList);

    if (currentBatch) {
      const updatedBatch: PlaqueBatch = {
        ...currentBatch,
        plaques: updatedList,
      };
      setCurrentBatch(updatedBatch);
      savePlaqueBatch(updatedBatch);
    }

    renderPlaqueCanvas(fixed, selectedModel).then(setPreviewDataUrl);
    setSelectedPlaqueForEdit(null);
  };

  const handleDownloadPdf = async () => {
    if (!currentBatch || plaquesList.length === 0) return;
    setPdfGenerating(true);

    try {
      const blob = await generatePlaquesPdf(
        plaquesList,
        selectedModel,
        currentBatch.name,
        (prog) => setPdfProgress(prog)
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GERAPIX_${currentBatch.name.replace(/[^a-zA-Z0-9]/g, '_')}_A4_10x10cm.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Erro ao gerar PDF: ${err.message}`);
    } finally {
      setPdfGenerating(false);
      setPdfProgress(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00BFFF] mb-1">
          <Layers className="w-3.5 h-3.5" />
          <span>Passo a Passo Profissional</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Criar Lote de Plaquinhas Pix
        </h1>
        <p className="text-xs md:text-sm text-neutral-400">
          Formato oficial A4 (10x10 cm, 4 por folha) com QR Code real EMV Banco Central e numeração sequencial.
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-4 gap-2 bg-[#111827] p-2 rounded-2xl border border-[#1E293B]">
        {[
          { num: 1, label: '1. Modelo' },
          { num: 2, label: '2. Quantidade' },
          { num: 3, label: '3. Dados Pix' },
          { num: 4, label: '4. Visualizar & PDF' },
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => {
              if (s.num < step || (s.num === 4 && plaquesList.length > 0)) {
                setStep(s.num as any);
              }
            }}
            disabled={s.num > step && plaquesList.length === 0}
            className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              step === s.num
                ? 'bg-gradient-to-r from-[#00BFFF] to-[#087CFF] text-black shadow-[0_2px_15px_rgba(0,191,255,0.35)]'
                : step > s.num
                ? 'bg-[#0B1120] text-white'
                : 'text-neutral-500'
            }`}
          >
            {step > s.num ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* STEP 1: CHOOSE MODEL */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Escolha um dos 5 Modelos Oficiais</h2>
            <span className="text-xs text-neutral-400">Dimensão exata 800x800 px (10x10cm)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {models.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className={`group relative bg-[#111827] border-2 rounded-2xl p-4 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#00BFFF] shadow-[0_0_30px_rgba(0,191,255,0.25)]'
                      : 'border-[#1E293B] hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#0A0E17] text-neutral-300 border border-[#1E293B]">
                      {model.category}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-black text-[#00BFFF]">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        SELECIONADO
                      </span>
                    )}
                  </div>

                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black mb-3 border border-[#1E293B]">
                    <img
                      src={model.imageUrl}
                      alt={model.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur rounded text-[10px] font-mono text-[#00BFFF]">
                      10 × 10 cm
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1">{model.name}</h3>
                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                    {model.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] active:scale-[0.98] text-black font-black rounded-xl transition shadow-[0_4px_20px_rgba(0,191,255,0.35)] cursor-pointer"
            >
              <span>Avançar para Quantidade</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CHOOSE QUANTITY */}
      {step === 2 && (
        <div className="space-y-6 max-w-2xl mx-auto">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Nome do Lote & Quantidade</h2>
            <p className="text-xs text-neutral-400">
              Escolha quantas plaquinhas serão geradas com numeração automática (#001 em diante).
            </p>
          </div>

          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 space-y-6">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                Nome do Lote (para organização)
              </label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="Ex: Balcão Restaurante Matriz"
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#00BFFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-3">
                Quantidade de Plaquinhas no Lote:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([10, 30, 50, 100] as const).map((q) => {
                  const isQSelected = quantity === q;
                  const pages = Math.ceil(q / 4);
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q)}
                      className={`p-4 rounded-xl border text-center transition cursor-pointer ${
                        isQSelected
                          ? 'border-[#00BFFF] bg-[#00BFFF]/10 shadow-[0_0_20px_rgba(0,191,255,0.25)]'
                          : 'border-[#1E293B] bg-[#0A0E17] hover:border-neutral-700'
                      }`}
                    >
                      <div className={`text-2xl font-black ${isQSelected ? 'text-[#00BFFF]' : 'text-white'}`}>
                        {q}
                      </div>
                      <div className="text-[11px] font-bold text-neutral-400 uppercase mt-0.5">
                        unidades
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-2">
                        {pages} folha{pages > 1 ? 's' : ''} A4
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-[#0A0E17] border border-[#1E293B] rounded-xl text-xs text-neutral-400 space-y-1">
              <div className="flex justify-between">
                <span>Modelo escolhido:</span>
                <strong className="text-white">{selectedModel.name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Numeração sequencial:</span>
                <span className="font-mono text-[#00BFFF]">
                  #001 até #{quantity.toString().padStart(3, '0')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Dimensões no PDF A4:</span>
                <span className="text-neutral-300">10x10 cm cada (4 por folha)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 bg-[#0A0E17] hover:bg-[#111827] text-neutral-300 text-xs font-bold rounded-xl border border-[#1E293B] cursor-pointer"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] active:scale-[0.98] text-black font-black rounded-xl transition shadow-[0_4px_20px_rgba(0,191,255,0.35)] cursor-pointer"
            >
              <span>Avançar para Dados Pix</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: INFORM PIX DATA */}
      {step === 3 && (
        <div className="space-y-6 max-w-2xl mx-auto">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Informações do Pix</h2>
            <p className="text-xs text-neutral-400">
              Estes dados serão convertidos no QR Code oficial BACEN (EMV) para todas as plaquinhas.
            </p>
          </div>

          {validationError && (
            <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-red-200 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                Tipo de Chave Pix
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { id: 'phone', label: 'Celular' },
                  { id: 'cpf', label: 'CPF' },
                  { id: 'cnpj', label: 'CNPJ' },
                  { id: 'email', label: 'E-mail' },
                  { id: 'random', label: 'Aleatória' },
                  { id: 'payload', label: 'Copia & Cola' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setPixType(t.id as any);
                      setValidationError(null);
                    }}
                    className={`py-2 px-2 text-xs font-black rounded-lg border transition cursor-pointer ${
                      pixType === t.id
                        ? 'bg-[#00BFFF] text-black border-[#00BFFF] shadow'
                        : 'bg-[#0A0E17] text-neutral-400 border-[#1E293B] hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {pixType === 'payload' ? (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Código Pix Copia e Cola Completo
                </label>
                <textarea
                  rows={3}
                  value={rawPayloadInput}
                  onChange={handleRawPayloadChange}
                  placeholder="Cole aqui o payload 000201..."
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl p-3 font-mono text-xs text-white focus:outline-none focus:border-[#00BFFF]"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Chave Pix
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Informe a chave Pix"
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-[#00BFFF]"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Nome do Recebedor (máx 25 caracteres)
                </label>
                <input
                  type="text"
                  maxLength={25}
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Ex: MERCADO CENTRAL"
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-[#00BFFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Cidade (máx 15 caracteres)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={receiverCity}
                  onChange={(e) => setReceiverCity(e.target.value)}
                  placeholder="Ex: SAO PAULO"
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-[#00BFFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Valor em R$ (Opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00 (deixe em branco para livre)"
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-[#00BFFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Identificador / TxID (Opcional)
                </label>
                <input
                  type="text"
                  maxLength={25}
                  value={txId}
                  onChange={(e) => setTxId(e.target.value)}
                  placeholder="Padrão: ***"
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-[#00BFFF]"
                />
              </div>
            </div>

            {/* Modo do QR Code */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                Modo de Operação do QR Code:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setQrMode('dynamic_link')}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    qrMode === 'dynamic_link'
                      ? 'border-[#00BFFF] bg-[#00BFFF]/10 shadow-[0_0_15px_rgba(0,191,255,0.2)]'
                      : 'border-[#1E293B] bg-[#0A0E17] text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-[#00BFFF]" />
                    <span className="text-xs font-black text-white">QR Dinâmico (Link de Apontamento)</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-tight">
                    Recomendado. Ao escanear com qualquer câmera ou app, o cliente abre o ponto Pix e copia a chave em 1 toque. Permite mudar a chave mesmo após imprimir!
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setQrMode('static_emv')}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    qrMode === 'static_emv'
                      ? 'border-[#00BFFF] bg-[#00BFFF]/10 shadow-[0_0_15px_rgba(0,191,255,0.2)]'
                      : 'border-[#1E293B] bg-[#0A0E17] text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <QrCode className="w-4 h-4 text-neutral-300" />
                    <span className="text-xs font-black text-white">QR Pix Direto (EMV Banco Central)</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-tight">
                    Payload estático oficial do BACEN. Ideal para escanear diretamente de dentro do leitor Pix do aplicativo bancário.
                  </p>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-[#0A0E17] hover:bg-[#111827] text-neutral-300 text-xs font-bold rounded-xl border border-[#1E293B] cursor-pointer"
            >
              Voltar
            </button>
            <button
              onClick={handleGenerateBatch}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] active:scale-[0.98] text-black font-black rounded-xl transition shadow-[0_4px_25px_rgba(0,191,255,0.35)] cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Gerando Plaquinhas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar Lote de {quantity} Plaquinhas</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PREVIEW, INDIVIDUAL EDITOR & PDF DOWNLOAD */}
      {step === 4 && currentBatch && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-[#1E293B] p-5 rounded-2xl">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">{currentBatch.name}</h2>
                <span className="text-xs px-2.5 py-0.5 bg-[#00BFFF]/15 text-[#00BFFF] font-bold rounded-full border border-[#00BFFF]/30">
                  {plaquesList.length} unidades
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Todas as plaquinhas estão salvas e prontas para impressão no formato A4 (10x10 cm).
              </p>
            </div>

            <button
              onClick={handleDownloadPdf}
              disabled={pdfGenerating}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] active:scale-[0.98] text-black font-black rounded-xl transition shadow-[0_4px_30px_rgba(0,191,255,0.4)] text-sm cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{pdfGenerating ? 'Gerando PDF...' : 'Baixar PDF A4 Completo'}</span>
            </button>
          </div>

          {pdfGenerating && pdfProgress && (
            <div className="bg-[#0A0E17] border border-[#00BFFF]/40 p-4 rounded-xl text-center space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-white">{pdfProgress.statusText}</span>
                <span className="text-[#00BFFF]">{pdfProgress.percent}%</span>
              </div>
              <div className="w-full bg-[#111827] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#00BFFF] h-full transition-all duration-200"
                  style={{ width: `${pdfProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-[#111827] border border-[#1E293B] rounded-2xl p-5 sticky top-20 self-start">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-3">
                Prévia Fiel da Plaquinha
              </span>

              {previewDataUrl ? (
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-black border border-[#1E293B] shadow-xl relative group">
                  <img
                    src={previewDataUrl}
                    alt="Prévia Plaquinha"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs text-white font-bold pointer-events-none">
                    Formato de Impressão 10x10cm
                  </div>
                </div>
              ) : (
                <div className="aspect-square w-full rounded-xl bg-[#0A0E17] flex items-center justify-center text-neutral-500 text-xs">
                  Renderizando prévia...
                </div>
              )}

              <div className="mt-4 p-3 bg-[#0A0E17] rounded-xl text-xs space-y-1.5 border border-[#1E293B]">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Modelo:</span>
                  <span className="text-white font-semibold">{selectedModel.name.split('—')[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Padrão QR:</span>
                  <span className="text-emerald-400 font-mono font-bold">EMV BACEN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Dimensão física:</span>
                  <span className="text-neutral-300">10 × 10 cm</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Lista de Plaquinhas do Lote</h3>
                  <p className="text-xs text-neutral-400">
                    Clique em qualquer plaquinha para visualizar ou personalizar os dados individualmente.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {plaquesList.map((plaque) => (
                  <div
                    key={plaque.id}
                    className="bg-[#0A0E17] border border-[#1E293B] hover:border-[#00BFFF]/60 rounded-xl p-3 transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-black text-xs text-[#00BFFF]">
                          {plaque.number}
                        </span>
                        <button
                          onClick={async () => {
                            const url = await renderPlaqueCanvas(plaque, selectedModel);
                            setPreviewDataUrl(url);
                          }}
                          className="p-1 text-neutral-400 hover:text-white rounded bg-[#111827] cursor-pointer"
                          title="Ver na prévia"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-xs font-bold text-white truncate">
                        {plaque.receiverName}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono truncate">
                        {plaque.pixKey}
                      </div>
                      {plaque.amount ? (
                        <div className="text-[10px] text-emerald-400 font-bold mt-1">
                          R$ {plaque.amount.toFixed(2)}
                        </div>
                      ) : null}
                    </div>

                    <button
                      onClick={() => setSelectedPlaqueForEdit(plaque)}
                      className="mt-3 w-full py-1.5 px-2 bg-[#111827] hover:bg-[#1E293B] text-neutral-200 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer border border-[#1E293B]"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Plaque Edit Modal */}
      {selectedPlaqueForEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#111827] border border-[#1E293B] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-[#00BFFF]">
                  {selectedPlaqueForEdit.number}
                </span>
                <h3 className="text-base font-bold text-white">Editar Plaquinha Individual</h3>
              </div>
              <button
                onClick={() => setSelectedPlaqueForEdit(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-[#0A0E17] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Chave Pix
                </label>
                <input
                  type="text"
                  value={selectedPlaqueForEdit.pixKey}
                  onChange={(e) =>
                    setSelectedPlaqueForEdit({
                      ...selectedPlaqueForEdit,
                      pixKey: e.target.value,
                    })
                  }
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Nome do Recebedor
                  </label>
                  <input
                    type="text"
                    maxLength={25}
                    value={selectedPlaqueForEdit.receiverName}
                    onChange={(e) =>
                      setSelectedPlaqueForEdit({
                        ...selectedPlaqueForEdit,
                        receiverName: e.target.value,
                      })
                    }
                    className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl p-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={selectedPlaqueForEdit.receiverCity}
                    onChange={(e) =>
                      setSelectedPlaqueForEdit({
                        ...selectedPlaqueForEdit,
                        receiverCity: e.target.value,
                      })
                    }
                    className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Valor em R$ (Opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={selectedPlaqueForEdit.amount || ''}
                  onChange={(e) =>
                    setSelectedPlaqueForEdit({
                      ...selectedPlaqueForEdit,
                      amount: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E293B]">
              <button
                onClick={() => setSelectedPlaqueForEdit(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUpdatePlaque(selectedPlaqueForEdit)}
                className="px-5 py-2.5 bg-[#00BFFF] text-black font-black text-xs rounded-xl shadow cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
