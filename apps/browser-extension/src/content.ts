import { analyzeLocalPageSignals } from './scan-policy';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

type ProductType =
  | 'FOOD'
  | 'DRUG'
  | 'COSMETIC'
  | 'MEDICAL_DEVICE'
  | 'HERBAL'
  | 'CLINIC'
  | 'HAZARDOUS'
  | 'NARCOTIC';

const PRODUCT_PATTERNS: Array<{ productType: ProductType; keywords: string[] }> = [
  { productType: 'DRUG', keywords: ['drug', 'medicine', 'capsule', 'tablet', 'antibiotic', 'ยา'] },
  { productType: 'COSMETIC', keywords: ['cosmetic', 'serum', 'cream', 'whitening', 'beauty', 'skincare', 'ครีม'] },
  {
    productType: 'MEDICAL_DEVICE',
    keywords: ['medical device', 'test kit', 'monitor', 'mask', 'เครื่องมือแพทย์'],
  },
  { productType: 'CLINIC', keywords: ['clinic', 'hospital', 'doctor', 'treatment center', 'คลินิก', 'แพทย์'] },
  { productType: 'HERBAL', keywords: ['herbal', 'botanical', 'traditional herb', 'สมุนไพร'] },
  { productType: 'FOOD', keywords: ['food', 'supplement', 'dietary', 'beverage', 'coffee', 'tea', 'อาหาร'] },
];

let warningBannerInjected = false;
let warningPopupInjected = false;
let blockOverlayInjected = false;
let localWarningAcknowledged = false;
let scanDebounceTimer: number | undefined;

function scanPageContent() {
  if (blockOverlayInjected || localWarningAcknowledged) return;
  chrome.storage.local.get(['extensionMode', 'autoScan', 'riskLevel'], (settings) => {
    const isAutoScanEnabled = settings.autoScan !== false && settings.riskLevel !== 'MANUAL';
    if (!isAutoScanEnabled) {
      return;
    }

    const bodyText = document.body.innerText || '';
    const localSignals = analyzeLocalPageSignals(bodyText);
    const matchedPhrases = localSignals.matchedClaims;

    if (localSignals.shouldWarn && !blockOverlayInjected) {
      if (!warningBannerInjected) {
        injectWarningBanner(matchedPhrases);
      }
      if (!warningPopupInjected) {
        injectWarningPopup(matchedPhrases);
      }
    }
  });
}

function checkDomainBlockedOnLoad() {
  const currentDomain = window.location.hostname.replace('www.', '').toLowerCase();

  chrome.runtime.sendMessage({ action: 'CHECK_DOMAIN', domain: currentDomain }, (response) => {
    if (response && response.isBlocked) {
      injectBlockOverlay(response.reason || 'โดเมนนี้ถูกขึ้นบัญชีเฝ้าระวังและบล็อกการเข้าถึงจากศูนย์ควบคุมโฆษณาผิดกฎหมาย');
    } else {
      setTimeout(scanPageContent, 250);
    }
  });
}

