import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  PlaqueBatch,
  PlaqueItem,
  PixIntegrationConfig,
} from '../types';
import { getStoredModelConfigs, resolvePlaqueModel } from '../lib/modelsData';
import {
  generatePixPayload,
  parsePixPayload,
  detectPixKeyType,
} from '../lib/pix';
import {
  fetchPixIntegrationConfig,
  getDefaultPixMetadata,
  isPspDynamicConfigured,
  provisionDynamicPlaqueLocation,
  updateDynamicPlaqueDestination,
  DEFAULT_INTEGRATION_CONFIG,
} from '../lib/pixIntegration';
import { savePlaqueBatch, logActivity, peekNextBatchSerial } from '../lib/firebase';
import {
  generatePlaquesPdf,
  renderPlaqueCanvas,
  PdfGenerationProgress,
} from '../lib/pdfGenerator';
import QRCode from 'qrcode';
import {
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
  CheckCircle2,
  Hash,
  ArrowLeft,
  Clock,
  Layers,
  Info,
} from 'lucide-react';

interface CreateBatchViewProps {
  onSuccessNavigate?: (tab: string) => void;
}

function generateUniqueQrId(serial: string, index: number): string {
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `QR-${serial}-${index.toString().padStart(3, '0')}-${rand}`;
}

