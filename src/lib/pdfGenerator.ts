import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { PlaqueItem, PlaqueModelConfig } from '../types';
import { resolvePlaqueModel } from './modelsData';
import { detectPixKeyType, generatePixPayload, validateBrCode } from './pix';

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
 * - If a VALID BACEN EMV BR Code exists (passes strict CRC16 + TLV + non-empty 62.05 check), encodes it
 *   (or regenerates cleanly if a static key was edited/stored with legacy broken payload).
 * - If a Pix key is linked, always generates a guaranteed valid BACEN BR Code via `generatePixPayload`.
 * - If unlinked (no Pix key and no PSP dynamic location), encodes the plaque's permanent ID (never a Biosite URL).
 */
export function resolvePlaqueQrContent(plaque: PlaqueItem): string {
  const existingPayload = (plaque.payload || '').trim();
  const cleanKey = (plaque.pixKey || '').trim();

  if (existingPayload.startsWith('000201')) {
    const check = validateBrCode(existingPayload);
    if (check.valid) {
      // Dynamic PSP QR location: preserve untouched
      if (check.details.isDynamic || plaque.pspLocationUrl) {
        return existingPayload;
      }
      // Static QR: ensure payload matches current key
      if (!cleanKey) {
        return existingPayload;
      }
      const detected = detectPixKeyType(cleanKey, plaque.pixType !== 'payload' ? plaque.pixType : undefined);
      const targetKey = detected.formattedKey || cleanKey;
      if (check.details.keyOrLocation === targetKey || plaque.pixType === 'payload') {
        return existingPayload;
      }
    }
  }

  if (cleanKey.length > 0 && plaque.pixStatus !== 'unlinked') {
    const detected = detectPixKeyType(
      cleanKey,
      plaque.pixType && plaque.pixType !== 'payload' ? plaque.pixType : undefined
    );
    const formattedKey = detected.formattedKey || cleanKey;
    return generatePixPayload({
      pixType: detected.type,
      pixKey: formattedKey,
      receiverName: plaque.receiverName || 'PIX',
      receiverCity: plaque.receiverCity || 'BRASIL',
      amount: plaque.amount,
      txId: plaque.txId || '***',
      rawPayload: detected.type === 'payload' ? cleanKey : undefined,
    });
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

  // 5. QR Content: Guaranteed validated BACEN EMV BR Code if linked/PSP dynamic, or permanent ID if unlinked
  const qrContent = resolvePlaqueQrContent(plaque);

  // 6. Generate crisp QR code with compliant quiet zone (margin: 2)
  const qrDataUrl = await QRCode.toDataURL(qrContent, {
    errorCorrectionLevel: 'M',
    margin: 2,
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

  const slotPositions = [
    { x: marginX, y: marginY },
    { x: marginX + plaqueSizeMm, y: marginY },
    { x: marginX, y: marginY + plaqueSizeMm },
    { x: marginX + plaqueSizeMm, y: marginY + plaqueSizeMm },
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

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.1);

    const tickLen = 3;
    doc.line(pos.x - tickLen, pos.y, pos.x, pos.y);
    doc.line(pos.x, pos.y - tickLen, pos.x, pos.y);
    doc.line(pos.x + plaqueSizeMm, pos.y, pos.x + plaqueSizeMm + tickLen, pos.y);
    doc.line(pos.x + plaqueSizeMm, pos.y - tickLen, pos.x + plaqueSizeMm, pos.y);
    doc.line(pos.x - tickLen, pos.y + plaqueSizeMm, pos.x, pos.y + plaqueSizeMm);
    doc.line(pos.x, pos.y + plaqueSizeMm, pos.x, pos.y + plaqueSizeMm + tickLen);
    doc.line(pos.x + plaqueSizeMm, pos.y + plaqueSizeMm, pos.x + plaqueSizeMm + tickLen, pos.y + plaqueSizeMm);
    doc.line(pos.x + plaqueSizeMm, pos.y + plaqueSizeMm, pos.x + plaqueSizeMm, pos.y + plaqueSizeMm + tickLen);

    if (pageSlotIndex === 3 || i === total - 1) {
      const pageNum = Math.floor(i / 4) + 1;
      const totalPages = Math.ceil(total / 4);
      const pageFirstIndex = Math.floor(i / 4) * 4;
      const firstNum = plaques[pageFirstIndex].number;
      const lastNum = plaque.number;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text(
        `FOLHA ${pageNum}/${totalPages} • LOTE: ${batchName.toUpperCase()} • PLAQUINHAS: ${firstNum} A ${lastNum} (4 UNID. POR FOLHA)`,
        105,
        22,
        { align: 'center' }
      );

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
