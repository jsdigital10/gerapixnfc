import React, { useEffect, useState, useTransition } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PlaqueBatch, PlaqueItem, PixKeyType, PlaqueModelConfig } from '../types';
import { fetchUserBatches, deletePlaqueBatch, savePlaqueBatch, logActivity } from '../lib/firebase';
import { getStoredModelConfigs } from '../lib/modelsData';
import { generatePlaquesPdf, renderPlaqueCanvas, PdfGenerationProgress } from '../lib/pdfGenerator';
import { generatePixPayload, validatePixKey, formatPixKey } from '../lib/pix';
import {
  FolderOpen,
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
  Info,
  ChevronRight,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  QrCode,
  Sparkles,
} from 'lucide-react';

interface MyBatchesViewProps {
  onNavigate: (tab: any) => void;
  initialSelectedBatch?: PlaqueBatch | null;
}

export function MyBatchesView({ onNavigate, initialSelectedBatch }: MyBatchesViewProps) {
  const { currentUser } = useAuth();
  const models = getStoredModelConfigs();

  const [batches, setBatches] = useState<PlaqueBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<PlaqueBatch | null>(initialSelectedBatch || null);

  // Plaque Editing State
  const [editingPlaque, setEditingPlaque] = useState<PlaqueItem | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [copiedPlaqueId, setCopiedPlaqueId] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState<boolean>(false);
  const [applyToAll, setApplyToAll] = useState<boolean>(false);
  const [editValidationError, setEditValidationError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<PdfGenerationProgress | null>(null);

  const loadBatches = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const list = await fetchUserBatches(currentUser.uid);
      setBatches(list);
      if (initialSelectedBatch) {
        const found = list.find((b) => b.id === initialSelectedBatch.id);
        if (found) setSelectedBatch(found);
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

  // Live preview update in Edit Modal
  useEffect(() => {
    if (!editingPlaque) {
      setEditPreviewUrl(null);
      return;
    }

    let active = true;
    const modelToUse = models.find((m) => m.id === editingPlaque.modelId) || models[0];

    // Compute temp payload for preview
    let payload = editingPlaque.payload;
    if (editingPlaque.pixType === 'payload') {
      payload = editingPlaque.pixKey.trim() || 'PIX_PAYLOAD_TEST';
    } else {
      payload = generatePixPayload({
        pixType: editingPlaque.pixType,
        pixKey: editingPlaque.pixKey,
        receiverName: editingPlaque.receiverName || 'RECEBEDOR',
        receiverCity: editingPlaque.receiverCity || 'SAO PAULO',
        amount: editingPlaque.amount,
        txId: editingPlaque.txId,
      });
    }

    const tempPlaque: PlaqueItem = {
      ...editingPlaque,
      payload,
    };

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
  }, [
    editingPlaque?.modelId,
    editingPlaque?.pixType,
    editingPlaque?.pixKey,
    editingPlaque?.receiverName,
    editingPlaque?.receiverCity,
    editingPlaque?.amount,
    editingPlaque?.qrMode,
  ]);

  const handleDeleteBatch = async (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir este lote e todas as suas plaquinhas?')) return;
    try {
      await deletePlaqueBatch(batchId);
      setBatches(batches.filter((b) => b.id !== batchId));
      if (selectedBatch?.id === batchId) setSelectedBatch(null);
    } catch (err) {
      alert('Falha ao excluir lote.');
    }
  };

  const handleDownloadPdf = async (batch: PlaqueBatch) => {
    const defaultModel = models.find((m) => m.id === batch.modelId) || models[0];
    const plaques = batch.plaques || [];

    if (plaques.length === 0) {
      alert('Este lote não possui plaquinhas gravadas.');
      return;
    }

    setPdfGenerating(true);
    try {
      const blob = await generatePlaquesPdf(
        plaques,
        defaultModel,
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

  const handleOpenEdit = (plaque: PlaqueItem) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gerapix.pro';
    setEditingPlaque({
      ...plaque,
      qrMode: plaque.qrMode || selectedBatch?.qrMode || 'dynamic_link',
      pointingUrl: plaque.pointingUrl || `${origin}/p/${plaque.id}`,
      modelId: plaque.modelId || selectedBatch?.modelId || models[0].id,
      receiverCity: plaque.receiverCity || 'SAO PAULO',
    });
    setApplyToAll(false);
    setShowModelPicker(false);
    setEditValidationError(null);
  };

  const handleSaveEditedPlaque = async () => {
    if (!editingPlaque || !selectedBatch) return;
    setEditValidationError(null);

    // Validate if not raw payload
    if (editingPlaque.pixType !== 'payload') {
      const val = validatePixKey(editingPlaque.pixType, editingPlaque.pixKey);
      if (!val.valid) {
        setEditValidationError(val.message || 'Chave Pix inválida.');
        return;
      }
    }

    if (!editingPlaque.receiverName.trim()) {
      setEditValidationError('Informe o nome do recebedor.');
      return;
    }

    if (applyToAll) {
      const ok = confirm(
        `Deseja aplicar estas alterações a TODAS as ${selectedBatch.plaques?.length || selectedBatch.quantity} plaquinhas do lote?\n\nAs numerações sequenciais (#001, #002...) serão preservadas.`
      );
      if (!ok) return;
    }

    setIsSavingEdit(true);

    try {
      let updatedList: PlaqueItem[] = [];
      const currentPlaques = selectedBatch.plaques || [];
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gerapix.pro';

      if (applyToAll) {
        // Apply data to every plaque in the batch
        updatedList = currentPlaques.map((p) => {
          const payload =
            editingPlaque.pixType === 'payload'
              ? editingPlaque.pixKey.trim()
              : generatePixPayload({
                  pixType: editingPlaque.pixType,
                  pixKey: editingPlaque.pixKey,
                  receiverName: editingPlaque.receiverName.trim(),
                  receiverCity: (editingPlaque.receiverCity || 'SAO PAULO').trim(),
                  amount: editingPlaque.amount,
                  txId: p.txId,
                });

          const pointingUrl = `${origin}/p/${p.id}`;

          return {
            ...p,
            qrMode: editingPlaque.qrMode || 'dynamic_link',
            pointingUrl,
            modelId: editingPlaque.modelId,
            pixType: editingPlaque.pixType,
            pixKey: editingPlaque.pixKey,
            receiverName: editingPlaque.receiverName.trim(),
            receiverCity: (editingPlaque.receiverCity || 'SAO PAULO').trim(),
            amount: editingPlaque.amount,
            payload,
            updatedAt: new Date().toISOString(),
          };
        });
      } else {
        // Individual update
        const payload =
          editingPlaque.pixType === 'payload'
            ? editingPlaque.pixKey.trim()
            : generatePixPayload({
                pixType: editingPlaque.pixType,
                pixKey: editingPlaque.pixKey,
                receiverName: editingPlaque.receiverName.trim(),
                receiverCity: (editingPlaque.receiverCity || 'SAO PAULO').trim(),
                amount: editingPlaque.amount,
                txId: editingPlaque.txId,
              });

        const pointingUrl = editingPlaque.pointingUrl || `${origin}/p/${editingPlaque.id}`;

        const updatedSingle: PlaqueItem = {
          ...editingPlaque,
          qrMode: editingPlaque.qrMode || 'dynamic_link',
          pointingUrl,
          receiverName: editingPlaque.receiverName.trim(),
          receiverCity: (editingPlaque.receiverCity || 'SAO PAULO').trim(),
          payload,
          updatedAt: new Date().toISOString(),
        };

        updatedList = currentPlaques.map((p) =>
          p.id === updatedSingle.id ? updatedSingle : p
        );
      }

      const updatedBatch: PlaqueBatch = {
        ...selectedBatch,
        qrMode: editingPlaque.qrMode || selectedBatch.qrMode || 'dynamic_link',
        plaques: updatedList,
        updatedAt: new Date().toISOString(),
      };

      setSelectedBatch(updatedBatch);
      setBatches(batches.map((b) => (b.id === updatedBatch.id ? updatedBatch : b)));
      await savePlaqueBatch(updatedBatch);

      if (currentUser) {
        logActivity(
          'Editou Plaquinha no Lote',
          `${selectedBatch.name} — ${editingPlaque.number} (${editingPlaque.pixType.toUpperCase()})`,
          { uid: currentUser.uid, name: currentUser.displayName || 'Usuário' }
        );
      }

      // Update main modal preview
      const targetPlaque = updatedList.find((p) => p.id === editingPlaque.id) || updatedList[0];
      if (targetPlaque) {
        const targetModel = models.find((m) => m.id === targetPlaque.modelId) || models[0];
        renderPlaqueCanvas(targetPlaque, targetModel).then(setPreviewDataUrl);
      }

      setEditingPlaque(null);
    } catch (err: any) {
      setEditValidationError('Erro ao salvar alterações no Firestore.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00BFFF] mb-1">
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Gerenciador de Produção</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Meus Lotes Pix</h1>
          <p className="text-xs text-neutral-400">
            Consulte seus lotes salvos, edite plaquinhas individualmente, troque modelos e baixe PDFs A4 10x10cm.
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
            Crie seu primeiro lote de plaquinhas para gerar PDFs prontos para impressão gráfica.
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
            const model = models.find((m) => m.id === batch.modelId) || models[0];
            const dateStr = batch.createdAt
              ? new Date(batch.createdAt).toLocaleDateString('pt-BR')
              : 'Recente';

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
                      className="w-14 h-14 rounded-xl object-cover bg-black border border-[#1E293B] shrink-0"
                    />
                    <div className="text-right">
                      <span className="text-xs font-black text-[#00BFFF] bg-[#00BFFF]/10 border border-[#00BFFF]/30 px-2.5 py-1 rounded-full">
                        {batch.quantity} UNIDADES
                      </span>
                      <div className="text-[10px] text-neutral-500 mt-1 flex items-center justify-end gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-base font-black text-white line-clamp-1 mb-1">
                    {batch.name}
                  </h3>
                  <p className="text-xs text-neutral-400 mb-3">
                    {model.name} • Recebedor: <span className="text-neutral-200">{batch.basePixData?.receiverName || 'PIX'}</span>
                  </p>
                </div>

                <div className="pt-4 border-t border-[#1E293B] flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedBatch(batch);
                      if (batch.plaques && batch.plaques[0]) {
                        const m = models.find((mod) => mod.id === (batch.plaques![0].modelId || batch.modelId)) || model;
                        renderPlaqueCanvas(batch.plaques[0], m).then(setPreviewDataUrl);
                      }
                    }}
                    className="flex-1 py-2 px-3 bg-[#0A0E17] hover:bg-[#1E293B] text-white font-bold text-xs rounded-xl border border-[#1E293B] flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#00BFFF]" />
                    <span>Visualizar</span>
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
          <div className="bg-[#111827] border border-[#1E293B] rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white">{selectedBatch.name}</h2>
                  <span className="text-xs px-2.5 py-0.5 bg-[#00BFFF]/15 text-[#00BFFF] font-bold rounded-full">
                    {selectedBatch.quantity} plaquinhas
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Clique nas plaquinhas para inspecionar em alta definição ou clique em Editar para alterar chave e modelo.
                </p>
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
                  onClick={() => setSelectedBatch(null)}
                  className="p-2 bg-[#0A0E17] hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Enlarged Live HD Preview */}
              <div className="md:col-span-1 bg-[#0A0E17] p-4 rounded-2xl border border-[#1E293B]">
                <span className="text-xs font-bold text-neutral-400 block mb-3">
                  Prévia em Alta Definição
                </span>
                {previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt="Prévia Placa"
                    className="aspect-square w-full rounded-xl object-cover border border-[#1E293B] bg-black shadow-lg"
                  />
                ) : (
                  <div className="aspect-square w-full rounded-xl bg-[#05080F] flex items-center justify-center text-xs text-neutral-500">
                    Selecione uma plaquinha ao lado
                  </div>
                )}
                <div className="mt-3 text-[11px] text-neutral-400 text-center font-medium">
                  Impressão gráfica 10x10 cm • QR Code milimétrico
                </div>
              </div>

              {/* Right Column: Grid of Plaques */}
              <div className="md:col-span-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-2">
                  {(selectedBatch.plaques || []).map((plaque) => {
                    const plaqueModel =
                      models.find((m) => m.id === (plaque.modelId || selectedBatch.modelId)) ||
                      models[0];

                    return (
                      <div
                        key={plaque.id}
                        onClick={async () => {
                          const url = await renderPlaqueCanvas(plaque, plaqueModel);
                          setPreviewDataUrl(url);
                        }}
                        className="bg-[#0A0E17] border border-[#1E293B] hover:border-[#00BFFF]/60 p-3 rounded-xl transition cursor-pointer group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-mono text-xs font-black text-[#00BFFF]">
                              {plaque.number}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(plaque);
                              }}
                              className="py-1 px-2 text-[10px] font-bold text-black bg-[#00BFFF] hover:bg-[#38BDF8] rounded-md flex items-center gap-1 transition"
                              title="Editar Plaquinha"
                            >
                              <Edit className="w-2.5 h-2.5" />
                              <span>Editar</span>
                            </button>
                          </div>
                          <div className="text-xs font-bold text-white truncate">
                            {plaque.receiverName}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono truncate">
                            {plaque.pixKey}
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-[#1E293B] flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                            <span className="truncate text-neutral-400">{plaqueModel.name.split('—')[0]}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                plaque.qrMode === 'static_emv'
                                  ? 'bg-neutral-800 text-neutral-400'
                                  : 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30'
                              }`}
                            >
                              {plaque.qrMode === 'static_emv' ? 'ESTÁTICO' : 'DINÂMICO'}
                            </span>
                            <a
                              href={`/p/${plaque.id}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-neutral-400 hover:text-[#00BFFF] rounded hover:bg-white/5 transition"
                              title="Abrir página de apontamento (/p/:id)"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
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

      {/* Comprehensive Plaque Editor Modal */}
      {editingPlaque && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#111827] border border-[#1E293B] rounded-3xl p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Editar Plaquinha {editingPlaque.number}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#00BFFF]/10 border border-[#00BFFF]/30 text-[#00BFFF]">
                    Personalização Individual
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Atualize a chave Pix, recebedor ou troque o modelo gráfico. O QR Code será recalculado automaticamente.
                </p>
              </div>
              <button
                onClick={() => setEditingPlaque(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-xl bg-[#0A0E17]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner */}
            {editValidationError && (
              <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{editValidationError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Live HD Preview */}
              <div className="md:col-span-5 bg-[#0A0E17] border border-[#1E293B] p-4 rounded-2xl flex flex-col items-center">
                <span className="text-xs font-bold text-neutral-400 mb-2 self-start flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#00BFFF]" />
                  <span>Prévia em Tempo Real</span>
                </span>

                {editPreviewUrl ? (
                  <img
                    src={editPreviewUrl}
                    alt="Prévia Plaquinha"
                    className="w-full aspect-square rounded-xl object-cover border border-[#1E293B] bg-black shadow-lg"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-[#05080F] flex items-center justify-center text-xs text-neutral-500">
                    <RefreshCw className="w-5 h-5 animate-spin text-[#00BFFF]" />
                  </div>
                )}

                <div className="mt-3 text-[11px] text-neutral-400 text-center font-mono">
                  {editingPlaque.number} • Modelo:{' '}
                  <span className="text-[#00BFFF] font-bold">
                    {models.find((m) => m.id === editingPlaque.modelId)?.name.split('—')[0].trim() || 'Mod'}
                  </span>
                </div>
              </div>

              {/* Right Column: Form Fields */}
              <div className="md:col-span-7 space-y-4">
                {/* 1. Trocar Modelo Button */}
                <div className="p-3 bg-[#0A0E17] border border-[#1E293B] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Modelo Visual da Plaquinha
                      </span>
                      <span className="text-xs font-black text-white">
                        {models.find((m) => m.id === editingPlaque.modelId)?.name || 'Modelo'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowModelPicker(!showModelPicker)}
                      className="px-3 py-1.5 bg-[#00BFFF]/10 hover:bg-[#00BFFF]/20 text-[#00BFFF] border border-[#00BFFF]/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>{showModelPicker ? 'Fechar Seleção' : 'ALTERAR MODELO'}</span>
                    </button>
                  </div>

                  {/* 5 Models Visual Chooser */}
                  {showModelPicker && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#1E293B] max-h-48 overflow-y-auto">
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
                                : 'border-[#1E293B] bg-[#111827] text-neutral-300 hover:border-neutral-600'
                            }`}
                          >
                            <img
                              src={mod.imageUrl}
                              alt={mod.name}
                              className="w-10 h-10 rounded-lg object-cover bg-black border border-white/10 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold truncate">{mod.name}</div>
                              <div className="text-[9px] text-[#00BFFF] uppercase font-semibold">
                                {mod.category}
                              </div>
                            </div>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-[#00BFFF] ml-auto shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Formato do QR Code: Dinâmico Inteligente vs Estático EMV */}
                <div className="p-3 bg-[#0A0E17] border border-[#1E293B] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Modo do QR Code Impresso
                      </span>
                      <span className="text-xs font-black text-white">
                        {editingPlaque.qrMode === 'static_emv'
                          ? 'Código EMV BACEN Fixo'
                          : 'Link Dinâmico de Apontamento'}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        editingPlaque.qrMode === 'static_emv'
                          ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                          : 'bg-[#00BFFF]/10 text-[#00BFFF] border-[#00BFFF]/40'
                      }`}
                    >
                      {editingPlaque.qrMode === 'static_emv' ? 'ESTÁTICO' : 'RECOMENDADO'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingPlaque({ ...editingPlaque, qrMode: 'dynamic_link' })
                      }
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        editingPlaque.qrMode !== 'static_emv'
                          ? 'bg-[#00BFFF]/15 border-[#00BFFF] text-white shadow-[0_0_12px_rgba(0,191,255,0.15)]'
                          : 'bg-[#111827] border-[#1E293B] text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs text-[#00BFFF]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>QR Dinâmico de Apontamento</span>
                      </div>
                      <p className="text-[10px] text-neutral-300 mt-1 leading-tight">
                        Permite trocar a chave Pix no painel a qualquer momento sem reimprimir a placa física!
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setEditingPlaque({ ...editingPlaque, qrMode: 'static_emv' })
                      }
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        editingPlaque.qrMode === 'static_emv'
                          ? 'bg-[#00BFFF]/15 border-[#00BFFF] text-white shadow-[0_0_12px_rgba(0,191,255,0.15)]'
                          : 'bg-[#111827] border-[#1E293B] text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs text-neutral-200">
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Code Estático EMV BACEN</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1 leading-tight">
                        Chave e valor gravados diretamente nos pontos físicos do QR Code.
                      </p>
                    </button>
                  </div>

                  {editingPlaque.qrMode !== 'static_emv' && (
                    <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between gap-2 text-xs">
                      <div className="truncate text-neutral-400 font-mono text-[11px] bg-[#111827] px-2.5 py-1.5 rounded-lg border border-[#1E293B] flex-1">
                        {typeof window !== 'undefined' ? window.location.origin : 'https://gerapix.pro'}/p/{editingPlaque.id}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://gerapix.pro'}/p/${editingPlaque.id}`;
                          navigator.clipboard.writeText(url);
                          setCopiedPlaqueId(editingPlaque.id);
                          setTimeout(() => setCopiedPlaqueId(null), 2000);
                        }}
                        className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#00BFFF] hover:text-black text-neutral-200 font-bold text-xs rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        {copiedPlaqueId === editingPlaque.id ? (
                          <>
                            <Check className="w-3 h-3 text-green-400" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar Link</span>
                          </>
                        )}
                      </button>
                      <a
                        href={`/p/${editingPlaque.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-[#1E293B] hover:bg-[#00BFFF] hover:text-black text-neutral-200 rounded-lg transition shrink-0"
                        title="Testar página do recebedor"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* 3. Tipo de Chave Pix (6 opções) */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Tipo de Chave Pix
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'phone', label: 'Celular' },
                      { id: 'cpf', label: 'CPF' },
                      { id: 'cnpj', label: 'CNPJ' },
                      { id: 'email', label: 'E-mail' },
                      { id: 'random', label: 'Aleatória' },
                      { id: 'payload', label: 'Copia e Cola' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setEditingPlaque({
                            ...editingPlaque,
                            pixType: t.id as PixKeyType,
                          })
                        }
                        className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                          editingPlaque.pixType === t.id
                            ? 'bg-[#00BFFF] text-black border-[#00BFFF]'
                            : 'bg-[#0A0E17] text-neutral-400 border-[#1E293B] hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Chave Pix */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Chave Pix
                  </label>
                  <input
                    type="text"
                    value={editingPlaque.pixKey}
                    onChange={(e) =>
                      setEditingPlaque({ ...editingPlaque, pixKey: e.target.value })
                    }
                    placeholder={
                      editingPlaque.pixType === 'phone'
                        ? '11999999999'
                        : editingPlaque.pixType === 'cpf'
                        ? '000.000.000-00'
                        : editingPlaque.pixType === 'cnpj'
                        ? '00.000.000/0001-00'
                        : editingPlaque.pixType === 'email'
                        ? 'seu@email.com'
                        : 'Informe a chave'
                    }
                    className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#00BFFF]"
                  />
                </div>

                {/* 4. Recebedor & Cidade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Nome do Recebedor (máx 25)
                    </label>
                    <input
                      type="text"
                      maxLength={25}
                      value={editingPlaque.receiverName}
                      onChange={(e) =>
                        setEditingPlaque({
                          ...editingPlaque,
                          receiverName: e.target.value,
                        })
                      }
                      className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#00BFFF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Cidade do Recebedor (máx 15)
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={editingPlaque.receiverCity || 'SAO PAULO'}
                      onChange={(e) =>
                        setEditingPlaque({
                          ...editingPlaque,
                          receiverCity: e.target.value,
                        })
                      }
                      className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#00BFFF]"
                    />
                  </div>
                </div>

                {/* 5. Valor Opcional */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Valor Fixo em R$ (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPlaque.amount || ''}
                    placeholder="Em branco para valor livre"
                    onChange={(e) =>
                      setEditingPlaque({
                        ...editingPlaque,
                        amount: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#00BFFF]"
                  />
                </div>

                {/* Apply to whole batch checkbox */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 p-2.5 bg-[#0A0E17] rounded-xl border border-[#1E293B] cursor-pointer hover:border-[#00BFFF]/40 transition">
                    <input
                      type="checkbox"
                      checked={applyToAll}
                      onChange={(e) => setApplyToAll(e.target.checked)}
                      className="w-4 h-4 accent-[#00BFFF] rounded"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white">
                        Aplicar modelo e dados a todo o lote
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        Preserva a numeração de cada plaquinha (#001, #002...)
                      </span>
                    </div>
                  </label>
                </div>

                {/* Discreet notice */}
                <div className="flex items-start gap-2.5 p-3 bg-neutral-900/70 border border-[#00BFFF]/30 rounded-xl text-[11px] text-neutral-300">
                  <Sparkles className="w-4 h-4 text-[#00BFFF] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#00BFFF] block">
                      Vantagem do QR Dinâmico Inteligente
                    </span>
                    <span className="text-neutral-400 leading-relaxed block">
                      Com o modo Dinâmico, você pode alterar a chave Pix, nome do recebedor ou valor fixo a qualquer momento no painel: quem escanear a placa física impressa abrirá instantaneamente os novos dados atualizados, sem perda de material!
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions footer */}
            <div className="flex justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setEditingPlaque(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEditedPlaque}
                className="px-5 py-2.5 bg-gradient-to-r from-[#00BFFF] to-[#087CFF] hover:from-[#38BDF8] hover:to-[#00BFFF] text-black font-black text-xs rounded-xl shadow-[0_2px_15px_rgba(0,191,255,0.3)] transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>SALVAR ALTERAÇÕES</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
