'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { CaseStatus, ProductType } from '@kp-ads/shared';

function riskTone(score?: number) {
  if ((score ?? 0) >= 80) return { color: '#dc2626', bg: 'linear-gradient(90deg, #ef4444, #b91c1c)' };
  if ((score ?? 0) >= 50) return { color: '#d97706', bg: 'linear-gradient(90deg, #f59e0b, #d97706)' };
  return { color: '#16a34a', bg: 'linear-gradient(90deg, #10b981, #047857)' };
}

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCases = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (statusFilter) queryParams.append('status', statusFilter);
      if (typeFilter) queryParams.append('productType', typeFilter);

      const res = await fetch(`http://localhost:3001/cases?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.clear();
          router.push('/');
          return;
        }
        throw new Error('ไม่สามารถดึงข้อมูลคดีได้');
      }

      setCases(await res.json());
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดรายการคดี');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter, typeFilter]);

  const insights = useMemo(() => {
    const total = cases.length;
    const autoScan = cases.filter((item) => item.reporterRole === 'SYSTEM').length;
    const highRisk = cases.filter((item) => (item.aiRiskScore ?? 0) >= 80).length;
    const pending = cases.filter((item) => item.status === CaseStatus.PENDING).length;
    return { total, autoScan, highRisk, pending };
  }, [cases]);

  const translateStatus = (status: string) => {
    if (status === CaseStatus.PENDING) return 'Pending';
    if (status === CaseStatus.UNDER_REVIEW) return 'Under Review';
    if (status === CaseStatus.APPROVED_BLOCKED) return 'Blocked';
    return 'Rejected';
  };

  const translateProductType = (type: string) => {
    switch (type) {
      case ProductType.FOOD:
        return 'อาหาร';
      case ProductType.DRUG:
        return 'ยา';
      case ProductType.COSMETIC:
        return 'เครื่องสำอาง';
      case ProductType.MEDICAL_DEVICE:
        return 'เครื่องมือแพทย์';
      case ProductType.HERBAL:
        return 'สมุนไพร';
      case 'CLINIC':
        return 'สถานพยาบาล';
      case 'HAZARDOUS':
        return 'วัตถุอันตราย';
      case 'NARCOTIC':
        return 'ยาเสพติด';
      default:
        return type;
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases();
  };

  return (
    <div>
      <Header />
      <main className="container">
        <section className="command-grid command-grid--hero" style={{ marginBottom: '1.25rem' }}>
          <div className="card command-hero">
            <span className="command-hero__eyebrow">Case Operations Room</span>
            <h1 className="command-hero__title">ห้องปฏิบัติการคดีและหลักฐาน</h1>
            <p className="command-hero__description">
              จัดการทุกเคสใน workflow เดียว ตั้งแต่ intake, AI triage, law confirmation, reviewer decision,
              ไปจนถึง block execution และ export หลักฐาน
            </p>
            <div className="command-actions">
              <button className="btn btn-primary" onClick={fetchCases}>
                รีเฟรชคิวคดี
              </button>
              <button className="btn btn-secondary" onClick={() => router.push('/risk-logs')}>
                เปิด risk stream
              </button>
            </div>
          </div>

          <div className="card">
            <div className="panel-heading">
              <div>
                <h3>Queue Snapshot</h3>
                <p>สถานะเร่งด่วนของห้องคดีแบบย่อ</p>
              </div>
            </div>
            <div className="command-pulse">
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>Total Cases</strong>
                  <span>คดีทั้งหมดในระบบ</span>
                </div>
                <div className="command-pulse__value">{insights.total}</div>
              </div>
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>Pending Action</strong>
                  <span>คดีที่ยังค้างการเปิดตรวจ</span>
                </div>
                <div className="command-pulse__value">{insights.pending}</div>
              </div>
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>Auto-Scan Inflow</strong>
                  <span>คดีที่ระบบสแกนเข้ามาอัตโนมัติ</span>
                </div>
                <div className="command-pulse__value">{insights.autoScan}</div>
              </div>
              <div className="command-pulse__item">
                <div className="command-pulse__label">
                  <strong>High-Risk Cases</strong>
                  <span>คดีที่ AI ให้ความเสี่ยงสูงมาก</span>
                </div>
                <div className="command-pulse__value">{insights.highRisk}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="panel-heading">
            <div>
              <h3>Search & Filters</h3>
              <p>คัดเคสตาม domain, หมายเลขคดี, สถานะ และประเภทผลิตภัณฑ์</p>
            </div>
          </div>

          <form className="search-panel" onSubmit={handleSearchSubmit}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>ค้นหาคดีหรือโดเมน</label>
              <input
                type="text"
                placeholder="เช่น CASE-2026-001 หรือ fake-slimming-pills.com"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>สถานะ</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">ทั้งหมด</option>
                <option value={CaseStatus.PENDING}>Pending</option>
                <option value={CaseStatus.UNDER_REVIEW}>Under Review</option>
                <option value={CaseStatus.APPROVED_BLOCKED}>Blocked</option>
                <option value={CaseStatus.REJECTED}>Rejected</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>ประเภทผลิตภัณฑ์</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">ทั้งหมด</option>
                <option value={ProductType.FOOD}>อาหาร</option>
                <option value={ProductType.DRUG}>ยา</option>
                <option value={ProductType.COSMETIC}>เครื่องสำอาง</option>
                <option value={ProductType.MEDICAL_DEVICE}>เครื่องมือแพทย์</option>
                <option value={ProductType.HERBAL}>สมุนไพร</option>
                <option value="CLINIC">สถานพยาบาล</option>
                <option value="HAZARDOUS">วัตถุอันตราย</option>
                <option value="NARCOTIC">ยาเสพติด</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              ค้นหา
            </button>
          </form>
        </section>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            กำลังโหลด case operations...
          </div>
        ) : cases.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            ไม่พบรายการคดีที่ตรงกับเงื่อนไข
          </div>
        ) : (
          <section className="card">
            <div className="table-toolbar">
              <div className="table-toolbar__meta">พบ {cases.length} คดีในคิวปฏิบัติการปัจจุบัน</div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>รายละเอียด</th>
                    <th>ประเภท</th>
                    <th>Risk</th>
                    <th>Source</th>
                    <th>สถานะ</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((item) => {
                    const tone = riskTone(item.aiRiskScore);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1d4ed8' }}>{item.id}</td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{item.title}</div>
                          <div className="case-domain">{item.url}</div>
                        </td>
                        <td>{translateProductType(item.productType)}</td>
                        <td>
                          {item.aiRiskScore !== null && item.aiRiskScore !== undefined ? (
                            <div className="risk-meter">
                              <span style={{ minWidth: '44px', color: tone.color, fontWeight: 700 }}>
                                {Math.round(item.aiRiskScore)}%
                              </span>
                              <div className="risk-meter__track">
                                <div className="risk-meter__fill" style={{ width: `${item.aiRiskScore}%`, background: tone.bg }} />
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>ยังไม่วิเคราะห์</span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              color:
                                item.reporterRole === 'INSPECTOR'
                                  ? '#7c3aed'
                                  : item.reporterRole === 'SYSTEM'
                                    ? '#0f766e'
                                    : '#047857',
                              fontWeight: 700,
                              fontSize: '0.84rem',
                            }}
                          >
                            {item.reporterRole === 'INSPECTOR'
                              ? 'เจ้าหน้าที่'
                              : item.reporterRole === 'SYSTEM'
                                ? 'SYSTEM AUTO-SCAN'
                                : 'ประชาชน'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={
                              item.status === CaseStatus.PENDING
                                ? 'badge badge-pending'
                                : item.status === CaseStatus.UNDER_REVIEW
                                  ? 'badge badge-review'
                                  : item.status === CaseStatus.APPROVED_BLOCKED
                                    ? 'badge badge-blocked'
                                    : 'badge badge-rejected'
                            }
                          >
                            {translateStatus(item.status)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.55rem 0.9rem', fontSize: '0.8rem' }}
                              onClick={() => router.push(`/cases/${item.id}`)}
                            >
                              เปิดตรวจ
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.55rem 0.9rem', fontSize: '0.8rem' }}
                              onClick={() => {
                                const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(item, null, 2))}`;
                                const anchor = document.createElement('a');
                                anchor.setAttribute('href', dataStr);
                                anchor.setAttribute('download', `sentinel-case-${item.id}.json`);
                                document.body.appendChild(anchor);
                                anchor.click();
                                anchor.remove();
                              }}
                            >
                              Export JSON
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
