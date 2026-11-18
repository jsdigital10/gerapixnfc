import { PixData, PixKeyType } from '../types';

const textEncoder = new TextEncoder();

/**
 * Computes CRC16-CCITT (polynomial 0x1021, init 0xFFFF) over UTF-8 bytes
 * strictly according to EMVCo / BACEN Pix BR Code specification.
 */
export function calculateCrc16(payload: string): string {
  const bytes = textEncoder.encode(payload);
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
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
 * Normalizes merchant name / city text to clean ASCII for EMV compatibility.
 * Note: NEVER use this for TxID (`***`), use `formatPixTxId` instead.
 */
export function normalizeEmvText(text: string, maxLength: number): string {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  return normalized.slice(0, maxLength);
}

/**
 * Formats TxID strictly per BACEN Pix BR Code spec:
 * Either literal '***' (when empty/unspecified) or 1..25 alphanumeric chars [A-Za-z0-9] without spaces.
 */
export function formatPixTxId(rawTxId?: string): string {
  const trimmed = (rawTxId || '').trim();
  if (!trimmed || trimmed === '***') {
    return '***';
  }
  const clean = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 25);
  return clean || '***';
}

/**
 * Formats an EMVCo TLV field: ID + 2-digit UTF-8 byte length + Value
 */
function formatEmvField(id: string, value: string): string {
  const byteLen = textEncoder.encode(value).length;
  const len = byteLen.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Cleans and formats Pix keys strictly according to BACEN DICT standards
 */
export function formatPixKey(type: PixKeyType, rawKey: string): string {
  const trimmed = rawKey.trim();
  switch (type) {
    case 'cpf':
      return trimmed.replace(/\D/g, '').slice(0, 11);
    case 'cnpj':
      return trimmed.replace(/\D/g, '').slice(0, 14);
    case 'phone': {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
        return `+${digits}`;
      }
      if (digits.length === 10 || digits.length === 11) {
        return `+55${digits}`;
      }
      if (trimmed.startsWith('+') && digits.length >= 10) {
        return `+${digits}`;
      }
      return digits ? `+55${digits}` : '';
    }
    case 'email':
      return trimmed.toLowerCase();
    case 'random':
      return trimmed.toLowerCase();
    default:
      return trimmed;
  }
}

export interface DetectedPixKey {
  type: PixKeyType;
  label: string;
  formattedKey: string;
  isValid: boolean;
  isAmbiguousCpfOrPhone?: boolean;
  message?: string;
}

/**
 * Automatically detects the Pix key type from user input.
 * Identifies Phone (celular), CPF, CNPJ, E-mail, Random EVP key, or Pix Copia e Cola payload.
 * Flags 11-digit numbers that could validly be either CPF or Brazilian mobile phone so the user can toggle if needed.
 */