function injectWarningPopup(phrases: string[]) {
  if (warningPopupInjected) return;
  warningPopupInjected = true;

  const overlay = document.createElement('div');
  overlay.id = 'kp-ad-shield-warning-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(5, 46, 43, 0.25);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 2147483646;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: "IBM Plex Sans Thai", "Segoe UI", Tahoma, sans-serif;
  `;

  // Dynamic CSS Animation injected inside document head
  if (!document.getElementById('kp-ad-shield-animations')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'kp-ad-shield-animations';
    styleEl.innerHTML = `
      @keyframes kpFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes kpScaleUp {
        from { transform: scale(0.9) translateY(20px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styleEl);
  }
  overlay.style.animation = 'kpFadeIn 0.3s ease-out';

  const modal = document.createElement('div');
  modal.style.cssText = `
    position: relative;
    width: 90%;
    max-width: 480px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(244, 251, 248, 0.98) 100%);
    border: 1px solid rgba(15, 118, 110, 0.22);
    border-radius: 24px;
    padding: 32px;
    box-shadow: 0 24px 80px rgba(5, 46, 43, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.8);
    color: #052e2b;
    text-align: center;
    animation: kpScaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    box-sizing: border-box;
  `;

  modal.innerHTML = `
    <button id="warning-close-btn" style="position: absolute; top: 20px; right: 24px; background: transparent; border: none; color: #6f8a87; font-size: 24px; cursor: pointer; transition: color 0.2s; font-weight: 300; line-height: 1;">&times;</button>
    <div style="font-size: 48px; margin-bottom: 16px; display: inline-block;"></div>
    <h2 style="color: #d97706; margin-top: 0; margin-bottom: 12px; font-size: 20px; font-weight: 700; font-family: inherit;">
      ตรวจพบข้อความโฆษณาต้องสงสัย
    </h2>
    <p style="color: #4b6a67; font-size: 14px; line-height: 1.5; margin-bottom: 20px; font-family: inherit;">
      Sentinel ADS ตรวจพบคำอวดอ้างสรรพคุณสุขภาพที่เข้าข่ายเกินจริงหรืออาจผิดกฎหมายบนหน้าเว็บนี้
    </p>
    
    <div style="background: rgba(230, 255, 248, 0.65); border: 1px solid rgba(13, 148, 136, 0.18); padding: 16px 20px; border-radius: 16px; font-size: 13.5px; color: #0f766e; text-align: left; margin-bottom: 24px; max-height: 100px; overflow-y: auto; font-family: inherit; line-height: 1.6;">
      <strong style="color: #052e2b;">สัญญาณที่ตรวจพบ:</strong><br/>
      ${phrases.map(p => `• ${escapeHtml(p)}`).join('<br/>')}
    </div>
    
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button id="warning-bypass-btn" style="background: #047857; border: none; color: #ffffff; padding: 12px 32px; border-radius: 999px; cursor: pointer; font-weight: 700; font-size: 14px; transition: all 0.2s; font-family: inherit; box-shadow: 0 4px 14px rgba(4, 120, 87, 0.25);">
        ยอมรับความเสี่ยงและดูต่อ
      </button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const bypassBtn = modal.querySelector('#warning-bypass-btn') as HTMLButtonElement;
  const closeBtn = modal.querySelector('#warning-close-btn') as HTMLButtonElement;

  bypassBtn.onclick = () => {
    document.body.removeChild(overlay);
    warningPopupInjected = false;
    localWarningAcknowledged = true;
    chrome.runtime.sendMessage({ action: 'OPEN_EXTENSION_POPUP' });
  };

  closeBtn.onclick = () => {
    document.body.removeChild(overlay);
    warningPopupInjected = false;
    localWarningAcknowledged = true;
  };
}

function injectWarningBanner(phrases: string[]) {
  warningBannerInjected = true;

  const banner = document.createElement('div');
  banner.id = 'kp-ad-shield-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background: linear-gradient(90deg, #ef4444 0%, #b91c1c 100%);
    color: white;
    z-index: 999999;
    padding: 12px 24px;
    font-family: "Segoe UI", Tahoma, sans-serif;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-sizing: border-box;
    gap: 16px;
  `;

  const textNode = document.createElement('div');
  textNode.innerHTML = `ตรวจพบคำโฆษณาที่อาจเข้าข่ายผิดกฎหมาย <span style="background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:999px; font-size:12px; margin-left:8px;">${phrases.map(p => escapeHtml(p)).join(', ')}</span>`;
  banner.appendChild(textNode);

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 10px;
    align-items: center;
  `;

  const reportBtn = document.createElement('button');
  reportBtn.innerText = 'ส่งเบาะแส';
  reportBtn.style.cssText = `
    background: white;
    color: #b91c1c;
    border: none;
    padding: 6px 14px;
    border-radius: 999px;
    font-weight: 700;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  `;
  reportBtn.onclick = async () => {
    reportBtn.disabled = true;
    reportBtn.innerText = 'กำลังส่ง...';

    try {
      const pageTitle = document.title || 'Suspicious ad page';
      const pageUrl = window.location.href;
      const snippet = `${phrases.join('; ')} | ${document.body.innerText.substring(0, 400)}`;
      const imageSignalsText = collectImageSignalsText();
      const productType = classifyProductType(`${pageTitle}\n${pageUrl}\n${snippet}\n${imageSignalsText}`);

      const res = await fetch(`${API_URL}/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: pageTitle,
          url: pageUrl,
          productType,
          evidenceText: snippet,
          imageSignalsText,
          productLicenseNumber: extractFdaNumber(document.body.innerText),
          reporterRole: 'SYSTEM',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create case');
      }

      reportBtn.innerText = 'ส่งสำเร็จ';
      reportBtn.style.background = '#d1fae5';
      reportBtn.style.color = '#065f46';
    } catch {
      reportBtn.innerText = 'ส่งไม่สำเร็จ';
      reportBtn.disabled = false;
      setTimeout(() => {
        reportBtn.innerText = 'ส่งเบาะแส';
      }, 2000);
    }
  };
  buttonContainer.appendChild(reportBtn);

  const closeBtn = document.createElement('button');
  closeBtn.innerText = '×';
  closeBtn.style.cssText = `
    background: transparent;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
  `;
  closeBtn.onclick = () => {
    document.body.removeChild(banner);
    document.body.style.marginTop = '0px';
  };
  buttonContainer.appendChild(closeBtn);

  banner.appendChild(buttonContainer);

  document.body.appendChild(banner);
  document.body.style.marginTop = '45px';
}

