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

export interface PlaqueItem {
  id: string;
  batchId: string;
  userId: string;
  number: string; // e.g. "#001"
  modelId: string;
  pixType: PixKeyType;
  pixKey: string;
  receiverName: string;
  receiverCity: string;
  amount?: number;
  txId?: string;
  payload: string; // Computed BR Code EMV string
  qrMode?: QrCodeMode; // 'dynamic_link' (default) or 'static_emv'
  pointingUrl?: string; // Direct pointing URL, e.g. https://.../p/:id
  createdAt: string;
  updatedAt: string;
}

export interface PlaqueBatch {
  id: string;
  userId: string;
  name: string;
  modelId: string;
  quantity: 10 | 30 | 50 | 100;
  basePixData: PixData;
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

export interface BiositeItem {
  id: string;
  userId: string;
  receiverName: string;
  bank: string;
  pixType: PixKeyType;
  pixKey: string;
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
