// Background Service Worker for Sentinel ADS Shield
export {};

type AllowlistEntry = {
  domain: string;
  listType: 'TRUSTED_OFFICIAL' | 'MARKETPLACE' | 'PLATFORM';
  action: 'SKIP_SCAN' | 'REPORT_ONLY' | 'NO_AUTO_BLOCK';
  reason: string;
};

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
  { productType: 'DRUG', keywords: ['ยา', 'drug', 'tablet', 'capsule', 'medicine', 'antibiotic'] },
  { productType: 'COSMETIC', keywords: ['cosmetic', 'serum', 'cream', 'whitening', 'beauty', 'skincare', 'ครีม'] },
  { productType: 'MEDICAL_DEVICE', keywords: ['medical device', 'เครื่องมือแพทย์', 'test kit', 'mask', 'monitor'] },
  { productType: 'CLINIC', keywords: ['clinic', 'hospital', 'doctor', 'คลินิก', 'แพทย์'] },
  { productType: 'HERBAL', keywords: ['herbal', 'botanical', 'สมุนไพร'] },
  { productType: 'FOOD', keywords: ['food', 'supplement', 'ชา', 'coffee', 'beverage', 'อาหาร'] },
];

async function syncBlockedDomains() {
  try {
    const res = await fetch('http://localhost:3001/domains');
    if (!res.ok) throw new Error('Failed to fetch domains');
    const domains = await res.json();
    await chrome.storage.local.set({ blockedDomains: domains });
    console.log('Synced blocked domains:', domains.length);
  } catch (err) {
    console.error('Error syncing blocked domains:', err);
  }
}

async function syncAllowlist() {
  try {
    const res = await fetch('http://localhost:3001/allowlist');
    if (!res.ok) throw new Error('Failed to fetch allowlist');
    const allowlist = await res.json();
    await chrome.storage.local.set({ allowlistDomains: allowlist });
    console.log('Synced allowlist domains:', allowlist.length);
  } catch (err) {
    console.error('Error syncing allowlist:', err);
  }
}

function shouldScanUrl(urlStr: string) {
  return urlStr.startsWith('http://') || urlStr.startsWith('https://');
}

function normalizeDomain(urlStr: string) {
  return new URL(urlStr).hostname.replace(/^www\./, '').toLowerCase();
}

function matchAllowlist(domain: string, entries: AllowlistEntry[]) {
  return entries.find((entry) => domain === entry.domain || domain.endsWith(`.${entry.domain}`)) || null;
}

function classifyProductType(text: string): ProductType {
  const normalized = text.toLowerCase();
  let best: ProductType = 'FOOD';
  let bestScore = -1;

  for (const rule of PRODUCT_PATTERNS) {
    const score = rule.keywords.reduce((count, keyword) => count + (normalized.includes(keyword.toLowerCase()) ? 1 : 0), 0);
    if (score > bestScore) {
      best = rule.productType;
      bestScore = score;
    }
  }

  return best;
}

function buildAutoBlockDecision(aiResult: any, riskLevel: string, allowlistEntry: AllowlistEntry | null) {
  const score = aiResult.aiRiskScore || 0;
  const decision = aiResult.enforcementDecision || {};
  const legalSignals = Array.isArray(aiResult.matchingRules) ? aiResult.matchingRules.length : 0;
  const hasOfficialLicenseReference = aiResult.licenseStatus === 'CHECK_OFFICIAL_SOURCE';
  const hasRealOsint = aiResult.whoisInfo?.sourceType === 'REAL_OSINT';
  const allowlistAction = allowlistEntry?.action || null;
  const reportOnly = allowlistAction === 'REPORT_ONLY' || allowlistAction === 'NO_AUTO_BLOCK';
  const skipScan = allowlistAction === 'SKIP_SCAN';
  const eligible =
    !skipScan &&
    !reportOnly &&
    riskLevel === 'AUTO_BLOCK' &&
    score >= 85 &&
    !hasOfficialLicenseReference &&
    hasRealOsint &&
    legalSignals >= 1 &&
    decision.autoBlockEligible === true;

  return {
    eligible,
    score,
    legalSignals,
    recommendedAction: skipScan ? 'SKIP_SCAN' : reportOnly ? 'REPORT_ONLY' : decision.recommendedAction || 'REVIEW_REQUIRED',
  };
}

