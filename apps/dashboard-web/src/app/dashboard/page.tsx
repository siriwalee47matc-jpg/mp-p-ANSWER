'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { CaseStatus, ProductType } from '@kp-ads/shared';
import { API_URL } from '@/lib/api';

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
  const [publicMetrics, setPublicMetrics] = useState({ downloadClicks: 0, extensionInstalls: 0 });
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
      const [casesRes, domainsRes, metricsRes] = await Promise.all([
        fetch(`${API_URL}/cases`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/domains`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/metrics/public`),
      ]);

      if (!casesRes.ok) throw new Error('ไม่สามารถดึงข้อมูลคดีได้');
      if (!domainsRes.ok) throw new Error('ไม่สามารถดึงบัญชีโดเมนที่ถูกบล็อกได้');

      const [casesData, domainsData, metricsData] = await Promise.all([
        casesRes.json(),
        domainsRes.json(),
        metricsRes.ok ? metricsRes.json() : { downloadClicks: 0, extensionInstalls: 0 },
      ]);
      setCases(casesData);
      setBlockedDomains(domainsData);
      setPublicMetrics(metricsData);
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
            <span className="command-hero__eyebrow">ศูนย์บัญชาการ Sentinel ADS</span>
            <h1 className="command-hero__title">ภาพรวมการควบคุมภารกิจเฝ้าระวังโฆษณาผิดกฎหมาย</h1>
            <p className="command-hero__description">
              ติดตามคดี ความเสี่ยง รายการปิดกั้น กระบวนการตรวจจับอัตโนมัติ และสถานะการบังคับใช้กฎหมายจากจุดเดียว
              พร้อมมุมมองสำหรับผู้บริหารและหัวหน้าชุดปฏิบัติการ
            </p>
            <div className="command-actions">
              <button className="btn btn-primary" onClick={fetchData}>
                รีเฟรชภาพรวมระบบ
              </button>
              <button className="btn btn-secondary" onClick={() => router.push('/risk-logs')}>
                เปิด Auto ความเสี่ยง Stream
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
                  <strong>คดีจากการตรวจจับอัตโนมัติ</strong>
                  <span>คดีที่สร้างโดยระบบสแกนอัตโนมัติ</span>
                </div>
                <div className="command-pulse__value">{stats.autoDetected}</div>
              </div>
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>คดีความเสี่ยงสูง</strong>
                  <span>คดีที่มีคะแนนความเสี่ยง 80% ขึ้นไป</span>
                </div>
                <div className="command-pulse__value">{stats.highRisk}</div>
              </div>
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>ค่าเฉลี่ยระดับความเสี่ยง</strong>
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
                  <span className="metric-card__delta good">ปัจจุบัน</span>
                </div>
                <div className="metric-card__footer">รวมคดีจากประชาชน เจ้าหน้าที่ และระบบตรวจจับอัตโนมัติ</div>
              </div>
              <div className="card metric-card card-glow-warning">
                <span className="metric-card__label">คิวรอตรวจ</span>
                <div className="metric-card__headline">
                  <div className="metric-card__value">{stats.pendingCases + stats.reviewCases}</div>
                  <span className="metric-card__delta warn">การดำเนินการ</span>
                </div>
                <div className="metric-card__footer">คดีที่ยังต้องผ่านการตรวจสอบหรือยืนยันข้อกฎหมาย</div>
              </div>
              <div className="card metric-card card-glow-danger">
                <span className="metric-card__label">บล็อกสำเร็จ</span>
                <div className="metric-card__headline">
                  <div className="metric-card__value">{stats.blockedCases}</div>
                  <span className="metric-card__delta critical">{pct(stats.blockedCases, stats.totalCases)}%</span>
                </div>
                <div className="metric-card__footer">คดีที่จบด้วยการระงับหรือเพิ่มเข้ารายการปิดกั้นแล้ว</div>
              </div>
              <div className="card metric-card card-glow-blue">
                <span className="metric-card__label">บัญชีโดเมนเสี่ยง</span>
                <div className="metric-card__headline">
                  <div className="metric-card__value">{blockedDomains.length}</div>
                  <span className="metric-card__delta good">อยู่ภายใต้การคุ้มครอง</span>
                </div>
                <div className="metric-card__footer">โดเมนที่ระบบพร้อมปิดกั้นทันทีเมื่อ ส่วนขยาย ตรวจพบ</div>
              </div>
            </section>

            <section className="command-grid grid-2" style={{ marginBottom: '1.25rem' }}>
              <div className="card">
                <div className="panel-heading">
                  <div>
                    <h3>สถิติส่วนขยายเบราว์เซอร์ (Extension Telemetry)</h3>
                    <p>ปริมาณการดาวน์โหลดและติดตั้งใช้งานจากผู้ใช้จริงแบบเรียลไทม์</p>
                  </div>
                </div>
                <div className="signal-board" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <div className="signal-card" style={{ borderLeft: '4px solid var(--color-success)', padding: '1rem', background: '#f8fafc' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ยอดดาวน์โหลดสะสม (หน้าเว็บหลัก)</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0.35rem 0' }}>
                      {publicMetrics.downloadClicks.toLocaleString()} ครั้ง
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>จำนวนการกดปุ่มดาวน์โหลด/ติดตั้งบน Landing Page</div>
                  </div>
                  <div className="signal-card" style={{ borderLeft: '4px solid var(--color-info)', padding: '1rem', background: '#f8fafc' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ส่วนขยายที่กำลังใช้งาน (Active)</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-info)', margin: '0.35rem 0' }}>
                      {publicMetrics.extensionInstalls.toLocaleString()} เครื่อง
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>จำนวนอุปกรณ์จริงที่ติดตั้งและรายงานสถานะเข้ามา</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="panel-heading">
                  <div>
                    <h3>การสแกนผ่านส่วนขยาย (Extension Scan Summary)</h3>
                    <p>ข้อมูลภาพรวมคดีที่ถูกป้อนและรายงานจากระบบส่วนขยาย</p>
                  </div>
                </div>
                <div className="signal-board">
                  <div className="signal-card">
                    <div className="signal-card__title">คดีจากการสแกนอัตโนมัติ</div>
                    <div className="signal-card__value" style={{ color: 'var(--text-main)', fontSize: '1.8rem', fontWeight: 700, margin: '0.35rem 0' }}>
                      {stats.autoDetected} เคส
                    </div>
                    <div className="signal-card__sub">เคสทั้งหมดที่ถูกตรวจพบโดยระบบสแกนส่วนขยาย</div>
                  </div>
                  <div className="signal-card">
                    <div className="signal-card__title">อัตราส่วนคดีสแกนอัตโนมัติ</div>
                    <div className="signal-card__value" style={{ color: 'var(--text-main)', fontSize: '1.8rem', fontWeight: 700, margin: '0.35rem 0' }}>
                      {pct(stats.autoDetected, stats.totalCases)}%
                    </div>
                    <div className="signal-card__sub">สัดส่วนเคสตรวจจับอัตโนมัติต่อเคสทั้งหมด</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="command-grid grid-2" style={{ marginBottom: '1.25rem' }}>
              <div className="card">
                <div className="panel-heading">
                  <div>
                    <h3>ความเสี่ยง Pipeline</h3>
                    <p>การไหลของคดีตั้งแต่รับเข้าไปจนถึงการบล็อก</p>
                  </div>
                </div>
                <div className="status-strip">
                  {[
                    { label: 'รอตรวจสอบ', count: stats.pendingCases, status: CaseStatus.PENDING },
                    { label: 'อยู่ระหว่างตรวจสอบ', count: stats.reviewCases, status: CaseStatus.UNDER_REVIEW },
                    { label: 'ปิดกั้นแล้ว', count: stats.blockedCases, status: CaseStatus.APPROVED_BLOCKED },
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
                    <h3>ภาพรวมตามประเภทผลิตภัณฑ์</h3>
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
                    <h3>เหตุการณ์ล่าสุด</h3>
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
                  <h3>โดเมนที่ถูกปิดกั้นอยู่</h3>
                  <p>รายการโดเมนที่พร้อมบังคับใช้ทันทีใน ส่วนขยาย และ กระบวนการทำงาน ด้านกฎหมาย</p>
                </div>
              </div>

              {blockedDomains.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>ยังไม่มีโดเมนที่ถูกเพิ่มในรายการปิดกั้น</div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>โดเมน</th>
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