export function detectPixKeyType(
  rawInput: string,
  forcedType?: PixKeyType
): DetectedPixKey {
  const clean = rawInput.trim();
  if (!clean) {
    return {
      type: 'random',
      label: 'Aguardando chave',
      formattedKey: '',
      isValid: false,
      message: 'Cole ou digite CPF, CNPJ, Celular, E-mail ou Chave Aleatória.',
    };
  }

  // Respect explicit user override (e.g., switching 11-digit number between CPF and Celular)
  if (forcedType && forcedType !== 'payload') {
    const formatted = formatPixKey(forcedType, clean);
    const val = validatePixKey(forcedType, formatted);
    const labels: Record<PixKeyType, string> = {
      cpf: 'CPF',
      cnpj: 'CNPJ',
      phone: 'Celular (+55)',
      email: 'E-mail',
      random: 'Chave Aleatória',
      payload: 'Pix Copia e Cola',
    };
    const digitsOnly = clean.replace(/\D/g, '');
    const is11MobileAndCpf =
      digitsOnly.length === 11 &&
      parseInt(digitsOnly.slice(0, 2), 10) >= 11 &&
      digitsOnly[2] === '9' &&
      validatePixKey('cpf', digitsOnly).valid;

    return {
      type: forcedType,
      label: labels[forcedType],
      formattedKey: formatted,
      isValid: val.valid,
      isAmbiguousCpfOrPhone: is11MobileAndCpf,
      message: val.message,
    };
  }

  // 1. Pix Copia e Cola (EMV Payload)
  if (clean.startsWith('000201') || clean.includes('br.gov.bcb.pix')) {
    const check = validateBrCode(clean);
    return {
      type: 'payload',
      label: 'Pix Copia e Cola',
      formattedKey: clean,
      isValid: check.valid,
      message: check.valid ? undefined : check.errors[0] || 'Código Pix Copia e Cola inválido.',
    };
  }

  // 2. Email
  if (clean.includes('@')) {
    const formatted = clean.toLowerCase();
    const val = validatePixKey('email', formatted);
    return {
      type: 'email',
      label: 'E-mail',
      formattedKey: formatted,
      isValid: val.valid,
      message: val.message,
    };
  }

  // 3. Chave Aleatória (EVP / UUID — always lowercase per BACEN DICT)
  const uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (uuidRegex.test(clean)) {
    return {
      type: 'random',
      label: 'Chave Aleatória',
      formattedKey: clean.toLowerCase(),
      isValid: true,
    };
  }
  if (clean.length === 32 && /^[0-9a-fA-F]+$/.test(clean)) {
    const lower = clean.toLowerCase();
    const hyphenated = `${lower.slice(0, 8)}-${lower.slice(8, 12)}-${lower.slice(12, 16)}-${lower.slice(16, 20)}-${lower.slice(20)}`;
    return {
      type: 'random',
      label: 'Chave Aleatória',
      formattedKey: hyphenated,
      isValid: true,
    };
  }

  const digitsOnly = clean.replace(/\D/g, '');

  // 4. CNPJ (14 digits)
  if (digitsOnly.length === 14 && !clean.startsWith('+')) {
    const val = validatePixKey('cnpj', digitsOnly);
    return {
      type: 'cnpj',
      label: 'CNPJ',
      formattedKey: digitsOnly,
      isValid: val.valid,
      message: val.message,
    };
  }

  // 5. Phone with explicit + or Country Code 55 (+55...)
  if (
    clean.startsWith('+') ||
    (digitsOnly.startsWith('55') && (digitsOnly.length === 12 || digitsOnly.length === 13))
  ) {
    let num = digitsOnly;
    if (!num.startsWith('55')) num = '55' + num;
    const isValid = num.length === 12 || num.length === 13;
    return {
      type: 'phone',
      label: 'Celular (+55)',
      formattedKey: `+${num}`,
      isValid,
      message: isValid ? undefined : 'Telefone deve conter DDD e número.',
    };
  }

  // 6. 11 digits: CPF or Brazilian Mobile Phone (DDD + 9xxxx-xxxx)
  if (digitsOnly.length === 11) {
    const looksLikeFormattedPhone = clean.includes('(') || clean.includes(' ');
    const ddd = parseInt(digitsOnly.slice(0, 2), 10);
    const ninthDigit = digitsOnly[2];
    const cpfVal = validatePixKey('cpf', digitsOnly);
    const couldBeMobile = ddd >= 11 && ddd <= 99 && ninthDigit === '9';

    if (looksLikeFormattedPhone && couldBeMobile) {
      return {
        type: 'phone',
        label: 'Celular (+55)',
        formattedKey: `+55${digitsOnly}`,
        isValid: true,
        isAmbiguousCpfOrPhone: cpfVal.valid,
      };
    }

    if (cpfVal.valid) {
      return {
        type: 'cpf',
        label: 'CPF',
        formattedKey: digitsOnly,
        isValid: true,
        isAmbiguousCpfOrPhone: couldBeMobile,
      };
    }

    if (couldBeMobile) {
      return {
        type: 'phone',
        label: 'Celular (+55)',
        formattedKey: `+55${digitsOnly}`,
        isValid: true,
      };
    }

    return {
      type: 'cpf',
      label: 'CPF',
      formattedKey: digitsOnly,
      isValid: false,
      message: cpfVal.message || 'CPF inválido.',
    };
  }

  // 7. 10 digits: Landline with DDD
  if (digitsOnly.length === 10) {
    const ddd = parseInt(digitsOnly.slice(0, 2), 10);
    if (ddd >= 11 && ddd <= 99) {
      return {
        type: 'phone',
        label: 'Telefone (+55)',
        formattedKey: `+55${digitsOnly}`,
        isValid: true,
      };
    }
  }

  if (digitsOnly.length > 0 && digitsOnly.length < 11) {
    return {
      type: 'phone',
      label: 'Celular ou CPF',
      formattedKey: digitsOnly,
      isValid: false,
      message: 'Digite o CPF completo (11 dígitos) ou celular com DDD.',
    };
  }

  if (digitsOnly.length > 11 && digitsOnly.length < 14) {
    return {
      type: 'cnpj',
      label: 'CNPJ',
      formattedKey: digitsOnly,
      isValid: false,
      message: 'CNPJ incompleto (14 dígitos esperados).',
    };
  }

  return {
    type: 'random',
    label: 'Chave Aleatória',
    formattedKey: clean.toLowerCase(),
    isValid: uuidRegex.test(clean),
    message: uuidRegex.test(clean)
      ? undefined
      : 'Formato de chave Pix não reconhecido. Use CPF, CNPJ, Celular, E-mail ou Chave Aleatória UUID.',
  };
}

