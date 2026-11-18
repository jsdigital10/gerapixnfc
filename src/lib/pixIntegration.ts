import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { PixIntegrationConfig, PlaqueItem, PlaqueHistoryEntry } from '../types';

const LOCAL_INTEGRATION_KEY = 'gerapix_integration_config_v1';

export const DEFAULT_INTEGRATION_CONFIG: PixIntegrationConfig = {
  provider: 'efi',
  enabled: false,
  apiEndpoint: '',
  environment: 'production',
  defaultReceiverName: 'RECEBEDOR PIX',
  defaultReceiverCity: 'SAO PAULO',
};

export function getDefaultPixMetadata(config: PixIntegrationConfig | null): {
  receiverName: string;
  receiverCity: string;
} {
  return {
    receiverName: (config?.defaultReceiverName || 'RECEBEDOR PIX').trim().slice(0, 25),
    receiverCity: (config?.defaultReceiverCity || 'SAO PAULO').trim().slice(0, 15),
  };
}

/**
 * Loads the Pix Integration settings for a given user from Firestore,
 * with fallback to local cache.
 */
export async function fetchPixIntegrationConfig(userId: string): Promise<PixIntegrationConfig> {
  if (!userId || userId === 'guest') return DEFAULT_INTEGRATION_CONFIG;

  try {
    const ref = doc(db, 'integration_settings', userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = {
        ...DEFAULT_INTEGRATION_CONFIG,
        ...(snap.data() as Partial<PixIntegrationConfig>),
      };
      localStorage.setItem(`${LOCAL_INTEGRATION_KEY}_${userId}`, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Firestore fetchPixIntegrationConfig notice:', err);
  }

  try {
    const raw = localStorage.getItem(`${LOCAL_INTEGRATION_KEY}_${userId}`);
    if (raw) {
      return {
        ...DEFAULT_INTEGRATION_CONFIG,
        ...JSON.parse(raw),
      };
    }
  } catch {}

  return DEFAULT_INTEGRATION_CONFIG;
}

/**
 * Saves the Pix Integration settings for a user into Firestore and local cache.
 */
export async function savePixIntegrationConfig(
  userId: string,
  config: PixIntegrationConfig
): Promise<void> {
  if (!userId || userId === 'guest') return;

  const payload: PixIntegrationConfig = {
    ...config,
    defaultReceiverName: (config.defaultReceiverName || 'RECEBEDOR PIX').trim().slice(0, 25),
    defaultReceiverCity: (config.defaultReceiverCity || 'SAO PAULO').trim().slice(0, 15),
    updatedAt: new Date().toISOString(),
  };

  try {
    const ref = doc(db, 'integration_settings', userId);
    await setDoc(ref, {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore savePixIntegrationConfig notice, writing to cache:', err);
  }

  try {
    localStorage.setItem(`${LOCAL_INTEGRATION_KEY}_${userId}`, JSON.stringify(payload));
  } catch {}
}

export interface DynamicProvisionResult {
  pspConfigured: boolean;
  pspSyncStatus: 'pending_psp' | 'synced_psp' | 'error';
  dynamicPayload?: string;
  pspLocationUrl?: string;
  message: string;
}

export function isPspDynamicConfigured(config: PixIntegrationConfig | null): boolean {
  return Boolean(config?.enabled && config.apiEndpoint?.trim());
}

/**
 * Attempts real dynamic QR location provisioning ONLY if an active PSP API endpoint is configured.
 * Never simulates or fakes a dynamic banking location when PSP is not integrated.
 */
export async function provisionDynamicPlaqueLocation(
  plaque: Pick<PlaqueItem, 'id' | 'permanentId' | 'qrId' | 'number'>,
  config: PixIntegrationConfig | null
): Promise<DynamicProvisionResult> {
  if (!isPspDynamicConfigured(config)) {
    return {
      pspConfigured: false,
      pspSyncStatus: 'pending_psp',
      message:
        'Integração PSP dinâmica pendente: configure uma API Pix PSP em Minha Conta para emitir QR imutável antes da venda.',
    };
  }

  const providerLabel = getProviderLabel(config?.provider);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config?.apiKey?.trim()) {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    }

    const response = await fetch(config!.apiEndpoint!.trim(), {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        action: 'provision_plaque',
        permanentId: plaque.permanentId || plaque.number,
        qrId: plaque.qrId,
        plaqueId: plaque.id,
        provider: config?.provider,
        environment: config?.environment,
      }),
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        pspConfigured: true,
        pspSyncStatus: 'error',
        message: `Endpoint ${providerLabel} retornou HTTP ${response.status} ao provisionar location dinâmica.`,
      };
    }

    const data = await response.json().catch(() => ({}));
    const brCode = typeof data?.brcode === 'string' && data.brcode.startsWith('000201')
      ? data.brcode
      : typeof data?.payload === 'string' && data.payload.startsWith('000201')
      ? data.payload
      : undefined;
    const locationUrl = typeof data?.location === 'string' ? data.location : undefined;

    if (brCode) {
      return {
        pspConfigured: true,
        pspSyncStatus: 'synced_psp',
        dynamicPayload: brCode,
        pspLocationUrl: locationUrl,
        message: `Location dinâmica provisionada via ${providerLabel}.`,
      };
    }

    return {
      pspConfigured: true,
      pspSyncStatus: 'error',
      message: `Resposta do endpoint ${providerLabel} não retornou um BR Code dinâmico válido.`,
    };
  } catch (err: any) {
    return {
      pspConfigured: true,
      pspSyncStatus: 'error',
      message: `Falha ao conectar ao endpoint ${providerLabel} (${err?.name === 'AbortError' ? 'tempo esgotado' : 'erro de rede/CORS'}).`,
    };
  }
}

