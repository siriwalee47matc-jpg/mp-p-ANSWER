'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { RiskLevel } from '@kp-ads/shared';

const RISK_LEVEL_OPTIONS = [
  {
    value: RiskLevel.MANUAL,
    label: 'Manual Check',
    icon: '🟢',
    desc: 'ระบบบันทึกเหตุการณ์เท่านั้น รอเจ้าหน้าที่ดำเนินการ (ไม่มีการสแกนอัตโนมัติ)',
    color: '#16a34a',
  },
  {
    value: RiskLevel.AUTO_DETECT,
    label: 'Auto Detect & Risk Report',
    icon: '🔵',
    desc: 'ระบบสแกนต่อเนื่องและส่งรายงานความเสี่ยงไปยังเจ้าหน้าที่อัตโนมัติ',
    color: '#2563eb',
  },
  {
    value: RiskLevel.AUTO_BLOCK,
    label: 'Auto Block & Protect',
    icon: '🔴',
    desc: 'ระบบปิดกั้นผู้ใช้/โดเมนที่มีความเสี่ยงสูง (≥80%) ทันที แล้วส่งรายงานสรุป',
    color: '#dc2626',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [currentLevel, setCurrentLevel] = useState<string>(RiskLevel.MANUAL);
  const [selectedLevel, setSelectedLevel] = useState<string>(RiskLevel.MANUAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userRole, setUserRole] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    setUserRole(localStorage.getItem('userRole') || '');
    try {
      const res = await fetch('http://localhost:3001/config/risk-level');
      if (!res.ok) throw new Error('ดึงค่าการตั้งค่าไม่ได้');
      const data = await res.json();
      setCurrentLevel(data.riskLevel);
      setSelectedLevel(data.riskLevel);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    if (selectedLevel === currentLevel) {
      setMessage({ type: 'error', text: 'ไม่มีการเปลี่ยนแปลงค่า' });
      return;
    }
    setSaving(true);
    setMessage(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3001/config/risk-level', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ riskLevel: selectedLevel }),
      });
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ อาจไม่มีสิทธิ์ดำเนินการ');
      setCurrentLevel(selectedLevel);
      setMessage({ type: 'success', text: `✅ อัปเดต Global Risk Level เป็น "${selectedLevel}" เรียบร้อยแล้ว!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const canEdit = userRole === 'ADMIN' || userRole === 'REVIEWER';

  return (
    <div>
      <Header />
      <main className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>⚙️ ตั้งค่าระบบ Global Risk Level</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            กำหนดระดับการจัดการความเสี่ยงส่วนกลางสำหรับระบบทั้งหมด (เฉพาะ Admin / Reviewer)
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>กำลังโหลด...</div>
        ) : (
          <div style={{ maxWidth: '700px' }}>
            {/* Current Status */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>ระดับปัจจุบัน (Active)</div>
              {RISK_LEVEL_OPTIONS.map((opt) =>
                opt.value === currentLevel ? (
                  <div key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>{opt.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: opt.color }}>{opt.label}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                    </div>
                  </div>
                ) : null
              )}
            </div>

            {/* Risk Level Selector */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>เลือกระดับใหม่</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {RISK_LEVEL_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: `2px solid ${selectedLevel === opt.value ? opt.color : 'var(--border-color)'}`,
                      background: selectedLevel === opt.value ? `${opt.color}10` : 'transparent',
                      cursor: canEdit ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      opacity: canEdit ? 1 : 0.6,
                    }}
                  >
                    <input
                      type="radio"
                      name="riskLevel"
                      value={opt.value}
                      checked={selectedLevel === opt.value}
                      onChange={() => canEdit && setSelectedLevel(opt.value)}
                      disabled={!canEdit}
                      style={{ marginTop: '3px', accentColor: opt.color }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: opt.color }}>
                        {opt.icon} {opt.label}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px' }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {!canEdit && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  color: '#dc2626',
                }}>
                  ⚠️ สิทธิ์เฉพาะ Admin หรือ Reviewer เท่านั้นที่สามารถเปลี่ยนแปลงค่านี้ได้
                </div>
              )}

              {message && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: message.type === 'success' ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${message.type === 'success' ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  color: message.type === 'success' ? '#16a34a' : '#dc2626',
                }}>
                  {message.text}
                </div>
              )}

              {canEdit && (
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving || selectedLevel === currentLevel}
                  style={{ marginTop: '1.25rem', width: '100%' }}
                >
                  {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกการตั้งค่า'}
                </button>
              )}
            </div>

            {/* Info Card */}
            <div className="card" style={{ padding: '1.25rem', background: 'rgba(30,58,138,0.04)', border: '1px solid rgba(30,58,138,0.15)' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#1e3a8a' }}>📘 คำอธิบายระดับความเสี่ยง</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>ระดับ</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>การทำงาน</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>เหมาะสำหรับ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 700, color: '#16a34a' }}>🟢 Manual</td>
                    <td style={{ padding: '8px' }}>Log เท่านั้น รอเจ้าหน้าที่</td>
                    <td style={{ padding: '8px', color: 'var(--text-muted)' }}>สภาวะปกติ / ทดสอบ</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 700, color: '#2563eb' }}>🔵 Auto Detect</td>
                    <td style={{ padding: '8px' }}>สแกน + แจ้งเตือน Email</td>
                    <td style={{ padding: '8px', color: 'var(--text-muted)' }}>การทำงานประจำวัน</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 700, color: '#dc2626' }}>🔴 Auto Block</td>
                    <td style={{ padding: '8px' }}>ปิดกั้น + แจ้งเตือนทันที</td>
                    <td style={{ padding: '8px', color: 'var(--text-muted)' }}>ช่วงรณรงค์เร่งด่วน</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
