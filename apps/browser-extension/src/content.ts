// Content script for scanning exaggeration keywords and blocking domains

// List of exaggerated phrases to scan for health advertising violations
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
  'ยาเทวดารักษาได้ทุกโรค'
];

let warningBannerInjected = false;
let blockOverlayInjected = false;

// Scan text content on load
function scanPageContent() {
  chrome.storage.local.get(['extensionMode', 'autoScan'], (settings) => {
    // Only scan if in Consumer Mode and autoScan is enabled
    if (settings.extensionMode !== 'CONSUMER' || settings.autoScan === false) {
      return;
    }

    const bodyText = document.body.innerText || '';
    const matchedPhrases = EXAGGERATED_PHRASES.filter(phrase => bodyText.includes(phrase));

    if (matchedPhrases.length > 0 && !warningBannerInjected && !blockOverlayInjected) {
      injectWarningBanner(matchedPhrases);
    }
  });
}

// Check if domain is blocked immediately
function checkDomainBlockedOnLoad() {
  const currentDomain = window.location.hostname.replace('www.', '').toLowerCase();
  
  // Ask background script if blocked
  chrome.runtime.sendMessage({ action: 'CHECK_DOMAIN', domain: currentDomain }, (response) => {
    if (response && response.isBlocked) {
      injectBlockOverlay('โดเมนนี้ได้รับการยืนยันว่าเป็นแหล่งเผยแพร่โฆษณาหลอกลวงอันตรายและถูกขึ้นบัญชีดำปิดกั้น');
    } else {
      // If not blocked, scan for text violations
      setTimeout(scanPageContent, 1000);
    }
  });
}

// Injects warning banner at the top of the webpage
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
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
  textNode.innerHTML = `⚠️ <strong>Ad Shield คำเตือน:</strong> ตรวจพบข้อความโฆษณาอวดอ้างสรรพคุณเกินจริงและไม่ปลอดภัยต่อผู้บริโภค <span style="background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:4px; font-size:12px; margin-left:8px;">${phrases.join(', ')}</span>`;
  banner.appendChild(textNode);

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 10px;
    align-items: center;
  `;

  // Submit anonymous tip button
  const reportBtn = document.createElement('button');
  reportBtn.innerText = '🚨 ส่งเบาะแส อย.';
  reportBtn.style.cssText = `
    background: white;
    color: #b91c1c;
    border: none;
    padding: 6px 14px;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  `;
  reportBtn.onclick = async () => {
    reportBtn.disabled = true;
    reportBtn.innerText = 'กำลังส่งเบาะแส...';
    
    try {
      const pageTitle = document.title || 'โฆษณาเกินจริงในหน้าเว็บ';
      const pageUrl = window.location.href;
      const snippet = phrases.join('; ') + ' | เนื้อหาบางส่วน: ' + document.body.innerText.substring(0, 200);

      const res = await fetch('http://localhost:3001/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: pageTitle,
          url: pageUrl,
          productType: 'FOOD', // Defaulting to food scan
          evidenceText: snippet,
          productLicenseNumber: extractFdaNumber(document.body.innerText)
        })
      });

      if (!res.ok) throw new Error();

      reportBtn.innerText = 'ส่งเบาะแสสำเร็จแล้ว ✓';
      reportBtn.style.background = '#d1fae5';
      reportBtn.style.color = '#065f46';
    } catch {
      reportBtn.innerText = 'การส่งล้มเหลว ❌';
      reportBtn.disabled = false;
      setTimeout(() => {
        reportBtn.innerText = '🚨 ส่งเบาะแส อย.';
      }, 2000);
    }
  };
  buttonContainer.appendChild(reportBtn);

  // Close warning banner button
  const closeBtn = document.createElement('button');
  closeBtn.innerText = '✕';
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

  // Inject banner
  document.body.appendChild(banner);
  // Add body padding
  document.body.style.marginTop = '45px';
}

// Injects Full-screen Red overlay blocking unsafe pages
function injectBlockOverlay(reason: string) {
  blockOverlayInjected = true;
  
  // Remove warning banner if any
  const oldBanner = document.getElementById('kp-ad-shield-banner');
  if (oldBanner) {
    document.body.removeChild(oldBanner);
    document.body.style.marginTop = '0px';
  }

  const overlay = document.createElement('div');
  overlay.id = 'kp-ad-shield-block-screen';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #080a10;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
    <div style="max-width: 600px; padding: 40px; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px; background: rgba(17, 24, 39, 0.85); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
      <div style="font-size: 4.5rem; margin-bottom: 20px; text-shadow: 0 0 20px rgba(239, 68, 68, 0.4);">🚫</div>
      <h1 style="color: #ef4444; font-size: 1.85rem; margin-bottom: 12px; font-weight: bold;">การเข้าถึงถูกปิดกั้น (Blocked by Ad Shield)</h1>
      <p style="color: #f3f4f6; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
        เว็บไซต์โดเมนนี้ถูกระงับการเข้าถึงชั่วคราวและเพิ่มลงในบัญชีดำ (Blacklist) เครือข่ายคุ้มครองผู้บริโภค 
        เนื่องจากเจ้าหน้าที่นิติกรและหัวหน้าผู้รีวิว อย. ได้ตัดสินอนุมัติคดีโฆษณาอวดอ้างสรรพคุณเกินจริงระดับอันตรายร้ายแรง
      </p>
      
      <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); padding: 15px; border-radius: 8px; font-size: 13.5px; font-family: monospace; color: #f87171; text-align: left; margin-bottom: 24px; line-height: 1.5;">
        <strong>เหตุผลความผิดคดี:</strong> ${reason}
      </div>
      
      <div style="display: flex; justify-content: center; gap: 15px;">
        <button id="kp-bypass-btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: #9ca3af; padding: 10px 20px; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 13px;">
          ข้ามการปิดกั้น (เสี่ยงภัยด้วยตนเอง)
        </button>
        <button id="kp-back-btn" style="background: #ef4444; border: none; color: white; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13.5px;">
          ย้อนกลับไปที่ปลอดภัย 🛡️
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  // Block body scroll
  document.body.style.overflow = 'hidden';

  // Wire buttons
  document.getElementById('kp-back-btn')!.onclick = () => {
    window.history.back();
    setTimeout(() => {
      window.close();
    }, 500);
  };

  document.getElementById('kp-bypass-btn')!.onclick = () => {
    document.body.removeChild(overlay);
    document.body.style.overflow = 'auto';
    blockOverlayInjected = false;
  };
}

// Simple helper to extract FDA Oryor number (looks for patterns like 13-1-12345-1-0001 or similar digits)
function extractFdaNumber(text: string): string {
  const match = text.match(/\d{2}-\d-\d{5}-\d-\d{4}/);
  return match ? match[0] : '';
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'BLOCK_SCREEN' && !blockOverlayInjected) {
    injectBlockOverlay(message.reason);
  }
});

// Run onload check
checkDomainBlockedOnLoad();
