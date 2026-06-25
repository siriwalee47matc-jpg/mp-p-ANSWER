'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

function getRiskLabel(score: number) {
  if (score >= 80) return 'High Critical';
  if (score >= 50) return 'Elevated';
  return 'Low Signal';
}

function getRiskColor(score: number) {
  if (score >= 80) return '#dc2626';
  if (score >= 50) return '#d97706';
  return '#16a34a';
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
      setLogs(await res.json());
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลด risk stream');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        const score = log.aiRiskScore ?? 0;
        if (filter === 'HIGH') return score >= 80;
        if (filter === 'MEDIUM') return score >= 50 && score < 80;
        if (filter === 'LOW') return score < 50;
        return true;
      }),
    [filter, logs],
  );

  const overview = useMemo(
    () => ({
      total: logs.length,
      high: logs.filter((item) => (item.aiRiskScore ?? 0) >= 80).length,
      medium: logs.filter((item) => {
        const score = item.aiRiskScore ?? 0;
        return score >= 50 && score < 80;
      }).length,
      low: logs.filter((item) => (item.aiRiskScore ?? 0) < 50).length,
    }),
    [logs],
  );

  return (
    <div>
      <Header />
      <main className="container">
        <section className="command-grid command-grid--hero" style={{ marginBottom: '1.25rem' }}>
          <div className="card command-hero">
            <span className="command-hero__eyebrow">Auto Detection Stream</span>
            <h1 className="command-hero__title">Risk Logs Command Stream</h1>
            <p className="command-hero__description">
              ศูนย์รวมสัญญาณจากการสแกนโฆษณาอัตโนมัติ ใช้ดูแนวโน้มความเสี่ยง, ความหนาแน่นของเหตุการณ์,
              และเคสที่ควรเร่งปฏิบัติการก่อนเข้าสู่ขั้นตอนกฎหมาย
            </p>
            <div className="command-actions">
              <button className="btn btn-primary" onClick={fetchLogs}>
                รีเฟรชสตรีม
              </button>
              <button className="btn btn-secondary" onClick={() => router.push('/settings')}>
                ไปยัง Control Room
              </button>
            </div>
          </div>

          <div className="card">
            <div className="panel-heading">
              <div>
                <h3>Signal Summary</h3>
                <p>ดูความร้อนของ incident stream แบบย่อ</p>
              </div>
            </div>
            <div className="command-pulse">
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>Critical Alerts</strong>
                  <span>เคสที่เกิน 80% และเข้าข่าย block เร่งด่วน</span>
                </div>
                <div className="command-pulse__value">{overview.high}</div>
              </div>
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>Medium Watchlist</strong>
                  <span>เคสที่ควรให้เจ้าหน้าที่เปิดตรวจยืนยัน</span>
                </div>
                <div className="command-pulse__value">{overview.medium}</div>
              </div>
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>Baseline Traffic</strong>
                  <span>เหตุการณ์ความเสี่ยงต่ำหรือใช้เป็น pattern reference</span>
                </div>
                <div className="command-pulse__value">{overview.low}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="metric-grid" style={{ marginBottom: '1.25rem' }}>
          {[
            { label: 'Total Events', value: overview.total, className: 'card-glow-blue' },
            { label: 'Critical', value: overview.high, className: 'card-glow-danger' },
            { label: 'Elevated', value: overview.medium, className: 'card-glow-warning' },
            { label: 'Low Signal', value: overview.low, className: 'card-glow-green' },
          ].map((item) => (
            <div key={item.label} className={`card metric-card ${item.className}`}>
              <span className="metric-card__label">{item.label}</span>
              <div className="metric-card__value">{item.value}</div>
              <div className="metric-card__footer">อัปเดตจาก stream ที่ extension ส่งเข้าระบบ</div>
            </div>
          ))}
        </section>

        <section className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="table-toolbar">
            <div className="table-toolbar__meta">กรองเหตุการณ์ตามระดับความเสี่ยงเพื่อให้ทีมปฏิบัติการจัดคิวงานได้เร็วขึ้น</div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={filter === value ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ fontSize: '0.82rem' }}
                >
                  {value === 'ALL' && 'ทั้งหมด'}
                  {value === 'HIGH' && 'High Critical'}
                  {value === 'MEDIUM' && 'Elevated'}
                  {value === 'LOW' && 'Low Signal'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            กำลังโหลด risk stream...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            ยังไม่มีประวัติการสแกนอัตโนมัติในระดับที่เลือก
          </div>
        ) : (
          <section className="intel-feed">
            {filteredLogs.map((log) => {
              const score = log.aiRiskScore ?? 0;
              const isBlocked = (log.blockLogs?.length ?? 0) > 0;
              return (
                <button
                  key={log.id}
                  className="card"
                  style={{ textAlign: 'left', padding: '1.2rem' }}
                  onClick={() => router.push(`/cases/${log.id}`)}
                >
                  <div className="table-toolbar" style={{ marginBottom: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span
                        className="badge"
                        style={{
                          background: getRiskColor(score),
                          color: '#fff',
                        }}
                      >
                        {Math.round(score)}% {getRiskLabel(score)}
                      </span>
                      {isBlocked && (
                        <span className="badge" style={{ background: '#7c3aed', color: '#fff' }}>
                          BLOCKED
                        </span>
                      )}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(log.createdAt).toLocaleString('th-TH')}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{log.id}</div>
                  </div>

                  <div style={{ display: 'grid', gap: '0.6rem' }}>
                    <div>
                      <strong style={{ fontSize: '1rem' }}>{log.title}</strong>
                      <div className="case-domain">{log.url}</div>
                    </div>

                    <div className="risk-meter">
                      <span style={{ minWidth: '92px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Risk Signal</span>
                      <div className="risk-meter__track" style={{ width: '180px' }}>
                        <div
                          className="risk-meter__fill"
                          style={{
                            width: `${score}%`,
                            background:
                              score >= 80
                                ? 'linear-gradient(90deg, #ef4444, #b91c1c)'
                                : score >= 50
                                  ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                                  : 'linear-gradient(90deg, #10b981, #047857)',
                          }}
                        />
                      </div>
                    </div>

                    <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.88rem' }}>
                      {log.aiAnalysis}
                    </p>
                  </div>
                </button>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
