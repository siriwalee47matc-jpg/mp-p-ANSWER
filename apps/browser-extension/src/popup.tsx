import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { API_URL, DASHBOARD_URL } from './config';
import { analyzeCaseWithRetry } from './analysis-api';
import './popup.css';

export enum ProductType {
  FOOD = 'FOOD',
  DRUG = 'DRUG',
  COSMETIC = 'COSMETIC',
  MEDICAL_DEVICE = 'MEDICAL_DEVICE',
  HERBAL = 'HERBAL',
  CLINIC = 'CLINIC',
  HAZARDOUS = 'HAZARDOUS',
  NARCOTIC = 'NARCOTIC'
}

type Mode = 'CONSUMER' | 'OFFICER';

const readApiJson = async (response: Response, operation: string) => {
  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();

  if (!contentType.toLowerCase().includes('application/json')) {
    const reason = response.status >= 500
      ? 'เซิร์ฟเวอร์วิเคราะห์ไม่พร้อมใช้งานชั่วคราว'
      : 'ปลายทาง API ส่งข้อมูลกลับมาไม่ถูกต้อง';
    throw new Error(`${operation}: ${reason} (HTTP ${response.status})`);
  }

  try {
    return rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new Error(`${operation}: เซิร์ฟเวอร์ส่ง JSON ที่อ่านไม่ได้ (HTTP ${response.status})`);
  }
};

const ensureApiReady = async () => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}/metrics/public`, {
        signal: AbortSignal.timeout(60000),
        cache: 'no-store',
      });
      await readApiJson(response, 'เตรียมเซิร์ฟเวอร์');
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์วิเคราะห์ได้ กรุณาลองอีกครั้ง');
};

const getRiskLevelText = (score: number) => {
  if (score >= 80) return `สูงมาก (${score}%)`;
  if (score >= 50) return `ปานกลาง (${score}%)`;
  if (score > 0) return `ต่ำ (${score}%)`;
  return 'ไม่มีความเสี่ยง (0%)';
};

const getProductTypeText = (type: string) => {
  switch (type) {
    case 'FOOD': return 'อาหาร';
    case 'DRUG': return 'ยา';
    case 'COSMETIC': return 'เครื่องสำอาง';
    case 'MEDICAL_DEVICE': return 'เครื่องมือแพทย์';
    case 'HERBAL': return 'สมุนไพร';
    case 'CLINIC': return 'สถานพยาบาล';
    case 'HAZARDOUS': return 'วัตถุอันตราย';
    case 'NARCOTIC': return 'วัตถุเสพติด';
    default: return type;
  }
};

const getPenaltyText = (section: string) => {
  const sec = section.toLowerCase();
  if (sec.includes('มาตรา 40') && sec.includes('อาหาร')) {
    return 'โทษ: จำคุกไม่เกิน 3 ปี หรือปรับไม่เกิน 30,000 บาท หรือทั้งจำทั้งปรับ (มาตรา 70 พ.ร.บ. อาหาร)';
  }
  if (sec.includes('มาตรา 41') && sec.includes('อาหาร')) {
    return 'โทษ: ปรับไม่เกิน 5,000 บาท (มาตรา 71 พ.ร.บ. อาหาร)';
  }
  if (sec.includes('มาตรา 88') && sec.includes('ยา') && !sec.includes('ทวิ')) {
    return 'โทษ: ปรับไม่เกิน 100,000 บาท (มาตรา 124 พ.ร.บ. ยา)';
  }
  if (sec.includes('มาตรา 88 ทวิ') || (sec.includes('88') && sec.includes('ทวิ') && sec.includes('ยา'))) {
    return 'โทษ: ปรับไม่เกิน 100,000 บาท (มาตรา 124 ทวิ พ.ร.บ. ยา)';
  }
  if (sec.includes('เครื่องสำอาง')) {
    return 'โทษ: จำคุกไม่เกิน 1 ปี หรือปรับไม่เกิน 100,000 บาท หรือทั้งจำทั้งปรับ (มาตรา 84 พ.ร.บ. เครื่องสำอาง)';
  }
  if (sec.includes('มาตรา 56') || (sec.includes('56') && sec.includes('แพทย์'))) {
    return 'โทษ: จำคุกไม่เกิน 1 ปี หรือปรับไม่เกิน 100,000 บาท หรือทั้งจำทั้งปรับ (มาตรา 106 พ.ร.บ. เครื่องมือแพทย์)';
  }
  if (sec.includes('มาตรา 57') || (sec.includes('57') && sec.includes('แพทย์'))) {
    return 'โทษ: จำคุกไม่เกิน 6 เดือน หรือปรับไม่เกิน 50,000 บาท หรือทั้งจำทั้งปรับ (มาตรา 107 พ.ร.บ. เครื่องมือแพทย์)';
  }
  if (sec.includes('มาตรา 70') || (sec.includes('70') && sec.includes('สมุนไพร'))) {
    return 'โทษ: จำคุกไม่เกิน 1 ปี หรือปรับไม่เกิน 100,000 บาท หรือทั้งจำทั้งปรับ (มาตรา 114 พ.ร.บ. ผลิตภัณฑ์สมุนไพร)';
  }
  if (sec.includes('มาตรา 71') || (sec.includes('71') && sec.includes('สมุนไพร'))) {
    return 'โทษ: จำคุกไม่เกิน 6 เดือน หรือปรับไม่เกิน 50,000 บาท หรือทั้งจำทั้งปรับ (มาตรา 115 พ.ร.บ. ผลิตภัณฑ์สมุนไพร)';
  }
  return 'โทษ: ปรับตามพระราชบัญญัติและกฎกระทรวงที่เกี่ยวข้อง';
};

const AI_STEPS = [
  'สกัดข้อความจากหน้าเว็บและภาพหลักฐาน (Tesseract OCR)',
  'วิเคราะห์ข้อความและประเมินความเสี่ยงด้วย AI จาก Backend',
  'เปรียบเทียบสัญญาณกับบทกฎหมายและมาตราความผิด',
  'ตรวจสอบโดเมนและข้อมูลจดทะเบียนจาก DNS/RDAP'
];

// ความเสี่ยง circular indicator for Push Notification
function RiskCircle({ score }: { score: number }) {
  const [dashoffset, setDashoffset] = useState(157.1); // Circumference for r=25 is 157.08

  useEffect(() => {
    const timer = setTimeout(() => {
      const radius = 25;
      const circumference = 2 * Math.PI * radius;
      setDashoffset(circumference - (score / 100) * circumference);
    }, 150);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = 25;
  const circumference = 2 * Math.PI * radius;

  let strokeColor = '#10b981'; // Emerald
  if (score >= 80) strokeColor = '#f43f5e'; // Rose
  else if (score >= 50) strokeColor = '#f59e0b'; // Amber

  return (
    <div className="risk-circle-container">
      <svg width="62" height="62" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <filter id={`circle-glow-${score}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={strokeColor} floodOpacity="0.45" />
          </filter>
        </defs>
        <circle cx="31" cy="31" r={radius} stroke="rgba(0,0,0,0.04)" strokeWidth="4.5" fill="transparent" />
        <circle
          cx="31"
          cy="31"
          r={radius}
          stroke={strokeColor}
          strokeWidth="4.5"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          filter={`url(#circle-glow-${score})`}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="risk-circle-text" style={{ color: strokeColor, textShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>{score}%</div>
    </div>
  );
}