/**
 * Validates a Pix key format & check digits
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
      if (/^(\d)\1+$/.test(digits)) {
        return { valid: false, message: 'CNPJ inválido (todos os dígitos iguais).' };
      }
      // CNPJ checksum validation
      const calcDigit = (base: string, weights: number[]) => {
        let sum = 0;
        for (let i = 0; i < weights.length; i++) {
          sum += parseInt(base[i]) * weights[i];
        }
        const rem = sum % 11;
        return rem < 2 ? 0 : 11 - rem;
      };
      const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      if (
        calcDigit(digits, w1) !== parseInt(digits[12]) ||
        calcDigit(digits, w2) !== parseInt(digits[13])
      ) {
        return { valid: false, message: 'CNPJ inválido (dígito verificador incorreto).' };
      }
      return { valid: true };
    }

    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanKey) || cleanKey.length > 77) {
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
      const uuidRegex =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (!uuidRegex.test(cleanKey)) {
        return { valid: false, message: 'Chave aleatória inválida (UUID esperado).' };
      }
      return { valid: true };
    }

    case 'payload': {
      const check = validateBrCode(cleanKey);
      return { valid: check.valid, message: check.errors[0] };
    }

    default:
      return { valid: true };
  }
}

/**
 * Generates an official BACEN Pix BR Code EMV static payload string.
 * Fixes TxID ('***' -> '0503***'), non-empty ASCII fields 59/60, lowercase UUIDs, and exact CRC16-CCITT.
 */
export function generatePixPayload(data: PixData): string {
  if (data.pixType === 'payload' && data.rawPayload) {
    const raw = data.rawPayload.trim();
    if (raw.startsWith('000201')) {
      return raw;
    }
  }

  const cleanKey = formatPixKey(data.pixType, data.pixKey);
  if (!cleanKey) {
    throw new Error('Não é possível gerar BR Code Pix sem uma chave Pix válida.');
  }

  // Neutral ASCII defaults that never invent a fake person/company name when omitted
  const merchantName = normalizeEmvText(data.receiverName || 'PIX', 25) || 'PIX';
  const merchantCity = normalizeEmvText(data.receiverCity || 'BRASIL', 15) || 'BRASIL';
  const txId = formatPixTxId(data.txId);

  // ID 00: Payload Format Indicator (01)
  let payload = formatEmvField('00', '01');

  // ID 01: Point of Initiation Method (11 = Static QR reusable)
  payload += formatEmvField('01', '11');

  // ID 26: Merchant Account Information (GUI br.gov.bcb.pix + 01 Pix Key)
  const accountInfo = formatEmvField('00', 'br.gov.bcb.pix') + formatEmvField('01', cleanKey);
  payload += formatEmvField('26', accountInfo);

  // ID 52: Merchant Category Code (0000)
  payload += formatEmvField('52', '0000');

  // ID 53: Transaction Currency (986 = BRL)
  payload += formatEmvField('53', '986');

  // ID 54: Transaction Amount (optional)
  if (data.amount && data.amount > 0) {
    payload += formatEmvField('54', data.amount.toFixed(2));
  }

  // ID 58: Country Code (BR)
  payload += formatEmvField('58', 'BR');

  // ID 59: Merchant Name (1..25 ASCII chars)
  payload += formatEmvField('59', merchantName);

  // ID 60: Merchant City (1..15 ASCII chars)
  payload += formatEmvField('60', merchantCity);

  // ID 62: Additional Data Field Template (05 = TxID, '***' -> '0503***')
  const additionalData = formatEmvField('05', txId);
  payload += formatEmvField('62', additionalData);

  // ID 63: CRC16 prefix + checksum
  payload += '6304';
  const crc = calculateCrc16(payload);

  return payload + crc;
}

export interface BrCodeValidationResult {
  valid: boolean;
  errors: string[];
  details: {
    pointOfInitiation?: string;
    isDynamic: boolean;
    gui?: string;
    keyOrLocation?: string;
    merchantName?: string;
    merchantCity?: string;
    txId?: string;
    crc: string;
    expectedCrc: string;
  };
}

/**
 * Parses and strictly validates an EMVCo / BACEN Pix BR Code string,
 * verifying TLV lengths, required tags (00, 26, 52, 53, 58, 59, 60, 62.05, 63), and CRC16.
 */
