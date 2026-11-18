import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { validateBrCode } from './pix';
import {
  PixIntegrationConfig,
  PlaqueItem,
  PlaqueHistoryEntry,
  PlaqueQrState,
} from '../types';

const LOCAL_INTEGRATION_KEY = 'gerapix_integration_config_v1';

export const DEFAULT_INTEGRATION_CONFIG: PixIntegrationConfig = {
  provider: 'efi',
  enabled: false,
  supportsReceiverSwap: false,
  apiEndpoint: '',
  environment: 'production',
  defaultReceiverName: 'PIX',
  defaultReceiverCity: 'BRASIL',
};

export function getDefaultPixMetadata(config: PixIntegrationConfig | null): {
  receiverName: string;
  receiverCity: string;
} {
  return {
    receiverName: (config?.defaultReceiverName || 'PIX').trim().slice(0, 25),
    receiverCity: (config?.defaultReceiverCity || 'BRASIL').trim().slice(0, 15),
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
    supportsReceiverSwap: Boolean(config.supportsReceiverSwap),
    defaultReceiverName: (config.defaultReceiverName || 'PIX').trim().slice(0, 25),
    defaultReceiverCity: (config.defaultReceiverCity || 'BRASIL').trim().slice(0, 15),
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
  const endpoint = config?.apiEndpoint?.trim() || '';
  return Boolean(config?.enabled && (endpoint.startsWith('https://') || endpoint.startsWith('http://')));
}

export interface EndpointTestResult {
  ok: boolean;
  status?: number;
  supportsReceiverSwap?: boolean;
  message: string;
}

/**
 * Runs a real HTTP POST capability check against the configured PSP gateway endpoint.
 */
export async function testPspIntegrationEndpoint(
  config: PixIntegrationConfig
): Promise<EndpointTestResult> {
  const endpoint = (config.apiEndpoint || '').trim();
  if (!endpoint.startsWith('https://') && !endpoint.startsWith('http://')) {
    return {
      ok: false,
      message: 'Informe uma URL HTTP/HTTPS válida para o endpoint PSP.',
    };
  }

  const providerLabel = getProviderLabel(config.provider);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey?.trim()) {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        action: 'ping_capabilities',
        provider: config.provider,
        environment: config.environment,
      }),
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: `Endpoint ${providerLabel} respondeu HTTP ${res.status}. Verifique autenticação e rota.`,
      };
    }

    const data = await res.json().catch(() => ({}));
    const supportsSwap = Boolean(data?.supportsReceiverSwap || data?.receiverSwapSupported);

    return {
      ok: true,
      status: res.status,
      supportsReceiverSwap: supportsSwap,
      message: supportsSwap
        ? `Conectado a ${providerLabel} (HTTP ${res.status}). Suporte a troca de recebedor confirmado pelo endpoint.`
        : `Conectado a ${providerLabel} (HTTP ${res.status}), porém o endpoint não declarou supportsReceiverSwap=true.`,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Falha ao conectar em ${providerLabel}: ${err?.name === 'AbortError' ? 'tempo esgotado (8s)' : 'erro de rede ou bloqueio CORS'}.`,
    };
  }
}

/**
 * Attempts real dynamic QR location provisioning ONLY if an active PSP API endpoint is configured.
 * Strictly validates that the returned payload is a real BACEN dynamic BR Code (tag 26.25 location + valid CRC16).
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
    const rawBrCode =
      typeof data?.brcode === 'string'
        ? data.brcode.trim()
        : typeof data?.payload === 'string'
        ? data.payload.trim()
        : '';

    const check = rawBrCode ? validateBrCode(rawBrCode) : null;
    const locationUrl =
      (typeof data?.location === 'string' && data.location.trim()) ||
      (check?.details.isDynamic ? check.details.keyOrLocation : undefined);

    if (check && check.valid && check.details.isDynamic && locationUrl) {
      return {
        pspConfigured: true,
        pspSyncStatus: 'synced_psp',
        dynamicPayload: rawBrCode,
        pspLocationUrl: locationUrl,
        message: `Location dinâmica validada via ${providerLabel}.`,
      };
    }

    return {
      pspConfigured: true,
      pspSyncStatus: 'error',
      message: `Resposta do endpoint ${providerLabel} não retornou um BR Code dinâmico BACEN válido com location (26.25).`,
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
  qrState: PlaqueQrState;
  pspErrorMessage?: string;
  dynamicPayload?: string;
  pspLocationUrl?: string;
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
 * - Static BR Codes embed the key directly in the QR matrix (valid in banking apps when scanning the newly generated QR/PDF),
 *   and CANNOT mutate a pre-printed physical QR without a real dynamic PSP backend.
 * - Pre-printed plaque swap ONLY succeeds (`dynamic_psp_ready`) when:
 *   1) PSP endpoint is configured and explicitly authorized (`supportsReceiverSwap === true`),
 *   2) A valid dynamic location exists, AND
 *   3) The PSP API returns HTTP 2xx with explicit JSON confirmation (`updated: true` / `receiverUpdated: true` / `synced: true`).
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
  const existingCheck = plaque.payload ? validateBrCode(plaque.payload) : null;
  const hasPspDynamicLocation = Boolean(
    plaque.pspLocationUrl || (existingCheck?.valid && existingCheck.details.isDynamic)
  );

  // 1. No dynamic PSP connected -> static BR Code only; MUST require new QR/PDF
  if (!hasEndpoint) {
    return {
      success: true,
      pspConfigured: false,
      dynamicUpdated: false,
      requiresReprint: true,
      qrState: 'static_reprint_required',
      message:
        'Chave Pix salva e BR Code oficial gerado! Use o novo QR Code/PDF para pagamento no app do banco. Aviso: sem PSP dinâmico autorizado, um QR já impresso antes não recebe essa alteração.',
      historyEntry: {
        pixKey: cleanKey,
        updatedAt: now,
        note: 'Chave vinculada — BR Code estático gerado (placa pré-impressa requer novo QR/PDF)',
        status: 'pending_reprint',
      },
    };
  }

  // 2. Endpoint exists, but provider receiver/key swap is NOT explicitly supported & authorized
  if (!config?.supportsReceiverSwap) {
    const errMsg = `Provedor ${providerLabel} sem autorização explícita para troca de recebedor/chave em QR já impresso. Ative apenas se seu gateway suportar subcontas/roteamento dinâmico.`;
    return {
      success: true,
      pspConfigured: true,
      dynamicUpdated: false,
      requiresReprint: true,
      qrState: 'dynamic_psp_unsupported',
      pspErrorMessage: errMsg,
      message:
        'Chave salva com BR Code estático (novo QR/PDF disponível). O QR pré-impresso NÃO foi marcado como pronto pois o provedor não tem suporte autorizado para troca de recebedor.',
      historyEntry: {
        pixKey: cleanKey,
        updatedAt: now,
        note: `BR Code estático salvo; ${providerLabel} sem suporte autorizado para troca em QR já impresso`,
        status: 'pending_reprint',
      },
    };
  }

  // 3. PSP endpoint + explicit supportsReceiverSwap -> perform real HTTP call and require explicit confirmation
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
      const errMsg = `Endpoint ${providerLabel} retornou HTTP ${response.status}; plaquinha pré-impressa NÃO marcada como pronta.`;
      return {
        success: true,
        pspConfigured: true,
        dynamicUpdated: false,
        requiresReprint: true,
        qrState: 'dynamic_psp_unsupported',
        pspErrorMessage: errMsg,
        message: `Chave salva localmente com novo BR Code estático, mas a API ${providerLabel} falhou (HTTP ${response.status}).`,
        historyEntry: {
          pixKey: cleanKey,
          updatedAt: now,
          note: `Falha na troca dinâmica ${providerLabel} (HTTP ${response.status})`,
          status: 'pending_reprint',
        },
      };
    }

    const data = await response.json().catch(() => null);
    const confirmed = Boolean(
      data &&
        (data.updated === true ||
          data.receiverUpdated === true ||
          data.synced === true ||
          data.supported === true)
    );

    const returnedBrCode =
      typeof data?.brcode === 'string'
        ? data.brcode.trim()
        : typeof data?.payload === 'string'
        ? data.payload.trim()
        : undefined;
    const returnedCheck = returnedBrCode ? validateBrCode(returnedBrCode) : null;
    const returnedLocation =
      (typeof data?.location === 'string' && data.location.trim()) ||
      (returnedCheck?.valid && returnedCheck.details.isDynamic
        ? returnedCheck.details.keyOrLocation
        : undefined);

    const effectiveHasLocation = hasPspDynamicLocation || Boolean(returnedLocation);

    if (!confirmed || !effectiveHasLocation) {
      const errMsg = !confirmed
        ? `A resposta de ${providerLabel} não confirmou explicitamente a atualização de recebedor/chave (updated/receiverUpdated=true ausente).`
        : `Esta plaquinha não possui location dinâmica (ID 01=12 / 26.25) provisionada no ${providerLabel}.`;

      return {
        success: true,
        pspConfigured: true,
        dynamicUpdated: false,
        requiresReprint: true,
        qrState: 'dynamic_psp_unsupported',
        pspErrorMessage: errMsg,
        message: `Chave salva com BR Code estático, mas a placa pré-impressa NÃO está pronta para pagamento dinâmico: ${errMsg}`,
        historyEntry: {
          pixKey: cleanKey,
          updatedAt: now,
          note: `PSP ${providerLabel} não confirmou QR dinâmico pronto (${errMsg})`,
          status: 'pending_reprint',
        },
      };
    }

    return {
      success: true,
      pspConfigured: true,
      dynamicUpdated: true,
      requiresReprint: false,
      qrState: 'dynamic_psp_ready',
      dynamicPayload:
        returnedCheck?.valid && returnedCheck.details.isDynamic ? returnedBrCode : undefined,
      pspLocationUrl: returnedLocation || plaque.pspLocationUrl,
      message: `Chave Pix vinculada e confirmada no endpoint dinâmico ${providerLabel}.`,
      historyEntry: {
        pixKey: cleanKey,
        updatedAt: now,
        note: `Troca dinâmica confirmada via ${providerLabel} (ID ${plaque.permanentId || plaque.number})`,
        status: 'synced_psp',
      },
    };
  } catch (err: any) {
    const errMsg = `Sem resposta do endpoint ${providerLabel} (${err?.name === 'AbortError' ? 'tempo esgotado' : 'erro de rede/CORS'}).`;
    return {
      success: true,
      pspConfigured: true,
      dynamicUpdated: false,
      requiresReprint: true,
      qrState: 'dynamic_psp_unsupported',
      pspErrorMessage: errMsg,
      message: `Chave salva com novo BR Code estático, mas ${errMsg} Placa pré-impressa NÃO marcada como pronta.`,
      historyEntry: {
        pixKey: cleanKey,
        updatedAt: now,
        note: `Erro ao sincronizar ${providerLabel} — use o novo QR/PDF`,
        status: 'pending_reprint',
      },
    };
  }
}
