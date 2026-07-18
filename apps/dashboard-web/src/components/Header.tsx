'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import BrandMark from './BrandMark';

const roleLabels: Record<string, string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  REVIEWER: 'ผู้ทบทวน',
  LEGAL_OFFICER: 'นิติกร',
  INSPECTOR: 'เจ้าหน้าที่ตรวจสอบ',
  EXECUTIVE: 'ผู้บริหาร',
};

const navigation = [
  { href: '/cases', label: 'คดีและหลักฐาน', roles: ['INSPECTOR', 'LEGAL_OFFICER', 'REVIEWER', 'ADMIN', 'EXECUTIVE'] },
  { href: '/dashboard', label: 'ภาพรวมระบบ', roles: ['EXECUTIVE', 'ADMIN', 'REVIEWER'] },
  { href: '/audit', label: 'ประวัติการทำรายการ', roles: ['ADMIN', 'EXECUTIVE'] },
  { href: '/risk-logs', label: 'รายการความเสี่ยง', roles: ['ADMIN', 'REVIEWER', 'INSPECTOR'] },
  { href: '/settings', label: 'ศูนย์ควบคุม', roles: ['ADMIN', 'REVIEWER'] },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userStr || !token) {
      router.push('/');
      return;
    }

    try {
      setUser(JSON.parse(userStr));
    } catch {
      localStorage.clear();
      router.push('/');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  if (!user) return null;

  return (
    <header className="header">
      <div className="header__inner">
        <BrandMark compact />

        <nav className="header__nav">
          {navigation
            .filter((item) => item.roles.includes(user.role))
            .map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <a key={item.href} href={item.href} className={`header__nav-link ${active ? 'active' : ''}`}>
                  {item.label}
                </a>
              );
            })}
        </nav>

        <div className="header__user">
          <div className="header__user-copy">
            <div className="header__user-name">{user.name}</div>
            <div className="header__user-role">{roleLabels[user.role] || user.role}</div>
          </div>
          <div className="header__user-badge">ปฏิบัติการสด</div>
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ padding: '0.55rem 1rem', fontSize: '0.82rem' }}
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </header>
  );
}