export function CreateBatchView({ onSuccessNavigate }: CreateBatchViewProps) {
  const { currentUser } = useAuth();
  const models = getStoredModelConfigs();

  // 3 Steps: 1. Modelo -> 2. Quantidade & Gerar -> 3. Lote Gerado & PDF
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Model Selection
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0].id);

  // Step 2: Quantity Selection (10, 30, 50, 100) — NO Pix key requested
  const [quantity, setQuantity] = useState<10 | 30 | 50 | 100>(10);
  const [batchName, setBatchName] = useState<string>('');

  const [integrationConfig, setIntegrationConfig] = useState<PixIntegrationConfig>(
    DEFAULT_INTEGRATION_CONFIG
  );

  // Numbering system with guaranteed unique monotonic serial: PIX-0001, PIX-0002...
  const [batchSerial, setBatchSerial] = useState<string>('PIX-0001');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Step 3: Generated Batch & Individual Plaques
  const [currentBatch, setCurrentBatch] = useState<PlaqueBatch | null>(null);
  const [plaquesList, setPlaquesList] = useState<PlaqueItem[]>([]);
  const [selectedPlaqueForEdit, setSelectedPlaqueForEdit] = useState<PlaqueItem | null>(null);
  const [editShowPreview, setEditShowPreview] = useState<boolean>(true);
  const [editPreviewCanvasUrl, setEditPreviewCanvasUrl] = useState<string | null>(null);
  const [editValidationError, setEditValidationError] = useState<string | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [activePreviewPlaque, setActivePreviewPlaque] = useState<PlaqueItem | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Loading & Progress
  const [generating, setGenerating] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<PdfGenerationProgress | null>(null);

  const selectedModel = resolvePlaqueModel(selectedModelId);

  useEffect(() => {
    setBatchSerial(peekNextBatchSerial());
  }, []);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchPixIntegrationConfig(currentUser.uid).then(setIntegrationConfig);
    }
  }, [currentUser?.uid]);

  const resolvePixMetadata = (keyInput: string) => {
    const defaults = getDefaultPixMetadata(integrationConfig);
    if (keyInput.trim().startsWith('000201')) {
      const parsed = parsePixPayload(keyInput);
      return {
        receiverName: parsed?.receiverName || defaults.receiverName,
        receiverCity: parsed?.receiverCity || defaults.receiverCity,
      };
    }
    return defaults;
  };

  // Live preview inside Ver / Editar modal
  useEffect(() => {
    if (!selectedPlaqueForEdit || !editShowPreview) {
      setEditPreviewCanvasUrl(null);
      return;
    }

    let active = true;
    const rawKey = (selectedPlaqueForEdit.pixKey || '').trim();
    const detected = detectPixKeyType(rawKey);
    const activeModel = resolvePlaqueModel(
      selectedPlaqueForEdit.modelId,
      selectedPlaqueForEdit.modelSnapshot,
      currentBatch?.modelSnapshot || selectedModel
    );

    let tempPlaque: PlaqueItem = { ...selectedPlaqueForEdit };
    if (rawKey && detected.isValid) {
      const cleanKey = detected.formattedKey || rawKey;
      const meta = resolvePixMetadata(cleanKey);
      const payload = generatePixPayload({
        pixType: detected.type,
        pixKey: cleanKey,
        receiverName: selectedPlaqueForEdit.receiverName || meta.receiverName,
        receiverCity: selectedPlaqueForEdit.receiverCity || meta.receiverCity,
        txId: selectedPlaqueForEdit.txId || '***',
        rawPayload: detected.type === 'payload' ? cleanKey : undefined,
      });
      tempPlaque = {
        ...tempPlaque,
        pixStatus: 'linked',
        pixType: detected.type,
        pixKey: cleanKey,
        payload,
      };
    }

    renderPlaqueCanvas(tempPlaque, activeModel)
      .then((url) => {
        if (active) setEditPreviewCanvasUrl(url);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [selectedPlaqueForEdit?.pixKey, selectedPlaqueForEdit?.modelId, editShowPreview]);

  const handleDownloadStandaloneQrPng = async (plaque: PlaqueItem) => {
    const cleanKey = (plaque.pixKey || '').trim();
    const payload = (plaque.payload || '').trim();
    let qrString = payload;

    if (!qrString.startsWith('000201') && cleanKey) {
      const detected = detectPixKeyType(cleanKey);
      const meta = resolvePixMetadata(cleanKey);
      qrString = generatePixPayload({
        pixType: detected.type,
        pixKey: detected.formattedKey || cleanKey,
        receiverName: plaque.receiverName || meta.receiverName,
        receiverCity: plaque.receiverCity || meta.receiverCity,
        txId: plaque.txId || '***',
      });
    }

    if (!qrString) {
      qrString = `GERAPIX:${plaque.permanentId || plaque.number}:${plaque.qrId || plaque.id}`;
    }

    const dataUrl = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 1024,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `QR_${(plaque.permanentId || plaque.number).replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /**
   * Generates batch WITHOUT requiring a Pix key up front.
   * Preserves exact modelSnapshot + unique permanentId + unique qrId on every plaque.
   */
  const handleGenerateBatch = async () => {
    setGenerating(true);

    const { getNextBatchSerial } = await import('../lib/firebase');
    const finalSerial = await getNextBatchSerial();
    setBatchSerial(finalSerial);

    const batchId = `batch_${finalSerial.toLowerCase()}_${Date.now()}`;
    const now = new Date().toISOString();
    const defaults = getDefaultPixMetadata(integrationConfig);
    const pspActive = isPspDynamicConfigured(integrationConfig);
    const modelSnapshot = { ...selectedModel };

    const items: PlaqueItem[] = [];
    for (let i = 1; i <= quantity; i++) {
      const numStr = `${finalSerial}-${i.toString().padStart(3, '0')}`;
      const plaqueId = `plq_${finalSerial.toLowerCase()}_${i.toString().padStart(3, '0')}`;
      const qrId = generateUniqueQrId(finalSerial, i);

      let payload = '';
      let pspLocationUrl: string | undefined = undefined;
      let pspSyncStatus: PlaqueItem['pspSyncStatus'] = 'pending_psp';

      // Only call real PSP API if user actually configured a dynamic PSP endpoint
      if (pspActive) {
        const prov = await provisionDynamicPlaqueLocation(
          { id: plaqueId, permanentId: numStr, qrId, number: numStr },
          integrationConfig
        );
        pspSyncStatus = prov.pspSyncStatus;
        if (prov.dynamicPayload) {
          payload = prov.dynamicPayload;
          pspLocationUrl = prov.pspLocationUrl;
        }
      }

      items.push({
        id: plaqueId,
        permanentId: numStr,
        qrId,
        batchId,
        userId: currentUser?.uid || 'guest',
        number: numStr,
        modelId: modelSnapshot.id,
        pixStatus: 'unlinked',
        pspSyncStatus,
        ...(pspLocationUrl ? { pspLocationUrl } : {}),
        pixType: 'random',
        pixKey: '',
        receiverName: defaults.receiverName,
        receiverCity: defaults.receiverCity,
        txId: '***',
        payload,
        qrMode: pspLocationUrl ? 'dynamic_link' : 'static_emv',
        history: [
          {
            pixKey: '',
            updatedAt: now,
            note: pspLocationUrl
              ? 'Plaquinha gerada com location dinâmica do PSP (aguardando vínculo de chave)'
              : 'Plaquinha gerada sem chave Pix (aguardando venda e vinculação)',
            status: pspLocationUrl ? 'synced_psp' : 'updated',
          },
        ],
        createdAt: now,
        updatedAt: now,
      });
    }

    const defaultBatchTitle = batchName.trim()
      ? `${batchName.trim()} (${finalSerial})`
      : `Lote ${finalSerial} — ${modelSnapshot.name.split('—')[0].trim()}`;

    const newBatch: PlaqueBatch = {
      id: batchId,
      userId: currentUser?.uid || 'guest',
      name: defaultBatchTitle,
      modelId: modelSnapshot.id,
      modelSnapshot,
      quantity,
      qrMode: pspActive ? 'dynamic_link' : 'static_emv',
      createdAt: now,
      updatedAt: now,
      plaques: items,
    };

    setCurrentBatch(newBatch);
    setPlaquesList(items);

    if (items.length > 0) {
      setActivePreviewPlaque(items[0]);
      renderPlaqueCanvas(items[0], modelSnapshot).then(setPreviewDataUrl);
    }

    try {
      await savePlaqueBatch(newBatch);
      setSaveSuccessMessage(
        `Lote ${finalSerial} (${quantity} unidades — ${modelSnapshot.name}) salvo em Meus Lotes!`
      );
      setTimeout(() => setSaveSuccessMessage(null), 5000);
    } catch (err) {
      console.warn('Silent save notice:', err);
    }

    if (currentUser) {
      logActivity(
        'Criou Lote de Plaquinhas Pix',
        `${newBatch.name} (${quantity} unidades, ${modelSnapshot.name})`,
        { uid: currentUser.uid, name: currentUser.displayName || 'Usuário' }
      );
    }

    setGenerating(false);
    setStep(3);
  };

  /**
   * Links or updates a buyer's Pix key inside a plaque after batch generation
   */
  const handleUpdatePlaque = async (updated: PlaqueItem) => {
    setEditValidationError(null);
    const detected = detectPixKeyType(updated.pixKey);
    if (!detected.isValid) {
      setEditValidationError(detected.message || 'Digite uma chave Pix válida.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const cleanKey = detected.formattedKey || updated.pixKey.trim();
      const meta = resolvePixMetadata(cleanKey);

      const dynamicResult = await updateDynamicPlaqueDestination(
        updated,
        cleanKey,
        integrationConfig
      );

      const newPayload = generatePixPayload({
        pixType: detected.type,
        pixKey: cleanKey,
        receiverName: updated.receiverName || meta.receiverName,
        receiverCity: updated.receiverCity || meta.receiverCity,
        txId: updated.txId || '***',
        rawPayload: detected.type === 'payload' ? cleanKey : undefined,
      });

      const now = new Date().toISOString();
      const fixed: PlaqueItem = {
        ...updated,
        permanentId: updated.permanentId || updated.number,
        qrId: updated.qrId || `QR-${updated.permanentId || updated.number}`,
        pixStatus: 'linked',
        pspSyncStatus: dynamicResult.dynamicUpdated
          ? 'synced_psp'
          : dynamicResult.pspConfigured
          ? 'error'
          : 'pending_psp',
        pixType: detected.type,
        pixKey: cleanKey,
        receiverName: updated.receiverName || meta.receiverName,
        receiverCity: updated.receiverCity || meta.receiverCity,
        payload: newPayload,
        qrMode: dynamicResult.dynamicUpdated ? 'dynamic_link' : 'static_emv',
        history: [...(updated.history || []), dynamicResult.historyEntry],
        updatedAt: now,
      };

      const updatedList = plaquesList.map((p) => (p.id === fixed.id ? fixed : p));
      setPlaquesList(updatedList);

      const targetModel = resolvePlaqueModel(
        fixed.modelId,
        fixed.modelSnapshot,
        currentBatch?.modelSnapshot || selectedModel
      );

      if (currentBatch) {
        const updatedBatch: PlaqueBatch = {
          ...currentBatch,
          plaques: updatedList,
          updatedAt: now,
        };
        setCurrentBatch(updatedBatch);
        await savePlaqueBatch(updatedBatch);
      }

      setActivePreviewPlaque(fixed);
      renderPlaqueCanvas(fixed, targetModel).then(setPreviewDataUrl);
      setSaveSuccessMessage(dynamicResult.message);
      setTimeout(() => setSaveSuccessMessage(null), 5000);
      setSelectedPlaqueForEdit(null);
      setEditShowPreview(true);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!currentBatch || plaquesList.length === 0) return;
    setPdfGenerating(true);

    try {
      const batchModel = resolvePlaqueModel(currentBatch.modelId, currentBatch.modelSnapshot, selectedModel);
      const blob = await generatePlaquesPdf(
        plaquesList,
        batchModel,
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

  const batchResolvedModel = currentBatch
    ? resolvePlaqueModel(currentBatch.modelId, currentBatch.modelSnapshot, selectedModel)
    : selectedModel;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Criar Lote de Plaquinhas Pix
        </h1>
        <p className="text-xs md:text-sm text-neutral-400 mt-1">
          Escolha o modelo e a quantidade para gerar o lote na hora. Você cadastra a chave Pix do cliente depois da venda em Meus Lotes.
        </p>
      </div>

      {/* 3-Step Stepper */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-[#111827] p-1.5 sm:p-2 rounded-2xl border border-[#1E293B]">
        {[
          { num: 1, label: '1. Modelo' },
          { num: 2, label: '2. Quantidade & Gerar' },
          { num: 3, label: '3. Lote & PDF' },
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => {
              if (s.num < step || (s.num === 3 && plaquesList.length > 0)) {
                setStep(s.num as any);
              }
            }}
            disabled={s.num > step && plaquesList.length === 0}
            className={`py-2 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              step === s.num
                ? 'bg-gradient-to-r from-[#00BFFF] to-[#087CFF] text-black shadow-[0_2px_15px_rgba(0,191,255,0.35)]'
                : step > s.num
                ? 'bg-[#0B1120] text-white'
                : 'text-neutral-500'
            }`}
          >
            {step > s.num ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : null}
            <span className="truncate">{s.label}</span>
          </button>
        ))}
      </div>

      {/* STEP 1: CHOOSE MODEL */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Selecione o Modelo da Plaquinha</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {models.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className={`group relative bg-[#111827] border-2 rounded-2xl p-4 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#00BFFF] shadow-[0_0_25px_rgba(0,191,255,0.25)]'
                      : 'border-[#1E293B] hover:border-neutral-700'
                  }`}
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black mb-3 border border-[#1E293B]">
                    <img
                      src={model.imageUrl}
                      alt={model.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-white truncate">{model.name}</h3>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-[#00BFFF] shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ATIVO
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] active:scale-[0.98] text-black font-black rounded-xl transition shadow-[0_4px_20px_rgba(0,191,255,0.35)] cursor-pointer"
            >
              <span>Avançar</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CHOOSE QUANTITY & GENERATE DIRECTLY WITHOUT PIX KEY */}
      {step === 2 && (
        <div className="space-y-6 max-w-2xl mx-auto">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Quantidade & Geração do Lote</h2>
            <p className="text-xs text-neutral-400">
              Escolha a quantidade desejada e gere as plaquinhas com numeração e QR exclusivo. Nenhuma chave Pix é necessária agora.
            </p>
          </div>

          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 space-y-6">
            {/* Selected Model Visual Confirmation */}
            <div className="flex items-center gap-4 p-3.5 bg-[#0A0E17] border border-[#1E293B] rounded-xl">
              <img
                src={selectedModel.imageUrl}
                alt={selectedModel.name}
                className="w-16 h-16 rounded-xl object-cover border border-[#1E293B] bg-black shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#00BFFF] block">
                  Modelo Selecionado
                </span>
                <div className="text-sm font-black text-white truncate">{selectedModel.name}</div>
                <div className="text-[11px] text-neutral-400 truncate">{selectedModel.description}</div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-1.5 text-[11px] font-bold text-[#00BFFF] bg-[#111827] hover:bg-[#1E293B] rounded-lg border border-[#1E293B] cursor-pointer shrink-0"
              >
                Trocar
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                Nome do Lote (Opcional)
              </label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder={`Ex: Estoque ${selectedModel.name.split('—')[0].trim()}`}
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#00BFFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-3">
                Quantidade de Plaquinhas:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([10, 30, 50, 100] as const).map((q) => {
                  const isQSelected = quantity === q;
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
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-[#0A0E17] border border-[#1E293B] rounded-xl text-xs text-neutral-400 space-y-2">
              <div className="flex justify-between">
                <span>Numeração exclusiva:</span>
                <span className="font-mono text-[#00BFFF] font-bold">
                  {batchSerial}-001 até {batchSerial}-{quantity.toString().padStart(3, '0')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chave Pix inicial:</span>
                <span className="text-amber-400 font-bold">Não solicitada (vincular pós-venda)</span>
              </div>
              <div className="flex justify-between">
                <span>Integração PSP Dinâmica:</span>
                <span className={isPspDynamicConfigured(integrationConfig) ? 'text-emerald-400 font-bold' : 'text-neutral-300 font-semibold'}>
                  {isPspDynamicConfigured(integrationConfig) ? 'Conectada' : 'Pendente (vincule em Minha Conta)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(1)}
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
                  <span>Gerando Lote...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar lote ({quantity} unidades)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: GENERATED BATCH, LINKING AFTER SALE & PDF DOWNLOAD */}
      {step === 3 && currentBatch && (
        <div className="space-y-6">
          {saveSuccessMessage && (
            <div className="flex items-center gap-2.5 p-3.5 bg-emerald-950/80 border border-emerald-500/60 rounded-2xl text-emerald-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {!isPspDynamicConfigured(integrationConfig) && (
            <div className="flex items-start gap-2.5 p-3.5 bg-[#0A0E17] border border-amber-500/40 rounded-2xl text-amber-200/90 text-xs">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300">Lote salvo para vinculação pós-venda:</strong>{' '}
                Cada plaquinha recebeu um identificador permanente e QR exclusivo. Quando vender, acesse{' '}
                <strong>Meus Lotes → Ver / Editar</strong> para vincular a chave Pix do comprador.
                Para alterar o destino bancário de placas já impressas sem reimprimir o QR físico, conecte uma integração Pix dinâmica (PSP) em Minha Conta.
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-[#1E293B] p-5 rounded-2xl">
            <div className="flex items-center gap-3.5">
              <img
                src={batchResolvedModel.imageUrl}
                alt={batchResolvedModel.name}
                className="w-12 h-12 rounded-xl object-cover border border-[#1E293B] bg-black shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-white">{currentBatch.name}</h2>
                  <span className="text-xs px-2.5 py-0.5 bg-[#00BFFF]/15 text-[#00BFFF] font-bold rounded-full border border-[#00BFFF]/30">
                    {plaquesList.length} unidades
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {batchResolvedModel.name} • Salvo em Meus Lotes
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onSuccessNavigate && (
                <button
                  type="button"
                  onClick={() => onSuccessNavigate('my-batches')}
                  className="px-4 py-3 bg-[#0A0E17] hover:bg-[#1E293B] text-white border border-[#1E293B] font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-[#00BFFF]" />
                  <span>Abrir Meus Lotes</span>
                </button>
              )}

              <button
                onClick={handleDownloadPdf}
                disabled={pdfGenerating}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] active:scale-[0.98] text-black font-black rounded-xl transition shadow-[0_4px_30px_rgba(0,191,255,0.4)] text-sm cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{pdfGenerating ? 'Gerando PDF...' : 'Baixar PDF A4'}</span>
              </button>
            </div>
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
            <div className="lg:col-span-1 bg-[#111827] border border-[#1E293B] rounded-2xl p-5 lg:sticky lg:top-20 self-start space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400">
                  Prévia {activePreviewPlaque ? `(${activePreviewPlaque.number})` : ''}
                </span>
                {activePreviewPlaque && (
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      activePreviewPlaque.pixStatus === 'linked' && activePreviewPlaque.pixKey
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {activePreviewPlaque.pixStatus === 'linked' && activePreviewPlaque.pixKey
                      ? 'Chave vinculada'
                      : 'Sem chave Pix'}
                  </span>
                )}
              </div>

              {previewDataUrl ? (
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-black border border-[#1E293B] shadow-xl">
                  <img
                    src={previewDataUrl}
                    alt="Prévia Plaquinha"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square w-full rounded-xl bg-[#0A0E17] flex items-center justify-center text-neutral-500 text-xs">
                  Renderizando prévia...
                </div>
              )}

              {activePreviewPlaque && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadStandaloneQrPng(activePreviewPlaque)}
                    className="py-2 px-3 bg-[#0A0E17] hover:bg-[#1E293B] text-white border border-[#1E293B] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#00BFFF]" />
                    <span>Baixar QR</span>
                  </button>
                  {previewDataUrl && (
                    <a
                      href={previewDataUrl}
                      download={`PLAQUINHA_${activePreviewPlaque.number}.jpg`}
                      className="py-2 px-3 bg-[#0A0E17] hover:bg-[#1E293B] text-white border border-[#1E293B] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#00BFFF]" />
                      <span>Baixar Arte</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Plaquinhas Geradas</h3>
                <p className="text-xs text-neutral-400">
                  Clique em Ver / Editar para vincular ou alterar a chave Pix do cliente em qualquer unidade.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {plaquesList.map((plaque) => {
                  const isLinked = plaque.pixStatus === 'linked' && Boolean(plaque.pixKey);
                  return (
                    <div
                      key={plaque.id}
                      onClick={async () => {
                        setActivePreviewPlaque(plaque);
                        const url = await renderPlaqueCanvas(plaque, batchResolvedModel);
                        setPreviewDataUrl(url);
                      }}
                      className="bg-[#0A0E17] border border-[#1E293B] hover:border-[#00BFFF]/60 rounded-xl p-3 transition flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono font-black text-xs text-[#00BFFF]">
                            {plaque.permanentId || plaque.number}
                          </span>
                          <Eye className="w-3 h-3 text-neutral-400" />
                        </div>

                        {isLinked ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Vinculada
                            </span>
                            <div className="text-[11px] text-white font-mono truncate">
                              {plaque.pixKey}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">
                              <Clock className="w-2.5 h-2.5" />
                              Sem chave Pix
                            </span>
                            <div className="text-[10px] text-neutral-500 font-mono truncate">
                              {plaque.qrId}
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlaqueForEdit(plaque);
                          setEditShowPreview(true);
                          setEditValidationError(null);
                        }}
                        className="mt-3 w-full py-1.5 px-2 bg-[#111827] hover:bg-[#1E293B] text-neutral-200 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer border border-[#1E293B]"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Ver / Editar</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VER / EDITAR PLAQUE MODAL */}
      {selectedPlaqueForEdit && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#111827] border border-[#1E293B] rounded-3xl p-6 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div>
                <span className="font-mono text-sm font-black text-[#00BFFF] block">
                  {selectedPlaqueForEdit.permanentId || selectedPlaqueForEdit.number}
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  {selectedPlaqueForEdit.qrId}
                </span>
              </div>
              <button
                onClick={() => setSelectedPlaqueForEdit(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-[#0A0E17] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editShowPreview && editPreviewCanvasUrl && (
              <div className="bg-[#0A0E17] border border-[#1E293B] rounded-2xl p-3">
                <img
                  src={editPreviewCanvasUrl}
                  alt="Prévia da Plaquinha"
                  className="w-full aspect-square rounded-xl object-cover"
                />
              </div>
            )}

            {editValidationError && (
              <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{editValidationError}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-neutral-200">
                  Chave Pix do Comprador
                </label>
                {selectedPlaqueForEdit.pixKey.trim() && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      detectPixKeyType(selectedPlaqueForEdit.pixKey).isValid
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {detectPixKeyType(selectedPlaqueForEdit.pixKey).label}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={selectedPlaqueForEdit.pixKey}
                onChange={(e) => {
                  setSelectedPlaqueForEdit({
                    ...selectedPlaqueForEdit,
                    pixKey: e.target.value,
                  });
                  setEditValidationError(null);
                }}
                placeholder="CPF, CNPJ, Celular, E-mail ou Chave Aleatória"
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#00BFFF]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => handleUpdatePlaque(selectedPlaqueForEdit)}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] text-black font-black text-xs rounded-xl shadow cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
                <span>Salvar alteração</span>
              </button>

              <button
                type="button"
                onClick={() => setEditShowPreview(!editShowPreview)}
                className="py-2.5 px-4 bg-[#0A0E17] hover:bg-[#1E293B] text-white border border-[#1E293B] font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-[#00BFFF]" />
                <span>{editShowPreview ? 'Ocultar Prévia' : 'Visualizar QR Code'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlaqueForEdit(null)}
                className="py-2.5 px-4 bg-[#0A0E17] hover:bg-[#1E293B] text-neutral-300 border border-[#1E293B] font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
