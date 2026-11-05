import { BiositeItem, BiositeTheme } from '../types';
import { BRAZILIAN_BANKS } from './bankLogos';

function getBankSvgRaw(bankId: string): string {
  switch (bankId) {
    case 'nubank':
      return `<svg viewBox="0 0 100 100" fill="none" class="bank-svg"><rect width="100" height="100" rx="22" fill="#820AD1"/><path d="M30 68V32H40.5L54 53.5V32H64V68H53.5L40 46.5V68H30Z" fill="white"/></svg>`;
    case 'itau':
      return `<svg viewBox="0 0 100 100" fill="none" class="bank-svg"><rect width="100" height="100" rx="22" fill="#EC7000"/><rect x="25" y="25" width="50" height="50" rx="8" fill="#003399"/><text x="50" y="58" fill="#FAF000" font-size="22" font-weight="bold" text-anchor="middle" font-family="sans-serif">Itaú</text></svg>`;
    case 'bradesco':
      return `<svg viewBox="0 0 100 100" fill="none" class="bank-svg"><rect width="100" height="100" rx="22" fill="#CC092F"/><circle cx="50" cy="38" r="8" fill="white"/><path d="M30 68C30 52 40 46 50 46C60 46 70 52 70 68H60C60 56 55 52 50 52C45 52 40 56 40 68H30Z" fill="white"/></svg>`;
    case 'banco-do-brasil':
      return `<svg viewBox="0 0 100 100" fill="none" class="bank-svg"><rect width="100" height="100" rx="22" fill="#FAF000"/><rect x="25" y="25" width="50" height="50" rx="6" fill="#002D72"/><text x="50" y="58" fill="#FAF000" font-size="22" font-weight="900" text-anchor="middle" font-family="sans-serif">BB</text></svg>`;
    case 'santander':
      return `<svg viewBox="0 0 100 100" fill="none" class="bank-svg"><rect width="100" height="100" rx="22" fill="#EC0000"/><path d="M50 25C46 36 34 44 34 56C34 65 41 73 50 73C59 73 66 65 66 56C66 44 54 36 50 25ZM50 67C44 67 40 62 40 56C40 49 47 42 50 35C53 42 60 49 60 56C60 62 56 67 50 67Z" fill="white"/></svg>`;
    case 'caixa':
      return `<svg viewBox="0 0 100 100" fill="none" class="bank-svg"><rect width="100" height="100" rx="22" fill="#005CA9"/><path d="M28 32L46 50L28 68H38L50 56L62 68H72L54 50L72 32H62L50 44L38 32H28Z" fill="#F37021"/><path d="M38 32L50 44L62 32H72L54 50L72 68H62L50 56L38 68H28L46 50L28 32H38Z" fill="white" fill-opacity="0.85"/></svg>`;
    case 'inter':
      return `<svg viewBox="0 0 100 100" fill="none" class="bank-svg"><rect width="100" height="100" rx="22" fill="#FF7A00"/><text x="50" y="62" fill="white" font-size="28" font-weight="bold" text-anchor="middle" font-family="sans-serif">inter</text></svg>`;
    case 'c6-bank':
      return `<svg viewBox="0 0 100 100" fill="none" class="bank-svg"><rect width="100" height="100" rx="22" fill="#1B1B1B"/><circle cx="50" cy="50" r="32" stroke="#00BFFF" stroke-width="4" fill="none"/><text x="50" y="60" fill="white" font-size="26" font-weight="bold" text-anchor="middle" font-family="sans-serif">C6</text></svg>`;
    case 'mercado-pago':
      return `<svg viewBox="0 0 100 100" fill="none" class="bank-svg"><rect width="100" height="100" rx="22" fill="#009EE3"/><path d="M30 45C30 38 36 32 43 32C47 32 50 34 50 37C50 34 53 32 57 32C64 32 70 38 70 45C70 54 59 62 50 68C41 62 30 54 30 45Z" fill="white"/></svg>`;
    case 'picpay':
      return `<svg viewBox="0 0 100 100" fill="none" class="bank-svg"><rect width="100" height="100" rx="22" fill="#11C76F"/><path d="M34 30H56C64 30 68 35 68 42C68 50 62 55 54 55H44V70H34V30ZM44 47H54C57 47 59 45 59 42C59 39 57 38 54 38H44V47Z" fill="white"/></svg>`;
    case 'pagbank':
      return `<svg viewBox="0 0 100 100" fill="none" class="bank-svg"><rect width="100" height="100" rx="22" fill="#00A859"/><circle cx="50" cy="50" r="34" fill="#007F43"/><text x="50" y="62" fill="#FFFFFF" font-size="34" font-weight="900" text-anchor="middle" font-family="sans-serif">P</text></svg>`;
    case 'sicredi':
      return `<svg viewBox="0 0 100 100" fill="none" class="bank-svg"><rect width="100" height="100" rx="22" fill="#007A33"/><circle cx="50" cy="50" r="28" fill="#84BD00"/><text x="50" y="58" fill="white" font-size="20" font-weight="bold" text-anchor="middle" font-family="sans-serif">SICREDI</text></svg>`;
    case 'sicoob':
      return `<svg viewBox="0 0 100 100" fill="none" class="bank-svg"><rect width="100" height="100" rx="22" fill="#003641"/><circle cx="50" cy="50" r="26" fill="#00A859"/><text x="50" y="58" fill="white" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">SICOOB</text></svg>`;
    default:
      return `<div class="bank-fallback">PIX</div>`;
  }
}

