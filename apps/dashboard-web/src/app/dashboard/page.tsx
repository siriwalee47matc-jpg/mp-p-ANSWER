'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { CaseStatus, ProductType } from '@kp-ads/shared';

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
      // 1. Fetch Cases
      const casesRes = await fetch('http://localhost:3001/cases', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!casesRes.ok) throw new Error('ไม่สามารถดึงสถิติคดีได้');
      const casesData = await casesRes.json();
      setCases(casesData);

      // 2. Fetch Blocked Domains
      const domainsRes = await fetch('http://localhost:3001/domains', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!domainsRes.ok) throw new Error('ไม่สามารถดึงข้อมูลโดเมนที่ถูกบล็อกได้');
      const domainsData = await domainsRes.json();
      setBlockedDomains(domainsData);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute stats
  const totalCases = cases.length;
  const pendingCases = cases.filter(c => c.status === CaseStatus.PENDING).length;
  const reviewCases = cases.filter(c => c.status === CaseStatus.UNDER_REVIEW).length;
  const blockedCases = cases.filter(c => c.status === CaseStatus.APPROVED_BLOCKED).length;
  const rejectedCases = cases.filter(c => c.status === CaseStatus.REJECTED).length;

  const consumerTipsCount = cases.filter(c => c.reporterRole === 'CONSUMER').length;
  const inspectorCasesCount = cases.filter(c => c.reporterRole === 'INSPECTOR').length;

  // Breakdown by product type
  const foodCount = cases.filter(c => c.productType === ProductType.FOOD).length;
  const drugCount = cases.filter(c => c.productType === ProductType.DRUG).length;
  const cosmeticCount = cases.filter(c => c.productType === ProductType.COSMETIC).length;
  const herbalCount = cases.filter(c => c.productType === ProductType.HERBAL).length;
  const medicalDeviceCount = cases.filter(c => c.productType === ProductType.MEDICAL_DEVICE).length;
  const clinicCount = cases.filter(c => c.productType === (ProductType as any).CLINIC || c.productType === 'CLINIC').length;
  const hazardousCount = cases.filter(c => c.productType === (ProductType as any).HAZARDOUS || c.productType === 'HAZARDOUS').length;
  const narcoticCount = cases.filter(c => c.productType === (ProductType as any).NARCOTIC || c.productType === 'NARCOTIC').length;
  const effectivenessRate = totalCases > 0 ? Math.round((blockedCases / totalCases) * 100) : 0;

  // Percentage calculations
  const percentOfTotal = (count: number) => {
    if (totalCases === 0) return 0;
    return Math.round((count / totalCases) * 100);
  };

  return (
    <div>
      <Header />
      <main className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>ศูนย์วิเคราะห์ข้อมูลและสถิติคดี</h1>
            <p style={{ color: 'var(--text-muted)' }}>หน้าจอแสดงผลรายงานสรุปสำหรับผู้บริหาร เฝ้าติดตามการปฏิบัติงานและวิเคราะห์ภัยคุกคามผู้บริโภค</p>
          </div>
          <button onClick={fetchData} className="btn btn-secondary">
            🔄 รีเฟรชสถิติ
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
            <p style={{ color: 'var(--text-muted)' }}>กำลังประมวลผลรายงานสถิติของระบบ...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* KPI Cards Grid */}
            <div className="grid grid-4">
              <div className="card card-glow-orange">
                <span style={{ fontSize: '1.5rem' }}>📋</span>
                <div className="stat-value">{totalCases}</div>
                <div className="stat-desc">จำนวนข้อร้องเรียนและคดีทั้งหมด</div>
              </div>

              <div className="card card-glow-green">
                <span style={{ fontSize: '1.5rem' }}>⏳</span>
                <div className="stat-value">{pendingCases + reviewCases}</div>
                <div className="stat-desc">คดีอยู่ระหว่างกระบวนการตรวจสอบ</div>
              </div>

              <div className="card card-glow-blue">
                <span style={{ fontSize: '1.5rem' }}>🚫</span>
                <div className="stat-value">{blockedDomains.length}</div>
                <div className="stat-desc">โดเมนโฆษณาอันตรายที่ถูกปิดกั้น</div>
              </div>

              <div className="card card-glow-purple">
                <span style={{ fontSize: '1.5rem' }}>👥</span>
                <div className="stat-value">{percentOfTotal(consumerTipsCount)}%</div>
                <div className="stat-desc">สัดส่วนแจ้งเบาะแสจากภาคประชาชน</div>
              </div>
            </div>

            {/* Visual Charts Layout */}
            <div className="grid grid-2">
              {/* Product Type Distribution */}
              <div className="card">
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  📦 สัดส่วนการกระทำความผิดแยกตามประเภทโฆษณา
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Food Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span>🍔 อาหารและอาหารเสริม (Food)</span>
                      <strong>{foodCount} คดี ({percentOfTotal(foodCount)}%)</strong>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                      <div style={{ width: `${percentOfTotal(foodCount)}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '4px' }}></div>
                    </div>
                  </div>

                  {/* Drug Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span>💊 ยารักษาโรค (Drug)</span>
                      <strong>{drugCount} คดี ({percentOfTotal(drugCount)}%)</strong>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                      <div style={{ width: `${percentOfTotal(drugCount)}%`, height: '100%', background: '#60a5fa', borderRadius: '4px' }}></div>
                    </div>
                  </div>

                  {/* Cosmetic Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span>💄 เครื่องสำอาง (Cosmetics)</span>
                      <strong>{cosmeticCount} คดี ({percentOfTotal(cosmeticCount)}%)</strong>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                      <div style={{ width: `${percentOfTotal(cosmeticCount)}%`, height: '100%', background: 'var(--color-accent)', borderRadius: '4px' }}></div>
                    </div>
                  </div>

                  {/* Herbal Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span>🌱 ผลิตภัณฑ์สมุนไพร (Herbal)</span>
                      <strong>{herbalCount} คดี ({percentOfTotal(herbalCount)}%)</strong>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                      <div style={{ width: `${percentOfTotal(herbalCount)}%`, height: '100%', background: 'var(--color-success)', borderRadius: '4px' }}></div>
                    </div>
                  </div>

                  {/* Medical Device Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span>🩺 เครื่องมือแพทย์ (Medical Device)</span>
                      <strong>{medicalDeviceCount} คดี ({percentOfTotal(medicalDeviceCount)}%)</strong>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                      <div style={{ width: `${percentOfTotal(medicalDeviceCount)}%`, height: '100%', background: '#fb923c', borderRadius: '4px' }}></div>
                    </div>
                  </div>

                  {/* Clinic Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span>🏥 สถานพยาบาล (Clinic)</span>
                      <strong>{clinicCount} คดี ({percentOfTotal(clinicCount)}%)</strong>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                      <div style={{ width: `${percentOfTotal(clinicCount)}%`, height: '100%', background: '#2dd4bf', borderRadius: '4px' }}></div>
                    </div>
                  </div>

                  {/* Hazardous Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span>☣️ วัตถุอันตราย (Hazardous)</span>
                      <strong>{hazardousCount} คดี ({percentOfTotal(hazardousCount)}%)</strong>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                      <div style={{ width: `${percentOfTotal(hazardousCount)}%`, height: '100%', background: '#f87171', borderRadius: '4px' }}></div>
                    </div>
                  </div>

                  {/* Narcotic Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span>🚨 วัตถุเสพติด (Narcotic)</span>
                      <strong>{narcoticCount} คดี ({percentOfTotal(narcoticCount)}%)</strong>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                      <div style={{ width: `${percentOfTotal(narcoticCount)}%`, height: '100%', background: '#a78bfa', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Breakdown & Source ratio */}
              <div className="card">
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  📊 อัตราประสิทธิผลการกวาดล้างและปิดกั้นโฆษณา
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', alignItems: 'center' }}>
                  {/* Left Column: Statuses & Source Ratio */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Case Status Distribution */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '700', marginBottom: '0.25rem' }}>สถานะความคืบหน้าของคดีความ:</div>
                      <div className="flex align-center justify-between" style={{ fontSize: '0.9rem' }}>
                        <span>🟠 รอตรวจสอบ (Pending)</span>
                        <strong style={{ fontWeight: '700' }}>{pendingCases} คดี</strong>
                      </div>
                      <div className="flex align-center justify-between" style={{ fontSize: '0.9rem' }}>
                        <span>🔵 ระหว่างดำเนินงาน (Under Review)</span>
                        <strong style={{ fontWeight: '700' }}>{reviewCases} คดี</strong>
                      </div>
                      <div className="flex align-center justify-between" style={{ fontSize: '0.9rem' }}>
                        <span>🔴 สั่งปิดกั้นแล้ว (Blocked)</span>
                        <strong style={{ fontWeight: '700' }}>{blockedCases} คดี</strong>
                      </div>
                      <div className="flex align-center justify-between" style={{ fontSize: '0.9rem' }}>
                        <span>⚪ ปฏิเสธคำร้อง (Rejected)</span>
                        <strong style={{ fontWeight: '700' }}>{rejectedCases} คดี</strong>
                      </div>
                    </div>

                    {/* Citizens VS Officers Source Ratio */}
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.85rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: '700', marginBottom: '0.5rem' }}>แหล่งที่มาเบาะแส (Reporter Source Ratio)</div>
                      <div style={{ display: 'flex', gap: '0.25rem', height: '24px', background: 'rgba(0,0,0,0.05)', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                        <div style={{ width: `${percentOfTotal(consumerTipsCount)}%`, background: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {percentOfTotal(consumerTipsCount)}%
                        </div>
                        <div style={{ width: `${percentOfTotal(inspectorCasesCount)}%`, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {percentOfTotal(inspectorCasesCount)}%
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-main)', fontWeight: '600' }}>
                        <span>👥 ประชาชน ({consumerTipsCount})</span>
                        <span>👮 เจ้าหน้าที่ ({inspectorCasesCount})</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Circular Progress Chart */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem', textAlign: 'center', minHeight: '230px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '700', marginBottom: '1rem' }}>สัดส่วนปิดกั้นสำเร็จ (Blocked Success Rate)</div>
                    
                    <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="130" height="130" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                        {/* Background Circle */}
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="transparent"
                          stroke="rgba(0, 0, 0, 0.05)"
                          strokeWidth="10"
                        />
                        {/* Foreground Circle */}
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="transparent"
                          stroke="var(--color-danger)"
                          strokeWidth="10"
                          strokeDasharray={2 * Math.PI * 50}
                          strokeDashoffset={2 * Math.PI * 50 * (1 - effectivenessRate / 100)}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                      </svg>
                      
                      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-main)', lineHeight: '1' }}>
                          {effectivenessRate}%
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-main)', fontWeight: '700', marginTop: '2px', letterSpacing: '0.5px' }}>
                          สำเร็จ
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '700', marginTop: '1rem' }}>
                      🚫 ปิดกั้นสำเร็จ {blockedCases} จากทั้งหมด {totalCases} เคส
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Blocked Domains Blacklist Table */}
            <div className="card">
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                🚫 บัญชีดำรายชื่อโดเมนที่ถูกบล็อก (Active Blacklisted Domains)
              </h3>

              {blockedDomains.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>ยังไม่มีประวัติโดเมนที่ถูกสั่งปิดกั้น</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>โดเมนที่ถูกระงับ (Domain)</th>
                        <th>เหตุผลที่ระงับ (Reason)</th>
                        <th style={{ width: '220px' }}>วันที่เพิ่มเข้าบัญชีดำ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blockedDomains.map((d) => (
                        <tr key={d.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-danger)' }}>
                            ❌ {d.domain}
                          </td>
                          <td style={{ fontSize: '0.9rem' }}>{d.reason}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {new Date(d.blockedAt).toLocaleString('th-TH')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