function injectAiResultAlert(message: { score: number; analysis?: string; recommendedAction?: string }) {
  document.getElementById('kp-ad-shield-ai-alert')?.remove();

  const alert = document.createElement('aside');
  alert.id = 'kp-ad-shield-ai-alert';
  alert.setAttribute('role', 'alert');
  alert.style.cssText = `
    position: fixed;
    top: 18px;
    right: 18px;
    width: min(390px, calc(100vw - 36px));
    z-index: 2147483647;
    box-sizing: border-box;
    padding: 18px;
    border: 1px solid ${message.score >= 80 ? '#fecaca' : '#fde68a'};
    border-left: 6px solid ${message.score >= 80 ? '#dc2626' : '#d97706'};
    border-radius: 16px;
    background: #ffffff;
    color: #17211d;
    box-shadow: 0 20px 60px rgba(15, 23, 42, 0.24);
    font-family: "IBM Plex Sans Thai", "Segoe UI", Tahoma, sans-serif;
  `;

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;';
  const title = document.createElement('strong');
  title.textContent = message.score >= 80 ? 'Sentinel ADS พบความเสี่ยงสูง' : 'Sentinel ADS พบความเสี่ยงที่ควรตรวจสอบ';
  title.style.cssText = `font-size:15px;color:${message.score >= 80 ? '#b91c1c' : '#92400e'};`;
  const score = document.createElement('span');
  score.textContent = `${Math.round(message.score)}%`;
  score.style.cssText = `padding:4px 9px;border-radius:999px;background:${message.score >= 80 ? '#fee2e2' : '#fef3c7'};font-weight:800;`;
  header.append(title, score);

  const detail = document.createElement('p');
  detail.textContent = (message.analysis || 'ผลวิเคราะห์จาก AI แนะนำให้เจ้าหน้าที่ตรวจสอบหน้านี้').slice(0, 280);
  detail.style.cssText = 'margin:0 0 12px;font-size:13px;line-height:1.55;color:#475569;';

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;';
  const action = document.createElement('span');
  action.textContent = `คำแนะนำ: ${message.recommendedAction || 'REVIEW_REQUIRED'}`;
  action.style.cssText = 'font-size:11px;font-weight:700;color:#64748b;';
  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;gap:6px;';
  const detailsButton = document.createElement('button');
  detailsButton.textContent = 'ดูผลตรวจ';
  detailsButton.style.cssText = 'border:0;border-radius:999px;padding:7px 12px;background:#047857;color:white;font-weight:700;cursor:pointer;';
  detailsButton.onclick = () => chrome.runtime.sendMessage({ action: 'OPEN_EXTENSION_POPUP' });
  const closeButton = document.createElement('button');
  closeButton.textContent = 'ปิด';
  closeButton.style.cssText = 'border:1px solid #cbd5e1;border-radius:999px;padding:7px 10px;background:white;color:#475569;font-weight:700;cursor:pointer;';
  closeButton.onclick = () => alert.remove();
  buttons.append(detailsButton, closeButton);
  footer.append(action, buttons);

  alert.append(header, detail, footer);
  document.body.appendChild(alert);
}

