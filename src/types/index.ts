export type UserRole = 'user' | 'admin';
export type UserStatus = 'pending' | 'active' | 'blocked';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | 'payload';

export interface PixData {
  pixType: PixKeyType;
  pixKey: string;
  receiverName: string;
  receiverCity: string;
  amount?: number;
  txId?: string;
  rawPayload?: string;
}

export type QRPosition = {
  x: number; // in pixels relative to 800
  y: number; // in pixels relative to 800
  size: number; // in pixels relative to 800
  padding: number; // in pixels relative to 800
};

export interface QRWhiteBox {
  boxX: number; // in pixels relative to 800
  boxY: number; // in pixels relative to 800
  boxWidth: number; // in pixels relative to 800
  boxHeight: number; // in pixels relative to 800
  innerPadding: number; // internal safety padding from borders
  boxBg: string; // Background fill for the box (e.g. #FFFFFF)
}

export interface PlaqueModelConfig {
  id: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  // QR code position as percentage of 800x800
  qrX: number; // percentage (0-100)
  qrY: number; // percentage (0-100)
  qrSize: number; // percentage (0-100)
  qrPosition?: QRPosition; // Normalized 800px pixel coordinates
  whiteBox?: QRWhiteBox; // Bounded white container specification
  // Mask to cleanly erase demo QR
  maskBg: string; // color hex, e.g. '#ffffff' or '#000000'
  maskPadding: number; // pixels padding around mask
  // Numbering position (#001 etc.)
  numberX: number; // percentage (0-100)
  numberY: number; // percentage (0-100)
  numberColor: string;
  numberSize: number; // in pixels relative to 800
  numberAlign: 'left' | 'center' | 'right';
  description: string;
  category: string;
}

export type QrCodeMode = 'dynamic_link' | 'static_emv';
export type PlaquePixStatus = 'unlinked' | 'linked';
export type PspSyncStatus = 'pending_psp' | 'synced_psp' | 'error';

export interface PlaqueHistoryEntry {
  pixKey: string;
  updatedAt: string;
  note?: string;
  status: 'updated' | 'pending_reprint' | 'synced_psp';
}

export interface PlaqueItem {
  id: string;
  permanentId?: string; // Permanent unique identifier (e.g. PIX-0001-001)
  qrId?: string; // Exclusive permanent QR identifier for this physical plaque
  batchId: string;
  userId: string;
  number: string; // e.g. "PIX-0001-001"
  modelId: string;
  modelSnapshot?: PlaqueModelConfig;
  pixStatus?: PlaquePixStatus; // 'unlinked' (created without key) or 'linked' (buyer key registered)
  pspSyncStatus?: PspSyncStatus; // 'pending_psp' | 'synced_psp' | 'error'
  pspLocationUrl?: string; // Real dynamic PSP location URL if provisioned
  pixType: PixKeyType;
  pixKey: string; // Empty string when unlinked
  receiverName: string;
  receiverCity: string;
  amount?: number;
  txId?: string;
  payload: string; // Empty when unlinked without PSP, or BR Code 000201... when linked/PSP dynamic
  qrMode?: QrCodeMode;
  pointingUrl?: string;
  history?: PlaqueHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export type PixIntegrationProvider =
  | 'efi'
  | 'asaas'
  | 'mercadopago'
  | 'openpix'
  | 'custom_bacen';

export interface PixIntegrationConfig {
  provider: PixIntegrationProvider;
  enabled: boolean;
  apiEndpoint?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  pixKey?: string;
  certificatePem?: string;
  environment: 'sandbox' | 'production';
  defaultReceiverName: string;
  defaultReceiverCity: string;
  updatedAt?: string;
}

export interface PlaqueBatch {
  id: string;
  userId: string;
  name: string;
  modelId: string;
  modelSnapshot?: PlaqueModelConfig;
  quantity: 10 | 30 | 50 | 100;
  basePixData?: PixData;
  qrMode?: QrCodeMode;
  createdAt: string;
  updatedAt: string;
  plaques?: PlaqueItem[];
}

export type BiositeTheme =
  | 'neon_banking'
  | 'white_luxury'
  | 'glass_finance'
  | 'cyber_pix'
  | 'executive_card'
  | 'black_gold'
  | 'clean_white'
  | 'dark_premium'
  | 'neon_yellow'
  | 'banking_pro';

export interface BiositeCustomButton {
  label: string;
  url: string;
}

export interface BiositeItem {
  id: string;
  userId: string;
  receiverName: string;
  businessName?: string;
  description?: string;
  logoUrl?: string;
  bank: string;
  pixType: PixKeyType;
  pixKey: string;
  whatsapp?: string;
  instagram?: string;
  accentColor?: string;
  customButtons?: BiositeCustomButton[];
  theme: BiositeTheme;
  customMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface BankInfo {
  id: string;
  name: string;
  code: string;
  color: string;
  textColor: string;
  popular?: boolean;
}
