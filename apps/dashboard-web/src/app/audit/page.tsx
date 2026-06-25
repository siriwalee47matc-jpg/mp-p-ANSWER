'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('คุณไม่มีสิทธิ์เข้าถึงประวัติความโปร่งใสส่วนนี้ (เฉพาะ Admin หรือ Executive)');
        }
        throw new Error('ไม่สามารถดึงบันทึกประวัติความเคลื่อนไหวได้');
      }

      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div>
      <Header />
      <main className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>บันทึกประวัติการทำรายการ (Audit Logs)</h1>
            <p style={{ color: 'var(--text-muted)' }}>ข้อมูลตรวจสอบย้อนกลับรอยเท้าการทำงานของเจ้าหน้าที่รัฐและการรันของระบบคอมพิวเตอร์</p>
          </div>
          <button onClick={fetchLogs} className="btn btn-secondary">
            🔄 รีเฟรชประวัติ
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: 'var(--color-danger)',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '6rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>กำลังโหลดรายการบันทึกประวัติความปลอดภัย...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
            <span style={{ fontSize: '3rem' }}>📜</span>
            <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>ไม่พบประวัติการทำรายการ</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ระบบยังไม่พบบันทึกประวัติประวัติความเคลื่อนไหวใดๆ</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '220px' }}>วันเวลาประทับ</th>
                  <th style={{ width: '150px' }}>รหัสคดี</th>
                  <th style={{ width: '180px' }}>การกระทำ (Action)</th>
                  <th>รายละเอียด (Details)</th>
                  <th style={{ width: '250px' }}>เจ้าหน้าที่ / ผู้รันระบบ</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(log.createdAt).toLocaleString('th-TH')}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1e3a8a' }}>
                      {log.caseId || '-'}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: log.action.includes('APPROVED') ? 'rgba(239, 68, 68, 0.12)' :
                                    log.action.includes('AI') ? 'rgba(139, 92, 246, 0.12)' :
                                    log.action.includes('CONFIRM') ? 'rgba(245, 158, 11, 0.12)' :
                                    'rgba(255, 255, 255, 0.05)',
                        color: log.action.includes('APPROVED') ? 'var(--color-danger)' :
                               log.action.includes('AI') ? 'var(--color-primary)' :
                               log.action.includes('CONFIRM') ? 'var(--color-warning)' :
                               'var(--text-main)',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 550 }}>
                      {log.details}
                    </td>
                    <td>
                      {log.user ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.user.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user.email} [{log.user.role}]</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>System / Anonymous Client</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
