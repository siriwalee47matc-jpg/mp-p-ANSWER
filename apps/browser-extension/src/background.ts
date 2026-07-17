// Background Service Worker for Sentinel ADS Shield
import { API_URL } from './config';
import { AllowlistEntry, analyzeLocalPageSignals, buildScanDecision } from './scan-policy';
export {};

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

let apiReadyAt = 0;

async function ensureApiReady() {
  if (Date.now() - apiReadyAt < 4 * 60 * 1000) return;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}/metrics/public`, {
        signal: AbortSignal.timeout(60000),
        cache: 'no-store',
      });
      await readApiJson(response, 'API readiness check');
      if (response.ok) {
        apiReadyAt = Date.now();
        return;
      }
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
    const localConfig = await chrome.storage.local.get(['riskLevelOverride']);
    if (localConfig.riskLevelOverride === true) return;
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

const INTERNAL_SENTINEL_HOSTS = new Set([
  'sentinel-ads-ssk.vercel.app',
  'sentinel-ads-api.onrender.com',
]);

function shouldScanUrl(urlStr: string) {
  const supported = urlStr.startsWith('http://') || urlStr.startsWith('https://') || urlStr.startsWith('file://');
  if (!supported) return false;

  try {
    const hostname = new URL(urlStr).hostname.toLowerCase();
    return !INTERNAL_SENTINEL_HOSTS.has(hostname);
  } catch {
    return false;
  }
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

chrome.runtime.onInstalled.addListener(async (details) => {
  const current = await chrome.storage.local.get([
    'extensionMode',
    'autoScan',
    'riskLevel',
    'riskLevelOverride',
    'riskLogs',
    'scanHistory',
    'localProtection',
    'allowlistDomains',
  ]);
  await chrome.storage.local.set({
    extensionMode: current.extensionMode ?? 'CONSUMER',
    autoScan: current.autoScan ?? true,
    riskLevel: current.riskLevel ?? 'AUTO_DETECT',
    riskLevelOverride: current.riskLevelOverride ?? false,
    riskLogs: current.riskLogs ?? [],
    scanHistory: current.scanHistory ?? {},
    localProtection: current.localProtection ?? {},
    allowlistDomains: current.allowlistDomains ?? [],
  });
  await Promise.all([syncBlockedDomains(), syncAllowlist(), syncRiskLevel()]);

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

async function sendMessageToTab(tabId: number, message: Record<string, unknown>) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch (firstError) {
    try {
      // Existing tabs do not receive a newly installed/updated manifest content
      // script until they reload. Inject it on demand so a completed scan can
      // still display its in-page warning immediately.
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['assets/content.js'],
      });
      await chrome.tabs.sendMessage(tabId, message);
      return true;
    } catch (retryError) {
      console.log('Failed to deliver message to tab:', firstError, retryError);
      return false;
    }
  }
}

async function checkAndBlockTab(tabId: number, urlStr: string) {
  try {
    const domain = normalizeDomain(urlStr);
    const data = await chrome.storage.local.get(['blockedDomains', 'allowlistDomains', 'localProtection', 'riskLevel']);
    const allowlistEntry = matchAllowlist(domain, data.allowlistDomains || []);
    if (allowlistEntry?.action === 'SKIP_SCAN') {
      return;
    }

    const list = data.blockedDomains || [];
    const blockedInfo = list.find((d: any) => domain === d.domain || domain.endsWith(`.${d.domain}`));
    const protection = data.localProtection?.[domain];
    const activeProtection =
      data.riskLevel === 'AUTO_BLOCK' && protection && Number(protection.expiresAt) > Date.now()
        ? protection
        : null;
    const blockReason = blockedInfo?.reason || activeProtection?.reason;
    if (blockReason) {
      setTimeout(() => {
        void sendMessageToTab(tabId, {
          action: 'BLOCK_SCREEN',
          reason: blockReason,
        });
      }, 500);
    }
  } catch {
    // Ignore invalid protocols
  }
}

const inFlightScans = new Map<number, string>();

async function runAutoScanForTab(activeTab: chrome.tabs.Tab) {
  if (!activeTab?.id || !activeTab.url || !shouldScanUrl(activeTab.url)) return;
  const tabId = activeTab.id;
  const scanKey = `${tabId}:${activeTab.url}`;
  if (inFlightScans.has(tabId)) return;
  inFlightScans.set(tabId, scanKey);

  try {
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
    const pageUrl = new URL(activeTab.url);
    const historyKey = `${hostname}:${pageUrl.pathname}${pageUrl.search}:${riskLevel}`;
    const now = Date.now();
    
    // Cache check: only scan if not scanned in last 1 minute to prevent rapid duplicate requests while browsing
    // Bypass cache check for local testing URLs (localhost, 127.0.0.1, or file://) to make development testing seamless
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || activeTab.url.startsWith('file://') || !hostname;
    if (!isLocal && (now - (scanHistory[historyKey] || 0) < 3 * 60 * 1000)) return;

    let pageSignals: any = null;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const bodyText = document.body.innerText || '';
          const mainText =
            document.querySelector('main, article, [role="main"]')?.textContent || bodyText;
          const description =
            document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
          const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
            .slice(0, 20)
            .map((node) => (node.textContent || '').trim())
            .filter(Boolean)
            .join(' | ');
          const fda = bodyText.match(/\d{2}-\d-\d{5}-\d-\d{4}/)?.[0] || '';
          const imageSignals = Array.from(document.images)
            .slice(0, 20)
            .map((img) => [img.alt || '', img.title || '', img.getAttribute('aria-label') || '', img.src.split('/').pop() || ''].join(' '))
            .join(' | ');
          const figcaptions = Array.from(document.querySelectorAll('figcaption, [data-testid*="caption"], .caption'))
            .slice(0, 20)
            .map((node) => (node.textContent || '').trim())
            .join(' | ');
          return {
            text: [document.title, description, headings, mainText]
              .filter(Boolean)
              .join('\n')
              .replace(/\s+/g, ' ')
              .substring(0, 6000),
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

    const currentTab = await chrome.tabs.get(tabId).catch(() => null);
    if (!currentTab || currentTab.url !== activeTab.url) return;

    const textEvidence = `${activeTab.title || ''}\n${activeTab.url}\n${pageSignals.text}`;
    const imageEvidence = `${activeTab.title || ''}\n${pageSignals.imageSignalsText || ''}`;
    const combinedText = `${textEvidence}\n${pageSignals.imageSignalsText || ''}`;
    const textLocalSignals = analyzeLocalPageSignals(textEvidence);
    const imageLocalSignals = analyzeLocalPageSignals(imageEvidence);
    const localSignals = analyzeLocalPageSignals(combinedText);
    if (!localSignals.shouldAnalyze) {
      await chrome.storage.local.set({
        scanHistory: { ...scanHistory, [historyKey]: now },
      });
      return;
    }

    const [, evidenceImage] = await Promise.all([
      ensureApiReady(),
      currentTab.active && !textLocalSignals.shouldAnalyze && imageLocalSignals.shouldAnalyze
        ? chrome.tabs
            .captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, { format: 'jpeg', quality: 55 })
            .catch((err) => {
              console.log('Could not capture visible tab:', err);
              return undefined;
            })
        : Promise.resolve(undefined),
    ]);
    const productType = classifyProductType(combinedText);

    const analyzeRes = await fetch(`${API_URL}/risk/logs`, {
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

    const aiResult = await readApiJson(analyzeRes, 'Automatic risk analysis');
    if (!analyzeRes.ok) {
      throw new Error(aiResult.message || `Automatic risk analysis failed (HTTP ${analyzeRes.status})`);
    }
    const caseData = aiResult;
    const score = aiResult.aiRiskScore || 0;
    const blockDecision = buildScanDecision(aiResult, riskLevel, allowlistEntry);

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
      autoBlockEligible: blockDecision.serverBlockEligible,
      protectiveBlockEligible: blockDecision.protectiveBlockEligible,
      legalSignals: blockDecision.legalSignals,
      localSignals: localSignals.claimSignals,
      allowlist: allowlistEntry?.action || null,
      whoisInfo: aiResult.whoisInfo || null,
      officialProductSources: aiResult.officialProductSources || [],
      matchingRules: aiResult.matchingRules || [],
      licenseStatus: aiResult.licenseStatus || null,
      productLicenseNumber: aiResult.productLicenseNumber || null,
      scanDurationMs: Date.now() - now,
    };

    await chrome.storage.local.set({
      riskLogs: [newLog, ...logs].slice(0, 30),
      scanHistory: {
        ...scanHistory,
        [historyKey]: now,
      },
    });

    if (blockDecision.notify) {
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#dc2626' });
      await chrome.action.setBadgeText({ tabId, text: String(Math.round(score)) });
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

    if (blockDecision.protectiveBlockEligible) {
      const reason = `Sentinel ADS ตรวจพบความเสี่ยงสูงจาก AI (${score}%) และพบหลักฐานที่ตรงกับกฎกฎหมาย ระบบจึงแสดงหน้าป้องกันชั่วคราว`;
      const protectionData = await chrome.storage.local.get(['localProtection']);
      await chrome.storage.local.set({
        localProtection: {
          ...(protectionData.localProtection || {}),
          [hostname]: { score, reason, caseId: caseData.id, expiresAt: Date.now() + 12 * 60 * 60 * 1000 },
        },
      });
      await sendMessageToTab(tabId, { action: 'BLOCK_SCREEN', reason });
    } else if (blockDecision.notify) {
      await sendMessageToTab(tabId, {
        action: 'SCAN_RESULT',
        score,
        analysis: aiResult.aiAnalysis,
        recommendedAction: blockDecision.recommendedAction,
      });
    } else {
      await chrome.action.setBadgeText({ tabId, text: '' });
    }

    if (blockDecision.serverBlockEligible && canAuthorizeBlock) {
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
  } finally {
    if (activeTab.id && inFlightScans.get(activeTab.id) === scanKey) {
      inFlightScans.delete(activeTab.id);
    }
    const latestTab = activeTab.id ? await chrome.tabs.get(activeTab.id).catch(() => null) : null;
    if (latestTab?.url && latestTab.url !== activeTab.url && shouldScanUrl(latestTab.url)) {
      void runAutoScanForTab(latestTab);
    }
  }
}


chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'SYNC_NOW') {
    Promise.all([syncBlockedDomains(), syncAllowlist()]).then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.action === 'CHECK_DOMAIN') {
    chrome.storage.local.get(['blockedDomains', 'localProtection', 'riskLevel']).then((data) => {
      const list = data.blockedDomains || [];
      const domain = request.domain.toLowerCase();
      const blockedInfo = list.find((d: any) => domain === d.domain || domain.endsWith(`.${d.domain}`));
      const protection = data.localProtection?.[domain];
      const activeProtection =
        data.riskLevel === 'AUTO_BLOCK' && protection && Number(protection.expiresAt) > Date.now()
          ? protection
          : null;
      sendResponse({
        isBlocked: Boolean(blockedInfo || activeProtection),
        reason: blockedInfo?.reason || activeProtection?.reason,
      });
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
