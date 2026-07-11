'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

const PHRASES = [
  'กำลังโหลดข้อมูล...',
  'เชื่อมต่อระบบ...',
  'กำลังประมวลผล...',
  'ตรวจสอบสิทธิ์...',
  'เตรียมพร้อม...',
];

export default function PageLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phrase, setPhrase] = useState(PHRASES[0]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    // Start loading sequence
    setVisible(true);
    setProgress(0);
    setPhrase(PHRASES[Math.floor(Math.random() * PHRASES.length)]);

    let prog = 0;
    const tick = () => {
      prog += Math.random() * 18 + 4;
      if (prog >= 90) prog = 90;
      setProgress(Math.round(prog));
      if (prog < 90) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    // Complete after a short delay
    timerRef.current = setTimeout(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setProgress(100);
      timerRef.current = setTimeout(() => setVisible(false), 420);
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="page-loader"
      style={{ opacity: progress >= 100 ? 0 : 1 }}
      aria-live="polite"
      aria-label="กำลังโหลด"
    >
      {/* Scanline grid background */}
      <div className="page-loader__grid" />

      {/* Corner brackets */}
      <div className="page-loader__corner page-loader__corner--tl" />
      <div className="page-loader__corner page-loader__corner--tr" />
      <div className="page-loader__corner page-loader__corner--bl" />
      <div className="page-loader__corner page-loader__corner--br" />

      {/* Center content */}
      <div className="page-loader__center">
        <div className="page-loader__shield">
          <svg viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M32 4L56 14V34C56 49 44 62 32 68C20 62 8 49 8 34V14L32 4Z"
              stroke="url(#shieldGrad)"
              strokeWidth="2"
              fill="rgba(16,185,129,0.06)"
            />
            <path
              d="M24 36l6 6 12-14"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="shieldGrad" x1="32" y1="4" x2="32" y2="68" gradientUnits="userSpaceOnUse">
                <stop stopColor="#10b981" />
                <stop offset="1" stopColor="#0284c7" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="page-loader__wordmark">SENTINEL ADS</div>

        <div className="page-loader__phrase">{phrase}</div>

        {/* Progress bar */}
        <div className="page-loader__bar-wrap">
          <div
            className="page-loader__bar-fill"
            style={{ width: `${progress}%` }}
          />
          <div className="page-loader__bar-glow" style={{ left: `${progress}%` }} />
        </div>

        <div className="page-loader__pct">{progress}%</div>
      </div>

      {/* Side data lines */}
      <div className="page-loader__side page-loader__side--left">
        <span>SYS:ONLINE</span>
        <span>DB:CONNECTED</span>
        <span>AUTH:VALID</span>
      </div>
      <div className="page-loader__side page-loader__side--right">
        <span>VER 2.0</span>
        <span>ENC:AES256</span>
        <span>MODE:LIVE</span>
      </div>
    </div>
  );
}
