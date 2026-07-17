'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL, fetchApi, readApiResponse } from '@/lib/api';

const chromeWebStoreUrl = process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL?.trim();
const extensionDownloadUrl = chromeWebStoreUrl || '/downloads/sentinel-ads-extension.zip';

type PublicMetrics = {
  downloadClicks: number;
  extensionInstalls: number;
};

type AuthMode = 'login' | 'register';

const passwordRequirements = [
  { key: 'length', label: 'อย่างน้อย 12 ตัวอักษร', test: (value: string) => value.length >= 12 },
  { key: 'lowercase', label: 'ตัวพิมพ์เล็ก (a-z)', test: (value: string) => /[a-z]/.test(value) },
  { key: 'uppercase', label: 'ตัวพิมพ์ใหญ่ (A-Z)', test: (value: string) => /[A-Z]/.test(value) },
  { key: 'number', label: 'ตัวเลข (0-9)', test: (value: string) => /[0-9]/.test(value) },
  { key: 'special', label: 'อักขระพิเศษ เช่น !@#$', test: (value: string) => /[^A-Za-z0-9\s]/.test(value) },
];

function getApiError(data: Record<string, any>, fallback: string): string {
  if (Array.isArray(data.message)) return data.message.join(', ');
  return typeof data.message === 'string' ? data.message : fallback;
}

/* ─── Inline SVG Components ─── */
const ShieldLogo = () => (
  <svg width="32" height="36" viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M16 1L2 7V18C2 25.18 8.18 31.74 16 34C23.82 31.74 30 25.18 30 18V7L16 1Z" fill="url(#shieldGrad)" stroke="rgba(245,158,11,0.6)" strokeWidth="1"/>
    <path d="M10 18L14 22L22 13" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="shieldGrad" x1="16" y1="1" x2="16" y2="34" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0b7a4c"/>
        <stop offset="1" stopColor="#064e31"/>
      </linearGradient>
    </defs>
  </svg>
);

const ChromeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="12" r="4" fill="currentColor"/>
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="0"/>
    <path d="M12 8h8.93A10 10 0 0 0 12 2v6z" fill="currentColor" opacity="0.9"/>
    <path d="M4.27 17.5l4.47-7.74A4 4 0 0 0 8 12a4 4 0 0 0 4 4l-4.47 7.74A10 10 0 0 1 2 12a9.95 9.95 0 0 1 2.27-6.5" fill="currentColor" opacity="0.7"/>
    <path d="M19.73 6.5l-4.47 7.74A4 4 0 0 1 12 16v6a10 10 0 0 0 9.73-8.5 9.95 9.95 0 0 0-2-7z" fill="currentColor" opacity="0.55"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/* Feature Icons */
const BrainIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.16z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.16z"/>
    <line x1="12" y1="4.5" x2="12" y2="8"/>
    <line x1="12" y1="11" x2="12" y2="13"/>
    <line x1="12" y1="16" x2="12" y2="19.5"/>
  </svg>
);

const ShieldBlockIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7l-9-5z"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);

const BellIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    <line x1="12" y1="2" x2="12" y2="4"/>
  </svg>
);

const ScaleIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="3" x2="12" y2="21"/>
    <path d="M3 6l3 6-3 6M21 6l-3 6 3 6"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const FolderCheckIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);

const LayersIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
);

/* How It Works Icons */
const DownloadIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const GlobeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const RadarIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 12A10 10 0 1 1 12 2"/>
    <path d="M17 12a5 5 0 1 1-5-5"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
    <path d="M12 12l4-8"/>
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

/* ─── Stats Counter Hook ─── */
function useCountUp(target: number, duration = 2000, isActive = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isActive) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, isActive]);
  return count;
}

