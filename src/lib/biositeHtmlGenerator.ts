import { BiositeItem, BiositeTheme } from '../types';
import { BRAZILIAN_BANKS } from './bankLogos';

export function getBiositePublicUrl(biositeId: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/b/${biositeId}`;
  }
  return `/b/${biositeId}`;
}

export function formatWhatsappUrl(raw?: string): string | null {
  const clean = (raw || '').trim();
  if (!clean) return null;
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  const digits = clean.replace(/\D/g, '');
  if (!digits) return null;
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

export function formatInstagramUrl(raw?: string): string | null {
  const clean = (raw || '').trim();
  if (!clean) return null;
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  const handle = clean.replace(/^@/, '').replace(/\/+$/, '');
  return handle ? `https://instagram.com/${handle}` : null;
}

export function normalizeExternalUrl(raw?: string): string {
  const clean = (raw || '').trim();
  if (!clean) return '#';
  if (/^(https?:|mailto:|tel:)/i.test(clean)) return clean;
  return `https://${clean}`;
}

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

export function normalizeTheme(
  theme: BiositeTheme
): 'neon_banking' | 'white_luxury' | 'glass_finance' | 'cyber_pix' | 'executive_card' {
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

export function generateBiositeHtml(biosite: BiositeItem): string {
  const bank = BRAZILIAN_BANKS.find((b) => b.id === biosite.bank) || {
    name: 'Instituição Bancária',
    id: 'outros',
    color: '#087CFF',
  };

  const normalized = normalizeTheme(biosite.theme);
  const accent = biosite.accentColor || '#00BFFF';
  const displayName = biosite.businessName?.trim() || biosite.receiverName;
  const description = biosite.description?.trim() || '';
  const logoHtml = biosite.logoUrl
    ? `<img src="${escapeHtml(biosite.logoUrl)}" alt="${escapeHtml(displayName)}" class="logo-img" />`
    : getBankSvgRaw(bank.id);

  const waUrl = formatWhatsappUrl(biosite.whatsapp);
  const igUrl = formatInstagramUrl(biosite.instagram);
  const customButtons = (biosite.customButtons || []).filter((b) => b.label.trim() && b.url.trim());

  const linksHtml = `
    ${waUrl || igUrl ? `
      <div class="social-row">
        ${waUrl ? `<a href="${escapeHtml(waUrl)}" target="_blank" rel="noopener noreferrer" class="social-btn whatsapp">WhatsApp</a>` : ''}
        ${igUrl ? `<a href="${escapeHtml(igUrl)}" target="_blank" rel="noopener noreferrer" class="social-btn instagram">Instagram</a>` : ''}
      </div>
    ` : ''}
    ${customButtons.length > 0 ? `
      <div class="custom-links">
        ${customButtons
          .map(
            (btn) =>
              `<a href="${escapeHtml(normalizeExternalUrl(btn.url))}" target="_blank" rel="noopener noreferrer" class="custom-link-btn">${escapeHtml(btn.label)}</a>`
          )
          .join('')}
      </div>
    ` : ''}
  `;

  const isLight = normalized === 'white_luxury';

  const bgCss =
    normalized === 'white_luxury'
      ? 'background: #F8FAFC; color: #0F172A;'
      : normalized === 'glass_finance'
      ? `background: #030712; background-image: radial-gradient(circle at 20% 15%, ${accent}33 0%, transparent 50%); color: #FFFFFF;`
      : normalized === 'cyber_pix'
      ? `background: #000000; background-image: linear-gradient(${accent}12 1px, transparent 1px), linear-gradient(90deg, ${accent}12 1px, transparent 1px); background-size: 28px 28px; color: #FFFFFF;`
      : normalized === 'executive_card'
      ? 'background: #07090E; color: #FFFFFF;'
      : `background: #05080F; background-image: radial-gradient(circle at 50% 15%, ${accent}25 0%, transparent 65%); color: #FFFFFF;`;

  const cardBgCss =
    normalized === 'white_luxury'
      ? 'background: #FFFFFF; border: 1px solid #E2E8F0; box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.12);'
      : normalized === 'glass_finance'
      ? 'background: rgba(15, 23, 42, 0.72); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.14); box-shadow: 0 30px 60px -15px rgba(0,0,0,0.85);'
      : normalized === 'cyber_pix'
      ? `background: #05080F; border: 2px solid ${accent}; box-shadow: 0 0 32px ${accent}40;`
      : normalized === 'executive_card'
      ? 'background: linear-gradient(145deg, #1A202C 0%, #0F141F 50%, #161D2B 100%); border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 35px 70px -15px rgba(0,0,0,0.95);'
      : `background: linear-gradient(165deg, #0A0F1D 0%, #05080F 100%); border: 1px solid ${accent}66; box-shadow: 0 30px 60px -15px rgba(0,0,0,0.95), 0 0 30px ${accent}33;`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${escapeHtml(displayName)} — Pix & Contato</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      line-height: 1.4;
      ${bgCss}
    }
    .container { width: 100%; max-width: 400px; margin: 0 auto; }
    .card {
      border-radius: 30px;
      padding: 36px 24px;
      text-align: center;
      ${cardBgCss}
    }
    .logo-box {
      width: 84px;
      height: 84px;
      margin: 0 auto 18px auto;
      border-radius: 22px;
      overflow: hidden;
      border: 2px solid ${accent}66;
      background: ${isLight ? '#fff' : '#0A0E17'};
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-img, .bank-svg { width: 100%; height: 100%; object-fit: cover; display: block; }
    .bank-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 900; color: ${accent}; }
    .receiver-name { font-size: 22px; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 6px; }
    .description { font-size: 13px; color: ${isLight ? '#475569' : '#94A3B8'}; margin-bottom: 14px; }
    .bank-name { font-size: 11px; font-weight: 800; color: ${accent}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 18px; }
    .pix-box {
      background: ${isLight ? '#F8FAFC' : 'rgba(0,0,0,0.4)'};
      border: 1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.12)'};
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 16px;
      text-align: left;
    }
    .pix-box-label { font-size: 10px; font-weight: 800; color: ${isLight ? '#64748B' : '#94A3B8'}; text-transform: uppercase; margin-bottom: 4px; }
    .pix-key { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; word-break: break-all; }
    .copy-btn {
      width: 100%;
      background: ${accent};
      color: #05080F;
      border: none;
      border-radius: 16px;
      padding: 16px 20px;
      font-size: 14px;
      font-weight: 900;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 10px 24px ${accent}40;
    }
    .copy-btn.copied { background: #10B981 !important; color: #FFFFFF !important; }
    .social-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-top: 16px; }
    .social-btn, .custom-link-btn {
      display: block;
      text-decoration: none;
      padding: 12px 14px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 800;
      text-align: center;
    }
    .social-btn.whatsapp { background: #16A34A; color: #FFFFFF; }
    .social-btn.instagram { background: linear-gradient(135deg, #F58529, #DD2A7B, #8134AF); color: #FFFFFF; }
    .custom-links { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
    .custom-link-btn {
      background: ${isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)'};
      color: ${isLight ? '#0F172A' : '#FFFFFF'};
      border: 1px solid ${isLight ? '#CBD5E1' : 'rgba(255,255,255,0.14)'};
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo-box">${logoHtml}</div>
      <h1 class="receiver-name">${escapeHtml(displayName)}</h1>
      ${description ? `<p class="description">${escapeHtml(description)}</p>` : ''}
      <p class="bank-name">${escapeHtml(bank.name)}</p>

      <div class="pix-box">
        <div class="pix-box-label">Chave Pix</div>
        <div class="pix-key" id="pixKeyText">${escapeHtml(biosite.pixKey)}</div>
      </div>

      <button class="copy-btn" id="copyBtn" onclick="copyPixKey()">
        <span id="btnText">COPIAR CHAVE PIX</span>
      </button>

      ${linksHtml}
    </div>
  </div>
  <script>
    function copyPixKey() {
      var key = document.getElementById('pixKeyText').innerText.trim();
      var btn = document.getElementById('copyBtn');
      var btnText = document.getElementById('btnText');
      function onSuccess() {
        btn.classList.add('copied');
        btnText.innerText = 'CHAVE COPIADA!';
        if (navigator.vibrate) { try { navigator.vibrate(50); } catch(e) {} }
        setTimeout(function() {
          btn.classList.remove('copied');
          btnText.innerText = 'COPIAR CHAVE PIX';
        }, 2200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(key).then(onSuccess).catch(fallback);
      } else { fallback(); }
      function fallback() {
        var temp = document.createElement('textarea');
        temp.value = key;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.focus();
        temp.select();
        try {
          if (document.execCommand('copy')) onSuccess();
        } catch(e) {}
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
