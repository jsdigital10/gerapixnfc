import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { PlaqueItem, PlaqueModelConfig } from '../types';
import { resolvePlaqueModel } from './modelsData';

/**
 * Loads an image from URL and returns an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar a imagem do modelo: ${src}`));
    img.src = src;
  });
}

/**
 * Determines the exact QR string to encode on the plaque:
 * - If a valid BACEN EMV BR Code exists (either linked key or real PSP dynamic location), encodes that BR Code.
 * - If the plaque is unlinked (no Pix key registered yet and no PSP dynamic location provisioned),
 *   encodes the plaque's unique permanent identifier (never a Biosite URL or fake Pix key).
 */
export function resolvePlaqueQrContent(plaque: PlaqueItem): string {
  const existingPayload = (plaque.payload || '').trim();
  if (existingPayload.startsWith('000201')) {
    return existingPayload;
  }

  const cleanKey = (plaque.pixKey || '').trim();
  if (cleanKey.length > 0 && plaque.pixStatus !== 'unlinked') {
    return ''; // Caller will compute synchronous/async BR Code via generatePixPayload
  }

  const permId = plaque.permanentId || plaque.number || plaque.id;
  const qrId = plaque.qrId || `QR-${permId}`;
  return `GERAPIX:${permId}:${qrId}`;
}

/**
 * Renders a single plaque onto a high-resolution 1200x1200 canvas
 * and returns its Data URL (high print quality ~300 DPI for 10x10 cm).
 */
