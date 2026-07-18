'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { API_URL } from '@/lib/api';

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
  if (score >= 80) return 'วิกฤตสูง';
  if (score >= 50) return 'เฝ้าระวัง';
  return 'สัญญาณความเสี่ยงต่ำ';
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
      const res = await fetch(`${API_URL}/risk/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูล รายการความเสี่ยง ได้');
      setLogs(await res.json());
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลด รายการความเสี่ยง');
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
            <span className="command-hero__eyebrow">การตรวจจับอัตโนมัติ</span>
            <h1 className="command-hero__title">รายการเหตุการณ์ความเสี่ยง</h1>
            <p className="command-hero__description">
              ศูนย์รวมสัญญาณจากการสแกนโฆษณาอัตโนมัติ ใช้ดูแนวโน้มความเสี่ยง, ความหนาแน่นของเหตุการณ์,
              และเคสที่ควรเร่งปฏิบัติการก่อนเข้าสู่ขั้นตอนกฎหมาย
            </p>
            <div className="command-actions">
              <button className="btn btn-primary" onClick={fetchLogs}>
                รีเฟรชสตรีม
              </button>
              <button className="btn btn-secondary" onClick={() => router.push('/settings')}>
                ไปยัง ศูนย์ควบคุม
              </button>
            </div>
          </div>

          <div className="card">
            <div className="panel-heading">
              <div>
                <h3>สรุปสัญญาณความเสี่ยง</h3>
                <p>ดูความร้อนของ รายการเหตุการณ์ แบบย่อ</p>
              </div>
            </div>
            <div className="command-pulse">
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>การแจ้งเตือนวิกฤต</strong>
                  <span>คดีที่เกิน 80% และเข้าข่ายต้องปิดกั้นเร่งด่วน</span>
                </div>
                <div className="command-pulse__value">{overview.high}</div>
              </div>
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>รายการเฝ้าระวังระดับกลาง</strong>
                  <span>เคสที่ควรให้เจ้าหน้าที่เปิดตรวจยืนยัน</span>
                </div>
                <div className="command-pulse__value">{overview.medium}</div>
              </div>
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>เหตุการณ์ความเสี่ยงต่ำ</strong>
                  <span>เหตุการณ์ความเสี่ยงต่ำหรือใช้เป็นข้อมูลอ้างอิง</span>
                </div>
                <div className="command-pulse__value">{overview.low}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="metric-grid" style={{ marginBottom: '1.25rem' }}>
          {[
            { label: 'เหตุการณ์ทั้งหมด', value: overview.total, className: 'card-glow-blue' },
            { label: 'Critical', value: overview.high, className: 'card-glow-danger' },
            { label: 'เฝ้าระวัง', value: overview.medium, className: 'card-glow-warning' },
            { label: 'สัญญาณความเสี่ยงต่ำ', value: overview.low, className: 'card-glow-green' },
          ].map((item) => (
            <div key={item.label} className={`card metric-card ${item.className}`}>
              <span className="metric-card__label">{item.label}</span>
              <div className="metric-card__value">{item.value}</div>
              <div className="metric-card__footer">อัปเดตจากข้อมูลที่ส่วนขยายส่งเข้าระบบ</div>
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
                  {value === 'HIGH' && 'วิกฤตสูง'}
                  {value === 'MEDIUM' && 'เฝ้าระวัง'}
                  {value === 'LOW' && 'สัญญาณความเสี่ยงต่ำ'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            กำลังโหลด รายการความเสี่ยง...
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
                      <span style={{ minWidth: '92px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>สัญญาณความเสี่ยง</span>
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