const getRiskThemeClass = (score: number) => {
  if (score >= 80) return 'risk-theme-high';
  if (score >= 50) return 'risk-theme-medium';
  return 'risk-theme-low';
};

const getLicenseStatusMeta = (status?: string) => {
  switch (status) {
    case 'VALID':
      return { className: 'text-success', text: 'ตรวจสอบแล้วถูกต้อง' };
    case 'INVALID':
      return { className: 'text-danger', text: '❌ ตรวจสอบแล้วไม่ถูกต้องหรือหมดอายุ' };
    case 'CHECK_OFFICIAL_SOURCE':
      return { className: 'text-warning', text: '🟡 พบเลขแล้ว ต้องยืนยันกับแหล่งทางการ' };
    case 'NOT_PROVIDED':
      return { className: 'text-muted', text: '⚪ ไม่พบเลขใบอนุญาตบนหน้าเว็บ' };
    default:
      return { className: 'text-muted', text: '⚪ ยังไม่มีผลการตรวจสอบ' };
  }
};

const PRODUCT_PATTERNS: Array<{ productType: ProductType; keywords: string[] }> = [
  { productType: ProductType.DRUG, keywords: ['drug', 'medicine', 'capsule', 'tablet', 'antibiotic', 'ยา'] },
  { productType: ProductType.COSMETIC, keywords: ['cosmetic', 'serum', 'cream', 'whitening', 'beauty', 'skincare', 'ครีม'] },
  { productType: ProductType.MEDICAL_DEVICE, keywords: ['medical device', 'test kit', 'monitor', 'mask', 'เครื่องมือแพทย์'] },
  { productType: ProductType.CLINIC, keywords: ['clinic', 'hospital', 'doctor', 'treatment center', 'คลินิก', 'แพทย์'] },
  { productType: ProductType.HERBAL, keywords: ['herbal', 'botanical', 'traditional herb', 'สมุนไพร'] },
  { productType: ProductType.FOOD, keywords: ['food', 'supplement', 'dietary', 'beverage', 'coffee', 'tea', 'อาหาร'] },
];

const classifyProductType = (text: string) => {
  const normalized = text.toLowerCase();
  let best = ProductType.FOOD;
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
};