/* ─── Main Page Component ─── */
export default function LandingPage() {
  const router = useRouter();

  /* Authentication state */
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /* Navbar scroll state */
  const [scrolled, setScrolled] = useState(false);

  /* Stats visibility */
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<PublicMetrics>({ downloadClicks: 0, extensionInstalls: 0 });

  /* Features visibility */
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);

  /* How it works visibility */
  const [stepsVisible, setStepsVisible] = useState(false);
  const stepsRef = useRef<HTMLDivElement>(null);

  /* Animated counters */
  const c1 = useCountUp(metrics.downloadClicks, 1200, statsVisible);
  const c2 = useCountUp(metrics.extensionInstalls, 1200, statsVisible);
  const c3 = useCountUp(3, 1200, statsVisible);

  /* Auth check (preserved) */
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return;
    try {
      const user = JSON.parse(userStr);
      router.push(user.role === 'EXECUTIVE' ? '/dashboard' : '/cases');
    } catch {
      localStorage.clear();
    }
  }, [router]);

  useEffect(() => {
    const syncAuthModeWithHash = () => {
      const mode = window.location.hash === '#register' ? 'register' : 'login';
      setAuthMode(mode);
      setError('');
      if (mode === 'register') {
        window.requestAnimationFrame(() => {
          document.getElementById('login')?.scrollIntoView({ block: 'start' });
        });
      }
    };

    syncAuthModeWithHash();
    window.addEventListener('hashchange', syncAuthModeWithHash);
    return () => window.removeEventListener('hashchange', syncAuthModeWithHash);
  }, []);

  /* Scroll effects */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    fetch(`${API_URL}/metrics/public`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!isCurrent || !data) return;
        setMetrics({
          downloadClicks: Number(data.downloadClicks) || 0,
          extensionInstalls: Number(data.extensionInstalls) || 0,
        });
      })
      .catch(() => {
        // The public page remains usable when the API is temporarily unavailable.
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const trackDownloadClick = () => {
    fetch(`${API_URL}/metrics/download-click`, { method: 'POST' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        setMetrics((current) => ({
          ...current,
          downloadClicks: Number(data.downloadClicks) || current.downloadClicks,
        }));
      })
      .catch(() => {
        // Analytics must never interrupt the installation journey.
      });
  };

  /* IntersectionObserver: Stats */
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  /* IntersectionObserver: Features */
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setFeaturesVisible(true); },
      { threshold: 0.1 }
    );
    if (featuresRef.current) obs.observe(featuresRef.current);
    return () => obs.disconnect();
  }, []);

  /* IntersectionObserver: Steps */
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStepsVisible(true); },
      { threshold: 0.2 }
    );
    if (stepsRef.current) obs.observe(stepsRef.current);
    return () => obs.disconnect();
  }, []);

  const saveSession = (data: Record<string, any>) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    router.push(data.user.role === 'EXECUTIVE' ? '/dashboard' : '/cases');
  };

  const selectAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setError('');
    window.history.replaceState(null, '', mode === 'register' ? '#register' : '#login');
  };

  const passwordScore = passwordRequirements.filter((requirement) => requirement.test(password)).length;
  const passwordStrength = [
    'ยังไม่ได้กรอก',
    'อ่อนมาก',
    'อ่อน',
    'พอใช้',
    'แข็งแรง',
    'แข็งแรงมาก',
  ][passwordScore];

  /* Login handler */
  const handleLogin = async (e?: React.FormEvent, presetEmail?: string) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    const loginEmail = presetEmail || email;
    const loginPassword = password;
    if (!loginEmail) {
      setError('กรุณากรอกอีเมลเจ้าหน้าที่');
      setLoading(false);
      return;
    }
    if (!loginPassword) {
      setError('กรุณากรอกรหัสผ่าน');
      setLoading(false);
      return;
    }
    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(getApiError(data, 'ไม่สามารถเข้าสู่ระบบได้'));
      saveSession(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim()) {
      setError('กรุณากรอกชื่อและอีเมลให้ครบถ้วน');
      return;
    }
    if (passwordScore < passwordRequirements.length) {
      setError('รหัสผ่านยังไม่ครบตามเงื่อนไขความปลอดภัย');
      return;
    }
    if (password !== confirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchApi('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(getApiError(data, 'ไม่สามารถสร้างบัญชีได้'));
      saveSession(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <BrainIcon />,
      title: 'วิเคราะห์เนื้อหาด้วย ระบบอัจฉริยะ',
      desc: 'ระบบอัจฉริยะ Gemini วิเคราะห์ข้อความและรูปภาพโฆษณา เพื่อตรวจจับการอ้างสรรพคุณเกินจริงด้วยคะแนนความแม่นยำสูง',
      color: 'var(--color-primary)',
    },
    {
      icon: <ShieldBlockIcon />,
      title: 'โหมดบล็อกอัตโนมัติ',
      desc: 'ปิดแท็บที่มีโฆษณาความเสี่ยงสูงทันทีเมื่อคะแนนความเสี่ยงตั้งแต่ 80% ขึ้นไป',
      color: '#0891b2',
    },
    {
      icon: <BellIcon />,
      title: 'แจ้งเตือนทันที',
      desc: 'แจ้งเตือนเจ้าหน้าที่บังคับใช้กฎหมายทันทีที่ตรวจพบการละเมิด ครอบคลุมทุกแท็บที่เปิดอยู่',
      color: '#f59e0b',
    },
    {
      icon: <ScaleIcon />,
      title: 'จับคู่กฎหมายไทย',
      desc: 'จับคู่ทุกการละเมิดที่ตรวจพบกับมาตรากฎหมาย อย. ที่เกี่ยวข้องและบทกำหนดโทษที่ครบถ้วน',
      color: '#7c3aed',
    },
    {
      icon: <FolderCheckIcon />,
      title: 'จัดการคดี',
      desc: 'บันทึกเส้นทางการตรวจสอบ รวบรวมหลักฐาน บันทึกคดี และจัดทำเอกสารห่วงโซ่การครอบครองหลักฐาน',
      color: '#0284c7',
    },
    {
      icon: <LayersIcon />,
      title: 'การป้องกัน 3 ระดับ',
      desc: 'ตรวจสอบโดยเจ้าหน้าที่ → ตรวจจับอัตโนมัติ → ปิดกั้นอัตโนมัติ รองรับการบังคับใช้ที่ยืดหยุ่นสำหรับทุกสถานการณ์',
      color: '#dc2626',
    },
  ];

  const steps = [
    {
      num: '01',
      icon: <DownloadIcon />,
      title: 'ติดตั้งส่วนขยาย',
      desc: 'เพิ่ม Sentinel ADS ใน Chrome เพียงคลิกเดียว ไม่ต้องตั้งค่าใดๆ',
    },
    {
      num: '02',
      icon: <GlobeIcon />,
      title: 'ใช้งานเว็บตามปกติ',
      desc: 'ส่วนขยายจะตรวจสอบทุกแท็บและทุกหน้าเว็บที่โหลดแบบทันทีโดยอัตโนมัติ',
    },
    {
      num: '03',
      icon: <RadarIcon />,
      title: 'ตรวจจับการละเมิดอัตโนมัติ',
      desc: 'ระบบอัจฉริยะ ตรวจจับ ให้คะแนน และบล็อกโฆษณาสุขภาพผิดกฎหมาย พร้อมบันทึกเข้าแดชบอร์ดทันที',
    },
  ];

  return (
    <>
      {/* ─── NAVBAR ─── */}
      <nav className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`} role="navigation" aria-label="เมนูหลัก">
        <div className="lp-nav__inner">
          {/* Logo */}
          <a href="#hero" className="lp-nav__brand" id="nav-logo" aria-label="Sentinel ADS หน้าหลัก">
            <ShieldLogo />
            <span className="lp-nav__brand-text">SENTINEL<span className="lp-nav__brand-accent"> ADS</span></span>
          </a>

          {/* Nav links */}
          <ul className="lp-nav__links" role="list">
            <li><a href="#features" className="lp-nav__link">ฟีเจอร์</a></li>
            <li><a href="#how-it-works" className="lp-nav__link">วิธีการทำงาน</a></li>
            <li><a href="#download" className="lp-nav__link">ดาวน์โหลด</a></li>
            <li><a href="#login" className="lp-nav__link">เข้าสู่ระบบเจ้าหน้าที่</a></li>
          </ul>

          {/* CTA */}
          <a href="#download" className="lp-nav__cta" id="nav-cta-install">
            <ChromeIcon />
                ติดตั้งส่วนขยาย – ฟรี
          </a>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="lp-hero" id="hero" aria-labelledby="hero-heading">
        {/* Background elements */}
        <div className="lp-hero__orb lp-hero__orb--emerald" aria-hidden="true" />
        <div className="lp-hero__orb lp-hero__orb--amber" aria-hidden="true" />
        <div className="lp-hero__grid" aria-hidden="true" />

        <div className="lp-hero__inner">
          {/* Left content */}
          <div className="lp-hero__content">
            <span className="lp-chip">
              <CheckIcon />
              เครื่องมือบังคับใช้กฎหมาย อย. ด้วย ระบบอัจฉริยะ
            </span>

            <h1 className="lp-hero__headline" id="hero-heading">
              บล็อกโฆษณาสุขภาพผิดกฎหมาย —<br />
              <span className="lp-hero__headline-accent">ก่อนที่จะเป็นอันตรายต่อประชาชน</span>
            </h1>

            <p className="lp-hero__subtitle-th">
              ป้องกันโฆษณาผลิตภัณฑ์สุขภาพผิดกฎหมาย อัตโนมัติ ทุกแท็บ ทุกเว็บ
            </p>

            <p className="lp-hero__desc">
              ส่วนขยายเบราว์เซอร์ ที่ขับเคลื่อนด้วย ระบบอัจฉริยะ ตรวจจับ แจ้งเตือน และบล็อกโฆษณาผลิตภัณฑ์สุขภาพผิดกฎหมายแบบเรียลไทม์
              พัฒนาขึ้นสำหรับเจ้าหน้าที่บังคับใช้กฎหมาย อย. และการคุ้มครองประชาชน
            </p>

            <div className="lp-hero__actions">
              <a href="#download" className="lp-btn lp-btn--primary lp-btn--pulse" id="hero-cta-install">
                <ChromeIcon />
                ติดตั้ง ส่วนขยาย Chrome – ฟรี
              </a>
              <a href="#login" className="lp-btn lp-btn--outline" id="hero-cta-login">
                เข้าสู่ระบบเจ้าหน้าที่
                <ArrowRightIcon />
              </a>
            </div>

            <div className="lp-hero__trust" role="list" aria-label="ตราสัญลักษณ์ความน่าเชื่อถือ">
              {['ขับเคลื่อนด้วย ระบบอัจฉริยะ', 'ถูกต้องตามกฎหมาย อย.', 'บล็อกแบบเรียลไทม์'].map((t) => (
                <span key={t} className="lp-trust-badge" role="listitem">
                  <CheckIcon />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — Extension mockup */}
          <div className="lp-hero__mockup" aria-hidden="true">
            <div className="ext-card">
              <div className="ext-card__topbar">
                <div className="ext-card__dot ext-card__dot--red" />
                <div className="ext-card__dot ext-card__dot--yellow" />
                <div className="ext-card__dot ext-card__dot--green" />
                <span className="ext-card__title">Sentinel ADS</span>
              </div>

              <div className="ext-card__status">
                <div className="ext-status-ring">
                  <svg viewBox="0 0 80 80" className="ext-status-svg">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(11,122,76,0.15)" strokeWidth="8"/>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#0b7a4c" strokeWidth="8"
                      strokeDasharray="213.6" strokeDashoffset="42.7" strokeLinecap="round"
                      transform="rotate(-90 40 40)" className="ext-arc"/>
                  </svg>
                  <div className="ext-status-inner">
                    <ShieldBlockIcon />
                    <span>เปิดใช้งาน</span>
                  </div>
                </div>
              </div>

              <div className="ext-card__label">สถานะการป้องกัน</div>
              <div className="ext-card__value ext-card__value--green">เปิดใช้งาน</div>

              <div className="ext-card__metrics">
                <div className="ext-metric">
                  <span className="ext-metric__label">คะแนนความเสี่ยง</span>
                  <div className="ext-metric__bar">
                    <div className="ext-metric__fill ext-metric__fill--high" style={{ width: '82%' }} />
                  </div>
                  <span className="ext-metric__num ext-metric__num--danger">82%</span>
                </div>
                <div className="ext-metric">
                  <span className="ext-metric__label">โฆษณาที่บล็อก</span>
                  <div className="ext-metric__bar">
                    <div className="ext-metric__fill ext-metric__fill--primary" style={{ width: '94%' }} />
                  </div>
                  <span className="ext-metric__num">2,418</span>
                </div>
              </div>

              <div className="ext-card__alert">
                <div className="ext-alert-dot" />
                <span>ตรวจพบการอ้างสรรพคุณผิดกฎหมาย — เปิดใช้การปิดกั้นอัตโนมัติ</span>
              </div>

              <div className="ext-card__modes">
                {[['MANUAL', 'เจ้าหน้าที่'], ['AUTO_DETECT', 'ตรวจจับอัตโนมัติ'], ['AUTO_BLOCK', 'ปิดกั้นอัตโนมัติ']].map(([value, label]) => (
                  <span key={value} className={`ext-mode${value === 'AUTO_BLOCK' ? ' ext-mode--active' : ''}`}>{label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section className="lp-stats" ref={statsRef} aria-label="สถิติของแพลตฟอร์ม">
        <div className="lp-stats__inner">
          <div className="lp-stat-item">
            <span className="lp-stat-num">{statsVisible ? c1.toLocaleString() : '0'}</span>
            <span className="lp-stat-label">คลิกเพื่อติดตั้งส่วนขยาย</span>
          </div>
          <div className="lp-stats__divider" aria-hidden="true" />
          <div className="lp-stat-item">
            <span className="lp-stat-num">{statsVisible ? c2.toLocaleString() : '0'}</span>
            <span className="lp-stat-label">ติดตั้งและเปิดใช้งานแล้ว</span>
          </div>
          <div className="lp-stats__divider" aria-hidden="true" />
          <div className="lp-stat-item">
            <span className="lp-stat-num">{statsVisible ? c3 : '0'}</span>
            <span className="lp-stat-label">ระดับความเสี่ยงที่รองรับ</span>
          </div>
          <div className="lp-stats__divider" aria-hidden="true" />
          <div className="lp-stat-item">
            <span className="lp-stat-num">เรียลไทม์</span>
            <span className="lp-stat-label">ระบบวิเคราะห์ด้วย ระบบอัจฉริยะ</span>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="lp-section" id="features" aria-labelledby="features-heading">
        <div className="lp-section__inner">
          <div className="lp-section__header">
            <span className="lp-chip lp-chip--dark">ความสามารถของแพลตฟอร์ม</span>
            <h2 className="lp-section__title" id="features-heading">
              ทุกสิ่งที่คุณต้องการในการบังคับใช้กฎหมายโฆษณา
            </h2>
            <p className="lp-section__subtitle">
              ชุดระบบอัจฉริยะครบวงจร — ตั้งแต่การตรวจจับด้วย ระบบอัจฉริยะ แบบเรียลไทม์ ไปจนถึงการจัดการคดีทางกฎหมาย พัฒนาเพื่อ อย. โดยเฉพาะ
            </p>
          </div>

          <div className="lp-features-grid" ref={featuresRef}>
            {features.map((f, i) => (
              <article
                key={f.title}
                className={`lp-feature-card${featuresVisible ? ' lp-feature-card--visible' : ''}`}
                style={{ '--delay': `${i * 0.1}s`, '--accent': f.color } as React.CSSProperties}
              >
                <div className="lp-feature-card__icon" style={{ color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="lp-feature-card__title">{f.title}</h3>
                <p className="lp-feature-card__desc">{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="lp-section lp-section--alt" id="how-it-works" aria-labelledby="how-heading">
        <div className="lp-section__inner">
          <div className="lp-section__header">
            <span className="lp-chip">ขั้นตอนการใช้งาน</span>
            <h2 className="lp-section__title" id="how-heading">Sentinel ADS ทำงานอย่างไร</h2>
            <p className="lp-section__subtitle">
              พร้อมใช้งานภายใน 60 วินาที ไม่ต้องตั้งค่าเซิร์ฟเวอร์ ไม่ต้องกำหนดค่าใดๆ
            </p>
          </div>

          <div className="lp-steps" ref={stepsRef}>
            {steps.map((s, i) => (
              <article
                key={s.num}
                className={`lp-step${stepsVisible ? ' lp-step--visible' : ''}`}
                style={{ '--delay': `${i * 0.18}s` } as React.CSSProperties}
              >
                {i < steps.length - 1 && <div className="lp-step__connector" aria-hidden="true" />}
                <div className="lp-step__icon-wrap">
                  {s.icon}
                </div>
                <span className="lp-step__num">{s.num}</span>
                <h3 className="lp-step__title">{s.title}</h3>
                <p className="lp-step__desc">{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DOWNLOAD ─── */}
      <section className="lp-download" id="download" aria-labelledby="download-heading">
        <div className="lp-download__orb lp-download__orb--1" aria-hidden="true" />
        <div className="lp-download__orb lp-download__orb--2" aria-hidden="true" />

        <div className="lp-download__inner">
          <div className="lp-download__content">
            <span className="lp-chip lp-chip--amber">ส่วนขยายเบราว์เซอร์ ฟรี</span>
            <h2 className="lp-download__title" id="download-heading">
              เริ่มปกป้องประชาชนได้เลยวันนี้
            </h2>
            <p className="lp-download__subtitle">
              ติดตั้ง Sentinel ADS ส่วนขยาย Chrome ภายในไม่กี่วินาที ฟรี 100% ไม่ต้องสร้างบัญชี
            </p>

            <a
              href={extensionDownloadUrl}
              className="lp-btn lp-btn--chrome lp-btn--pulse"
              id="download-cta-chrome"
              onClick={trackDownloadClick}
              {...(!chromeWebStoreUrl ? { download: 'sentinel-ads-extension.zip' } : {})}
            >
              <ChromeIcon />
              {chromeWebStoreUrl ? 'เพิ่มใน Chrome – ติดตั้งฟรี' : 'ดาวน์โหลดส่วนขยาย v1.0.6 สำหรับ Chrome'}
            </a>

            {!chromeWebStoreUrl && (
              <p className="lp-download__subtitle">
                หลังดาวน์โหลด ให้แตกไฟล์แล้วเลือกโฟลเดอร์ <strong>sentinel-ads-extension</strong> ในหน้า <strong>chrome://extensions</strong> (ไม่ต้องเปิดโฟลเดอร์ assets)
              </p>
            )}

            <p className="lp-download__alts">
              วิธีอื่น:{' '}
              <a href="/downloads/sentinel-ads-extension.zip" download="sentinel-ads-extension.zip" className="lp-link" id="download-alt-zip" onClick={trackDownloadClick}>ดาวน์โหลดไฟล์ ZIP</a>
            </p>
          </div>

          {/* Floating mockup card */}
          <div className="lp-download__mockup" aria-hidden="true">
            <div className="ext-card ext-card--float">
              <div className="ext-card__topbar">
                <div className="ext-card__dot ext-card__dot--red" />
                <div className="ext-card__dot ext-card__dot--yellow" />
                <div className="ext-card__dot ext-card__dot--green" />
                <span className="ext-card__title">Sentinel ADS — เปิดใช้งาน</span>
              </div>
              <div className="ext-card__status">
                <div className="ext-status-ring ext-status-ring--sm">
                  <svg viewBox="0 0 80 80" className="ext-status-svg">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(11,122,76,0.15)" strokeWidth="8"/>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#0b7a4c" strokeWidth="8"
                      strokeDasharray="213.6" strokeDashoffset="21.4" strokeLinecap="round"
                      transform="rotate(-90 40 40)" className="ext-arc"/>
                  </svg>
                  <div className="ext-status-inner">
                    <span className="ext-status-pct">90%</span>
                  </div>
                </div>
              </div>
              <div className="ext-card__label">ภัยคุกคามถูกกำจัดแล้ว</div>
              <div className="ext-card__value ext-card__value--green">บล็อกแล้ว</div>
              <div className="ext-card__alert">
                <div className="ext-alert-dot" />
                <span>สารสุขภาพเกินจริง — ถูกบล็อกแล้ว</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LOGIN ─── */}
      <section className="lp-login-section" id="login" aria-labelledby="login-heading">
        <span id="register" className="auth-anchor" aria-hidden="true" />
        <div className="lp-section__inner">
          <div className="lp-section__header">
            <span className="lp-chip">
              <LockIcon />
              พื้นที่เข้าถึงจำกัด
            </span>
            <h2 className="lp-section__title" id="login-heading">พอร์ทัลสำหรับเจ้าหน้าที่</h2>
            <p className="lp-section__subtitle">
              สำหรับบุคลากรบังคับใช้กฎหมาย อย. ที่ได้รับอนุญาตเท่านั้น
            </p>
          </div>

          <div className="lp-login-card card">
            <div className="auth-mode-switch" role="tablist" aria-label="เลือกรูปแบบการเข้าใช้งาน">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'login'}
                className={authMode === 'login' ? 'is-active' : ''}
                onClick={() => selectAuthMode('login')}
              >
                เข้าสู่ระบบ
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'register'}
                className={authMode === 'register' ? 'is-active' : ''}
                onClick={() => selectAuthMode('register')}
              >
                สมัครบัญชีเจ้าหน้าที่
              </button>
            </div>

            <div className="login-panel__header">
              <span className="lp-chip">การเข้าถึงอย่างปลอดภัย</span>
              <h3>{authMode === 'login' ? 'เข้าสู่ระบบปฏิบัติการ' : 'สร้างบัญชีเจ้าหน้าที่'}</h3>
              <p>
                {authMode === 'login'
                  ? 'สำหรับเจ้าหน้าที่ตรวจสอบ, นิติกร, ผู้ทบทวน และผู้บริหาร'
                  : 'บัญชีใหม่จะเริ่มต้นด้วยสิทธิ์เจ้าหน้าที่ตรวจสอบ เพื่อความปลอดภัยของระบบ'}
              </p>
            </div>

            {error && <div className="alert alert-error" role="alert">{error}</div>}

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} noValidate>
                <div className="form-group">
                  <label htmlFor="login-email">อีเมล</label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="name@fda.go.th"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="login-password">รหัสผ่าน</label>
                  <div className="password-field">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="กรอกรหัสผ่าน"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
                      {showPassword ? 'ซ่อน' : 'แสดง'}
                    </button>
                  </div>
                </div>
                <button type="submit" id="login-submit-btn" className="btn btn-primary login-panel__submit" disabled={loading}>
                  {loading ? 'กำลังเชื่อมต่อเซิร์ฟเวอร์...' : 'เข้าสู่ศูนย์ควบคุม'}
                </button>
                <button type="button" className="auth-text-button" onClick={() => selectAuthMode('register')}>
                  ยังไม่มีบัญชี? สมัครบัญชีเจ้าหน้าที่
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} noValidate>
                <div className="form-group">
                  <label htmlFor="register-name">ชื่อ–นามสกุล</label>
                  <input
                    id="register-name"
                    type="text"
                    placeholder="ชื่อและนามสกุลเจ้าหน้าที่"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    autoComplete="name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="register-email">อีเมล</label>
                  <input
                    id="register-email"
                    type="email"
                    placeholder="name@fda.go.th"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="register-password">สร้างรหัสผ่าน</label>
                  <div className="password-field">
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="อย่างน้อย 12 ตัวอักษร"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
                      {showPassword ? 'ซ่อน' : 'แสดง'}
                    </button>
                  </div>
                </div>

                <div className={`password-strength strength-${passwordScore}`} aria-live="polite">
                  <div className="password-strength__heading">
                    <span>ความปลอดภัยของรหัสผ่าน</span>
                    <strong>{passwordStrength}</strong>
                  </div>
                  <div className="password-strength__bars" aria-hidden="true">
                    {passwordRequirements.map((requirement, index) => (
                      <span key={requirement.key} className={index < passwordScore ? 'is-filled' : ''} />
                    ))}
                  </div>
                  <ul className="password-checklist">
                    {passwordRequirements.map((requirement) => {
                      const passed = requirement.test(password);
                      return (
                        <li key={requirement.key} className={passed ? 'is-valid' : ''}>
                          <span aria-hidden="true">{passed ? '✓' : '○'}</span>{requirement.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="form-group">
                  <label htmlFor="register-confirm-password">ยืนยันรหัสผ่าน</label>
                  <div className="password-field">
                    <input
                      id="register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                      aria-invalid={Boolean(confirmPassword && password !== confirmPassword)}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
                      {showConfirmPassword ? 'ซ่อน' : 'แสดง'}
                    </button>
                  </div>
                  {confirmPassword && (
                    <span className={password === confirmPassword ? 'password-match is-valid' : 'password-match is-invalid'}>
                      {password === confirmPassword ? '✓ รหัสผ่านตรงกัน' : 'รหัสผ่านยังไม่ตรงกัน'}
                    </span>
                  )}
                </div>
                <div className="registration-security-note">
                  <LockIcon />
                  <span>รหัสผ่านจะถูกเข้ารหัสแบบ one-way และบัญชีใหม่จะไม่ได้รับสิทธิ์ผู้ดูแลระบบ</span>
                </div>
                <button type="submit" className="btn btn-primary login-panel__submit" disabled={loading}>
                  {loading ? 'กำลังสร้างบัญชี...' : 'สมัครและเข้าสู่ระบบ'}
                </button>
                <button type="button" className="auth-text-button" onClick={() => selectAuthMode('login')}>
                  มีบัญชีแล้ว? กลับไปเข้าสู่ระบบ
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="lp-footer" role="contentinfo">
        <div className="lp-footer__inner">
          <div className="lp-footer__brand">
            <a href="#hero" className="lp-nav__brand" aria-label="Sentinel ADS">
              <ShieldLogo />
              <span className="lp-nav__brand-text lp-nav__brand-text--light">
                SENTINEL<span className="lp-nav__brand-accent"> ADS</span>
              </span>
            </a>
            <p className="lp-footer__tagline">
              แพลตฟอร์มเฝ้าระวังและบล็อกโฆษณาผลิตภัณฑ์สุขภาพผิดกฎหมาย
            </p>
          </div>

          <nav className="lp-footer__links" aria-label="เมนูท้ายหน้า">
            <a href="#features" className="lp-footer__link">ฟีเจอร์</a>
            <a href="#download" className="lp-footer__link">ดาวน์โหลด</a>
            <a href="#login" className="lp-footer__link">เข้าสู่ระบบเจ้าหน้าที่</a>
            <a href="#" className="lp-footer__link">นโยบายความเป็นส่วนตัว</a>
            <a href="#" className="lp-footer__link">ข้อกำหนดการใช้งาน</a>
          </nav>
        </div>

        <div className="lp-footer__bottom">
          <p>© 2568 Sentinel ADS – พัฒนาเพื่อการบังคับใช้กฎหมาย อย. แห่งประเทศไทย</p>
        </div>
      </footer>
    </>
  );
}
