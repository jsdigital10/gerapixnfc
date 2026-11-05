import { PlaqueModelConfig } from '../types';

export const DEFAULT_PLAQUE_MODELS: PlaqueModelConfig[] = [
  {
    id: 'model-01',
    name: 'Modelo 01 — Black Gold Deluxe',
    imageUrl: '/models/model1.png',
    width: 800,
    height: 800,
    // Exact calibrated QR position on the right card:
    // (x: 384px, y: 420px, size: 288px, padding: 4px relative to 800)
    qrX: 48.0,
    qrY: 52.5,
    qrSize: 36.0,
    qrPosition: {
      x: 384,
      y: 420,
      size: 288,
      padding: 4,
    },
    maskBg: '#FDF1E2',
    maskPadding: 4,
    numberX: 85,
    numberY: 93,
    numberColor: '#FFD600',
    numberSize: 20,
    numberAlign: 'right',
    description: 'Design premium preto com acabamento em ouro e QR Code perfeitamente integrado no cartão.',
    category: 'Premium Dark'
  },
  {
    id: 'model-02',
    name: 'Modelo 02 — Dark Tech NFC',
    imageUrl: '/models/model2.png',
    width: 800,
    height: 800,
    // (x: 382px, y: 428px, size: 288px, padding: 4px relative to 800)
    qrX: 47.75,
    qrY: 53.5,
    qrSize: 36.0,
    qrPosition: {
      x: 382,
      y: 428,
      size: 288,
      padding: 4,
    },
    maskBg: '#F2EAFE',
    maskPadding: 4,
    numberX: 85,
    numberY: 93,
    numberColor: '#00BFFF',
    numberSize: 20,
    numberAlign: 'right',
    description: 'Estilo tecnológico com indicação de aproximação NFC à esquerda e QR Pix à direita.',
    category: 'Tecnologia'
  },
  {
    id: 'model-03',
    name: 'Modelo 03 — Pix, WhatsApp & Wi-Fi',
    imageUrl: '/models/model3.jpg',
    width: 800,
    height: 800,
    // (x: 382px, y: 436px, size: 276px, padding: 4px relative to 800)
    qrX: 47.75,
    qrY: 54.5,
    qrSize: 34.5,
    qrPosition: {
      x: 382,
      y: 436,
      size: 276,
      padding: 4,
    },
    maskBg: '#FFFFFF',
    maskPadding: 4,
    numberX: 85,
    numberY: 93,
    numberColor: '#FFD600',
    numberSize: 20,
    numberAlign: 'right',
    description: 'Modelo versátil de balcão com QR Code perfeitamente alinhado na área reservada.',
    category: 'Comércio'
  },
  {
    id: 'model-04',
    name: 'Modelo 04 — Neon Gold Luxury',
    imageUrl: '/models/model4.png',
    width: 800,
    height: 800,
    // (x: 382px, y: 422px, size: 296px, padding: 4px relative to 800)
    qrX: 47.75,
    qrY: 52.75,
    qrSize: 37.0,
    qrPosition: {
      x: 382,
      y: 422,
      size: 296,
      padding: 4,
    },
    maskBg: '#FAF9F9',
    maskPadding: 4,
    numberX: 85,
    numberY: 93,
    numberColor: '#FFD600',
    numberSize: 20,
    numberAlign: 'right',
    description: 'Alto contraste com borda neon e QR Code preservando a arte e textos circundantes.',
    category: 'Neon'
  },
  {
    id: 'model-05',
    name: 'Modelo 05 — Executive Banking',
    imageUrl: '/models/model5.png',
    width: 800,
    height: 800,
    // (x: 380px, y: 414px, size: 294px, padding: 4px relative to 800)
    qrX: 47.5,
    qrY: 51.75,
    qrSize: 36.75,
    qrPosition: {
      x: 380,
      y: 414,
      size: 294,
      padding: 4,
    },
    maskBg: '#F4F7FB',
    maskPadding: 4,
    numberX: 85,
    numberY: 93,
    numberColor: '#00BFFF',
    numberSize: 20,
    numberAlign: 'right',
    description: 'Visual executivo elegante com enquadramento de QR Code milimetricamente ajustado.',
    category: 'Corporativo'
  }
];

const LOCAL_STORAGE_MODELS_KEY = 'gerapix_custom_models_config_v2';

export function getStoredModelConfigs(): PlaqueModelConfig[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MODELS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === DEFAULT_PLAQUE_MODELS.length && parsed[0]?.qrPosition) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_PLAQUE_MODELS;
}

export function saveStoredModelConfigs(configs: PlaqueModelConfig[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_MODELS_KEY, JSON.stringify(configs));
  } catch {
    // Ignore storage errors
  }
}
