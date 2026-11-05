import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { PlaqueItem, PlaqueModelConfig } from '../types';
import { getStoredModelConfigs } from './modelsData';

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
 * Renders a single plaque onto a high-resolution 1200x1200 canvas
 * and returns its Data URL (high print quality ~300 DPI for 10x10 cm).
 * Accurately aligns the real QR Pix over the model's illustrative area.
 */
export async function renderPlaqueCanvas(
  plaque: PlaqueItem,
  model: PlaqueModelConfig
): Promise<string> {
  // If the plaque has its own individual model assigned, resolve it
  const allModels = getStoredModelConfigs();
  const activeModel =
    plaque.modelId && plaque.modelId !== model.id
      ? allModels.find((m) => m.id === plaque.modelId) || model
      : model;

  const canvas = document.createElement('canvas');
  const size = 1200; // 1200x1200 px for ultra-sharp 10x10cm printing
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Falha ao inicializar o contexto 2D do Canvas.');

  // 1. Draw base original model image (800x800 scaled to 1200x1200)
  const baseImg = await loadImage(activeModel.imageUrl);
  ctx.drawImage(baseImg, 0, 0, size, size);

  // 2. Compute pixel coordinates from calibrated coordinates
  // Normalized to 800 base: scale = size / 800 = 1.5
  const scale = size / (activeModel.width || 800);
  
  let qrX = (activeModel.qrX / 100) * size;
  let qrY = (activeModel.qrY / 100) * size;
  let qrSize = (activeModel.qrSize / 100) * size;
  let maskPad = ((activeModel.maskPadding || 4) / 800) * size;

  if (activeModel.qrPosition) {
    qrX = activeModel.qrPosition.x * scale;
    qrY = activeModel.qrPosition.y * scale;
    qrSize = activeModel.qrPosition.size * scale;
    maskPad = (activeModel.qrPosition.padding || 4) * scale;
  }

  // 3. Cleanly erase previous illustrative QR code with matching background mask
  ctx.fillStyle = activeModel.maskBg || '#FFFFFF';
  ctx.fillRect(
    qrX - maskPad,
    qrY - maskPad,
    qrSize + maskPad * 2,
    qrSize + maskPad * 2
  );

  // 4. Generate real Pix QR Code with matching card background
  // Dynamic pointing link allows changing the Pix key even after physical printing!
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gerapix.pro';
  const pointingLink = plaque.pointingUrl || `${origin}/p/${plaque.id}`;
  const qrContent = plaque.qrMode === 'static_emv' ? plaque.payload : pointingLink;

  // Using error correction level 'M' for optimal camera scanning
  const qrDataUrl = await QRCode.toDataURL(qrContent, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: Math.round(qrSize),
    color: {
      dark: '#000000',
      light: activeModel.maskBg || '#FFFFFF',
    },
  });

  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // 5. Draw plaque numbering (#001 etc.)
  const numX = (activeModel.numberX / 100) * size;
  const numY = (activeModel.numberY / 100) * size;
  const numFontSize = Math.round(((activeModel.numberSize || 20) / 800) * size);

  ctx.font = `700 ${numFontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = activeModel.numberColor || '#FFD600';
  ctx.textAlign = activeModel.numberAlign || 'right';
  ctx.textBaseline = 'middle';

  // Subtle shadow for legibility over any background
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  ctx.fillText(plaque.number, numX, numY);

  // Reset shadow
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
  const allModels = getStoredModelConfigs();
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

    // Resolve individual model for this plaque if user changed its visual layout
    const plaqueModel = allModels.find((m) => m.id === plaque.modelId) || model;
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

    // Subtle footer caption with page numbering on the page
    if (pageSlotIndex === 3 || i === total - 1) {
      const pageNum = Math.floor(i / 4) + 1;
      const totalPages = Math.ceil(total / 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(
        `GERAPIX PRO — Lote: ${batchName} — Página ${pageNum} de ${totalPages} — Dimensão individual: 10x10 cm`,
        105,
        290,
        { align: 'center' }
      );
    }
  }

  return doc.output('blob');
}
