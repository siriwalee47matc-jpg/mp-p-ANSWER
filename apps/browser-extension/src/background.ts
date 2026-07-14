// Background Service Worker for Sentinel ADS Shield
import { API_URL } from './config';
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

async function readApiJson(response: Response, operation: string) {
  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`${operation} returned non-JSON response (HTTP ${response.status})`);
  }

  try {
    return rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new Error(`${operation} returned invalid JSON (HTTP ${response.status})`);
  }
}

async function ensureApiReady() {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}/metrics/public`, {
        signal: AbortSignal.timeout(60000),
        cache: 'no-store',
      });
      await readApiJson(response, 'API readiness check');
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }

  throw lastError instanceof Error ? lastError : new Error('API readiness check failed');
}

async function syncBlockedDomains() {
  try {
    const res = await fetch(`${API_URL}/domains`);
    if (!res.ok) throw new Error('Failed to fetch domains');
    const domains = await readApiJson(res, 'Domain sync');
    await chrome.storage.local.set({ blockedDomains: domains });
    console.log('Synced blocked domains:', domains.length);
  } catch (err) {
    console.error('Error syncing blocked domains:', err);
  }
}

async function syncAllowlist() {
  try {
    const res = await fetch(`${API_URL}/allowlist`);
    if (!res.ok) throw new Error('Failed to fetch allowlist');
    const allowlist = await readApiJson(res, 'Allowlist sync');
    await chrome.storage.local.set({ allowlistDomains: allowlist });
    console.log('Synced allowlist domains:', allowlist.length);
  } catch (err) {
    console.error('Error syncing allowlist:', err);
  }
}

async function syncRiskLevel() {
  try {
    const res = await fetch(`${API_URL}/config/risk-level`);
    if (!res.ok) throw new Error('Failed to fetch risk level');
    const config = await readApiJson(res, 'Risk-level sync');
    if (config && config.riskLevel) {
      const autoScan = config.riskLevel !== 'MANUAL';
      await chrome.storage.local.set({ 
        riskLevel: config.riskLevel,
        autoScan
      });
      console.log('Synced global risk level:', config.riskLevel);
    }
  } catch (err) {
    console.error('Error syncing global risk level:', err);
  }
}

function shouldScanUrl(urlStr: string) {
  return urlStr.startsWith('http://') || urlStr.startsWith('https://') || urlStr.startsWith('file://');
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

async function recordExtensionInstall() {
  const storage = await chrome.storage.local.get(['installationTelemetryId', 'installationTelemetryReported']);
  const installationId = storage.installationTelemetryId ||
    (crypto.randomUUID?.() || `install-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  if (!storage.installationTelemetryId) {
    await chrome.storage.local.set({ installationTelemetryId: installationId });
  }

  if (storage.installationTelemetryReported) return;

  try {
    const response = await fetch(`${API_URL}/metrics/extension-install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        installationId,
        version: chrome.runtime.getManifest().version,
      }),
    });

    if (response.ok) {
      await chrome.storage.local.set({ installationTelemetryReported: true });
    }
  } catch (error) {
    console.warn('Could not record extension installation:', error);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.local.set({
    extensionMode: 'CONSUMER',
    autoScan: true,
    riskLevel: 'AUTO_DETECT',
    riskLogs: [],
    scanHistory: {},
    allowlistDomains: [],
  }, () => {
    syncBlockedDomains();
    syncAllowlist();
    syncRiskLevel();
  });

  if (details.reason === 'install') {
    void recordExtensionInstall();
  }
});

chrome.runtime.onStartup.addListener(() => {
  void recordExtensionInstall();
});

chrome.alarms.create('sync_domains_alarm', { periodInMinutes: 0.5 });
chrome.alarms.create('sync_allowlist_alarm', { periodInMinutes: 2 });


chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync_domains_alarm') {
    syncBlockedDomains();
    syncRiskLevel();
  } else if (alarm.name === 'sync_allowlist_alarm') {
    syncAllowlist();
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    checkAndBlockTab(tabId, tab.url);
    runAutoScanForTab(tab);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      checkAndBlockTab(activeInfo.tabId, tab.url);
      runAutoScanForTab(tab);
    }
  });
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

async function runAutoScanForTab(activeTab: chrome.tabs.Tab) {
  try {
    if (!activeTab || !activeTab.id || !activeTab.url) return;
    if (!shouldScanUrl(activeTab.url)) return;

    const hostname = normalizeDomain(activeTab.url);
    const domainData = await chrome.storage.local.get(['blockedDomains', 'allowlistDomains', 'scanHistory', 'riskLevel']);
    const authData = await chrome.storage.local.get(['token', 'userRole']);
    const blockedList = domainData.blockedDomains || [];
    if (blockedList.some((d: any) => d.domain === hostname)) return;

    const allowlistEntry = matchAllowlist(hostname, domainData.allowlistDomains || []);
    if (allowlistEntry?.action === 'SKIP_SCAN') return;

    const riskLevel = domainData.riskLevel || 'AUTO_DETECT';
    if (riskLevel === 'MANUAL') return;

    const scanHistory = domainData.scanHistory || {};
    const historyKey = `${hostname}:${riskLevel}`;
    const now = Date.now();
    
    // Cache check: only scan if not scanned in last 1 minute to prevent rapid duplicate requests while browsing
    // Bypass cache check for local testing URLs (localhost, 127.0.0.1, or file://) to make development testing seamless
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || activeTab.url.startsWith('file://') || !hostname;
    if (!isLocal && (now - (scanHistory[historyKey] || 0) < 1 * 60 * 1000)) return;

    await ensureApiReady();

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
          const figcaptions = Array.from(document.querySelectorAll('figcaption, [data-testid*="caption"], .caption'))
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

    const createRes = await fetch(`${API_URL}/cases`, {
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
    const caseData = await readApiJson(createRes, 'Case creation');

    const analyzeRes = await fetch(`${API_URL}/cases/${caseData.id}/analyze`, {
      method: 'POST',
    });
    if (!analyzeRes.ok) throw new Error('AI analysis failed');
    const aiResult = await readApiJson(analyzeRes, 'AI analysis');
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
      analysisSource: aiResult.analysisSource,
      aiModel: aiResult.aiModel,
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
      chrome.notifications.create(caseData.id, {
        type: 'basic',
        iconUrl: 'logo.png',
        title: `Sentinel ADS: พบความเสี่ยง ${score >= 80 ? 'สูงมาก' : 'ปานกลาง'} (${score}%)`,
        message: `พบโฆษณาอาจเข้าข่ายผิดกฎหมายบนหน้าเว็บ:\n${activeTab.title || activeTab.url}\nข้อแนะนำทางกฎหมาย: ${blockDecision.recommendedAction}`,
        priority: 2,
      }, (id) => {
        if (chrome.runtime.lastError) {
          console.warn('First notification attempt failed, trying fallback:', chrome.runtime.lastError.message);
          // Fallback with no icon
          chrome.notifications.create(caseData.id, {
            type: 'basic',
            iconUrl: '',
            title: `Sentinel ADS: พบความเสี่ยง ${score >= 80 ? 'สูงมาก' : 'ปานกลาง'} (${score}%)`,
            message: `พบโฆษณาอาจเข้าข่ายผิดกฎหมายบนหน้าเว็บ:\n${activeTab.title || activeTab.url}\nข้อแนะนำทางกฎหมาย: ${blockDecision.recommendedAction}`,
            priority: 2,
          });
        }
      });
    }

    const canAuthorizeBlock =
      Boolean(authData.token) &&
      (authData.userRole === 'ADMIN' || authData.userRole === 'REVIEWER');

    if (blockDecision.eligible && canAuthorizeBlock) {
      try {
        const blockResponse = await fetch(`${API_URL}/blocks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authData.token}`,
          },
          body: JSON.stringify({ caseId: caseData.id }),
        });

        if (!blockResponse.ok) {
          throw new Error(`Automatic block request was rejected (${blockResponse.status})`);
        }

        const blockResult = await readApiJson(blockResponse, 'Automatic block');
        if (!blockResult.success) {
          throw new Error(blockResult.reason || 'Automatic block request was rejected');
        }

        await syncBlockedDomains();
        chrome.tabs
        .sendMessage(activeTab.id, {
          action: 'BLOCK_SCREEN',
          reason: `ระบบ Sentinel ADS ปิดกั้นการเข้าถึงอัตโนมัติ เนื่องจากพบโฆษณาสุขภาพผิดกฎหมายที่มีระดับความเสี่ยงสูงมาก (${score}%)`,
        })
        .catch((err) => {
          console.log('Failed to send block message to content script:', err);
        });
      } catch (blockErr) {
        console.error('Error auto-blocking domain:', blockErr);
      }
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

  if (request.action === 'OPEN_EXTENSION_POPUP') {
    triggerOpenPopup();
    sendResponse({ success: true });
    return true;
  }
});

function triggerOpenPopup() {
  if (typeof chrome !== 'undefined' && chrome.action && typeof chrome.action.openPopup === 'function') {
    chrome.windows.getLastFocused({ populate: false }, (window) => {
      const windowId = window?.id;
      try {
        const options = windowId ? { windowId } : {};
        chrome.action.openPopup(options, () => {
          const err = chrome.runtime.lastError;
          if (err) {
            console.log('Failed to open action popup, falling back to tab:', err);
            chrome.tabs.create({
              url: chrome.runtime.getURL('popup.html')
            });
          }
        });
      } catch (e) {
        console.log('Failed to call openPopup, falling back to tab:', e);
        chrome.tabs.create({
          url: chrome.runtime.getURL('popup.html')
        });
      }
    });
  } else {
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html')
    });
  }
}

chrome.notifications.onClicked.addListener((notificationId) => {
  triggerOpenPopup();
});
