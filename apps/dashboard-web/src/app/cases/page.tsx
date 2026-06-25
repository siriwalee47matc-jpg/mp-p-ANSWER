'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { CaseStatus, ProductType } from '@kp-ads/shared';

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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.clear();
          router.push('/');
          return;
        }
        throw new Error('ไม่สามารถดึงข้อมูลคดีได้');
      }

      const data = await res.json();
      setCases(data);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case CaseStatus.PENDING:
        return 'badge badge-pending';
      case CaseStatus.UNDER_REVIEW:
        return 'badge badge-review';
      case CaseStatus.APPROVED_BLOCKED:
        return 'badge badge-blocked';
      default:
        return 'badge badge-rejected';
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case CaseStatus.PENDING:
        return 'แจ้งเบาะแสประชาชน (Pending)';
      case CaseStatus.UNDER_REVIEW:
        return 'อยู่ระหว่างตรวจสอบ (Review)';
      case CaseStatus.APPROVED_BLOCKED:
        return 'บล็อกแล้ว (Blocked)';
      default:
        return 'ยกเลิกคดี (Rejected)';
    }
  };

  const translateProductType = (type: string) => {
    switch (type) {
      case ProductType.FOOD:
        return 'อาหาร (Food)';
      case ProductType.DRUG:
        return 'ยา (Drug)';
      case ProductType.COSMETIC:
        return 'เครื่องสำอาง (Cosmetic)';
      case ProductType.MEDICAL_DEVICE:
        return 'เครื่องมือแพทย์ (Medical Device)';
      case ProductType.HERBAL:
        return 'สมุนไพร (Herbal)';
      case (ProductType as any).CLINIC:
      case 'CLINIC':
        return 'สถานพยาบาล (Clinic)';
      case (ProductType as any).HAZARDOUS:
      case 'HAZARDOUS':
        return 'วัตถุอันตราย (Hazardous)';
      case (ProductType as any).NARCOTIC:
      case 'NARCOTIC':
        return 'วัตถุเสพติด (Narcotic)';
      default:
        return type;
    }
  };

  return (
    <div>
      <Header />
      <main className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>รายการดำเนินคดีและแจ้งเบาะแส</h1>
            <p style={{ color: 'var(--text-muted)' }}>คิวงานตรวจสอบคำโฆษณา คอนเฟิร์มข้อกฎหมาย และอนุมัติระงับการเข้าถึงโดเมน</p>
          </div>
          
          <button onClick={fetchCases} className="btn btn-secondary" style={{ padding: '0.6rem 1rem' }}>
            🔄 รีเฟรชข้อมูล
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>ค้นหาโดเมน, ชื่อหัวข้อ หรือเลขเคส</label>
              <input
                type="text"
                placeholder="เช่น CASE-2026-001 หรือ fake-slimming.com..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>ตัวกรองสถานะคดี</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">ทั้งหมด (All Status)</option>
                <option value={CaseStatus.PENDING}>แจ้งเบาะแสประชาชน (Pending)</option>
                <option value={CaseStatus.UNDER_REVIEW}>อยู่ระหว่างตรวจสอบ (Under Review)</option>
                <option value={CaseStatus.APPROVED_BLOCKED}>อนุมัติบล็อกแล้ว (Blocked)</option>
                <option value={CaseStatus.REJECTED}>ยกเลิก/ปฏิเสธ (Rejected)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>ประเภทผลิตภัณฑ์</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">ทั้งหมด (All Product Type)</option>
                <option value={ProductType.FOOD}>อาหาร (Food)</option>
                <option value={ProductType.DRUG}>ยา (Drug)</option>
                <option value={ProductType.COSMETIC}>เครื่องสำอาง (Cosmetic)</option>
                <option value={ProductType.MEDICAL_DEVICE}>เครื่องมือแพทย์</option>
                <option value={ProductType.HERBAL}>สมุนไพร (Herbal)</option>
                <option value={(ProductType as any).CLINIC || 'CLINIC'}>สถานพยาบาล (Clinic)</option>
                <option value={(ProductType as any).HAZARDOUS || 'HAZARDOUS'}>วัตถุอันตราย (Hazardous)</option>
                <option value={(ProductType as any).NARCOTIC || 'NARCOTIC'}>วัตถุเสพติด (Narcotic)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', height: '42px' }}>
              ค้นหา 🔍
            </button>
          </form>
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
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              borderTopColor: 'var(--color-primary)',
              animation: 'spin 1s ease-in-out infinite',
              marginBottom: '1rem'
            }}></div>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <p style={{ color: 'var(--text-muted)' }}>กำลังดึงข้อมูลรายการคดีความ...</p>
          </div>
        ) : cases.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
            <span style={{ fontSize: '3rem' }}>📂</span>
            <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>ไม่พบรายการคดีตรงตามข้อกำหนด</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ไม่มีคดีค้างส่งหรือไม่มีการแจ้งเตือนในช่วงเวลานี้</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>เลขที่คดี</th>
                  <th>โฆษณาที่ตรวจพบ</th>
                  <th>โดเมนเป้าหมาย</th>
                  <th style={{ width: '150px' }}>ประเภทสินค้า</th>
                  <th style={{ width: '140px' }}>ผู้แจ้งเบาะแส</th>
                  <th style={{ width: '180px' }}>สถานะ</th>
                  <th style={{ width: '250px' }}>การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1e3a8a' }}>
                      {c.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{c.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.url}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                      {c.domain}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.85rem',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px'
                      }}>
                        {translateProductType(c.productType)}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        color: c.reporterRole === 'INSPECTOR' ? '#7c3aed' : '#047857',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}>
                        {c.reporterRole === 'INSPECTOR' ? '👮 เจ้าหน้าที่' : '👥 ประชาชน'}
                      </span>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(c.status)}>
                        {translateStatus(c.status)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => router.push(`/cases/${c.id}`)}
                          className="btn btn-primary"
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary))',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          เปิดตรวจ 🔍
                        </button>
                        <button
                          onClick={() => {
                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(c, null, 2));
                            const downloadAnchor = document.createElement('a');
                            downloadAnchor.setAttribute("href", dataStr);
                            downloadAnchor.setAttribute("download", `sentinel-case-${c.id}.json`);
                            document.body.appendChild(downloadAnchor);
                            downloadAnchor.click();
                            downloadAnchor.remove();
                          }}
                          className="btn"
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #27272a 0%, #000000 100%)',
                            color: '#ffffff',
                            fontWeight: 700,
                            border: '1px solid #3f3f46',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.45)';
                            e.currentTarget.style.background = 'linear-gradient(135deg, #3f3f46 0%, #18181b 100%)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                            e.currentTarget.style.background = 'linear-gradient(135deg, #27272a 0%, #000000 100%)';
                          }}
                        >
                          💾 Export JSON
                        </button>
                      </div>
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
