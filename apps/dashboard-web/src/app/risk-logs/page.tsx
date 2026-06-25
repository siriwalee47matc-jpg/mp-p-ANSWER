'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';

interface RiskLog {
  id: string;
  title: string;
  url: string;
  domain: string;
  aiRiskScore: number;
  aiAnalysis: string;
  status: string;
  reporterRole: string;
  createdAt: string;
  blockLogs?: any[];
}

function getRiskClass(score: number) {
  if (score >= 80) return '#dc2626';
  if (score >= 50) return '#d97706';
  return '#16a34a';
}

function getRiskLabel(score: number) {
  if (score >= 80) return 'สูงมาก 🔴';
  if (score >= 50) return 'ปานกลาง 🟡';
  return 'ต่ำ 🟢';
}

export default function RiskLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<RiskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    try {
      const res = await fetch('http://localhost:3001/risk/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูล risk logs ได้');
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const score = log.aiRiskScore ?? 0;
    if (filter === 'HIGH') return score >= 80;
    if (filter === 'MEDIUM') return score >= 50 && score < 80;
    if (filter === 'LOW') return score < 50;
    return true;
  });

  return (
    <div>
      <Header />
      <main className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
              🤖 Risk Log – ประวัติการสแกนอัตโนมัติ
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              แสดงผลการสแกนจากระบบ Auto-Detect และ Auto-Block ของส่วนขยายเบราว์เซอร์
            </p>
          </div>
          <button onClick={fetchLogs} className="btn btn-secondary">🔄 รีเฟรช</button>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.85rem' }}
            >
              {f === 'ALL' && '📋 ทั้งหมด'}
              {f === 'HIGH' && '🔴 ความเสี่ยงสูงมาก (≥80%)'}
              {f === 'MEDIUM' && '🟡 ปานกลาง (50-79%)'}
              {f === 'LOW' && '🟢 ต่ำ (<50%)'}
            </button>
          ))}
        </div>

        {/* Stats Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'ทั้งหมด', value: logs.length, color: '#3b82f6' },
            { label: 'ความเสี่ยงสูง', value: logs.filter(l => (l.aiRiskScore ?? 0) >= 80).length, color: '#dc2626' },
            { label: 'ปานกลาง', value: logs.filter(l => { const s = l.aiRiskScore ?? 0; return s >= 50 && s < 80; }).length, color: '#d97706' },
            { label: 'ต่ำ / ปลอดภัย', value: logs.filter(l => (l.aiRiskScore ?? 0) < 50).length, color: '#16a34a' },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#dc2626', padding: '1rem', marginBottom: '1.5rem' }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
            กำลังโหลดข้อมูล...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <p style={{ color: 'var(--text-muted)' }}>ยังไม่มีประวัติการสแกนอัตโนมัติ</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              เปิดส่วนขยายเบราว์เซอร์แล้วตั้งค่าเป็น Auto-Detect หรือ Auto-Block เพื่อเริ่มสแกน
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredLogs.map((log) => {
              const score = log.aiRiskScore ?? 0;
              const isBlocked = log.blockLogs && log.blockLogs.length > 0;
              return (
                <div
                  key={log.id}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    borderLeft: `4px solid ${getRiskClass(score)}`,
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onClick={() => router.push(`/cases/${log.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateX(4px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateX(0)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-block',
                          background: getRiskClass(score),
                          color: 'white',
                          borderRadius: '999px',
                          padding: '2px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}>
                          {score}% – {getRiskLabel(score)}
                        </span>
                        {isBlocked && (
                          <span style={{ background: '#7c3aed', color: 'white', borderRadius: '999px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                            🔒 BLOCKED
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(log.createdAt).toLocaleString('th-TH')}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.title}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#1e3a8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        🌐 {log.url}
                      </p>
                      {log.aiAnalysis && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {log.aiAnalysis}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>คดีหมายเลข</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem' }}>{log.id}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>🤖 SYSTEM</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