export interface DynamicUpdateResult {
  success: boolean;
  pspConfigured: boolean;
  dynamicUpdated: boolean;
  requiresReprint: boolean;
  message: string;
  historyEntry: PlaqueHistoryEntry;
}

function getProviderLabel(provider?: PixIntegrationConfig['provider']): string {
  switch (provider) {
    case 'efi':
      return 'Efí Bank';
    case 'asaas':
      return 'Asaas';
    case 'mercadopago':
      return 'Mercado Pago';
    case 'openpix':
      return 'OpenPix';
    default:
      return 'API Pix BACEN';
  }
}

/**
 * Honest update handler for linking or swapping a plaque Pix key:
 * - Static BR Codes embed the key inside the QR matrix and require a new QR/PDF print unless a real PSP dynamic location is connected.
 * - Remote dynamic updates are only attempted when an active PSP API endpoint is configured and returns HTTP 2xx. Never simulates fake dynamic updates.
 */
export async function updateDynamicPlaqueDestination(
  plaque: PlaqueItem,
  newPixKey: string,
  config: PixIntegrationConfig | null
): Promise<DynamicUpdateResult> {
  const now = new Date().toISOString();
  const cleanKey = newPixKey.trim();
  const providerLabel = getProviderLabel(config?.provider);

  const hasEndpoint = isPspDynamicConfigured(config);
  const hasPspDynamicLocation = Boolean(
    plaque.pspLocationUrl ||
      (plaque.payload && plaque.payload.startsWith('000201010212'))
  );

  if (!hasEndpoint) {
    return {
      success: true,
      pspConfigured: false,
      dynamicUpdated: false,
      requiresReprint: true,
      message:
        'Chave Pix vinculada e salva no lote! Novo QR Code BR Code gerado. Nota: sem integração PSP dinâmica em Minha Conta, placas já impressas anteriormente não mudam o QR físico.',
      historyEntry: {
        pixKey: cleanKey,
        updatedAt: now,
        note: 'Chave Pix vinculada (integração PSP dinâmica pendente)',
        status: 'pending_reprint',
      },
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config?.apiKey?.trim()) {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    }

    const response = await fetch(config!.apiEndpoint!.trim(), {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        action: 'update_pix_key',
        permanentId: plaque.permanentId || plaque.number,
        qrId: plaque.qrId,
        plaqueId: plaque.id,
        txId: plaque.txId || plaque.id,
        pixKey: cleanKey,
        pspLocationUrl: plaque.pspLocationUrl,
        provider: config?.provider,
        environment: config?.environment,
      }),
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: true,
        pspConfigured: true,
        dynamicUpdated: false,
        requiresReprint: true,
        message: `Chave salva na plaquinha, mas o endpoint ${providerLabel} retornou HTTP ${response.status}.`,
        historyEntry: {
          pixKey: cleanKey,
          updatedAt: now,
          note: `Salvo na conta; falha na sincronização ${providerLabel} (HTTP ${response.status})`,
          status: 'pending_reprint',
        },
      };
    }

    if (!hasPspDynamicLocation) {
      return {
        success: true,
        pspConfigured: true,
        dynamicUpdated: false,
        requiresReprint: true,
        message: `Chave registrada no endpoint ${providerLabel}. Como esta unidade não possui location dinâmica (ID 01=12), utilize o novo QR/PDF se precisar atualizar uma placa já impressa.`,
        historyEntry: {
          pixKey: cleanKey,
          updatedAt: now,
          note: `Registrado em ${providerLabel} (sem location dinâmica vinculada)`,
          status: 'pending_reprint',
        },
      };
    }

    return {
      success: true,
      pspConfigured: true,
      dynamicUpdated: true,
      requiresReprint: false,
      message: `Chave Pix vinculada e sincronizada na API dinâmica ${providerLabel}.`,
      historyEntry: {
        pixKey: cleanKey,
        updatedAt: now,
        note: `Sincronizado via ${providerLabel} (ID ${plaque.permanentId || plaque.number})`,
        status: 'synced_psp',
      },
    };
  } catch (err: any) {
    return {
      success: true,
      pspConfigured: true,
      dynamicUpdated: false,
      requiresReprint: true,
      message: `Chave salva na conta. Não foi possível conectar ao endpoint ${providerLabel} (${err?.name === 'AbortError' ? 'tempo esgotado' : 'erro de rede/CORS'}).`,
      historyEntry: {
        pixKey: cleanKey,
        updatedAt: now,
        note: `Salvo na conta; sem resposta do endpoint ${providerLabel}`,
        status: 'pending_reprint',
      },
    };
  }
}
