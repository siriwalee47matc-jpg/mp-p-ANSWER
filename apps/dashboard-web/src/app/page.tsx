'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BrandMark from '../components/BrandMark';

const presetAccounts = [
  { label: 'Inspector', email: 'inspector@fda.go.th' },
  { label: 'Legal', email: 'legal@fda.go.th' },
  { label: 'Reviewer', email: 'reviewer@fda.go.th' },
  { label: 'Executive', email: 'executive@fda.go.th' },
  { label: 'Admin', email: 'admin@fda.go.th' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async (e?: React.FormEvent, presetEmail?: string) => {
    e?.preventDefault();
    setLoading(true);
    setError('');

    const loginEmail = presetEmail || email;
    const loginPassword = password || 'password123';

    if (!loginEmail) {
      setError('กรุณากรอกอีเมลเจ้าหน้าที่');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'ไม่สามารถเข้าสู่ระบบได้');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push(data.user.role === 'EXECUTIVE' ? '/dashboard' : '/cases');
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-shell__hero">
        <div className="orb orb--emerald" />
        <div className="orb orb--cyan" />
        <div className="grid-beam" />
        <div className="hero-panel">
          <BrandMark />
          <div className="hero-panel__text">
            <span className="hero-chip">Illegal Ad Intelligence Platform</span>
            <h1>ศูนย์ควบคุมการเฝ้าระวังโฆษณาสุขภาพผิดกฎหมาย</h1>
            <p>
              แพลตฟอร์มสำหรับล็อกเคส, วิเคราะห์ความเสี่ยงด้วย AI, สรุปรายงาน, ตรวจเส้นทางผู้กระทำผิด
              และส่งต่อให้สายกฎหมายดำเนินการใน workflow เดียว
            </p>
          </div>

          <div className="hero-stats">
            <div className="hero-stat-card">
              <span>01</span>
              <strong>Live Risk Logging</strong>
              <p>รับข้อมูลจากหน้าเว็บและ extension เข้าคิวคดีแบบเรียลไทม์</p>
            </div>
            <div className="hero-stat-card">
              <span>02</span>
              <strong>AI + Law Assist</strong>
              <p>วิเคราะห์ข้อความโฆษณาและจับคู่มาตรากฎหมายที่เกี่ยวข้อง</p>
            </div>
            <div className="hero-stat-card">
              <span>03</span>
              <strong>Command Dashboard</strong>
              <p>บริหารเคส, blacklist, audit trail และ global risk mode จากจุดเดียว</p>
            </div>
          </div>
        </div>
      </section>

      <section className="login-shell__panel">
        <div className="login-panel card">
          <div className="login-panel__header">
            <span className="hero-chip">Secure Officer Access</span>
            <h2>เข้าสู่ระบบปฏิบัติการ</h2>
            <p>สำหรับเจ้าหน้าที่ตรวจสอบ, นิติกร, ผู้ทบทวน และผู้บริหาร</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">อีเมล</label>
              <input
                id="email"
                type="email"
                placeholder="name@fda.go.th"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">รหัสผ่าน</label>
              <input
                id="password"
                type="password"
                placeholder="password123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary login-panel__submit" disabled={loading}>
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ Control Center'}
            </button>
          </form>

          <div className="login-panel__divider">
            <span>บัญชีทดสอบด่วน</span>
          </div>

          <div className="preset-grid">
            {presetAccounts.map((account) => (
              <button
                key={account.email}
                onClick={() => {
                  setEmail(account.email);
                  setPassword('password123');
                  handleLogin(undefined, account.email);
                }}
                className="btn btn-secondary"
                disabled={loading}
              >
                {account.label}
              </button>
            ))}
          </div>

          <div className="login-panel__note">
            ใช้ seed data มาตรฐาน: รหัสผ่านเริ่มต้นคือ <code>password123</code>
          </div>
        </div>
      </section>
    </main>
  );
}
