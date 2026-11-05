import { PixData, PixKeyType } from '../types';

/**
 * Computes CRC16-CCITT (polynomial 0x1021, init 0xFFFF) for Pix BR Code
 */
export function calculateCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Normalizes text to ASCII (removes accents/special characters for EMV compatibility)
 */
export function normalizeEmvText(text: string, maxLength: number): string {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .toUpperCase();
  return normalized.slice(0, maxLength);
}

/**
 * Formats an EMV field: ID + 2-digit length + Value
 */
function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Cleans and formats Pix keys according to BACEN standards
 */
export function formatPixKey(type: PixKeyType, rawKey: string): string {
  const trimmed = rawKey.trim();
  switch (type) {
    case 'cpf':
      return trimmed.replace(/\D/g, '').slice(0, 11);
    case 'cnpj':
      return trimmed.replace(/\D/g, '').slice(0, 14);
    case 'phone': {
      let digits = trimmed.replace(/\D/g, '');
      if (digits.startsWith('55') && digits.length >= 12) {
        return `+${digits}`;
      }
      if (digits.length === 10 || digits.length === 11) {
        return `+55${digits}`;
      }
      return trimmed.startsWith('+') ? trimmed : `+${digits}`;
    }
    case 'email':
      return trimmed.toLowerCase();
    case 'random':
      return trimmed.trim();
    default:
      return trimmed;
  }
}

/**
 * Validates a Pix key format
 */
export function validatePixKey(type: PixKeyType, key: string): { valid: boolean; message?: string } {
  const cleanKey = key.trim();
  if (!cleanKey) {
    return { valid: false, message: 'Chave Pix não pode ser vazia.' };
  }

  switch (type) {
    case 'cpf': {
      const digits = cleanKey.replace(/\D/g, '');
      if (digits.length !== 11) {
        return { valid: false, message: 'CPF deve conter exatamente 11 dígitos numéricos.' };
      }
      if (/^(\d)\1+$/.test(digits)) {
        return { valid: false, message: 'CPF inválido (todos os dígitos iguais).' };
      }
      // CPF Check digit validation
      let sum = 0;
      for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
      let rest = (sum * 10) % 11;
      if (rest === 10 || rest === 11) rest = 0;
      if (rest !== parseInt(digits[9])) return { valid: false, message: 'CPF inválido.' };

      sum = 0;
      for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
      rest = (sum * 10) % 11;
      if (rest === 10 || rest === 11) rest = 0;
      if (rest !== parseInt(digits[10])) return { valid: false, message: 'CPF inválido.' };
      return { valid: true };
    }

    case 'cnpj': {
      const digits = cleanKey.replace(/\D/g, '');
      if (digits.length !== 14) {
        return { valid: false, message: 'CNPJ deve conter 14 dígitos numéricos.' };
      }
      return { valid: true };
    }

    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanKey)) {
        return { valid: false, message: 'Formato de e-mail inválido.' };
      }
      return { valid: true };
    }

    case 'phone': {
      const digits = cleanKey.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) {
        return { valid: false, message: 'Telefone deve conter DDD e número (10 a 13 dígitos).' };
      }
      return { valid: true };
    }

    case 'random': {
      // UUID format 8-4-4-4-12
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (!uuidRegex.test(cleanKey) && cleanKey.length !== 32 && cleanKey.length !== 36) {
        return { valid: false, message: 'Chave aleatória inválida (formato UUID esperado).' };
      }
      return { valid: true };
    }

    case 'payload': {
      if (!cleanKey.startsWith('000201') || !cleanKey.includes('br.gov.bcb.pix')) {
        return { valid: false, message: 'Código Pix Copia e Cola inválido. Deve começar com 000201 e conter br.gov.bcb.pix.' };
      }
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

/**
 * Generates the official BACEN Pix BR Code EMV payload string
 */
export function generatePixPayload(data: PixData): string {
  // If user provided a raw Copia e Cola payload, validate and return
  if (data.pixType === 'payload' && data.rawPayload) {
    const raw = data.rawPayload.trim();
    if (raw.startsWith('000201')) {
      return raw;
    }
  }

  const cleanKey = formatPixKey(data.pixType, data.pixKey);
  const merchantName = normalizeEmvText(data.receiverName || 'RECEBEDOR PIX', 25) || 'RECEBEDOR PIX';
  const merchantCity = normalizeEmvText(data.receiverCity || 'BRASIL', 15) || 'BRASIL';
  const txId = data.txId ? normalizeEmvText(data.txId, 25) : '***';

  // ID 00: Payload Format Indicator
  let payload = formatEmvField('00', '01');

  // ID 01: Point of Initiation Method (11 = Static QR)
  payload += formatEmvField('01', '11');

  // ID 26: Merchant Account Information
  // 00: GUI (br.gov.bcb.pix)
  // 01: Pix Key
  const accountInfo = formatEmvField('00', 'br.gov.bcb.pix') + formatEmvField('01', cleanKey);
  payload += formatEmvField('26', accountInfo);

  // ID 52: Merchant Category Code (0000 = Not specified / generic)
  payload += formatEmvField('52', '0000');

  // ID 53: Transaction Currency (986 = BRL)
  payload += formatEmvField('53', '986');

  // ID 54: Transaction Amount (optional)
  if (data.amount && data.amount > 0) {
    const amountStr = data.amount.toFixed(2);
    payload += formatEmvField('54', amountStr);
  }

  // ID 58: Country Code
  payload += formatEmvField('58', 'BR');

  // ID 59: Merchant Name (Receiver Name)
  payload += formatEmvField('59', merchantName);

  // ID 60: Merchant City
  payload += formatEmvField('60', merchantCity);

  // ID 62: Additional Data Field Template (TxId / Reference Label)
  const additionalData = formatEmvField('05', txId);
  payload += formatEmvField('62', additionalData);

  // ID 63: CRC16 prefix
  payload += '6304';

  // Calculate CRC16 checksum
  const crc = calculateCrc16(payload);

  return payload + crc;
}

/**
 * Parses and extracts key information from an existing Pix payload string
 */
export function parsePixPayload(payload: string): Partial<PixData> | null {
  try {
    const clean = payload.trim();
    if (!clean.startsWith('000201')) return null;

    const result: Partial<PixData> = {
      rawPayload: clean,
    };

    let idx = 0;
    while (idx < clean.length - 4) {
      const id = clean.slice(idx, idx + 2);
      const len = parseInt(clean.slice(idx + 2, idx + 4), 10);
      const val = clean.slice(idx + 4, idx + 4 + len);
      idx += 4 + len;

      if (id === '26') {
        // Parse subfields
        let subIdx = 0;
        while (subIdx < val.length) {
          const subId = val.slice(subIdx, subIdx + 2);
          const subLen = parseInt(val.slice(subIdx + 2, subIdx + 4), 10);
          const subVal = val.slice(subIdx + 4, subIdx + 4 + subLen);
          subIdx += 4 + subLen;
          if (subId === '01') {
            result.pixKey = subVal;
          }
        }
      } else if (id === '54') {
        result.amount = parseFloat(val);
      } else if (id === '59') {
        result.receiverName = val;
      } else if (id === '60') {
        result.receiverCity = val;
      }
    }

    return result;
  } catch {
    return null;
  }
}