chrome.runtime.onInstalled.addListener(() => {
  syncBlockedDomains();
  syncAllowlist();
  chrome.storage.local.set({
    extensionMode: 'CONSUMER',
    autoScan: true,
    riskLevel: 'MANUAL',
    riskLogs: [],
    scanHistory: {},
    allowlistDomains: [],
  });
});

chrome.alarms.create('sync_domains_alarm', { periodInMinutes: 0.5 });
chrome.alarms.create('sync_allowlist_alarm', { periodInMinutes: 2 });
chrome.alarms.create('auto_scan_alarm', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync_domains_alarm') {
    syncBlockedDomains();
  } else if (alarm.name === 'sync_allowlist_alarm') {
    syncAllowlist();
  } else if (alarm.name === 'auto_scan_alarm') {
    runAutoScan();
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    checkAndBlockTab(tabId, tab.url);
  }
});

async function checkAndBlockTab(tabId: number, urlStr: string) {
  try {
    const domain = normalizeDomain(urlStr);
    const data = await chrome.storage.local.get(['blockedDomains', 'allowlistDomains']);
    const allowlistEntry = matchAllowlist(domain, data.allowlistDomains || []);
    if (allowlistEntry?.action === 'SKIP_SCAN') {
      return;
    }

    const list = data.blockedDomains || [];
    const blockedInfo = list.find((d: any) => d.domain === domain);
    if (blockedInfo) {
      setTimeout(() => {
        chrome.tabs
          .sendMessage(tabId, {
            action: 'BLOCK_SCREEN',
            reason: blockedInfo.reason,
          })
          .catch((err) => {
            console.log('Failed to notify tab, likely not injected yet:', err);
          });
      }, 500);
    }
  } catch {
    // Ignore invalid protocols
  }
}