export async function renderPlaqueCanvas(
  plaque: PlaqueItem,
  model?: PlaqueModelConfig
): Promise<string> {
  const activeModel = resolvePlaqueModel(plaque.modelId, plaque.modelSnapshot, model);

  const canvas = document.createElement('canvas');
  const size = 1200; // 1200x1200 px for ultra-sharp 10x10cm printing
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Falha ao inicializar o contexto 2D do Canvas.');

  // 1. Draw exact base original model artwork
  const baseImg = await loadImage(activeModel.imageUrl);
  ctx.drawImage(baseImg, 0, 0, size, size);

  // 2. Compute pixel coordinates from calibrated coordinates
  const baseDim = activeModel.width || 1254;
  const scale = size / baseDim;

  // 3. Precision White Box Container strictly inside the inner white rounded area
  const wb = activeModel.whiteBox || {
    boxX: 672,
    boxY: 594,
    boxWidth: 448,
    boxHeight: 416,
    innerPadding: 16,
    boxBg: '#FFFFFF',
  };

  const boxX = Math.round(wb.boxX * scale);
  const boxY = Math.round(wb.boxY * scale);
  const boxW = Math.round(wb.boxWidth * scale);
  const boxH = Math.round(wb.boxHeight * scale);

  ctx.fillStyle = wb.boxBg || '#FFFFFF';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  // 4. Center QR Code inside the container box with internal safety margin (innerPadding)
  const innerPad = Math.round((wb.innerPadding ?? 16) * scale);
  const qrAvailableW = Math.max(10, boxW - 2 * innerPad);
  const qrAvailableH = Math.max(10, boxH - 2 * innerPad);
  const qrSize = Math.min(qrAvailableW, qrAvailableH);
  const qrX = Math.round(boxX + (boxW - qrSize) / 2);
  const qrY = Math.round(boxY + (boxH - qrSize) / 2);

  // 5. QR Content: Real BACEN EMV BR Code if linked/PSP dynamic, or exclusive permanent plaque identifier if unlinked
  let qrContent = resolvePlaqueQrContent(plaque);
  if (!qrContent && plaque.pixKey?.trim()) {
    const { generatePixPayload } = await import('./pix');
    qrContent = generatePixPayload({
      pixType: plaque.pixType || 'random',
      pixKey: plaque.pixKey.trim(),
      receiverName: plaque.receiverName || 'RECEBEDOR PIX',
      receiverCity: plaque.receiverCity || 'SAO PAULO',
      amount: plaque.amount,
      txId: plaque.txId || '***',
      rawPayload: plaque.pixType === 'payload' ? plaque.pixKey : undefined,
    });
  }

  // 6. Generate crisp QR code
  const qrDataUrl = await QRCode.toDataURL(qrContent, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: Math.round(qrSize),
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // 7. Draw discrete plaque numbering safely at bottom center clear zone
  const numX = (activeModel.numberX / 100) * size;
  const numY = (activeModel.numberY / 100) * size;
  const numFontSize = Math.round(((activeModel.numberSize || 18) / baseDim) * size);

  ctx.font = `700 ${numFontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = activeModel.numberColor || '#111827';
  ctx.textAlign = activeModel.numberAlign || 'center';
  ctx.textBaseline = 'middle';

  // Light text on dark band gets subtle dark contrast; dark text stays crisp without smudge
  const isLightText =
    activeModel.numberColor?.toUpperCase() === '#FDE047' ||
    activeModel.numberColor?.toUpperCase() === '#FFFFFF' ||
    activeModel.numberColor?.toUpperCase() === '#FFD600';

  if (isLightText) {
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  ctx.fillText(plaque.permanentId || plaque.number, numX, numY);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  return canvas.toDataURL('image/jpeg', 0.95);
}

export interface PdfGenerationProgress {
  current: number;
  total: number;
  percent: number;
  statusText: string;
}

/**
 * Generates an A4 PDF containing exactly 4 plaques (10x10 cm each) per sheet.
 * Includes professional subtle crop marks for graphic trimming.
 */
export async function generatePlaquesPdf(
  plaques: PlaqueItem[],
  model: PlaqueModelConfig,
  batchName: string,
  onProgress?: (progress: PdfGenerationProgress) => void
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210 x 297 mm
  });

  const plaqueSizeMm = 100; // 10 cm x 10 cm
  const marginX = (210 - plaqueSizeMm * 2) / 2; // 5 mm
  const marginY = (297 - plaqueSizeMm * 2) / 2; // 48.5 mm

  // Positions on A4 page (2 columns x 2 rows)
  const slotPositions = [
    { x: marginX, y: marginY }, // Top-Left
    { x: marginX + plaqueSizeMm, y: marginY }, // Top-Right
    { x: marginX, y: marginY + plaqueSizeMm }, // Bottom-Left
    { x: marginX + plaqueSizeMm, y: marginY + plaqueSizeMm }, // Bottom-Right
  ];

  const total = plaques.length;

  for (let i = 0; i < total; i++) {
    const plaque = plaques[i];
    const pageSlotIndex = i % 4;

    if (i > 0 && pageSlotIndex === 0) {
      doc.addPage('a4', 'portrait');
    }

    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        percent: Math.round(((i + 1) / total) * 100),
        statusText: `Renderizando plaquinha ${plaque.number} (${i + 1} de ${total})...`,
      });
    }

    const plaqueModel = resolvePlaqueModel(plaque.modelId, plaque.modelSnapshot, model);
    const imgDataUrl = await renderPlaqueCanvas(plaque, plaqueModel);

    const pos = slotPositions[pageSlotIndex];
    doc.addImage(
      imgDataUrl,
      'JPEG',
      pos.x,
      pos.y,
      plaqueSizeMm,
      plaqueSizeMm,
      undefined,
      'FAST'
    );

    // Draw professional hairline crop marks at plaque corners
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.1);

    // Outer corner ticks
    const tickLen = 3; // 3 mm ticks
    // Top-left corner marks
    doc.line(pos.x - tickLen, pos.y, pos.x, pos.y);
    doc.line(pos.x, pos.y - tickLen, pos.x, pos.y);
    // Top-right corner marks
    doc.line(pos.x + plaqueSizeMm, pos.y, pos.x + plaqueSizeMm + tickLen, pos.y);
    doc.line(pos.x + plaqueSizeMm, pos.y - tickLen, pos.x + plaqueSizeMm, pos.y);
    // Bottom-left corner marks
    doc.line(pos.x - tickLen, pos.y + plaqueSizeMm, pos.x, pos.y + plaqueSizeMm);
    doc.line(pos.x, pos.y + plaqueSizeMm, pos.x, pos.y + plaqueSizeMm + tickLen);
    // Bottom-right corner marks
    doc.line(pos.x + plaqueSizeMm, pos.y + plaqueSizeMm, pos.x + plaqueSizeMm + tickLen, pos.y + plaqueSizeMm);
    doc.line(pos.x + plaqueSizeMm, pos.y + plaqueSizeMm, pos.x + plaqueSizeMm, pos.y + plaqueSizeMm + tickLen);

    // Header and footer identification for print shop cutting organization
    if (pageSlotIndex === 3 || i === total - 1) {
      const pageNum = Math.floor(i / 4) + 1;
      const totalPages = Math.ceil(total / 4);
      const pageFirstIndex = Math.floor(i / 4) * 4;
      const firstNum = plaques[pageFirstIndex].number;
      const lastNum = plaque.number;

      // Top Sheet Header (outside cut boundary)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text(
        `FOLHA ${pageNum}/${totalPages} • LOTE: ${batchName.toUpperCase()} • PLAQUINHAS: ${firstNum} A ${lastNum} (4 UNID. POR FOLHA)`,
        105,
        22,
        { align: 'center' }
      );

      // Bottom Sheet Footer (outside cut boundary)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(130, 130, 130);
      doc.text(
        `GERAPIX PRO — Formato padrão 10x10 cm • Corte nas marcas guias • Página ${pageNum} de ${totalPages}`,
        105,
        290,
        { align: 'center' }
      );
    }
  }

  return doc.output('blob');
}
