'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userStr || !token) {
      router.push('/');
    } else {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        localStorage.clear();
        router.push('/');
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  if (!user) return null;

  return (
    <header className="header flex justify-between align-center">
      <div className="logo-container">
        <div className="logo-icon">🛡️</div>
        <span>SENTINEL ADS</span>
      </div>

      <nav className="flex align-center gap-3">
        {(user.role === 'INSPECTOR' || user.role === 'LEGAL_OFFICER' || user.role === 'REVIEWER' || user.role === 'ADMIN' || user.role === 'EXECUTIVE') && (
          <a
            href="/cases"
            style={{
              fontWeight: 500,
              fontSize: '0.95rem',
              color: pathname === '/cases' ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: pathname === '/cases' ? '2px solid var(--color-primary)' : 'none',
              paddingBottom: '0.25rem',
            }}
          >
            📋 รายการคดีความ
          </a>
        )}

        {(user.role === 'EXECUTIVE' || user.role === 'ADMIN' || user.role === 'REVIEWER') && (
          <a
            href="/dashboard"
            style={{
              fontWeight: 500,
              fontSize: '0.95rem',
              color: pathname === '/dashboard' ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: pathname === '/dashboard' ? '2px solid var(--color-primary)' : 'none',
              paddingBottom: '0.25rem',
            }}
          >
            📊 แดชบอร์ดสถิติ
          </a>
        )}

        {(user.role === 'ADMIN' || user.role === 'EXECUTIVE') && (
          <a
            href="/audit"
            style={{
              fontWeight: 500,
              fontSize: '0.95rem',
              color: pathname === '/audit' ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: pathname === '/audit' ? '2px solid var(--color-primary)' : 'none',
              paddingBottom: '0.25rem',
            }}
          >
            🔍 บันทึกประวัติ (Audit)
          </a>
        )}

        {(user.role === 'ADMIN' || user.role === 'REVIEWER' || user.role === 'INSPECTOR') && (
          <a
            href="/risk-logs"
            style={{
              fontWeight: 500,
              fontSize: '0.95rem',
              color: pathname === '/risk-logs' ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: pathname === '/risk-logs' ? '2px solid var(--color-primary)' : 'none',
              paddingBottom: '0.25rem',
            }}
          >
            🤖 Risk Logs
          </a>
        )}

        {(user.role === 'ADMIN' || user.role === 'REVIEWER') && (
          <a
            href="/settings"
            style={{
              fontWeight: 500,
              fontSize: '0.95rem',
              color: pathname === '/settings' ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: pathname === '/settings' ? '2px solid var(--color-primary)' : 'none',
              paddingBottom: '0.25rem',
            }}
          >
            ⚙️ ตั้งค่า
          </a>
        )}
      </nav>

      <div className="flex align-center gap-3">
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            สิทธิ์: <span style={{
              color: user.role === 'ADMIN' ? '#db2777' : 
                     user.role === 'REVIEWER' ? '#7c3aed' : 
                     user.role === 'LEGAL_OFFICER' ? '#1e3a8a' : 
                     user.role === 'EXECUTIVE' ? '#047857' : 'var(--text-main)',
              fontWeight: 700
            }}>{user.role}</span>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{
            padding: '0.4rem 0.8rem',
            fontSize: '0.8rem',
            borderRadius: '6px'
          }}
        >
          ออกจากระบบ 🚪
        </button>
      </div>
    </header>
  );
}