function Popup() {
  const [mode, setMode] = useState<Mode>('CONSUMER');
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Consumer state
  const [citizenTitle, setCitizenTitle] = useState('');

  // Officer state
  const [officerToken, setOfficerToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [dismissedNotification, setDismissedNotification] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Custom scan input states for officers
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customAdText, setCustomAdText] = useState('');

  // Auto-scan settings and history states
  const [showSettings, setShowSettings] = useState(false);
  const [riskLevel, setRiskLevel] = useState<'MANUAL' | 'AUTO_DETECT' | 'AUTO_BLOCK'>('MANUAL');
  const [riskLogs, setRiskLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Premium Features States
  const [blockLevel, setBlockLevel] = useState<'NORMAL' | 'MEDIUM' | 'STRICT'>('MEDIUM');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(-1);

  const runRadarScan = async (scanFn: () => Promise<void>) => {
    setIsScanning(true);
    setScanStepIndex(0);
    for (let step = 0; step < 4; step++) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      setScanStepIndex(step + 1);
    }
    await scanFn();
    setIsScanning(false);
    setScanStepIndex(-1);
  };

  useEffect(() => {
    // Get active tab info
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          const tab = tabs[0];
          setCurrentTab(tab);
          setCitizenTitle(tab.title || '');

          // Check if there is an auto-scan log for this URL
          chrome.storage.local.get(['riskLogs'], (data) => {
            const logs = data.riskLogs || [];
            const currentTabLog = logs.find((l: any) => l.url === tab.url);
            if (currentTabLog && currentTabLog.score >= 50) {
              setAiAnalysisResult({
                aiRiskScore: currentTabLog.score,
                aiAnalysis: currentTabLog.analysis,
                analysisSource: currentTabLog.analysisSource,
                aiModel: currentTabLog.aiModel,
                url: currentTabLog.url,
                productType: currentTabLog.productType || ProductType.FOOD,
                productLicenseNumber: currentTabLog.productLicenseNumber,
                licenseStatus: currentTabLog.licenseStatus,
                whoisInfo: currentTabLog.whoisInfo,
                officialProductSources: currentTabLog.officialProductSources || [],
                matchingRules: currentTabLog.matchingRules || [],
              });
              setDismissedNotification(false);
            }
          });
        }
      });
    } else {
      // Mock tab for standard browser preview
      const mockTab = {
        id: 1,
        title: 'ผลิตภัณฑ์สมุนไพรลดน้ำหนักสูตรเร่งด่วน ผอมจริงใน 3 วัน ปลอดภัย 100%',
        url: `${DASHBOARD_URL}/mock-ad-page`
      } as any;
      setCurrentTab(mockTab);
      setCitizenTitle(mockTab.title);
    }

    // Load saved settings
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['extensionMode', 'token', 'userName', 'riskLevel', 'riskLogs'], (data) => {
        if (data.extensionMode) setMode(data.extensionMode as Mode);
        if (data.token) setOfficerToken(data.token);
        if (data.riskLevel) setRiskLevel(data.riskLevel);
        if (data.riskLogs) setRiskLogs(data.riskLogs);
      });

      // Synchronize state when storage changes from background task
      const handleStorageChange = (changes: any) => {
        if (changes.riskLogs) {
          setRiskLogs(changes.riskLogs.newValue || []);
        }
        if (changes.riskLevel) {
          setRiskLevel(changes.riskLevel.newValue || 'MANUAL');
        }
      };
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    } else {
      const savedMode = localStorage.getItem('extensionMode');
      if (savedMode) setMode(savedMode as Mode);
      const savedToken = localStorage.getItem('token');
      if (savedToken) setOfficerToken(savedToken);
      const savedRiskLevel = localStorage.getItem('riskLevel');
      if (savedRiskLevel) setRiskLevel(savedRiskLevel as any);
      const savedLogs = localStorage.getItem('riskLogs');
      if (savedLogs) setRiskLogs(JSON.parse(savedLogs));
    }
  }, []);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setCreatedCaseId(null);
    setShowDetails(false);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ extensionMode: newMode });
    } else {
      localStorage.setItem('extensionMode', newMode);
    }
  };

  const handleRiskLevelChange = (level: 'MANUAL' | 'AUTO_DETECT' | 'AUTO_BLOCK') => {
    setRiskLevel(level);
    const autoScan = level !== 'MANUAL';
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ riskLevel: level, autoScan, riskLevelOverride: true });
    } else {
      localStorage.setItem('riskLevel', level);
      localStorage.setItem('autoScan', String(autoScan));
    }
  };

  const handleClearLogs = () => {
    setRiskLogs([]);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ riskLogs: [] });
    } else {
      localStorage.setItem('riskLogs', '[]');
    }
  };

  const handleConsumerScan = async () => {
    if (!currentTab || !currentTab.url) return;
    setLoading(true);
    setMessage(null);
    setAiAnalysisResult(null);
    setCreatedCaseId(null);
    try {
      await ensureApiReady();
      let pageSnippet = '';
      if (typeof chrome !== 'undefined' && chrome.scripting) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: currentTab.id! },
            func: () => document.body.innerText.substring(0, 500)
          });
          if (results && results[0]) pageSnippet = results[0].result as string;
        } catch (e) {}
      } else {
        pageSnippet = 'นี่คือตัวอย่างข้อความบนหน้าโฆษณาที่ผู้บริโภคพบว่าเข้าข่ายน่าสงสัย เช่น ยาสมุนไพรรักษาโรคสะเก็ดเงิน หายขาดร้อยเปอร์เซ็นต์ในสามวัน!';
      }
      const res = await fetch(`${API_URL}/risk/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: citizenTitle || currentTab.title || 'โฆษณาต้องสงสัย',
          url: currentTab.url,
          productType: classifyProductType(`${citizenTitle || currentTab.title || ''}\n${currentTab.url}\n${pageSnippet}`),
          evidenceText: pageSnippet || 'แจ้งจากระบบ Ad Shield',
          reporterRole: 'CONSUMER',
        })
      });
      const analyzeData = await readApiJson(res, 'สร้างและวิเคราะห์รายการตรวจสอบ');
      if (!res.ok) throw new Error(analyzeData.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
      setCreatedCaseId(analyzeData.id);
      setAiAnalysisResult(analyzeData);
      setDismissedNotification(false);
      setShowDetails(true);
      setMessage({ type: 'success', text: '⚡ ระบบอัจฉริยะ วิเคราะห์ระดับความเสี่ยงของหน้านี้เรียบร้อยแล้ว!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'ส่งข้อมูลล้มเหลว โปรดตรวจสอบเซิร์ฟเวอร์' });
    } finally {
      setLoading(false);
    }
  };

  const handleOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await ensureApiReady();
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await readApiJson(res, 'เข้าสู่ระบบ');
      if (!res.ok) throw new Error(data.message || 'รหัสผ่านไม่ถูกต้อง');

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ token: data.token, userName: data.user.name, userRole: data.user.role });
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userName', data.user.name);
        localStorage.setItem('userRole', data.user.role);
      }
      setOfficerToken(data.token);

      setEmail('');
      setPassword('');
      setMessage({ type: 'success', text: `เข้าสู่ระบบสำเร็จ: ยินดีต้อนรับ ${data.user.name}` });

      // Redirect/Navigate to หน้าภาพรวม
      setTimeout(() => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.create({ url: `${DASHBOARD_URL}/cases` });
        } else {
          window.open(`${DASHBOARD_URL}/cases`, '_blank');
        }
      }, 800);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOfficerScan = async () => {
    if (!currentTab || !currentTab.url) return;
    setLoading(true);
    setMessage(null);
    setAiAnalysisResult(null);
    setCreatedCaseId(null);
    try {
      await ensureApiReady();
      // Extract text and license
      let pageText = '';
      let detectedLicense = '';
      if (typeof chrome !== 'undefined' && chrome.scripting) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: currentTab.id! },
            func: () => {
              const txt = document.body.innerText;
              const match = txt.match(/\d{2}-\d-\d{5}-\d-\d{4}/);
              return { text: txt.substring(0, 1000), lic: match ? match[0] : '' };
            }
          });
          if (results && results[0] && results[0].result) {
            const resObj = results[0].result as any;
            pageText = resObj.text;
            detectedLicense = resObj.lic;
            if (detectedLicense) setLicenseNumber(detectedLicense);
          }
        } catch (e) {}
      } else {
        pageText = 'หน้าเพจโฆษณาอาหารเสริมสมุนไพรบำบัดมะเร็ง เบาหวาน ความดัน เลข อย 10-1-12345-1-0001 สรรพคุณวิเศษสุดๆ หายได้ในหนึ่งขวด ไม่ต้องพึ่งเคมีบำบัด';
        detectedLicense = '10-1-12345-1-0001';
        setLicenseNumber(detectedLicense);
      }
      // Create case
      const createRes = await fetch(`${API_URL}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${officerToken}` },
        body: JSON.stringify({
          title: currentTab.title || 'โฆษณาส่งตรวจจากส่วนขยาย',
          url: currentTab.url,
          productType: classifyProductType(`${currentTab.title || ''}\n${currentTab.url}\n${pageText}`),
          productLicenseNumber: detectedLicense || licenseNumber || undefined,
          evidenceText: pageText || 'ส่งจาก Extension เจ้าหน้าที่'
        })
      });
      const caseData = await readApiJson(createRes, 'สร้างรายการตรวจสอบ');
      if (!createRes.ok) throw new Error(caseData.message || 'บันทึกสร้างเคสล้มเหลว');
      setCreatedCaseId(caseData.id);
      // ระบบอัจฉริยะ analysis
      const analyzeData = await analyzeCaseWithRetry({
        apiUrl: API_URL,
        caseId: caseData.id,
        headers: { Authorization: `Bearer ${officerToken}` },
        readJson: readApiJson,
        operation: 'วิเคราะห์ด้วย AI',
        fallbackMessage: 'การเรียก ระบบอัจฉริยะ วิเคราะห์ล้มเหลว',
        onRetry: ({ attempt, delayMs, error }) => {
          console.warn(`AI analysis attempt ${attempt} failed; retrying in ${delayMs}ms:`, error.message);
        },
      });
      setAiAnalysisResult(analyzeData);
      setDismissedNotification(false);
      setShowDetails(true);
      setMessage({ type: 'success', text: `⚡ ระบบอัจฉริยะ ตรวจพบหลักฐานและประเมินคดี ${caseData.id} เรียบร้อย!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomOfficerScan = async () => {
    if (!customUrlInput.trim() && !customAdText.trim()) {
      setMessage({ type: 'error', text: 'กรุณากรอก URL เว็บไซต์ หรือข้อความโฆษณาที่ต้องการให้ ระบบอัจฉริยะ สแกน' });
      return;
    }
    setLoading(true);
    setMessage(null);
    setAiAnalysisResult(null);
    setCreatedCaseId(null);
    try {
      await ensureApiReady();
      const targetUrl = customUrlInput.trim() || 'manual-input://custom-text';
      const targetTitle = customUrlInput.trim() ? `สแกนด้วยตนเอง: ${customUrlInput}` : 'ตรวจสแกนข้อความโฆษณา';
      const targetText = customAdText.trim() || `สแกน URL กำหนดเอง: ${customUrlInput}`;

      // Create case
      const createRes = await fetch(`${API_URL}/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${officerToken}`
        },
        body: JSON.stringify({
          title: targetTitle,
          url: targetUrl,
          productType: classifyProductType(`${targetTitle}\n${targetUrl}\n${targetText}`),
          evidenceText: targetText
        })
      });
      const caseData = await readApiJson(createRes, 'สร้างรายการตรวจสอบ');
      if (!createRes.ok) throw new Error(caseData.message || 'บันทึกสร้างเคสล้มเหลว');
      setCreatedCaseId(caseData.id);

      // ระบบอัจฉริยะ analysis
      const analyzeData = await analyzeCaseWithRetry({
        apiUrl: API_URL,
        caseId: caseData.id,
        headers: { Authorization: `Bearer ${officerToken}` },
        readJson: readApiJson,
        operation: 'วิเคราะห์ด้วย AI',
        fallbackMessage: 'การเรียก ระบบอัจฉริยะ วิเคราะห์ล้มเหลว',
        onRetry: ({ attempt, delayMs, error }) => {
          console.warn(`AI analysis attempt ${attempt} failed; retrying in ${delayMs}ms:`, error.message);
        },
      });

      setAiAnalysisResult(analyzeData);
      setDismissedNotification(false);
      setShowDetails(true);
      setMessage({ type: 'success', text: `⚡ ระบบอัจฉริยะ ประเมินคดีแบบกำหนดเองรหัส ${caseData.id} เรียบร้อย!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDashboard = () => {
    setMessage({ type: 'success', text: `คดีหมายเลข ${createdCaseId} ถูกบันทึกเข้าสู่ระบบฐานข้อมูลแล้ว!` });
    setAiAnalysisResult(null);
    setCreatedCaseId(null);
    setShowDetails(false);
  };

  const handleConsumerConfirmSubmit = () => {
    setMessage({ type: 'success', text: 'ส่งรายงานเบาะแสความเสี่ยงเข้าสู่ระบบแล้ว ขอบพระคุณครับ!' });
    setAiAnalysisResult(null);
    setCreatedCaseId(null);
    setShowDetails(false);
  };

  const licenseMeta = getLicenseStatusMeta(aiAnalysisResult?.licenseStatus);
  const riskThemeClass = getRiskThemeClass(aiAnalysisResult?.aiRiskScore || 0);
  const investigation = (() => {
    const value = aiAnalysisResult?.whoisInfo;
    if (!value || typeof value !== 'string') return value || null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  })();
  const domainRdap = investigation?.domainRdap || null;
  const ipRdap = investigation?.ipRdap || null;
  const dnsInfo = investigation?.dns || null;
  const officialProductSources = aiAnalysisResult?.officialProductSources || investigation?.officialProductSources || [];

  const officialSourcesBlock = officialProductSources.length > 0 ? (
    <div className="info-block law-info">
      <h4 className="info-block-title">การตรวจสอบจากแหล่งข้อมูลทางการ</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {officialProductSources.map((source: any, idx: number) => (
          <div key={idx} className="law-rule-card">
            <div className="law-rule-name">{source.label}</div>
            <div className="law-rule-desc">{source.note}</div>
            <div className="law-rule-penalty"><a href={source.url} target="_blank" rel="noreferrer">เปิดแหล่งข้อมูลทางการ</a></div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  // Determine risk details
  const currentRiskScore = aiAnalysisResult?.aiRiskScore || 0;
  const riskFillClass = currentRiskScore >= 80 ? 'high' : currentRiskScore >= 50 ? 'medium' : 'low';
  const riskBadgeClass = currentRiskScore >= 80 ? 'high' : currentRiskScore >= 50 ? 'medium' : 'low';

  return (
    <div className={`popup-container ${showDetails && aiAnalysisResult ? 'has-results' : ''} ${riskThemeClass}`}>
      {/* Main Panel: Browser Control Panel */}
      <div className="main-panel animate-fade-in">
          {/* Scan steps overlay for Browser Mode */}
          {isScanning && (
            <div className="radar-container animate-fade-in">
              <div className="radar-ring-wrapper">
                <div className="radar-circle c1"></div>
                <div className="radar-circle c2"></div>
                <div className="radar-circle c3"></div>
                <div className="radar-sweep"></div>
                <img src="logo.png" alt="Sentinel Ads Logo" className="radar-logo" />
              </div>
              <div className="radar-steps-list">
                {AI_STEPS.map((stepText, idx) => {
                  const isDone = scanStepIndex > idx;
                  const isActive = scanStepIndex === idx;
                  return (
                    <div key={idx} className={`radar-step-item ${isDone ? '' : (isActive ? 'active' : 'pending')}`} style={isActive ? { color: '#b91c1c' } : {}}>
                      <span className="radar-step-icon">
                        {isDone ? 'DONE' : (isActive ? '' : '')}
                      </span>
                      <span>{stepText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="popup-header">
            <div className="header-brand">
              <img src="logo.png" alt="Sentinel Ads Logo" className="branding-logo" />
              <div className="header-text">
                <h1 className="title">SENTINEL ADS</h1>
                <span className="subtitle">ระบบเฝ้าระวังโฆษณา กระทรวงสาธารณสุข</span>
              </div>
            </div>
            <button
              className="settings-btn"
              onClick={() => setShowSettings(!showSettings)}
              title="ตั้งค่า (Settings)"
              type="button"
            >
              ⚙️
            </button>
          </div>

          <div className="status-indicator-container">
            <div className={`status-badge ${riskLevel !== 'MANUAL' ? 'status-active' : 'status-standby'}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {riskLevel === 'AUTO_BLOCK'
                  ? 'ปิดกั้นอัตโนมัติ (คุ้มครองหน้าเว็บเสี่ยงสูง)'
                  : riskLevel === 'AUTO_DETECT'
                    ? 'เฝ้าระวังอัตโนมัติ (ตรวจจับและแจ้งเตือน)'
                    : 'พร้อมสแกนตรวจสอบ (โหมดเจ้าหน้าที่)'}
              </span>
            </div>
          </div>

          {showSettings && (
            <div className="settings-panel animate-slide-down">
              <h3 className="section-title">ตั้งค่าส่วนขยาย</h3>
              <div className="input-group">
                <label className="panel-label">ระดับการจัดการความเสี่ยง:</label>
                <select
                  className="panel-input"
                  value={riskLevel}
                  onChange={(e) => handleRiskLevelChange(e.target.value as any)}
                >
                  <option value="MANUAL">ตรวจสอบโดยเจ้าหน้าที่</option>
                  <option value="AUTO_DETECT">ตรวจจับและส่งรายงานอัตโนมัติ</option>
                  <option value="AUTO_BLOCK">ปิดกั้นและคุ้มครองอัตโนมัติ</option>
                </select>
              </div>
              <div className="input-group" style={{ marginTop: '8px' }}>
                <label className="panel-label">ระดับการบล็อกโฆษณา (ระดับความเข้มงวดในการปิดกั้น):</label>
                <select
                  className="panel-input"
                  value={blockLevel}
                  onChange={(e) => setBlockLevel(e.target.value as any)}
                >
                  <option value="NORMAL">ทั่วไป</option>
                  <option value="MEDIUM">ปานกลาง</option>
                  <option value="STRICT">เข้มงวด</option>
                </select>
              </div>
            </div>
          )}

          <div className="mode-toggle">
            <button className={mode === 'CONSUMER' ? 'active' : ''} onClick={() => handleModeChange('CONSUMER')}>👥 ประชาชน</button>
            <button className={mode === 'OFFICER' ? 'active' : ''} onClick={() => handleModeChange('OFFICER')}>👮 เจ้าหน้าที่</button>
          </div>

          {/* Exaggerated Advertising Push Notification Card */}
          {aiAnalysisResult && aiAnalysisResult.aiRiskScore >= 50 && !dismissedNotification && (
            <div className={`push-notification-card ${aiAnalysisResult.aiRiskScore >= 80 ? 'high-risk' : 'medium-risk'}`}>
              <RiskCircle score={aiAnalysisResult.aiRiskScore} />

              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '1rem' }}></span>
                  <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#991b1b' }}>
                    ระบบอัจฉริยะ ตรวจพบโฆษณาเกินจริง!
                  </h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 600, color: '#4b5563', lineHeight: '1.3' }}>
                  พบความอวดอ้างสรรพคุณไม่เป็นธรรมในหน้านี้: {aiAnalysisResult.aiRiskScore >= 80 ? 'ระดับอันตรายสูงมาก' : 'ระดับปานกลาง'}
                </p>

                {/* การดำเนินการ button in notification */}
                <button
                  className="notification-action-btn"
                  onClick={() => {
                    setShowDetails(true);
                    setTimeout(() => {
                      const detailBlock = document.querySelector('.ai-info');
                      if (detailBlock) {
                        detailBlock.scrollIntoView({ behavior: 'smooth' });
                      }
                    }, 100);
                  }}
                >
                  ดูรายงานวิเคราะห์ ⚖️
                </button>
              </div>

              {/* Close / Dismiss Button */}
              <button
                onClick={() => setDismissedNotification(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  padding: '2px',
                  alignSelf: 'flex-start',
                  lineHeight: '1',
                  transition: 'color 0.2s',
                  fontWeight: 'bold'
                }}
                title="ปิดการแจ้งเตือน"
                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                ✕
              </button>

              {/* Colored bottom line accent */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: aiAnalysisResult.aiRiskScore >= 80
                  ? 'linear-gradient(90deg, #ef4444, #991b1b)'
                  : 'linear-gradient(90deg, #f59e0b, #d97706)',
                opacity: 0.95
              }} />
            </div>
          )}

          {message && <div className={`alert ${message.type}`}>{message.text}</div>}

          <div className="risk-bar">
            <span className="risk-label">ระดับความเสี่ยง:</span>
            <div className="risk-track">
              <div
                className={`risk-fill ${riskFillClass}`}
                style={{ width: `${currentRiskScore}%` }}
              ></div>
            </div>
            <span className={`risk-score-badge-label ${riskBadgeClass}`}>
              {aiAnalysisResult ? getRiskLevelText(currentRiskScore) : 'ไม่มีความเสี่ยง (0%)'}
            </span>
          </div>

          <button
            className={`btn-primary ${!loading ? 'pulse-button' : ''}`}
            onClick={() => {
              if (mode === 'CONSUMER') {
                runRadarScan(handleConsumerScan);
              } else {
                runRadarScan(handleOfficerScan);
              }
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loader-spinner"></span>
                <span>กำลังวิเคราะห์ระบบ...</span>
              </>
            ) : (
              <>
                <span>เริ่มสแกนวิเคราะห์หน้าเว็บนี้ (เริ่มตรวจสอบ)</span>
              </>
            )}
          </button>

          {/* Officer Mode ตรวจสอบแบบกำหนดเอง Section & Session Control */}
          {mode === 'OFFICER' && (
            <>
              {officerToken ? (
                <>
                  <div className="custom-scan-section">
                    <h3 className="section-title">ตรวจสอบข้อมูลแบบกำหนดเอง (ตรวจสอบแบบกำหนดเอง)</h3>
                    <div className="input-group">
                      <label htmlFor="customUrlInput">กล่องใส่ข้อมูลเว็บไซต์ (URL):</label>
                      <input
                        id="customUrlInput"
                        className="panel-input"
                        type="text"
                        placeholder="https://example.com/dangerous-ad"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                      />
                    </div>
                    <div className="input-group" style={{ marginTop: '4px' }}>
                      <label htmlFor="customAdText">กล่องใส่ข้อความโฆษณาเกินจริง:</label>
                      <textarea
                        id="customAdText"
                        className="panel-input"
                        rows={2}
                        placeholder="กรอกข้อความโฆษณาอวดอ้างสรรพคุณเกินจริง..."
                        value={customAdText}
                        onChange={(e) => setCustomAdText(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn-primary"
                      onClick={() => runRadarScan(handleCustomOfficerScan)}
                      disabled={loading}
                      style={{ background: 'linear-gradient(135deg, #27272a 0%, #000000 100%)', color: '#ffffff', fontWeight: '700', marginTop: '4px', width: '100%' }}
                    >
                      ให้ ระบบอัจฉริยะ ช่วยตรวจสอบ
                    </button>
                  </div>

                  <div className="officer-session-card animate-slide-down" style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#12100e', textAlign: 'center', fontWeight: 'bold' }}>
                      👮 เจ้าหน้าที่ลงชื่อเข้าใช้งานอยู่
                    </div>
                    <button
                      className="btn-primary"
                      style={{ background: 'linear-gradient(135deg, #27272a 0%, #000000 100%)', color: '#ffffff', fontWeight: '700', width: '100%', padding: '8px 0', fontSize: '0.8rem' }}
                      onClick={() => {
                        if (typeof chrome !== 'undefined' && chrome.tabs) {
                          chrome.tabs.create({ url: `${DASHBOARD_URL}/cases` });
                        } else {
                          window.open(`${DASHBOARD_URL}/cases`, '_blank');
                        }
                      }}
                    >
                      เข้าสู่หน้าแดชบอร์ดหลัก (หน้าภาพรวม)
                    </button>
                    <button
                      className="btn-primary"
                      style={{ background: 'linear-gradient(135deg, #27272a 0%, #000000 100%)', color: '#ffffff', fontWeight: '700', width: '100%', padding: '6px 0', fontSize: '0.75rem', marginTop: '4px' }}
                      onClick={async () => {
                        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                          await chrome.storage.local.remove(['token', 'userName', 'userRole']);
                        } else {
                          localStorage.removeItem('token');
                          localStorage.removeItem('userName');
                          localStorage.removeItem('userRole');
                        }
                        setOfficerToken('');
                        setAiAnalysisResult(null);
                        setCreatedCaseId(null);
                        setShowDetails(false);
                        setCustomUrlInput('');
                        setCustomAdText('');
                        setMessage({ type: 'success', text: 'ออกจากระบบสำเร็จ' });
                      }}
                    >
                      ออกจากระบบ
                    </button>
                  </div>
                </>
              ) : (
                <div className="login-section-card animate-slide-down" style={{ marginTop: '4px' }}>
                  <h3 className="section-title" style={{ fontSize: '0.82rem', color: '#12100e', margin: '0 0 6px 0' }}>🔑 เข้าสู่ระบบเจ้าหน้าที่</h3>
                  <form className="login-form" onSubmit={handleOfficerLogin}>
                    <label htmlFor="email">อีเมล</label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required style={{ padding: '6px' }} />
                    <label htmlFor="password" style={{ marginTop: '2px' }}>รหัสผ่าน</label>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required style={{ padding: '6px' }} />
                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '6px', padding: '8px 0' }}>เข้าสู่ระบบ</button>
                    <button
                      type="button"
                      className="extension-register-link"
                      onClick={() => {
                        const registrationUrl = `${DASHBOARD_URL}/#register`;
                        if (typeof chrome !== 'undefined' && chrome.tabs) {
                          chrome.tabs.create({ url: registrationUrl });
                        } else {
                          window.open(registrationUrl, '_blank');
                        }
                      }}
                    >
                      ยังไม่มีบัญชี? สมัครบัญชีเจ้าหน้าที่
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          <div className="logs-header-section" onClick={() => setShowLogs(!showLogs)}>
            <span className="logs-title-text">
              📋 ประวัติการสแกนอัตโนมัติ ({riskLogs.length})
            </span>
            <span>{showLogs ? '▼' : '▶'}</span>
          </div>

          {showLogs && (
            <div className="logs-content-panel">
              {riskLogs.length === 0 ? (
                <div className="no-logs-text">ไม่มีประวัติการสแกนในปัจจุบัน</div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                    <button className="clear-logs-btn" onClick={handleClearLogs}>ล้างข้อมูล</button>
                  </div>
                  <div className="logs-list">
                    {riskLogs.map((log, index) => (
                      <div key={log.id || index} className="log-card">
                        <div className="log-card-header">
                          <span className={`log-score-badge ${log.score >= 80 ? 'high' : log.score >= 50 ? 'medium' : 'low'}`}>
                            {log.score}%
                          </span>
                          <span className="log-timestamp">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="log-card-title">{log.title}</div>
                        <div className="log-card-url">{log.url}</div>
                        {log.analysisSource && (
                          <div className="log-card-analysis">แหล่งผลวิเคราะห์: {log.analysisSource}{log.aiModel ? ` (${log.aiModel})` : ''}</div>
                        )}
                        <div className="log-card-analysis">{log.analysis}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      {/* Right Side Panel: ระบบอัจฉริยะ Detailed analysis report */}
      {showDetails && aiAnalysisResult && (
        <div className="side-panel animate-slide-down">
          <div className="side-panel-header">
            <h3 className="side-panel-title">📋 รายงานวิเคราะห์หน้าเว็บด้วย ระบบอัจฉริยะ</h3>
            <button className="btn-close-side" onClick={() => setShowDetails(false)} title="ปิดรายงาน">✕</button>
          </div>
          {aiAnalysisResult.analysisSource && (
            <div style={{ margin: '0 0 8px', fontSize: '0.72rem', fontWeight: 700, color: '#047857' }}>
              แหล่งผลวิเคราะห์: {aiAnalysisResult.analysisSource}
              {aiAnalysisResult.aiModel ? ` (${aiAnalysisResult.aiModel})` : ''}
            </div>
          )}

          <div className="risk-bar" style={{ marginTop: '4px', gap: '6px' }}>
            <span className="risk-label" style={{ fontSize: '0.78rem' }}>ระดับความเสี่ยง:</span>
            <div className="risk-track" style={{ height: '10px' }}>
              <div
                className={`risk-fill ${aiAnalysisResult.aiRiskScore >= 80 ? 'high' : aiAnalysisResult.aiRiskScore >= 50 ? 'medium' : 'low'}`}
                style={{ width: `${aiAnalysisResult.aiRiskScore || 0}%` }}
              ></div>
            </div>
            <span className={`risk-score-badge-label ${aiAnalysisResult.aiRiskScore >= 80 ? 'high' : aiAnalysisResult.aiRiskScore >= 50 ? 'medium' : 'low'}`} style={{ fontSize: '0.74rem' }}>
              {getRiskLevelText(aiAnalysisResult.aiRiskScore || 0)}
            </span>
          </div>

          <div className="info-block product-info">
            <h4 className="info-block-title">📦 ข้อมูลผลิตภัณฑ์</h4>
            <div className="info-row">
              <span className="info-label">ประเภท:</span>
              <span className="info-value">{getProductTypeText(aiAnalysisResult.productType)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">เลข อย.:</span>
              <span className="info-value" style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                {aiAnalysisResult.productLicenseNumber || 'ไม่ระบุ/ไม่พบในหน้าเว็บ'}
              </span>
            </div>
            {aiAnalysisResult.licenseStatus && (
              <div className="info-row">
                <span className="info-label">สถานะ อย.:</span>
                <span className={`info-value ${licenseMeta.className}`} style={{ fontWeight: 'bold' }}>
                  {licenseMeta.text}
                </span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">ที่มาเว็บไซต์:</span>
              <span className="info-value text-url" title={aiAnalysisResult.url}>{aiAnalysisResult.url || 'ไม่ระบุ'}</span>
            </div>
          </div>

          {/* ข้อมูลสืบค้นแหล่งเปิด Grid */}
          <div className="info-block product-info" style={{ background: '#ffffff', borderColor: 'rgba(0, 0, 0, 0.08)' }}>
            <h4 className="info-block-title">🔎 ข้อมูลสืบค้นแหล่งเปิดของผู้เผยแพร่</h4>
            <div className="osint-grid">
              <div className="osint-item">
                <span className="info-label">หมายเลขไอพี:</span>
                <div className="osint-val">{dnsInfo?.aRecords?.[0] || dnsInfo?.aaaaRecords?.[0] || 'ไม่พบข้อมูล DNS'}</div>
              </div>
              <div className="osint-item">
                <span className="info-label">เครือข่ายผู้ให้บริการ:</span>
                <div className="osint-val">{ipRdap?.networkName || ipRdap?.handle || 'ไม่เปิดเผยโดยผู้ให้บริการ'}</div>
              </div>
              <div className="osint-item">
                <span className="info-label">เจ้าของจดทะเบียน:</span>
                <div className="osint-val">{domainRdap?.registrant || domainRdap?.handle || domainRdap?.registrar || 'ไม่เปิดเผยโดย Registry'}</div>
              </div>
              <div className="osint-item">
                <span className="info-label">วันจดทะเบียน:</span>
                <div className="osint-val">{domainRdap?.createdAt || 'ไม่พบข้อมูล'}</div>
              </div>
              <div className="osint-item" style={{ gridColumn: 'span 2' }}>
                <span className="info-label">อีเมลติดต่อกลับ:</span>
                <div className="osint-val">{domainRdap?.abuseEmail || 'ไม่เปิดเผยโดย Registry'}</div>
              </div>
              <div className="osint-item" style={{ gridColumn: 'span 2' }}>
                <span className="info-label">แหล่งข้อมูลทะเบียน:</span>
                <div className="osint-val">{domainRdap?.rdapServer || ipRdap?.source || 'ไม่พบแหล่งข้อมูล RDAP'}</div>
              </div>
            </div>
          </div>
          {officialSourcesBlock}


          {aiAnalysisResult.evidenceText && (
            <div className="info-block evidence-info">
              <h4 className="info-block-title">💬 ข้อความโฆษณาที่สงสัย</h4>
              <p className="evidence-quote">"{aiAnalysisResult.evidenceText}"</p>
            </div>
          )}

          {aiAnalysisResult.matchingRules && aiAnalysisResult.matchingRules.length > 0 && (
            <div className="info-block law-info">
              <h4 className="info-block-title">⚖️ พระราชบัญญัติและบทลงโทษที่เกี่ยวข้อง</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {aiAnalysisResult.matchingRules.map((rule: any, idx: number) => (
                  <div key={idx} className="law-rule-card">
                    <div className="law-rule-name">{rule.lawName} - {rule.section}</div>
                    <div className="law-rule-desc">{rule.description}</div>
                    <div className="law-rule-penalty">{getPenaltyText(rule.section)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}





          {/* การดำเนินการ buttons based on Mode */}
          {mode === 'CONSUMER' ? (
            <button
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #27272a, #000000)', color: '#ffffff', fontWeight: '700', marginTop: '10px', width: '100%' }}
              onClick={handleConsumerConfirmSubmit}
            >
              ส่งรายงานเบาะแส อย.
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                className="btn-primary"
                style={{ flex: 1, color: '#ffffff', fontWeight: '700', fontSize: '0.8rem' }}
                onClick={handleSaveToDashboard}
              >
                บันทึกคดี
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1, background: 'linear-gradient(135deg, #27272a, #000000)', color: '#ffffff', fontWeight: '700', fontSize: '0.8rem' }}
                onClick={() => {
                  if (typeof chrome !== 'undefined' && chrome.tabs) {
                    chrome.tabs.create({ url: `${DASHBOARD_URL}/cases` });
                  } else {
                    window.open(`${DASHBOARD_URL}/cases`, '_blank');
                  }
                }}
              >
                เข้าแดชบอร์ด
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<Popup />);