function injectBlockOverlay(reason: string) {
  blockOverlayInjected = true;

  const oldBanner = document.getElementById('kp-ad-shield-banner');
  if (oldBanner) {
    document.body.removeChild(oldBanner);
    document.body.style.marginTop = '0px';
  }

  const overlay = document.createElement('div');
  overlay.id = 'kp-ad-shield-block-screen';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: #080a10;
    z-index: 2147483647;
    font-family: "Segoe UI", Tahoma, sans-serif;
    color: #f3f4f6;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 40px;
    text-align: center;
    box-sizing: border-box;
  `;

  overlay.innerHTML = `
    <div style="max-width: 600px; padding: 40px; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 24px; background: rgba(17, 24, 39, 0.88); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
      <div style="font-size: 4rem; margin-bottom: 20px;">ปิดกั้นแล้ว</div>
      <h1 style="color: #ef4444; font-size: 1.85rem; margin-bottom: 12px; font-weight: 700;">เว็บไซต์นี้ถูกบล็อกโดย Sentinel ADS</h1>
      <p style="color: #f3f4f6; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
        ระบบตรวจพบสัญญาณความเสี่ยงโฆษณาสุขภาพผิดกฎหมายและระงับการเข้าถึงชั่วคราวเพื่อความปลอดภัย
      </p>
      <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); padding: 15px; border-radius: 12px; font-size: 13.5px; color: #fca5a5; text-align: left; margin-bottom: 24px; line-height: 1.5;">
        <strong>เหตุผล:</strong> ${escapeHtml(reason)}
      </div>
      <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
        <button id="kp-bypass-btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: #d1d5db; padding: 10px 20px; border-radius: 999px; cursor: pointer; font-size: 13px;">
          เข้าต่อด้วยความเสี่ยงของผู้ใช้
        </button>
        <button id="kp-back-btn" style="background: #ef4444; border: none; color: white; padding: 10px 24px; border-radius: 999px; cursor: pointer; font-weight: 700; font-size: 13.5px;">
          กลับไปหน้าที่ปลอดภัย
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  document.getElementById('kp-back-btn')!.onclick = () => {
    window.history.back();
    setTimeout(() => window.close(), 500);
  };

  document.getElementById('kp-bypass-btn')!.onclick = () => {
    document.body.removeChild(overlay);
    document.body.style.overflow = 'auto';
    blockOverlayInjected = false;
  };
}

function extractFdaNumber(text: string): string {
  const match = text.match(/\d{2}-\d-\d{5}-\d-\d{4}/);
  return match ? match[0] : '';
}

function collectImageSignalsText(): string {
  const imageSignals = Array.from(document.images)
    .slice(0, 12)
    .map((img) =>
      [img.alt || '', img.title || '', img.getAttribute('aria-label') || '', img.src.split('/').pop() || ''].join(' '),
    )
    .join(' | ');

  const captionSignals = Array.from(document.querySelectorAll('figcaption, [data-testid*="caption"], .caption'))
    .slice(0, 12)
    .map((node) => (node.textContent || '').trim())
    .filter(Boolean)
    .join(' | ');

  return [imageSignals, captionSignals].filter(Boolean).join(' | ');
}

function classifyProductType(text: string): ProductType {
  const normalized = text.toLowerCase();
  let best: ProductType = 'FOOD';
  let bestScore = -1;

  for (const rule of PRODUCT_PATTERNS) {
    const score = rule.keywords.reduce(
      (count, keyword) => count + (normalized.includes(keyword.toLowerCase()) ? 1 : 0),
      0,
    );

    if (score > bestScore) {
      best = rule.productType;
      bestScore = score;
    }
  }

  return best;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'BLOCK_SCREEN' && !blockOverlayInjected) {
    injectBlockOverlay(message.reason);
  } else if (message.action === 'SCAN_RESULT' && !blockOverlayInjected) {
    injectAiResultAlert(message);
  }
});

checkDomainBlockedOnLoad();

const pageObserver = new MutationObserver(() => {
  if (blockOverlayInjected || localWarningAcknowledged) return;
  window.clearTimeout(scanDebounceTimer);
  scanDebounceTimer = window.setTimeout(scanPageContent, 600);
});
pageObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
