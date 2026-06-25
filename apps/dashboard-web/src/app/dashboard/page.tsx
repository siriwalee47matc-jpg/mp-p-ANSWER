'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { CaseStatus, ProductType } from '@kp-ads/shared';

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function statusColor(status: string) {
  if (status === CaseStatus.APPROVED_BLOCKED) return 'linear-gradient(90deg, #ef4444, #b91c1c)';
  if (status === CaseStatus.UNDER_REVIEW) return 'linear-gradient(90deg, #38bdf8, #0284c7)';
  if (status === CaseStatus.PENDING) return 'linear-gradient(90deg, #fbbf24, #d97706)';
  return 'linear-gradient(90deg, #94a3b8, #64748b)';
}

export default function DashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [blockedDomains, setBlockedDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const [casesRes, domainsRes] = await Promise.all([
        fetch('http://localhost:3001/cases', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3001/domains', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!casesRes.ok) throw new Error('ไม่สามารถดึงข้อมูลคดีได้');
      if (!domainsRes.ok) throw new Error('ไม่สามารถดึงบัญชีโดเมนที่ถูกบล็อกได้');

      const [casesData, domainsData] = await Promise.all([casesRes.json(), domainsRes.json()]);
      setCases(casesData);
      setBlockedDomains(domainsData);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล command center');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalCases = cases.length;
    const pendingCases = cases.filter((item) => item.status === CaseStatus.PENDING).length;
    const reviewCases = cases.filter((item) => item.status === CaseStatus.UNDER_REVIEW).length;
    const blockedCases = cases.filter((item) => item.status === CaseStatus.APPROVED_BLOCKED).length;
    const rejectedCases = cases.filter((item) => item.status === CaseStatus.REJECTED).length;
    const autoDetected = cases.filter((item) => item.reporterRole === 'SYSTEM').length;
    const highRisk = cases.filter((item) => (item.aiRiskScore ?? 0) >= 80).length;
    const averageRisk =
      totalCases > 0
        ? Math.round(cases.reduce((sum, item) => sum + (item.aiRiskScore ?? 0), 0) / totalCases)
        : 0;

    return {
      totalCases,
      pendingCases,
      reviewCases,
      blockedCases,
      rejectedCases,
      autoDetected,
      highRisk,
      averageRisk,
    };
  }, [cases]);

  const productMix = useMemo(
    () => [
      { label: 'อาหาร / เสริมอาหาร', type: ProductType.FOOD, color: 'linear-gradient(90deg, #0f766e, #14b8a6)' },
      { label: 'ยา', type: ProductType.DRUG, color: 'linear-gradient(90deg, #0284c7, #38bdf8)' },
      { label: 'เครื่องสำอาง', type: ProductType.COSMETIC, color: 'linear-gradient(90deg, #7c3aed, #a855f7)' },
      { label: 'สมุนไพร', type: ProductType.HERBAL, color: 'linear-gradient(90deg, #16a34a, #4ade80)' },
      { label: 'เครื่องมือแพทย์', type: ProductType.MEDICAL_DEVICE, color: 'linear-gradient(90deg, #ea580c, #fb923c)' },
      { label: 'คลินิก / สถานพยาบาล', type: 'CLINIC', color: 'linear-gradient(90deg, #0891b2, #22d3ee)' },
    ].map((entry) => {
      const count = cases.filter((item) => item.productType === entry.type).length;
      return { ...entry, count, percent: pct(count, stats.totalCases) };
    }),
    [cases, stats.totalCases],
  );

  const recentSignals = useMemo(
    () =>
      cases
        .slice()
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 6),
    [cases],
  );

  return (
    <div>
      <Header />
      <main className="container">
        <section className="command-grid command-grid--hero" style={{ marginBottom: '1.25rem' }}>
          <div className="card command-hero">
            <span className="command-hero__eyebrow">Sentinel Executive Command</span>
            <h1 className="command-hero__title">Dashboard ควบคุมภารกิจเฝ้าระวังโฆษณาผิดกฎหมาย</h1>
            <p className="command-hero__description">
              มอนิเตอร์คดี, ความเสี่ยง, blacklist, auto-detect pipeline และสถานะการบังคับใช้กฎหมายจากจุดเดียว
              พร้อมมุมมองสำหรับผู้บริหารและหัวหน้าชุดปฏิบัติการ
            </p>
            <div className="command-actions">
              <button className="btn btn-primary" onClick={fetchData}>
                รีเฟรชภาพรวมระบบ
              </button>
              <button className="btn btn-secondary" onClick={() => router.push('/risk-logs')}>
                เปิด Auto Risk Stream
              </button>
              <button className="btn btn-secondary" onClick={() => router.push('/cases')}>
                ไปยังห้องปฏิบัติการคดี
              </button>
            </div>
          </div>

          <div className="card">
            <div className="panel-heading">
              <div>
                <h3>สถานะปัจจุบันของระบบ</h3>
                <p>อ่านภาพรวมสุขภาพระบบภายใน 30 วินาที</p>
              </div>
            </div>
            <div className="command-pulse">
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>Auto-detect Intake</strong>
                  <span>คดีที่สร้างโดยระบบสแกนอัตโนมัติ</span>
                </div>
                <div className="command-pulse__value">{stats.autoDetected}</div>
              </div>
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>High-Risk Queue</strong>
                  <span>คดีที่มีคะแนนความเสี่ยง 80% ขึ้นไป</span>
                </div>
                <div className="command-pulse__value">{stats.highRisk}</div>
              </div>
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>Average Risk Heat</strong>
                  <span>ค่าความเสี่ยงเฉลี่ยของคดีทั้งหมด</span>
                </div>
                <div className="command-pulse__value">{stats.averageRisk}%</div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
            กำลังประมวลผลข้อมูล command center...
          </div>
        ) : (
          <>
            <section className="metric-grid" style={{ marginBottom: '1.25rem' }}>
              <div className="card metric-card card-glow-primary">
                <span className="metric-card__label">คดีทั้งหมด</span>
                <div className="metric-card__headline">
                  <div className="metric-card__value">{stats.totalCases}</div>
                  <span className="metric-card__delta good">Live</span>
                </div>
                <div className="metric-card__footer">รวมทั้งคดีจากประชาชน เจ้าหน้าที่ และระบบ auto-scan</div>
              </div>
              <div className="card metric-card card-glow-warning">
                <span className="metric-card__label">คิวรอตรวจ</span>
                <div className="metric-card__headline">
                  <div className="metric-card__value">{stats.pendingCases + stats.reviewCases}</div>
                  <span className="metric-card__delta warn">Action</span>
                </div>
                <div className="metric-card__footer">คดีที่ยังต้องผ่านการตรวจสอบหรือยืนยันข้อกฎหมาย</div>
              </div>
              <div className="card metric-card card-glow-danger">
                <span className="metric-card__label">บล็อกสำเร็จ</span>
                <div className="metric-card__headline">
                  <div className="metric-card__value">{stats.blockedCases}</div>
                  <span className="metric-card__delta critical">{pct(stats.blockedCases, stats.totalCases)}%</span>
                </div>
                <div className="metric-card__footer">คดีที่จบด้วยการระงับหรือเพิ่มเข้า blacklist แล้ว</div>
              </div>
              <div className="card metric-card card-glow-blue">
                <span className="metric-card__label">บัญชีโดเมนเสี่ยง</span>
                <div className="metric-card__headline">
                  <div className="metric-card__value">{blockedDomains.length}</div>
                  <span className="metric-card__delta good">Shielded</span>
                </div>
                <div className="metric-card__footer">โดเมนที่ระบบพร้อมปิดกั้นทันทีเมื่อ extension ตรวจพบ</div>
              </div>
            </section>

            <section className="command-grid grid-2" style={{ marginBottom: '1.25rem' }}>
              <div className="card">
                <div className="panel-heading">
                  <div>
                    <h3>Risk Pipeline</h3>
                    <p>การไหลของคดีตั้งแต่รับเข้าไปจนถึงการบล็อก</p>
                  </div>
                </div>
                <div className="status-strip">
                  {[
                    { label: 'Pending', count: stats.pendingCases, status: CaseStatus.PENDING },
                    { label: 'Under Review', count: stats.reviewCases, status: CaseStatus.UNDER_REVIEW },
                    { label: 'Blocked', count: stats.blockedCases, status: CaseStatus.APPROVED_BLOCKED },
                    { label: 'Rejected', count: stats.rejectedCases, status: CaseStatus.REJECTED },
                  ].map((entry) => (
                    <div key={entry.label} className="status-strip__row">
                      <div className="status-strip__label">{entry.label}</div>
                      <div className="status-strip__track">
                        <div
                          className="status-strip__fill"
                          style={{
                            width: `${pct(entry.count, stats.totalCases)}%`,
                            background: statusColor(entry.status),
                          }}
                        />
                      </div>
                      <div className="status-strip__value">{entry.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="panel-heading">
                  <div>
                    <h3>ระบบสัญญาณเตือนเร็ว</h3>
                    <p>มุมมองสรุปความเสี่ยงและแหล่งแจ้งเบาะแส</p>
                  </div>
                </div>
                <div className="signal-board">
                  <div className="signal-card">
                    <div className="signal-card__title">สัดส่วนจากประชาชน</div>
                    <div className="signal-card__value">
                      {pct(cases.filter((item) => item.reporterRole === 'CONSUMER').length, stats.totalCases)}%
                    </div>
                    <div className="signal-card__sub">ช่วยดูว่าความเสี่ยงถูกสะท้อนจากภาคประชาชนมากน้อยแค่ไหน</div>
                  </div>
                  <div className="signal-card">
                    <div className="signal-card__title">สัดส่วนจากเจ้าหน้าที่</div>
                    <div className="signal-card__value">
                      {pct(cases.filter((item) => item.reporterRole === 'INSPECTOR').length, stats.totalCases)}%
                    </div>
                    <div className="signal-card__sub">ใช้ติดตามภาระงานเชิงสืบสวนและการตรวจเชิงรุก</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="command-grid grid-2" style={{ marginBottom: '1.25rem' }}>
              <div className="card">
                <div className="panel-heading">
                  <div>
                    <h3>Product Heatmap</h3>
                    <p>กลุ่มผลิตภัณฑ์ที่กำลังเป็นเป้าหมายของโฆษณาเสี่ยง</p>
                  </div>
                </div>
                <div className="status-strip">
                  {productMix.map((entry) => (
                    <div key={entry.label} className="status-strip__row">
                      <div className="status-strip__label">{entry.label}</div>
                      <div className="status-strip__track">
                        <div
                          className="status-strip__fill"
                          style={{ width: `${entry.percent}%`, background: entry.color }}
                        />
                      </div>
                      <div className="status-strip__value">{entry.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="panel-heading">
                  <div>
                    <h3>Live Intel Feed</h3>
                    <p>เคสล่าสุดที่เพิ่งไหลเข้าห้องปฏิบัติการคดี</p>
                  </div>
                </div>
                <div className="intel-feed">
                  {recentSignals.map((item) => (
                    <div key={item.id} className="intel-feed__item">
                      <div
                        className="intel-feed__dot"
                        style={{
                          background:
                            (item.aiRiskScore ?? 0) >= 80
                              ? '#dc2626'
                              : (item.aiRiskScore ?? 0) >= 50
                                ? '#f59e0b'
                                : '#10b981',
                        }}
                      />
                      <div className="intel-feed__meta">
                        <strong>{item.title}</strong>
                        <span>{new Date(item.createdAt).toLocaleString('th-TH')}</span>
                      </div>
                      <div className="intel-feed__value">{Math.round(item.aiRiskScore ?? 0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="card">
              <div className="panel-heading">
                <div>
                  <h3>Active Blacklisted Domains</h3>
                  <p>รายการโดเมนที่พร้อมบังคับใช้ทันทีใน extension และ workflow ด้านกฎหมาย</p>
                </div>
              </div>

              {blockedDomains.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>ยังไม่มีโดเมนที่ถูกเพิ่มใน blacklist</div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Domain</th>
                        <th>เหตุผล</th>
                        <th>วันที่บล็อก</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blockedDomains.map((domain) => (
                        <tr key={domain.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-danger)' }}>
                            {domain.domain}
                          </td>
                          <td>{domain.reason}</td>
                          <td>{new Date(domain.blockedAt).toLocaleString('th-TH')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
