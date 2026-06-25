'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        redirectUser(user.role);
      } catch (e) {
        localStorage.clear();
      }
    }
  }, []);

  const redirectUser = (role: string) => {
    if (role === 'EXECUTIVE') {
      router.push('/dashboard');
    } else {
      router.push('/cases');
    }
  };

  const handleLogin = async (e?: React.FormEvent, presetEmail?: string, presetPassword?: string) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const loginEmail = presetEmail || email;
    const loginPassword = presetPassword || password || 'password123';

    if (!loginEmail) {
      setError('กรุณากรอกอีเมล');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'การเข้าสู่ระบบล้มเหลว');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Trigger redirection
      redirectUser(data.user.role);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์หลังบ้านได้');
    } finally {
      setLoading(false);
    }
  };

  const loginAsPreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('password123');
    handleLogin(undefined, presetEmail, 'password123');
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative'
    }}>
      <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            fontSize: '2rem',
            color: '#fff',
            marginBottom: '1rem',
            boxShadow: '0 0 20px rgba(127, 29, 29, 0.35)'
          }}>
            🛡️
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>SENTINEL ADs ssk</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ระบบพิจารณาดำเนินคดีโฆษณาสุขภาพผิดกฎหมาย</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: 'var(--color-danger)',
            padding: '0.75rem 1rem',
            fontSize: '0.9rem',
            marginBottom: '1.5rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">อีเมลเจ้าหน้าที่</label>
            <input
              id="email"
              type="email"
              placeholder="name@fda.go.th"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }} disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ 🔑'}
          </button>
        </form>

        <div style={{ margin: '1.5rem 0', textAlign: 'center', position: 'relative' }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
          <span style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg-main)',
            padding: '0 0.75rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}>หรือเลือกบัญชีทดสอบด่วน</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button onClick={() => loginAsPreset('inspector@fda.go.th')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
            ตรวจสืบ (Inspector)
          </button>
          <button onClick={() => loginAsPreset('legal@fda.go.th')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
            นิติกร (Legal)
          </button>
          <button onClick={() => loginAsPreset('reviewer@fda.go.th')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
            หัวหน้า (Reviewer)
          </button>
          <button onClick={() => loginAsPreset('executive@fda.go.th')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
            ผู้บริหาร (Executive)
          </button>
        </div>
      </div>
    </div>
  );
}