/**
 * Normalizes theme name between new descriptors and legacy ids
 */
export function normalizeTheme(theme: BiositeTheme): 'neon_banking' | 'white_luxury' | 'glass_finance' | 'cyber_pix' | 'executive_card' {
  switch (theme) {
    case 'white_luxury':
    case 'clean_white':
      return 'white_luxury';
    case 'glass_finance':
    case 'dark_premium':
      return 'glass_finance';
    case 'cyber_pix':
    case 'neon_yellow':
      return 'cyber_pix';
    case 'executive_card':
    case 'banking_pro':
      return 'executive_card';
    case 'neon_banking':
    case 'black_gold':
    default:
      return 'neon_banking';
  }
}

/**
 * Generates an ultra-premium, distinctive standalone HTML for NFC Biosites.
 * Exclusively displays:
 * 1. Logomarca do banco
 * 2. Nome do recebedor
 * 3. Nome da instituição financeira
 * 4. Chave Pix
 * 5. Botão COPIAR CHAVE PIX
 * ZERO footer, zero owner info, zero admin info, zero ads.
 */
export function generateBiositeHtml(biosite: BiositeItem): string {
  const bank = BRAZILIAN_BANKS.find((b) => b.id === biosite.bank) || {
    name: 'Instituição Bancária',
    id: 'outros',
    color: '#087CFF',
  };

  const normalized = normalizeTheme(biosite.theme);
  const bankSvg = getBankSvgRaw(bank.id);

  let themeCss = '';
  let cardHtml = '';

  if (normalized === 'neon_banking') {
    // Model 01 — Neon Banking: Deep black #05080F, electric cyan #00BFFF, 3D card tilt, soft blue glow, 3D button
    themeCss = `
      body {
        background: #05080F;
        background-image: radial-gradient(circle at 50% 15%, rgba(0, 191, 255, 0.15) 0%, transparent 65%);
        color: #FFFFFF;
      }
      .card-wrap {
        perspective: 1200px;
      }
      .card {
        background: linear-gradient(165deg, #0A0F1D 0%, #05080F 100%);
        border: 1px solid rgba(0, 191, 255, 0.4);
        border-radius: 32px;
        padding: 40px 24px;
        text-align: center;
        box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.95), 0 0 35px rgba(0, 191, 255, 0.22);
        transform: translateZ(0);
        animation: entrance3D 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .logo-box {
        width: 80px;
        height: 80px;
        margin: 0 auto 20px auto;
        border-radius: 24px;
        padding: 4px;
        background: linear-gradient(135deg, rgba(0, 191, 255, 0.4) 0%, rgba(8, 124, 255, 0.1) 100%);
        box-shadow: 0 10px 25px rgba(0, 191, 255, 0.3);
      }
      .receiver-name {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: #FFFFFF;
        margin-bottom: 4px;
      }
      .bank-name {
        font-size: 13px;
        font-weight: 700;
        color: #00BFFF;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 24px;
      }
      .pix-box {
        background: rgba(11, 17, 32, 0.8);
        border: 1px solid rgba(0, 191, 255, 0.25);
        border-radius: 18px;
        padding: 16px;
        margin-bottom: 24px;
        text-align: left;
        box-shadow: inset 0 2px 6px rgba(0,0,0,0.5);
      }
      .pix-box-label {
        font-size: 10px;
        font-weight: 800;
        color: #94A3B8;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 6px;
      }
      .pix-key {
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        font-weight: 700;
        color: #FFFFFF;
        word-break: break-all;
      }
      .copy-btn {
        width: 100%;
        background: linear-gradient(135deg, #00BFFF 0%, #087CFF 100%);
        color: #000000;
        border: none;
        border-radius: 18px;
        padding: 18px 24px;
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 0.02em;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-shadow: 0 10px 25px rgba(0, 191, 255, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .copy-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 14px 30px rgba(0, 191, 255, 0.45);
      }
      .copy-btn:active {
        transform: translateY(1px);
        box-shadow: 0 5px 15px rgba(0, 191, 255, 0.25);
      }
    `;

    cardHtml = `
      <div class="card-wrap">
        <div class="card">
          <div class="logo-box">
            ${bankSvg}
          </div>
          <h1 class="receiver-name">${escapeHtml(biosite.receiverName)}</h1>
          <p class="bank-name">${escapeHtml(bank.name)}</p>

          <div class="pix-box">
            <div class="pix-box-label">Chave Pix (${escapeHtml(biosite.pixType.toUpperCase())})</div>
            <div class="pix-key" id="pixKeyText">${escapeHtml(biosite.pixKey)}</div>
          </div>

          <button class="copy-btn" id="copyBtn" onclick="copyPixKey()">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span id="btnText">COPIAR CHAVE PIX</span>
          </button>
        </div>
      </div>
    `;
  } else if (normalized === 'white_luxury') {
    // Model 02 — White Luxury: Pure off-white #F8FAFC, dark graphite & electric blue, floating multi-depth card, elevated button
    themeCss = `
      body {
        background: #F8FAFC;
        background-image: radial-gradient(circle at 50% 0%, rgba(8, 124, 255, 0.06) 0%, transparent 70%);
        color: #0F172A;
      }
      .card {
        background: #FFFFFF;
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 32px;
        padding: 42px 26px;
        text-align: center;
        box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.12), 0 10px 25px -10px rgba(15, 23, 42, 0.06), 0 0 1px rgba(15, 23, 42, 0.15);
        animation: entrance3D 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .logo-box {
        width: 76px;
        height: 76px;
        margin: 0 auto 20px auto;
        padding: 4px;
        background: #FFFFFF;
        border-radius: 22px;
        box-shadow: 0 12px 24px -6px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(226, 232, 240, 0.8);
      }
      .receiver-name {
        font-size: 21px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: #0F172A;
        margin-bottom: 4px;
      }
      .bank-name {
        font-size: 13px;
        font-weight: 700;
        color: #087CFF;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 24px;
      }
      .pix-box {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 18px;
        padding: 16px;
        margin-bottom: 24px;
        text-align: left;
      }
      .pix-box-label {
        font-size: 10px;
        font-weight: 800;
        color: #64748B;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        margin-bottom: 5px;
      }
      .pix-key {
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        font-weight: 700;
        color: #0F172A;
        word-break: break-all;
      }
      .copy-btn {
        width: 100%;
        background: #0F172A;
        color: #FFFFFF;
        border: none;
        border-radius: 18px;
        padding: 18px 24px;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-shadow: 0 12px 28px -6px rgba(15, 23, 42, 0.35);
        transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
      }
      .copy-btn:hover {
        background: #1E293B;
        transform: translateY(-2px);
        box-shadow: 0 16px 32px -6px rgba(15, 23, 42, 0.45);
      }
      .copy-btn:active {
        transform: translateY(1px);
      }
    `;

    cardHtml = `
      <div class="card">
        <div class="logo-box">
          ${bankSvg}
        </div>
        <h1 class="receiver-name">${escapeHtml(biosite.receiverName)}</h1>
        <p class="bank-name">${escapeHtml(bank.name)}</p>

        <div class="pix-box">
          <div class="pix-box-label">Chave Pix (${escapeHtml(biosite.pixType.toUpperCase())})</div>
          <div class="pix-key" id="pixKeyText">${escapeHtml(biosite.pixKey)}</div>
        </div>

        <button class="copy-btn" id="copyBtn" onclick="copyPixKey()">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span id="btnText">COPIAR CHAVE PIX</span>
        </button>
      </div>
    `;
  } else if (normalized === 'glass_finance') {
    // Model 03 — Glass Finance: Deep midnight navy #030712, ambient glow, frosted glassmorphism, subtle specular highlights
    themeCss = `
      body {
        background: #030712;
        background-image: 
          radial-gradient(circle at 20% 15%, rgba(8, 124, 255, 0.28) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(0, 191, 255, 0.18) 0%, transparent 50%);
        color: #FFFFFF;
      }
      .card {
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(28px) saturate(190%);
        -webkit-backdrop-filter: blur(28px) saturate(190%);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 32px;
        padding: 40px 24px;
        text-align: center;
        box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.2);
        animation: entrance3D 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .logo-box {
        width: 78px;
        height: 78px;
        margin: 0 auto 20px auto;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 4px;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
      }
      .receiver-name {
        font-size: 21px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: #FFFFFF;
        margin-bottom: 4px;
      }
      .bank-name {
        font-size: 13px;
        font-weight: 600;
        color: #38BDF8;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 24px;
      }
      .pix-box {
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 18px;
        padding: 16px;
        margin-bottom: 24px;
        text-align: left;
      }
      .pix-box-label {
        font-size: 10px;
        font-weight: 700;
        color: #94A3B8;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 6px;
      }
      .pix-key {
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        font-weight: 600;
        color: #FFFFFF;
        word-break: break-all;
      }
      .copy-btn {
        width: 100%;
        background: linear-gradient(135deg, #087CFF 0%, #0284C7 100%);
        color: #FFFFFF;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 18px;
        padding: 18px 24px;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-shadow: 0 12px 25px rgba(8, 124, 255, 0.35);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .copy-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 16px 32px rgba(8, 124, 255, 0.45);
      }
      .copy-btn:active {
        transform: translateY(1px);
      }
    `;

    cardHtml = `
      <div class="card">
        <div class="logo-box">
          ${bankSvg}
        </div>
        <h1 class="receiver-name">${escapeHtml(biosite.receiverName)}</h1>
        <p class="bank-name">${escapeHtml(bank.name)}</p>

        <div class="pix-box">
          <div class="pix-box-label">Chave Pix (${escapeHtml(biosite.pixType.toUpperCase())})</div>
          <div class="pix-key" id="pixKeyText">${escapeHtml(biosite.pixKey)}</div>
        </div>

        <button class="copy-btn" id="copyBtn" onclick="copyPixKey()">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span id="btnText">COPIAR CHAVE PIX</span>
        </button>
      </div>
    `;
  } else if (normalized === 'cyber_pix') {
    // Model 04 — Cyber Pix: Pure black #000000, intense neon cyan #00BFFF, cyber grid, 3D press button with bottom bevel
    themeCss = `
      body {
        background: #000000;
        background-image: 
          linear-gradient(rgba(0, 191, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 191, 255, 0.05) 1px, transparent 1px);
        background-size: 28px 28px;
        color: #FFFFFF;
      }
      .card {
        background: #05080F;
        border: 2px solid #00BFFF;
        border-radius: 28px;
        padding: 40px 24px;
        text-align: center;
        box-shadow: 0 0 35px rgba(0, 191, 255, 0.35), inset 0 0 15px rgba(0, 191, 255, 0.1);
        position: relative;
        animation: entrance3D 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .card::before {
        content: '';
        position: absolute;
        top: -2px; left: 30px; right: 30px; height: 2px;
        background: #FFFFFF;
        box-shadow: 0 0 10px #FFFFFF;
      }
      .logo-box {
        width: 76px;
        height: 76px;
        margin: 0 auto 20px auto;
        border-radius: 20px;
        padding: 3px;
        border: 1px solid #00BFFF;
        box-shadow: 0 0 20px rgba(0, 191, 255, 0.4);
      }
      .receiver-name {
        font-size: 21px;
        font-weight: 800;
        letter-spacing: -0.01em;
        color: #FFFFFF;
        margin-bottom: 4px;
      }
      .bank-name {
        font-size: 13px;
        font-weight: 800;
        color: #00BFFF;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 24px;
      }
      .pix-box {
        background: #020408;
        border: 1px solid #00BFFF;
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 24px;
        text-align: left;
      }
      .pix-box-label {
        font-size: 10px;
        font-weight: 900;
        color: #00BFFF;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 6px;
      }
      .pix-key {
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        font-weight: 700;
        color: #FFFFFF;
        word-break: break-all;
      }
      .copy-btn {
        width: 100%;
        background: #00BFFF;
        color: #000000;
        border: none;
        border-radius: 16px;
        padding: 17px 24px;
        font-size: 15px;
        font-weight: 900;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-shadow: 0 5px 0 #0088cc, 0 10px 25px rgba(0, 191, 255, 0.4);
        transition: transform 0.08s ease, box-shadow 0.08s ease;
      }
      .copy-btn:active {
        transform: translateY(4px);
        box-shadow: 0 1px 0 #0088cc, 0 4px 10px rgba(0, 191, 255, 0.3);
      }
    `;

    cardHtml = `
      <div class="card">
        <div class="logo-box">
          ${bankSvg}
        </div>
        <h1 class="receiver-name">${escapeHtml(biosite.receiverName)}</h1>
        <p class="bank-name">${escapeHtml(bank.name)}</p>

        <div class="pix-box">
          <div class="pix-box-label">Chave Pix (${escapeHtml(biosite.pixType.toUpperCase())})</div>
          <div class="pix-key" id="pixKeyText">${escapeHtml(biosite.pixKey)}</div>
        </div>

        <button class="copy-btn" id="copyBtn" onclick="copyPixKey()">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span id="btnText">COPIAR CHAVE PIX</span>
        </button>
      </div>
    `;
  } else {
    // Model 05 — Executive Card: Real banking card layout (Black/Metal card), satin titanium gradient, metallic EMV security chip, asymmetric header
    themeCss = `
      body {
        background: #07090E;
        background-image: radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.04) 0%, transparent 70%);
        color: #FFFFFF;
      }
      .card {
        background: linear-gradient(145deg, #1A202C 0%, #0F141F 50%, #161D2B 100%);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 30px;
        padding: 36px 26px;
        box-shadow: 0 35px 70px -15px rgba(0, 0, 0, 0.95), inset 0 1px 1px rgba(255, 255, 255, 0.25);
        position: relative;
        animation: entrance3D 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .card-top-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 26px;
      }
      /* Realistic EMV Metallic Smart Chip */
      .emv-chip {
        width: 44px;
        height: 34px;
        background: linear-gradient(135deg, #ECC94B 0%, #B7791F 40%, #D69E2E 70%, #975A16 100%);
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 4px 10px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.4);
        position: relative;
        overflow: hidden;
      }
      .emv-chip::after {
        content: '';
        position: absolute;
        top: 50%; left: 0; right: 0; height: 1px;
        background: rgba(0,0,0,0.3);
      }
      .emv-chip::before {
        content: '';
        position: absolute;
        top: 0; bottom: 0; left: 50%; width: 1px;
        background: rgba(0,0,0,0.3);
      }
      .logo-box {
        width: 60px;
        height: 60px;
        border-radius: 18px;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
      }
      .receiver-name {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #FFFFFF;
        text-shadow: 0 2px 4px rgba(0,0,0,0.6);
        margin-bottom: 4px;
        text-align: left;
      }
      .bank-name {
        font-size: 12px;
        font-weight: 700;
        color: #A0AEC0;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 24px;
        text-align: left;
      }
      .pix-box {
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 18px;
        padding: 16px;
        margin-bottom: 24px;
        text-align: left;
      }
      .pix-box-label {
        font-size: 10px;
        font-weight: 800;
        color: #A0AEC0;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 6px;
      }
      .pix-key {
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        font-weight: 700;
        color: #ED8936;
        word-break: break-all;
      }
      .copy-btn {
        width: 100%;
        background: linear-gradient(135deg, #2D3748 0%, #1A202C 100%);
        color: #FFFFFF;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 18px;
        padding: 18px 24px;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.2);
        transition: transform 0.15s ease, background 0.15s ease;
      }
      .copy-btn:hover {
        background: linear-gradient(135deg, #374151 0%, #1F2937 100%);
        transform: translateY(-2px);
      }
      .copy-btn:active {
        transform: translateY(1px);
      }
    `;

    cardHtml = `
      <div class="card">
        <div class="card-top-row">
          <div class="emv-chip" title="Smart Card NFC"></div>
          <div class="logo-box">
            ${bankSvg}
          </div>
        </div>

        <h1 class="receiver-name">${escapeHtml(biosite.receiverName)}</h1>
        <p class="bank-name">${escapeHtml(bank.name)}</p>

        <div class="pix-box">
          <div class="pix-box-label">Chave Pix (${escapeHtml(biosite.pixType.toUpperCase())})</div>
          <div class="pix-key" id="pixKeyText">${escapeHtml(biosite.pixKey)}</div>
        </div>

        <button class="copy-btn" id="copyBtn" onclick="copyPixKey()">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span id="btnText">COPIAR CHAVE PIX</span>
        </button>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Pix — ${escapeHtml(biosite.receiverName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      line-height: 1.4;
    }
    .container {
      width: 100%;
      max-width: 380px;
      margin: 0 auto;
    }
    .bank-svg {
      width: 100%;
      height: 100%;
      border-radius: 18px;
      display: block;
    }
    .bank-fallback {
      width: 100%;
      height: 100%;
      border-radius: 18px;
      background: #111827;
      color: #00BFFF;
      font-weight: 800;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #1E293B;
    }
    .btn-icon {
      width: 18px;
      height: 18px;
      shrink: 0;
    }
    .copy-btn.copied {
      background: #10B981 !important;
      color: #FFFFFF !important;
      box-shadow: 0 10px 25px rgba(16, 185, 129, 0.45) !important;
      border-color: #10B981 !important;
    }
    @keyframes entrance3D {
      from {
        opacity: 0;
        transform: translateY(24px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .card {
        animation: none !important;
      }
      .copy-btn {
        transition: none !important;
      }
    }
    ${themeCss}
  </style>
</head>
<body>
  <div class="container">
    ${cardHtml}
  </div>

  <script>
    function copyPixKey() {
      var key = document.getElementById('pixKeyText').innerText.trim();
      var btn = document.getElementById('copyBtn');
      var btnText = document.getElementById('btnText');

      function onSuccess() {
        btn.classList.add('copied');
        btnText.innerText = 'CHAVE COPIADA!';
        if (navigator.vibrate) {
          try { navigator.vibrate(50); } catch(e) {}
        }
        setTimeout(function() {
          btn.classList.remove('copied');
          btnText.innerText = 'COPIAR CHAVE PIX';
        }, 2200);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(key).then(onSuccess).catch(fallback);
      } else {
        fallback();
      }

      function fallback() {
        var temp = document.createElement('textarea');
        temp.value = key;
        temp.style.position = 'fixed';
        temp.style.top = '0';
        temp.style.left = '0';
        temp.style.width = '2em';
        temp.style.height = '2em';
        temp.style.padding = '0';
        temp.style.border = 'none';
        temp.style.outline = 'none';
        temp.style.boxShadow = 'none';
        temp.style.background = 'transparent';
        document.body.appendChild(temp);
        temp.focus();
        temp.select();
        try {
          var successful = document.execCommand('copy');
          if (successful) onSuccess();
          else prompt('Copie a chave Pix:', key);
        } catch(e) {
          prompt('Copie a chave Pix:', key);
        }
        document.body.removeChild(temp);
      }
    }
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
