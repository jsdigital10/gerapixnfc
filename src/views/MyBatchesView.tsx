import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PlaqueBatch, PlaqueItem, PixIntegrationConfig } from '../types';
import { fetchUserBatches, deletePlaqueBatch, savePlaqueBatch, logActivity } from '../lib/firebase';
import { getStoredModelConfigs, resolvePlaqueModel } from '../lib/modelsData';
import { generatePlaquesPdf, renderPlaqueCanvas, PdfGenerationProgress } from '../lib/pdfGenerator';
import { generatePixPayload, detectPixKeyType } from '../lib/pix';
import {
  fetchPixIntegrationConfig,
  isPspDynamicConfigured,
  updateDynamicPlaqueDestination,
  getDefaultPixMetadata,
  DEFAULT_INTEGRATION_CONFIG,
} from '../lib/pixIntegration';
import QRCode from 'qrcode';
import {
  Calendar,
  Layers,
  Download,
  Trash2,
  Eye,
  Edit,
  X,
  RefreshCw,
  PlusCircle,
  Palette,
  Check,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowLeft,
  Clock,
  Info,
  History,
} from 'lucide-react';

interface MyBatchesViewProps {
  onNavigate: (tab: any) => void;
  initialSelectedBatch?: PlaqueBatch | null;
  onClearInitialBatch?: () => void;
}