export function validateBrCode(rawPayload: string): BrCodeValidationResult {
  const clean = (rawPayload || '').trim();
  const errors: string[] = [];
  const details: BrCodeValidationResult['details'] = {
    isDynamic: false,
    crc: '',
    expectedCrc: '',
  };

  if (clean.length < 40 || !clean.startsWith('000201')) {
    errors.push('Payload deve iniciar com 000201 (EMV BR Code).');
    return { valid: false, errors, details };
  }

  const crcTagPos = clean.length - 8;
  if (clean.slice(crcTagPos, crcTagPos + 4) !== '6304') {
    errors.push('Campo 6304 (CRC16) ausente ou fora de posição.');
    return { valid: false, errors, details };
  }

  details.crc = clean.slice(-4).toUpperCase();
  details.expectedCrc = calculateCrc16(clean.slice(0, -4));
  if (details.crc !== details.expectedCrc) {
    errors.push(`CRC16 inválido (${details.crc} != ${details.expectedCrc}).`);
  }

  const topTags = new Map<string, string>();
  let idx = 0;
  while (idx < clean.length - 4) {
    const id = clean.slice(idx, idx + 2);
    const lenStr = clean.slice(idx + 2, idx + 4);
    const len = parseInt(lenStr, 10);
    if (!/^\d{2}$/.test(lenStr) || isNaN(len) || idx + 4 + len > clean.length) {
      errors.push(`Erro de tamanho TLV no campo ${id}.`);
      break;
    }
    const val = clean.slice(idx + 4, idx + 4 + len);
    topTags.set(id, val);
    idx += 4 + len;
  }

  if (topTags.get('00') !== '01') errors.push('Campo 00 inválido.');
  details.pointOfInitiation = topTags.get('01');

  const tag26 = topTags.get('26');
  if (!tag26) {
    errors.push('Campo 26 (Conta Pix) ausente.');
  } else {
    let sIdx = 0;
    const sub26 = new Map<string, string>();
    while (sIdx < tag26.length) {
      const sId = tag26.slice(sIdx, sIdx + 2);
      const sLen = parseInt(tag26.slice(sIdx + 2, sIdx + 4), 10);
      if (isNaN(sLen) || sIdx + 4 + sLen > tag26.length) {
        errors.push('Subcampo inválido dentro da tag 26.');
        break;
      }
      sub26.set(sId, tag26.slice(sIdx + 4, sIdx + 4 + sLen));
      sIdx += 4 + sLen;
    }
    details.gui = sub26.get('00');
    if ((details.gui || '').toLowerCase() !== 'br.gov.bcb.pix') {
      errors.push('GUI Pix inválido (esperado br.gov.bcb.pix).');
    }
    if (sub26.has('25') && sub26.get('25')) {
      details.isDynamic = true;
      details.keyOrLocation = sub26.get('25');
    } else if (sub26.has('01') && sub26.get('01')) {
      details.isDynamic = false;
      details.keyOrLocation = sub26.get('01');
    } else {
      errors.push('Nem chave Pix (26.01) nem location dinâmica (26.25) encontrada.');
    }
  }

  if (topTags.get('53') !== '986') errors.push('Moeda 53 deve ser 986 (BRL).');
  if (topTags.get('58') !== 'BR') errors.push('País 58 deve ser BR.');

  details.merchantName = topTags.get('59');
  if (!details.merchantName || details.merchantName.length === 0) {
    errors.push('Nome do recebedor (campo 59) vazio.');
  }

  details.merchantCity = topTags.get('60');
  if (!details.merchantCity || details.merchantCity.length === 0) {
    errors.push('Cidade (campo 60) vazia.');
  }

  const tag62 = topTags.get('62');
  if (tag62 !== undefined) {
    let sIdx = 0;
    while (sIdx < tag62.length) {
      const sId = tag62.slice(sIdx, sIdx + 2);
      const sLen = parseInt(tag62.slice(sIdx + 2, sIdx + 4), 10);
      if (isNaN(sLen) || sIdx + 4 + sLen > tag62.length) {
        errors.push('Subcampo inválido na tag 62.');
        break;
      }
      const sVal = tag62.slice(sIdx + 4, sIdx + 4 + sLen);
      if (sId === '05') {
        details.txId = sVal;
        if (sVal.length === 0) {
          errors.push('TxID (62.05) vazio (0500) — inválido no BACEN; deve ser *** ou alfanumérico.');
        }
      }
      sIdx += 4 + sLen;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    details,
  };
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
      if (isNaN(len) || idx + 4 + len > clean.length) break;
      const val = clean.slice(idx + 4, idx + 4 + len);
      idx += 4 + len;

      if (id === '26') {
        let subIdx = 0;
        while (subIdx < val.length) {
          const subId = val.slice(subIdx, subIdx + 2);
          const subLen = parseInt(val.slice(subIdx + 2, subIdx + 4), 10);
          if (isNaN(subLen) || subIdx + 4 + subLen > val.length) break;
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