async function runAutoScan() {
  try {
    const settings = await chrome.storage.local.get(['riskLevel']);
    const riskLevel = settings.riskLevel || 'MANUAL';
    if (riskLevel === 'MANUAL') return;

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.id || !activeTab.url) return;
    if (!shouldScanUrl(activeTab.url)) return;

    const hostname = normalizeDomain(activeTab.url);
    const domainData = await chrome.storage.local.get(['blockedDomains', 'allowlistDomains', 'scanHistory']);
    const blockedList = domainData.blockedDomains || [];
    if (blockedList.some((d: any) => d.domain === hostname)) return;

    const allowlistEntry = matchAllowlist(hostname, domainData.allowlistDomains || []);
    if (allowlistEntry?.action === 'SKIP_SCAN') return;

    const scanHistory = domainData.scanHistory || {};
    const historyKey = `${hostname}:${riskLevel}`;
    const now = Date.now();
    if (now - (scanHistory[historyKey] || 0) < 3 * 60 * 1000) return;

    let pageSignals: any = null;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const bodyText = document.body.innerText || '';
          const fda = bodyText.match(/\d{2}-\d-\d{5}-\d-\d{4}/)?.[0] || '';
          const imageSignals = Array.from(document.images)
            .slice(0, 10)
            .map((img) => [img.alt || '', img.title || '', img.getAttribute('aria-label') || '', img.src.split('/').pop() || ''].join(' '))
            .join(' | ');
          const figcaptions = Array.from(document.querySelectorAll('figcaption, [data-testid*=\"caption\"], .caption'))
            .slice(0, 10)
            .map((node) => (node.textContent || '').trim())
            .join(' | ');
          return {
            text: bodyText.substring(0, 2500),
            fda,
            imageSignalsText: `${imageSignals} | ${figcaptions}`.trim(),
          };
        },
      });
      pageSignals = results?.[0]?.result || null;
    } catch (err) {
      console.log('Could not execute script on tab:', err);
      return;
    }

    if (!pageSignals?.text?.trim()) return;

    let evidenceImage: string | undefined;
    try {
      evidenceImage = await chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, { format: 'png' });
    } catch (err) {
      console.log('Could not capture visible tab:', err);
    }

    const combinedText = `${activeTab.title || ''}\n${activeTab.url}\n${pageSignals.text}\n${pageSignals.imageSignalsText || ''}`;
    const productType = classifyProductType(combinedText);

    const createRes = await fetch('http://localhost:3001/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: activeTab.title || 'Auto Scanned Page',
        url: activeTab.url,
        productType,
        evidenceText: pageSignals.text,
        evidenceImage,
        imageSignalsText: pageSignals.imageSignalsText || '',
        productLicenseNumber: pageSignals.fda || undefined,
        reporterRole: 'SYSTEM',
      }),
    });

    if (!createRes.ok) throw new Error('Failed to create background case');
    const caseData = await createRes.json();

    const analyzeRes = await fetch(`http://localhost:3001/cases/${caseData.id}/analyze`, {
      method: 'POST',
    });
    if (!analyzeRes.ok) throw new Error('AI analysis failed');
    const aiResult = await analyzeRes.json();
    const score = aiResult.aiRiskScore || 0;
    const blockDecision = buildAutoBlockDecision(aiResult, riskLevel, allowlistEntry);

    const logData = await chrome.storage.local.get(['riskLogs']);
    const logs = logData.riskLogs || [];
    const newLog = {
      id: caseData.id,
      timestamp: new Date().toISOString(),
      url: activeTab.url,
      title: activeTab.title || 'Auto Scanned Page',
      score,
      level: riskLevel,
      productType,
      analysis: aiResult.aiAnalysis,
      recommendedAction: blockDecision.recommendedAction,
      autoBlockEligible: blockDecision.eligible,
      legalSignals: blockDecision.legalSignals,
      allowlist: allowlistEntry?.action || null,
    };

    await chrome.storage.local.set({
      riskLogs: [newLog, ...logs].slice(0, 30),
      scanHistory: {
        ...scanHistory,
        [historyKey]: now,
      },
    });

    if (score >= 50) {
      const transparentPixel =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      chrome.notifications.create({
        type: 'basic',
        iconUrl: transparentPixel,
        title: `Ad Shield: risk ${score >= 80 ? 'high' : 'medium'}`,
        message: `Risk score: ${score}% (Action: ${blockDecision.recommendedAction})\nURL: ${activeTab.url}`,
        priority: 2,
      });
    }

    if (blockDecision.eligible) {
      try {
        await fetch(`http://localhost:3001/block/case/${caseData.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ performedByUserId: null }),
        });
        await syncBlockedDomains();
      } catch (blockErr) {
        console.error('Error auto-blocking domain:', blockErr);
      }

      chrome.tabs
        .sendMessage(activeTab.id, {
          action: 'BLOCK_SCREEN',
          reason: `Auto-blocked after confirmed high-risk signals (${score}%)`,
        })
        .catch((err) => {
          console.log('Failed to send block message to content script:', err);
        });
    }
  } catch (err) {
    console.error('Background auto-scan error:', err);
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'SYNC_NOW') {
    Promise.all([syncBlockedDomains(), syncAllowlist()]).then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.action === 'CHECK_DOMAIN') {
    chrome.storage.local.get(['blockedDomains']).then((data) => {
      const list = data.blockedDomains || [];
      const isBlocked = list.some((d: any) => d.domain === request.domain.toLowerCase());
      sendResponse({ isBlocked });
    });
    return true;
  }
});