export function MyBatchesView({
  onNavigate,
  initialSelectedBatch,
  onClearInitialBatch,
}: MyBatchesViewProps) {
  const { currentUser } = useAuth();
  const models = getStoredModelConfigs();

  const [batches, setBatches] = useState<PlaqueBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<PlaqueBatch | null>(initialSelectedBatch || null);
  const [integrationConfig, setIntegrationConfig] = useState<PixIntegrationConfig>(
    DEFAULT_INTEGRATION_CONFIG
  );

  // Ver / Editar Plaque State
  const [editingPlaque, setEditingPlaque] = useState<PlaqueItem | null>(null);
  const [showQrPreviewInEdit, setShowQrPreviewInEdit] = useState<boolean>(true);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [activePreviewPlaque, setActivePreviewPlaque] = useState<PlaqueItem | null>(null);
  const [showModelPicker, setShowModelPicker] = useState<boolean>(false);
  const [editValidationError, setEditValidationError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<PdfGenerationProgress | null>(null);

  const loadBatches = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [list, cfg] = await Promise.all([
        fetchUserBatches(currentUser.uid),
        fetchPixIntegrationConfig(currentUser.uid),
      ]);
      setBatches(list);
      setIntegrationConfig(cfg);
      if (initialSelectedBatch) {
        const found = list.find((b) => b.id === initialSelectedBatch.id) || initialSelectedBatch;
        setSelectedBatch(found);
        if (found.plaques && found.plaques[0]) {
          const first = found.plaques[0];
          const firstModel = resolvePlaqueModel(first.modelId || found.modelId, first.modelSnapshot, found.modelSnapshot);
          setActivePreviewPlaque(first);
          renderPlaqueCanvas(first, firstModel).then(setPreviewDataUrl);
        }
      }
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [currentUser]);

  // Keep selectedBatch synced if initialSelectedBatch prop updates from Dashboard
  useEffect(() => {
    if (initialSelectedBatch) {
      const found = batches.find((b) => b.id === initialSelectedBatch.id) || initialSelectedBatch;
      setSelectedBatch(found);
      if (found.plaques && found.plaques[0]) {
        const first = found.plaques[0];
        const firstModel = resolvePlaqueModel(first.modelId || found.modelId, first.modelSnapshot, found.modelSnapshot);
        setActivePreviewPlaque(first);
        renderPlaqueCanvas(first, firstModel).then(setPreviewDataUrl);
      }
    }
  }, [initialSelectedBatch]);

  // Live preview inside Ver / Editar modal preserving exact model & colors
  useEffect(() => {
    if (!editingPlaque || !showQrPreviewInEdit) {
      setEditPreviewUrl(null);
      return;
    }

    let active = true;
    const modelToUse = resolvePlaqueModel(
      editingPlaque.modelId || selectedBatch?.modelId,
      editingPlaque.modelSnapshot,
      selectedBatch?.modelSnapshot
    );
    const rawKey = (editingPlaque.pixKey || '').trim();
    const detected = detectPixKeyType(rawKey);
    const defaults = getDefaultPixMetadata(integrationConfig);

    let tempPlaque: PlaqueItem = { ...editingPlaque };
    if (rawKey && detected.isValid) {
      const cleanKey = detected.formattedKey || rawKey;
      const payload = generatePixPayload({
        pixType: detected.type,
        pixKey: cleanKey,
        receiverName: editingPlaque.receiverName || defaults.receiverName,
        receiverCity: editingPlaque.receiverCity || defaults.receiverCity,
        txId: editingPlaque.txId || '***',
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

    renderPlaqueCanvas(tempPlaque, modelToUse)
      .then((url) => {
        if (active) setEditPreviewUrl(url);
      })
      .catch((err) => {
        console.warn('Canvas live preview error:', err);
      });

    return () => {
      active = false;
    };
  }, [editingPlaque?.pixKey, editingPlaque?.modelId, showQrPreviewInEdit, selectedBatch?.id]);

  const handleCloseBatchModal = () => {
    setSelectedBatch(null);
    onClearInitialBatch?.();
  };

  const handleDeleteBatch = async (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir este lote e todas as suas plaquinhas?')) return;
    try {
      await deletePlaqueBatch(batchId);
      setBatches(batches.filter((b) => b.id !== batchId));
      if (selectedBatch?.id === batchId) handleCloseBatchModal();
    } catch {
      alert('Falha ao excluir lote.');
    }
  };

  const handleDownloadPdf = async (batch: PlaqueBatch) => {
    const batchModel = resolvePlaqueModel(batch.modelId, batch.modelSnapshot);
    const plaques = batch.plaques || [];

    if (plaques.length === 0) {
      alert('Este lote não possui plaquinhas gravadas.');
      return;
    }

    setPdfGenerating(true);
    try {
      const blob = await generatePlaquesPdf(
        plaques,
        batchModel,
        batch.name,
        (prog) => setPdfProgress(prog)
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GERAPIX_${batch.name.replace(/[^a-zA-Z0-9]/g, '_')}_A4_10x10cm.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Falha ao gerar PDF: ${err.message}`);
    } finally {
      setPdfGenerating(false);
      setPdfProgress(null);
    }
  };

  const handleDownloadStandaloneQr = async (plaque: PlaqueItem) => {
    const cleanKey = (plaque.pixKey || '').trim();
    let payload = (plaque.payload || '').trim();

    if (!payload.startsWith('000201') && cleanKey) {
      const detected = detectPixKeyType(cleanKey);
      const formatted = detected.formattedKey || cleanKey;
      const defaults = getDefaultPixMetadata(integrationConfig);
      payload = generatePixPayload({
        pixType: detected.type,
        pixKey: formatted,
        receiverName: plaque.receiverName || defaults.receiverName,
        receiverCity: plaque.receiverCity || defaults.receiverCity,
        txId: plaque.txId || '***',
        rawPayload: detected.type === 'payload' ? formatted : undefined,
      });
    }

    if (!payload) {
      payload = `GERAPIX:${plaque.permanentId || plaque.number}:${plaque.qrId || plaque.id}`;
    }

    const dataUrl = await QRCode.toDataURL(payload, {
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

  const handleOpenEdit = (plaque: PlaqueItem) => {
    setEditingPlaque({
      ...plaque,
      permanentId: plaque.permanentId || plaque.number,
      qrId: plaque.qrId || `QR-${plaque.permanentId || plaque.number}`,
      modelId: plaque.modelId || selectedBatch?.modelId || 'model-01',
    });
    setShowModelPicker(false);
    setShowQrPreviewInEdit(true);
    setEditValidationError(null);
    setSaveFeedback(null);
  };

  const handleSaveEditedPlaque = async () => {
    if (!editingPlaque || !selectedBatch) return;
    setEditValidationError(null);

    const detected = detectPixKeyType(editingPlaque.pixKey);
    if (!detected.isValid) {
      setEditValidationError(detected.message || 'Chave Pix inválida.');
      return;
    }

    setIsSavingEdit(true);

    try {
      const currentPlaques = selectedBatch.plaques || [];
      const cleanKey = detected.formattedKey || editingPlaque.pixKey.trim();
      const defaults = getDefaultPixMetadata(integrationConfig);
      const receiverName = (editingPlaque.receiverName || defaults.receiverName).trim();
      const receiverCity = (editingPlaque.receiverCity || defaults.receiverCity).trim();

      const dynamicResult = await updateDynamicPlaqueDestination(
        editingPlaque,
        cleanKey,
        integrationConfig
      );

      const payload = generatePixPayload({
        pixType: detected.type,
        pixKey: cleanKey,
        receiverName,
        receiverCity,
        txId: editingPlaque.txId || '***',
        rawPayload: detected.type === 'payload' ? cleanKey : undefined,
      });

      const resolvedModel = resolvePlaqueModel(
        editingPlaque.modelId || selectedBatch.modelId,
        editingPlaque.modelSnapshot,
        selectedBatch.modelSnapshot
      );

      const updatedSingle: PlaqueItem = {
        ...editingPlaque,
        permanentId: editingPlaque.permanentId || editingPlaque.number,
        qrId: editingPlaque.qrId || `QR-${editingPlaque.permanentId || editingPlaque.number}`,
        modelId: resolvedModel.id,
        pixStatus: 'linked',
        pspSyncStatus: dynamicResult.dynamicUpdated
          ? 'synced_psp'
          : dynamicResult.pspConfigured
          ? 'error'
          : 'pending_psp',
        qrMode: dynamicResult.dynamicUpdated ? 'dynamic_link' : 'static_emv',
        pixType: detected.type,
        pixKey: cleanKey,
        receiverName,
        receiverCity,
        payload,
        history: [...(editingPlaque.history || []), dynamicResult.historyEntry],
        updatedAt: new Date().toISOString(),
      };

      const updatedList = currentPlaques.map((p) =>
        p.id === updatedSingle.id ? updatedSingle : p
      );

      const updatedBatch: PlaqueBatch = {
        ...selectedBatch,
        plaques: updatedList,
        updatedAt: new Date().toISOString(),
      };

      setSelectedBatch(updatedBatch);
      setBatches(batches.map((b) => (b.id === updatedBatch.id ? updatedBatch : b)));
      await savePlaqueBatch(updatedBatch);

      if (currentUser) {
        logActivity(
          'Vinculou / Editou Chave Pix na Plaquinha',
          `${selectedBatch.name} — ${updatedSingle.number}`,
          { uid: currentUser.uid, name: currentUser.displayName || 'Usuário' }
        );
      }

      setActivePreviewPlaque(updatedSingle);
      renderPlaqueCanvas(updatedSingle, resolvedModel).then(setPreviewDataUrl);

      setSaveFeedback({
        text: dynamicResult.message,
        type: dynamicResult.dynamicUpdated ? 'success' : 'info',
      });
      setEditingPlaque(null);
      setShowQrPreviewInEdit(true);
    } catch {
      setEditValidationError('Erro ao salvar alterações.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Meus Lotes Pix</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Gerencie seus lotes, vincule ou altere a chave Pix de cada plaquinha vendida e baixe o PDF A4 para impressão.
          </p>
        </div>

        <button
          onClick={() => onNavigate('create-batch')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] text-black font-black text-xs rounded-xl transition cursor-pointer self-start sm:self-auto shadow-[0_2px_15px_rgba(0,191,255,0.3)]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Criar Novo Lote</span>
        </button>
      </div>

      {pdfGenerating && pdfProgress && (
        <div className="p-4 bg-[#0A0E17] border border-[#00BFFF]/40 rounded-xl space-y-2">
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

      {loading ? (
        <div className="text-center py-16 text-neutral-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00BFFF]" />
          Carregando seus lotes...
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-16 bg-[#111827] border border-dashed border-[#1E293B] rounded-3xl p-8">
          <Layers className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Nenhum lote Pix cadastrado</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-5">
            Crie seu primeiro lote de plaquinhas sem precisar informar chave Pix antecipadamente.
          </p>
          <button
            onClick={() => onNavigate('create-batch')}
            className="px-5 py-2.5 bg-[#00BFFF] text-black font-bold text-xs rounded-xl shadow cursor-pointer"
          >
            Começar Agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {batches.map((batch) => {
            const model = resolvePlaqueModel(batch.modelId, batch.modelSnapshot);
            const dateStr = batch.createdAt
              ? new Date(batch.createdAt).toLocaleDateString('pt-BR')
              : 'Recente';
            const linkedCount = (batch.plaques || []).filter(
              (p) => p.pixStatus === 'linked' && Boolean(p.pixKey?.trim())
            ).length;

            return (
              <div
                key={batch.id}
                className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 hover:border-[#00BFFF]/40 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <img
                      src={model.imageUrl}
                      alt={model.name}
                      className="w-16 h-16 rounded-xl object-cover bg-black border border-[#1E293B] shrink-0"
                    />
                    <div className="text-right space-y-1">
                      <span className="inline-block text-xs font-black text-[#00BFFF] bg-[#00BFFF]/10 border border-[#00BFFF]/30 px-2.5 py-1 rounded-full">
                        {batch.quantity} UNIDADES
                      </span>
                      <div className="text-[10px] text-neutral-400">
                        {linkedCount}/{batch.quantity} com chave Pix
                      </div>
                      <div className="text-[10px] text-neutral-500 flex items-center justify-end gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-base font-black text-white line-clamp-1 mb-1">
                    {batch.name}
                  </h3>
                  <p className="text-xs text-neutral-400 mb-3 truncate">
                    {model.name}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#1E293B] flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedBatch(batch);
                      setSaveFeedback(null);
                      if (batch.plaques && batch.plaques[0]) {
                        const first = batch.plaques[0];
                        const m = resolvePlaqueModel(
                          first.modelId || batch.modelId,
                          first.modelSnapshot,
                          batch.modelSnapshot
                        );
                        setActivePreviewPlaque(first);
                        renderPlaqueCanvas(first, m).then(setPreviewDataUrl);
                      }
                    }}
                    className="flex-1 py-2 px-3 bg-[#0A0E17] hover:bg-[#1E293B] text-white font-bold text-xs rounded-xl border border-[#1E293B] flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#00BFFF]" />
                    <span>Abrir Lote</span>
                  </button>

                  <button
                    onClick={() => handleDownloadPdf(batch)}
                    className="py-2 px-3 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-[0_2px_12px_rgba(0,191,255,0.25)]"
                    title="Baixar PDF A4"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={(e) => handleDeleteBatch(batch.id, e)}
                    className="p-2 bg-[#0A0E17] hover:bg-red-950/60 hover:border-red-800 text-neutral-400 hover:text-red-400 rounded-xl border border-[#1E293B] transition cursor-pointer"
                    title="Excluir Lote"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal with Grid of Plaques */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#111827] border border-[#1E293B] rounded-3xl p-5 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-5">
            {(() => {
              const batchModel = resolvePlaqueModel(
                selectedBatch.modelId,
                selectedBatch.modelSnapshot
              );
              return (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={batchModel.imageUrl}
                        alt={batchModel.name}
                        className="w-11 h-11 rounded-xl object-cover border border-[#1E293B] bg-black shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-black text-white">{selectedBatch.name}</h2>
                          <span className="text-xs px-2.5 py-0.5 bg-[#00BFFF]/15 text-[#00BFFF] font-bold rounded-full">
                            {selectedBatch.quantity} plaquinhas
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400">{batchModel.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadPdf(selectedBatch)}
                        className="px-4 py-2 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] text-black text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer shadow-[0_2px_12px_rgba(0,191,255,0.3)]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar PDF</span>
                      </button>
                      <button
                        onClick={handleCloseBatchModal}
                        className="p-2 bg-[#0A0E17] hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}

            {saveFeedback && (
              <div
                className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium border ${
                  saveFeedback.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                    : 'bg-[#0A0E17] border-[#00BFFF]/40 text-neutral-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-[#00BFFF] shrink-0" />
                <span>{saveFeedback.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Enlarged Live HD Preview */}
              <div className="md:col-span-1 bg-[#0A0E17] p-4 rounded-2xl border border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400">
                    Prévia {activePreviewPlaque ? `(${activePreviewPlaque.number})` : ''}
                  </span>
                  {activePreviewPlaque && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activePreviewPlaque.pixStatus === 'linked' && activePreviewPlaque.pixKey
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {activePreviewPlaque.pixStatus === 'linked' && activePreviewPlaque.pixKey
                        ? 'Vinculada'
                        : 'Sem chave Pix'}
                    </span>
                  )}
                </div>

                {previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt="Prévia Placa"
                    className="aspect-square w-full rounded-xl object-cover border border-[#1E293B] bg-black shadow-lg"
                  />
                ) : (
                  <div className="aspect-square w-full rounded-xl bg-[#05080F] flex items-center justify-center text-xs text-neutral-500">
                    Selecione uma plaquinha
                  </div>
                )}

                {activePreviewPlaque && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(activePreviewPlaque)}
                      className="w-full py-2 px-3 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] text-black rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Ver / Editar Chave Pix</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadStandaloneQr(activePreviewPlaque)}
                      className="w-full py-2 px-3 bg-[#111827] hover:bg-[#1E293B] text-white border border-[#1E293B] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#00BFFF]" />
                      <span>Baixar QR Code (PNG)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Grid of Plaques */}
              <div className="md:col-span-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
                  {(selectedBatch.plaques || []).map((plaque) => {
                    const plaqueModel = resolvePlaqueModel(
                      plaque.modelId || selectedBatch.modelId,
                      plaque.modelSnapshot,
                      selectedBatch.modelSnapshot
                    );
                    const isLinked =
                      plaque.pixStatus === 'linked' && Boolean(plaque.pixKey?.trim());

                    return (
                      <div
                        key={plaque.id}
                        onClick={async () => {
                          setActivePreviewPlaque(plaque);
                          const url = await renderPlaqueCanvas(plaque, plaqueModel);
                          setPreviewDataUrl(url);
                        }}
                        className="bg-[#0A0E17] border border-[#1E293B] hover:border-[#00BFFF]/60 p-3 rounded-xl transition cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-center mb-1.5 gap-1">
                            <span className="font-mono text-xs font-black text-[#00BFFF] truncate">
                              {plaque.permanentId || plaque.number}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(plaque);
                              }}
                              className="py-1 px-2 text-[10px] font-bold text-black bg-[#00BFFF] hover:bg-[#38BDF8] rounded-md flex items-center gap-1 transition cursor-pointer shrink-0"
                            >
                              <Edit className="w-2.5 h-2.5" />
                              <span>Ver / Editar</span>
                            </button>
                          </div>

                          {isLinked ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Chave vinculada
                              </span>
                              <div className="text-[11px] text-white font-mono truncate">
                                {plaque.pixKey}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400">
                                <Clock className="w-2.5 h-2.5" />
                                Aguardando chave Pix
                              </span>
                              <div className="text-[10px] text-neutral-500 font-mono truncate">
                                {plaque.qrId || `QR-${plaque.permanentId || plaque.number}`}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-2 pt-2 border-t border-[#1E293B] flex items-center justify-between text-[10px] text-neutral-500">
                          <span className="truncate">{plaqueModel.name.split('—')[0]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VER / EDITAR PLAQUE MODAL */}
      {editingPlaque && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#111827] border border-[#1E293B] rounded-3xl p-6 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div>
                <span className="font-mono text-sm font-black text-[#00BFFF] block">
                  {editingPlaque.permanentId || editingPlaque.number}
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  {editingPlaque.qrId}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowModelPicker(!showModelPicker)}
                  className="px-2.5 py-1 bg-[#0A0E17] hover:bg-[#1E293B] text-neutral-300 border border-[#1E293B] rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Palette className="w-3 h-3 text-[#00BFFF]" />
                  <span>Modelo</span>
                </button>
                <button
                  onClick={() => setEditingPlaque(null)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-xl bg-[#0A0E17] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Status & PSP Honesty Notice */}
            <div className="p-3 bg-[#0A0E17] border border-[#1E293B] rounded-xl text-[11px] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Status da Chave:</span>
                <span
                  className={`font-bold ${
                    editingPlaque.pixStatus === 'linked' && editingPlaque.pixKey
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {editingPlaque.pixStatus === 'linked' && editingPlaque.pixKey
                    ? 'Chave Pix vinculada'
                    : 'Aguardando chave Pix do comprador'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Infraestrutura PSP Dinâmica:</span>
                <span
                  className={`font-bold ${
                    isPspDynamicConfigured(integrationConfig) ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {isPspDynamicConfigured(integrationConfig)
                    ? 'Configurada'
                    : 'Pendente de integração'}
                </span>
              </div>
              {!isPspDynamicConfigured(integrationConfig) && (
                <div className="flex items-start gap-1.5 pt-1 text-[10px] text-neutral-400 border-t border-[#1E293B]">
                  <Info className="w-3.5 h-3.5 text-[#00BFFF] shrink-0 mt-0.5" />
                  <span>
                    Ao salvar a chave Pix, o sistema gera o BR Code oficial BACEN. Para que placas já impressas mantenham o mesmo QR Code após trocas de chave no banco, conecte seu PSP em Minha Conta.
                  </span>
                </div>
              )}
            </div>

            {showModelPicker && (
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#0A0E17] rounded-2xl border border-[#1E293B] max-h-44 overflow-y-auto">
                {models.map((mod) => {
                  const isCurrent = editingPlaque.modelId === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        setEditingPlaque({ ...editingPlaque, modelId: mod.id });
                        setShowModelPicker(false);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition cursor-pointer ${
                        isCurrent
                          ? 'border-[#00BFFF] bg-[#00BFFF]/15 text-white font-bold'
                          : 'border-[#1E293B] bg-[#111827] text-neutral-300'
                      }`}
                    >
                      <img
                        src={mod.imageUrl}
                        alt={mod.name}
                        className="w-8 h-8 rounded-lg object-cover bg-black shrink-0"
                      />
                      <span className="text-[11px] truncate">{mod.name.split('—')[0]}</span>
                    </button>
                  );
                })}
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
                <label className="block text-xs font-bold text-white">
                  Chave Pix do Comprador
                </label>
                {editingPlaque.pixKey.trim() && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      detectPixKeyType(editingPlaque.pixKey).isValid
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {detectPixKeyType(editingPlaque.pixKey).label}
                  </span>
                )}
              </div>

              <input
                type="text"
                value={editingPlaque.pixKey}
                onChange={(e) => {
                  const val = e.target.value;
                  const detected = detectPixKeyType(val);
                  setEditingPlaque({
                    ...editingPlaque,
                    pixKey: val,
                    pixType: detected.type,
                  });
                  setEditValidationError(null);
                }}
                placeholder="CPF, CNPJ, Celular, E-mail ou Chave Aleatória"
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#00BFFF]"
              />
            </div>

            {showQrPreviewInEdit && (
              <div className="bg-[#0A0E17] border border-[#1E293B] rounded-2xl p-3 space-y-3">
                {editPreviewUrl ? (
                  <>
                    <img
                      src={editPreviewUrl}
                      alt="Prévia Plaquinha"
                      className="w-full aspect-square rounded-xl object-cover bg-black"
                    />
                    <button
                      type="button"
                      onClick={() => handleDownloadStandaloneQr(editingPlaque)}
                      className="w-full py-2 px-3 bg-[#111827] hover:bg-[#1E293B] text-white border border-[#1E293B] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#00BFFF]" />
                      <span>Baixar QR Code (PNG)</span>
                    </button>
                  </>
                ) : (
                  <div className="aspect-square flex items-center justify-center text-xs text-neutral-500">
                    <RefreshCw className="w-5 h-5 animate-spin text-[#00BFFF]" />
                  </div>
                )}
              </div>
            )}

            {editingPlaque.history && editingPlaque.history.length > 0 && (
              <div className="bg-[#0A0E17] border border-[#1E293B] rounded-xl p-3 space-y-1.5 max-h-28 overflow-y-auto">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-neutral-400">
                  <History className="w-3 h-3 text-[#00BFFF]" />
                  <span>Histórico de Vinculação</span>
                </div>
                {editingPlaque.history.slice(-4).reverse().map((h, idx) => (
                  <div key={idx} className="text-[10px] text-neutral-400 flex justify-between gap-2">
                    <span className="truncate">{h.note || h.pixKey || 'Sem chave'}</span>
                    <span className="font-mono text-neutral-500 shrink-0">
                      {h.updatedAt ? new Date(h.updatedAt).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEditedPlaque}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] text-black font-black text-xs rounded-xl shadow cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
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
                onClick={() => setShowQrPreviewInEdit(!showQrPreviewInEdit)}
                className="py-2.5 px-4 bg-[#0A0E17] hover:bg-[#1E293B] text-white border border-[#1E293B] font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-[#00BFFF]" />
                <span>{showQrPreviewInEdit ? 'Ocultar Prévia' : 'Visualizar QR Code'}</span>
              </button>

              <button
                type="button"
                onClick={() => setEditingPlaque(null)}
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
