// Background Service Worker for Sentinel ADS Shield

// Fetch and sync blocked domains from NestJS backend
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

// Run sync on startup and set default settings
chrome.runtime.onInstalled.addListener(() => {
  syncBlockedDomains();
  chrome.storage.local.set({
    extensionMode: 'CONSUMER', // default mode
    autoScan: true,
    riskLevel: 'MANUAL', // default risk level
    riskLogs: [] // history of auto-scan results
  });
});

// Periodic sync every 30 seconds
chrome.alarms.create('sync_domains_alarm', { periodInMinutes: 0.5 });
// Periodic auto-scan every 30 seconds (for testing and quick updates)
chrome.alarms.create('auto_scan_alarm', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync_domains_alarm') {
    syncBlockedDomains();
  } else if (alarm.name === 'auto_scan_alarm') {
    runAutoScan();
  }
});

// Check tabs and notify if domain is blocked
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    checkAndBlockTab(tabId, tab.url);
  }
});

async function checkAndBlockTab(tabId: number, urlStr: string) {
  try {
    const url = new URL(urlStr);
    const domain = url.hostname.replace('www.', '').toLowerCase();

    const data = await chrome.storage.local.get(['blockedDomains']);
    const list = data.blockedDomains || [];

    const blockedInfo = list.find((d: any) => d.domain === domain);
    if (blockedInfo) {
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          action: 'BLOCK_SCREEN',
          reason: blockedInfo.reason
        }).catch(err => {
          console.log('Failed to notify tab, likely not injected yet:', err);
        });
      }, 500);
    }
  } catch (e) {
    // Ignore invalid URL protocols (e.g. chrome://)
  }
}

// Perform active tab scan and call backend cases API for AI analysis
async function runAutoScan() {
  try {
    const settings = await chrome.storage.local.get(['riskLevel', 'extensionMode']);
    const riskLevel = settings.riskLevel || 'MANUAL';

    if (riskLevel === 'MANUAL') {
      return;
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.id || !activeTab.url) return;

    // Only scan HTTP(S) webpages
    if (!activeTab.url.startsWith('http://') && !activeTab.url.startsWith('https://')) return;

    // Check if domain is already blocked
    const hostname = new URL(activeTab.url).hostname.replace('www.', '').toLowerCase();
    const domainData = await chrome.storage.local.get(['blockedDomains']);
    const blockedList = domainData.blockedDomains || [];
    const isBlocked = blockedList.some((d: any) => d.domain === hostname);
    if (isBlocked) return;

    // Execute script on the page to extract text
    let pageText = '';
    let fdaNumber = '';
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const bodyText = document.body.innerText || '';
          const match = bodyText.match(/\d{2}-\d-\d{5}-\d-\d{4}/);
          return {
            text: bodyText.substring(0, 800),
            fda: match ? match[0] : ''
          };
        }
      });
      if (results && results[0] && results[0].result) {
        pageText = results[0].result.text;
        fdaNumber = results[0].result.fda;
      }
    } catch (e) {
      console.log('Could not execute script on tab:', e);
      return;
    }

    if (!pageText || pageText.trim().length === 0) return;

    // POST page context to backend to create a case with SYSTEM reporterRole
    const createRes = await fetch('http://localhost:3001/cases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: activeTab.title || 'Auto Scanned Page',
        url: activeTab.url,
        productType: 'HERBAL',
        evidenceText: pageText,
        productLicenseNumber: fdaNumber || undefined,
        reporterRole: 'SYSTEM'
      })
    });

    if (!createRes.ok) throw new Error('Failed to create background case');
    const caseData = await createRes.json();

    // Trigger AI analysis on backend
    const analyzeRes = await fetch(`http://localhost:3001/cases/${caseData.id}/analyze`, {
      method: 'POST'
    });
    if (!analyzeRes.ok) throw new Error('AI analysis failed');
    const aiResult = await analyzeRes.json();
    const score = aiResult.aiRiskScore || 0;

    // Log the risk scan result in chrome.storage.local
    const logData = await chrome.storage.local.get(['riskLogs']);
    const logs = logData.riskLogs || [];
    const newLog = {
      id: caseData.id,
      timestamp: new Date().toISOString(),
      url: activeTab.url,
      title: activeTab.title || 'Auto Scanned Page',
      score: score,
      level: riskLevel,
      analysis: aiResult.aiAnalysis
    };
    await chrome.storage.local.set({ riskLogs: [newLog, ...logs].slice(0, 30) });

    // Send notifications if score is substantial
    if (score >= 50) {
      const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      chrome.notifications.create({
        type: 'basic',
        iconUrl: transparentPixel,
        title: `Ad Shield: ตรวจพบความเสี่ยงระดับ${score >= 80 ? 'สูงมาก' : 'ปานกลาง'}`,
        message: `คะแนนความเสี่ยง: ${score}% (มาตรการ: ${riskLevel === 'AUTO_BLOCK' ? 'ปิดกั้นทันที' : 'รายงานเท่านั้น'})\nURL: ${activeTab.url}`,
        priority: 2
      });
    }

    // Auto-blocking mechanism
    if (riskLevel === 'AUTO_BLOCK' && score >= 80) {
      // POST request to backend block endpoint
      try {
        await fetch(`http://localhost:3001/block/case/${caseData.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ performedByUserId: null })
        });
        await syncBlockedDomains();
      } catch (blockErr) {
        console.error('Error auto-blocking domain:', blockErr);
      }

      // Tell content script to inject block overlay immediately
      chrome.tabs.sendMessage(activeTab.id, {
        action: 'BLOCK_SCREEN',
        reason: `ระบบตรวจพบโฆษณาอวดอ้างสรรพคุณเกินจริงระดับสูงมาก (${score}%) ด้วยระบบสแกนอัตโนมัติ`
      }).catch(err => {
        console.log('Failed to send block message to content script:', err);
      });
    }
  } catch (err) {
    console.error('Background auto-scan error:', err);
  }
}

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'SYNC_NOW') {
    syncBlockedDomains().then(() => sendResponse({ success: true }));
    return true; // keep channel open for async response
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
