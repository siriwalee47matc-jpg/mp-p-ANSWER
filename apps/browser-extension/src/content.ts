export {};

const EXAGGERATED_PHRASES = [
  'ลด 10 กิโลใน 3 วัน',
  'ลด 10 กิโล ภายใน 3 วัน',
  'คุมหิว ลดน้ำหนักสูตรเร่งด่วน',
  'รักษาโรคมะเร็งหายขาด',
  'มะเร็งหายขาดใน 1 เดือน',
  'รักษามะเร็งหายขาด',
  'สูตรรักษาโรคมะเร็ง',
  'ขาวใสภายใน 2 วัน',
  'ขาวใสเร่งด่วนใน 2 วัน',
  'ยาเทวดารักษาได้ทุกโรค',
  'cure cancer',
  'weight loss fast',
  '100% safe',
  'doctor recommended',
];

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
let blockOverlayInjected = false;

function scanPageContent() {
  chrome.storage.local.get(['extensionMode', 'autoScan'], (settings) => {
    if (settings.extensionMode !== 'CONSUMER' || settings.autoScan === false) {
      return;
    }

    const bodyText = document.body.innerText || '';
    const matchedPhrases = EXAGGERATED_PHRASES.filter((phrase) =>
      bodyText.toLowerCase().includes(phrase.toLowerCase()),
    );

    if (matchedPhrases.length > 0 && !warningBannerInjected && !blockOverlayInjected) {
      injectWarningBanner(matchedPhrases);
    }
  });
}

function checkDomainBlockedOnLoad() {
  const currentDomain = window.location.hostname.replace('www.', '').toLowerCase();

  chrome.runtime.sendMessage({ action: 'CHECK_DOMAIN', domain: currentDomain }, (response) => {
    if (response && response.isBlocked) {
      injectBlockOverlay('โดเมนนี้ถูกขึ้นบัญชีเฝ้าระวังและบล็อกการเข้าถึงจากศูนย์ควบคุมโฆษณาผิดกฎหมาย');
    } else {
      setTimeout(scanPageContent, 1000);
    }
  });
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
  textNode.innerHTML = `Warning: suspicious ad claims detected <span style="background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:999px; font-size:12px; margin-left:8px;">${phrases.join(', ')}</span>`;
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

      const res = await fetch('http://localhost:3001/cases', {
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
      <div style="font-size: 4rem; margin-bottom: 20px;">Blocked</div>
      <h1 style="color: #ef4444; font-size: 1.85rem; margin-bottom: 12px; font-weight: 700;">เว็บไซต์นี้ถูกบล็อกโดย Sentinel ADS</h1>
      <p style="color: #f3f4f6; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
        ระบบตรวจพบสัญญาณความเสี่ยงโฆษณาสุขภาพผิดกฎหมายและระงับการเข้าถึงชั่วคราวเพื่อความปลอดภัย
      </p>
      <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); padding: 15px; border-radius: 12px; font-size: 13.5px; color: #fca5a5; text-align: left; margin-bottom: 24px; line-height: 1.5;">
        <strong>เหตุผล:</strong> ${reason}
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
  }
});

checkDomainBlockedOnLoad();
