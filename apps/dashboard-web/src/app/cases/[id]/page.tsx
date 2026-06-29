'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../../components/Header';
import { CaseStatus, ProductType, UserRole } from '@kp-ads/shared';

const renderPenaltyDetails = (section: string) => {
  let prison = 'ไม่มี';
  let fine = 'ปรับตามพระราชบัญญัติที่เกี่ยวข้อง';
  let penaltySection = '';
  let violationDetails = '';
  
  const secLower = section.toLowerCase();
  if (secLower.includes('มาตรา 40') && secLower.includes('อาหาร')) {
    violationDetails = 'โฆษณาคุณประโยชน์ คุณภาพ หรือสรรพคุณของอาหารอันเป็นเท็จหรือเป็นการหลอกลวงให้เกิดความหลงเชื่อโดยไม่สมควร';
    penaltySection = 'มาตรา 70 พ.ร.บ. อาหาร พ.ศ. 2522';
    prison = 'จำคุกไม่เกิน 3 ปี';
    fine = 'ปรับไม่เกิน 30,000 บาท';
  } else if (secLower.includes('มาตรา 41') && secLower.includes('อาหาร')) {
    violationDetails = 'โฆษณาคุณประโยชน์ คุณภาพ หรือสรรพคุณของอาหารเพื่อประโยชน์ในทางการค้าโดยไม่ได้รับอนุญาตจากผู้อนุญาต';
    penaltySection = 'มาตรา 71 พ.ร.บ. อาหาร พ.ศ. 2522';
    prison = 'ไม่มี';
    fine = 'ปรับไม่เกิน 5,000 บาท';
  } else if (secLower.includes('มาตรา 88') && secLower.includes('ยา') && !secLower.includes('ทวิ')) {
    violationDetails = 'โฆษณาขายยาโอ้อวดสรรพคุณยาหรือส่วนประกอบของยาว่าสามารถบำบัด บรรเทา รักษา หรือป้องกันโรคได้อย่างศักดิ์สิทธิ์หรือหายขาด หรือแสดงสรรพคุณเท็จเกินจริง';
    penaltySection = 'มาตรา 124 พ.ร.บ. ยา พ.ศ. 2510';
    prison = 'ไม่มี';
    fine = 'ปรับไม่เกิน 100,000 บาท';
  } else if (secLower.includes('มาตรา 88 ทวิ') || (secLower.includes('88') && secLower.includes('ทวิ') && secLower.includes('ยา'))) {
    violationDetails = 'โฆษณาขายยาโดยไม่ได้รับอนุมัติข้อความ เสียง หรือภาพที่ใช้ในการโฆษณาจากผู้อนุญาต';
    penaltySection = 'มาตรา 124 ทวิ พ.ร.บ. ยา พ.ศ. 2510';
    prison = 'ไม่มี';
    fine = 'ปรับไม่เกิน 100,000 บาท';
  } else if (secLower.includes('เครื่องสำอาง')) {
    violationDetails = 'โฆษณาเครื่องสำอางด้วยข้อความที่เป็นเท็จ เกินความจริง หรือก่อให้เกิดความเข้าใจผิดในสาระสำคัญเกี่ยวกับเครื่องสำอาง';
    penaltySection = 'มาตรา 84 พ.ร.บ. เครื่องสำอาง พ.ศ. 2558';
    prison = 'จำคุกไม่เกิน 1 ปี';
    fine = 'ปรับไม่เกิน 100,000 บาท';
  } else if (secLower.includes('มาตรา 56') || (secLower.includes('56') && secLower.includes('แพทย์'))) {
    violationDetails = 'ห้ามโฆษณาเครื่องมือแพทย์โดยแสดงสรรพคุณเท็จ เกินความจริง หรือก่อให้เกิดความเข้าใจผิดในสาระสำคัญเกี่ยวกับเครื่องมือแพทย์';
    penaltySection = 'มาตรา 106 พ.ร.บ. เครื่องมือแพทย์ พ.ศ. 2551';
    prison = 'จำคุกไม่เกิน 1 ปี';
    fine = 'ปรับไม่เกิน 100,000 บาท';
  } else if (secLower.includes('มาตรา 57') || (secLower.includes('57') && secLower.includes('แพทย์'))) {
    violationDetails = 'ห้ามโฆษณาเครื่องมือแพทย์โดยไม่ได้รับอนุญาตข้อความ เสียง หรือภาพที่ใช้ในการโฆษณาจากผู้อนุญาต';
    penaltySection = 'มาตรา 107 พ.ร.บ. เครื่องมือแพทย์ พ.ศ. 2551';
    prison = 'จำคุกไม่เกิน 6 เดือน';
    fine = 'ปรับไม่เกิน 50,000 บาท';
  } else if (secLower.includes('มาตรา 70') || (secLower.includes('70') && secLower.includes('สมุนไพร'))) {
    violationDetails = 'ห้ามโฆษณาผลิตภัณฑ์สมุนไพรในลักษณะโอ้อวดสรรพคุณว่าสามารถบำบัด บรรเทา รักษา หรือป้องกันโรคได้อย่างหายขาด หรือแสดงสรรพคุณเท็จเกินจริง';
    penaltySection = 'มาตรา 114 พ.ร.บ. ผลิตภัณฑ์สมุนไพร พ.ศ. 2562';
    prison = 'จำคุกไม่เกิน 1 ปี';
    fine = 'ปรับไม่เกิน 100,000 บาท';
  } else if (secLower.includes('มาตรา 71') || (secLower.includes('71') && secLower.includes('สมุนไพร'))) {
    violationDetails = 'ห้ามโฆษณาผลิตภัณฑ์สมุนไพรโดยไม่ได้รับอนุญาตข้อความ เสียง หรือภาพที่ใช้ในการโฆษณาจากผู้อนุญาต';
    penaltySection = 'มาตรา 115 พ.ร.บ. ผลิตภัณฑ์สมุนไพร พ.ศ. 2562';
    prison = 'จำคุกไม่เกิน 6 เดือน';
    fine = 'ปรับไม่เกิน 50,000 บาท';
  }

  return (
    <div style={{
      marginTop: '1rem',
      background: 'rgba(239, 68, 68, 0.02)',
      border: '1px dashed rgba(239, 68, 68, 0.25)',
      borderRadius: '10px',
      padding: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#b91c1c', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        <span>🚨 บทกำหนดโทษตามกฎหมาย ({penaltySection})</span>
      </div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.6rem', lineHeight: '1.4' }}>
        <strong>ฐานความผิด:</strong> {violationDetails || 'ฝ่าฝืนข้อบัญญัติการโฆษณาผลิตภัณฑ์สุขภาพ'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
        <div style={{ background: '#fff', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>โทษจำคุกสูงสุด:</span>
          <span style={{ fontWeight: 'bold', color: prison !== 'ไม่มี' ? '#b91c1c' : 'var(--text-main)' }}>
            {prison}
          </span>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>โทษปรับสูงสุด:</span>
          <span style={{ fontWeight: 'bold', color: '#b91c1c' }}>
            {fine}
          </span>
        </div>
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#7f1d1d', background: '#fef2f2', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', display: 'inline-block' }}>
        ⚠️ หมายเหตุ: ระวางโทษจำคุก หรือปรับ หรือทั้งจำทั้งปรับ
      </div>
    </div>
  );
};

const getConciseSuspiciousKeywords = (text: string) => {
  if (!text) return <span style={{ color: 'var(--text-muted)' }}>ไม่พบข้อความต้องสงสัย</span>;
  
  const keywords = [
    'คุมหิว', 'ลดน้ำหนัก', 'ลดความอ้วน', 'สลายไขมัน', 'ลด\\s*\\d+\\s*กิโล', 'ผอม',
    'รักษามะเร็ง', 'รักษาโรค', 'หายขาด', 'รักษาได้ทุกโรค', 'เบาหวาน', 'ความดัน',
    'หัวใจ', 'ไต', 'มะเร็ง', 'สูตรเร่งด่วน', 'ปลอดภัย\\s*100%', 'ไม่มีผลข้างเคียง',
    'ลดสัดส่วน', 'สลายไขมันเก่า', 'เห็นผลใน 3 วัน'
  ];

  // Split by spaces, newlines, or sentence structures
  const segments = text.split(/[\n|,\t;]|\s{2,}/);
  const matchedSegments: string[] = [];

  segments.forEach(segment => {
    const cleanSegment = segment.trim();
    if (!cleanSegment) return;
    
    const containsKeyword = keywords.some(kw => {
      const regex = new RegExp(kw, 'i');
      return regex.test(cleanSegment);
    });
    
    if (containsKeyword && !matchedSegments.includes(cleanSegment)) {
      matchedSegments.push(cleanSegment);
    }
  });

  if (matchedSegments.length === 0) {
    return <span style={{ color: 'var(--text-muted)' }}>ไม่พบข้อความต้องสงสัย</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {matchedSegments.map((sentence, idx) => {
        let highlighted = sentence
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

        keywords.forEach(kw => {
          const regex = new RegExp(`(${kw})`, 'gi');
          highlighted = highlighted.replace(regex, '<mark style="background-color: #fee2e2; color: #b91c1c; padding: 1px 3px; border-radius: 4px; font-weight: bold; border: 1px solid #fecaca;">$1</mark>');
        });

        return (
          <div key={idx} style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            color: '#7f1d1d',
            lineHeight: '1.5',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <span style={{ fontSize: '1rem', marginTop: '1px' }}>⚠️</span>
            <div dangerouslySetInnerHTML={{ __html: highlighted }} />
          </div>
        );
      })}
    </div>
  );
};

const parseAiAnalysis = (analysisText: string) => {
  if (!analysisText) return null;
  
  const lines = analysisText.split('\n');
  const data: { [key: string]: string } = {};
  
  lines.forEach(line => {
    const part = line.split(':');
    if (part.length >= 2) {
      const key = part[0].trim().toLowerCase();
      const value = part.slice(1).join(':').trim();
      data[key] = value;
    }
  });

  const translations: { [key: string]: { label: string; icon: string; valueColor?: string } } = {
    'ai risk assessment': { label: 'การประเมินความเสี่ยงของ AI', icon: '🚨', valueColor: '#b91c1c' },
    'detected claims': { label: 'การกล่าวอ้างที่ตรวจพบ', icon: '📢' },
    'product classification': { label: 'ประเภทกลุ่มผลิตภัณฑ์', icon: '📦' },
    'license verification': { label: 'การตรวจสอบใบอนุญาต อย.', icon: '🔑' },
    'image text ocr': { label: 'ข้อความดึงจากภาพ (OCR)', icon: '📷' },
    'osint status': { label: 'ความน่าเชื่อถือโดเมน (OSINT)', icon: '🌐' },
    'allowlist status': { label: 'สถานะบัญชีขาว (Allowlist)', icon: '⚪' },
    'enforcement recommendation': { label: 'ข้อเสนอแนะมาตรการบังคับใช้', icon: '⚡', valueColor: '#b91c1c' },
    'legal review': { label: 'มาตรากฎหมายที่แนะนำให้ตรวจสอบ', icon: '⚖️' }
  };

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.02) 0%, rgba(139, 92, 246, 0.05) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.2)',
      borderRadius: '16px',
      padding: '1.25rem',
      marginTop: '1.25rem',
      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.02)'
    }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
        📝 รายงานความเห็นข้อกฎหมาย AI:
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Object.entries(data).map(([key, value]) => {
          const trans = translations[key];
          if (!trans) return null;
          
          let displayValue = value;
          
          if (key === 'ai risk assessment') {
            displayValue = value.replace('HIGH', 'เสี่ยงสูง').replace('MEDIUM', 'เสี่ยงปานกลาง').replace('LOW', 'เสี่ยงต่ำ');
          } else if (key === 'enforcement recommendation') {
            displayValue = value.replace('AUTO_BLOCK', 'บล็อกอัตโนมัติ (Auto Block)').replace('REPORT_ONLY', 'รายงานอย่างเดียว').replace('NONE', 'ไม่มีมาตรการ');
          } else if (key === 'allowlist status') {
            displayValue = value === 'none' ? 'ไม่ได้อยู่ในบัญชีขาว (None)' : value;
          }
          
          return (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '0.5rem', fontSize: '0.85rem', borderBottom: '1px solid rgba(0,0,0,0.03)', paddingBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{trans.icon}</span> {trans.label}:
              </span>
              <span style={{ fontWeight: 700, color: trans.valueColor || 'var(--text-main)' }}>
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allLaws, setAllLaws] = useState<any[]>([]);
  const [selectedLawIds, setSelectedLawIds] = useState<number[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchDetails = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
      router.push('/');
      return;
    }
    
    const decodedUser = JSON.parse(userStr);
    setCurrentUser(decodedUser);

    try {
      // 1. Fetch Case Details
      const caseRes = await fetch(`http://localhost:3001/cases/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!caseRes.ok) throw new Error('ไม่สามารถดึงข้อมูลคดีได้');
      const caseData = await caseRes.json();
      setItem(caseData);
      
      // Preset selected laws based on what is already confirmed
      if (caseData.lawRulesConfirmed) {
        setSelectedLawIds(caseData.lawRulesConfirmed.map((l: any) => l.id));
      }

      // 2. Fetch Laws list
      const lawsRes = await fetch(`http://localhost:3001/laws`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (lawsRes.ok) {
        const lawsData = await lawsRes.json();
        setAllLaws(lawsData);
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดรายละเอียด');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleRunAI = async () => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:3001/cases/${id}/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('การรัน AI วิเคราะห์ข้อมูลเกิดความล้มเหลว');

      setSuccessMsg('⚡ ระบบ AI ตรวจจับพยานหลักฐานและวิเคราะห์ความเสี่ยงเรียบร้อยแล้ว!');
      
      // Refresh details
      await fetchDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmLaws = async () => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:3001/cases/${id}/confirm-laws`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lawRuleIds: selectedLawIds }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'ไม่สามารถบันทึกการยืนยันข้อกฎหมายได้');
      }

      setSuccessMsg('⚖️ ยืนยันข้อกฎหมายและส่งเรื่องเข้าสู่ขั้นการทบทวนสำเร็จ!');
      await fetchDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async (status: CaseStatus) => {
    if (status === CaseStatus.REJECTED && !rejectReason.trim()) {
      setError('กรุณากรอกเหตุผลที่ปฏิเสธยกเลิกคดี');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:3001/cases/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          rejectReason: status === CaseStatus.REJECTED ? rejectReason : undefined,
          // Include confirmed laws when approving
          lawRuleIds: selectedLawIds
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'ไม่สามารถดำเนินการเปลี่ยนสถานะได้');
      }

      setSuccessMsg(status === CaseStatus.APPROVED_BLOCKED 
        ? '🚫 อนุมัติการสั่งระงับโดเมนและเพิ่มเข้าบัญชีดำ Ad Shield สำเร็จ!' 
        : '❌ ยกเลิกและจำหน่ายข้อร้องเรียนออกแล้ว'
      );
      setRejectReason('');
      await fetchDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLawToggle = (lawId: number) => {
    if (selectedLawIds.includes(lawId)) {
      setSelectedLawIds(selectedLawIds.filter(lid => lid !== lawId));
    } else {
      setSelectedLawIds([...selectedLawIds, lawId]);
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case CaseStatus.PENDING: return 'แจ้งเบาะแสประชาชน (Pending)';
      case CaseStatus.UNDER_REVIEW: return 'อยู่ระหว่างตรวจสอบ (Review)';
      case CaseStatus.APPROVED_BLOCKED: return 'อนุมัติบล็อกแล้ว (Blocked)';
      default: return 'ยกเลิกคดี (Rejected)';
    }
  };

  const translateProductType = (type: string) => {
    switch (type) {
      case ProductType.FOOD: return 'อาหาร (Food)';
      case ProductType.DRUG: return 'ยา (Drug)';
      case ProductType.COSMETIC: return 'เครื่องสำอาง (Cosmetic)';
      case ProductType.HERBAL: return 'สมุนไพร (Herbal)';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div style={{ textAlign: 'center', padding: '6rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>กำลังโหลดรายละเอียดหลักฐานคดีความ...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div>
        <Header />
        <div className="container">
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2>ไม่พบรายละเอียดคดีหมายเลขนี้</h2>
            <button onClick={() => router.push('/cases')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>กลับหน้าแรก</button>
          </div>
        </div>
      </div>
    );
  }

  const whois = item?.whoisInfo ? (typeof item.whoisInfo === 'string' ? (() => {
    try { return JSON.parse(item.whoisInfo); } catch(e) { return null; }
  })() : item.whoisInfo) : null;

  // Calculate matched laws (confirmed + recommended)
  const confirmedLaws = item?.lawRulesConfirmed || [];
  const recommendedLaws = allLaws.filter(l => {
    if (confirmedLaws.some((cl: any) => cl.id === l.id)) return false;
    return item?.aiAnalysis && item.aiAnalysis.includes(l.section);
  });
  
  const matchedLaws = [
    ...confirmedLaws.map((l: any) => ({ ...l, isConfirmed: true })),
    ...recommendedLaws.map((l: any) => ({ ...l, isConfirmed: false }))
  ];

  return (
    <div>
      <Header />
      <main className="container" style={{ paddingBottom: '4rem' }}>
        {/* Breadcrumb & Navigation */}
        <div style={{ marginBottom: '1.5rem' }}>
          <a href="/cases" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>← กลับสู่หน้ารวมรายการคดี</a>
        </div>

        {/* Header Alert Notification */}
        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            color: 'var(--color-success)',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontWeight: 500
          }}>
            ✅ {successMsg}
          </div>
        )}
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

        {/* Case Info Header */}
        <div className="card" style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <div className="flex align-center gap-2" style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', color: 'var(--color-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                {item.id}
              </span>
              <span style={{
                fontSize: '0.75rem',
                background: item.reporterRole === 'INSPECTOR' ? 'rgba(139,92,246,0.15)' : 'rgba(6,182,212,0.15)',
                color: item.reporterRole === 'INSPECTOR' ? 'var(--color-primary)' : 'var(--color-secondary)',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontWeight: 600
              }}>
                {item.reporterRole === 'INSPECTOR' ? '👮 คดีส่งตรวจจากเจ้าหน้าที่' : '👥 เบาะแสประชาชนทั่วไป (Ad Shield)'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{item.title}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              โดเมน: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{item.domain}</span> |
              ลิงก์ต้นทาง: <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>{item.url}</a>
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontWeight: 700,
              background: item.status === CaseStatus.PENDING ? 'rgba(245, 158, 11, 0.15)' :
                          item.status === CaseStatus.UNDER_REVIEW ? 'rgba(59, 130, 246, 0.15)' :
                          item.status === CaseStatus.APPROVED_BLOCKED ? 'rgba(239, 68, 68, 0.15)' : 'rgba(156, 163, 175, 0.15)',
              color: item.status === CaseStatus.PENDING ? 'var(--color-warning)' :
                     item.status === CaseStatus.UNDER_REVIEW ? 'var(--color-info)' :
                     item.status === CaseStatus.APPROVED_BLOCKED ? 'var(--color-danger)' : 'var(--text-muted)',
              border: '1px solid rgba(255,255,255,0.05)',
              fontSize: '0.95rem'
            }}>
              {translateStatus(item.status)}
            </span>
          </div>
        </div>

        <div className="grid grid-2">
          {/* Left Side: Evidence & OSINT details */}
          <div className="flex flex-col gap-3">
            <div className="card card-glow-cyan">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                📂 พยานหลักฐานที่ตรวจพบ
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>ประเภทผลิตภัณฑ์:</span>
                <span style={{ fontWeight: 600 }}>{translateProductType(item.productType)}</span>

                <span style={{ color: 'var(--text-muted)' }}>เลขสารบบ อย. / ทะเบียนยา:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-secondary)' }}>
                  {item.productLicenseNumber || 'ไม่ได้ระบุ'}
                </span>
                
                <span style={{ color: 'var(--text-muted)' }}>วันเวลาที่แจ้งเข้าระบบ:</span>
                <span>{new Date(item.createdAt).toLocaleString('th-TH')}</span>
              </div>

              {item.evidenceText && (
                <div style={{
                  marginBottom: '0.5rem',
                  border: '1px solid #fca5a5',
                  borderRadius: '12px',
                  background: 'rgba(254, 242, 242, 0.3)',
                  padding: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', fontWeight: 'bold', color: '#b91c1c', fontSize: '0.95rem' }}>
                    <span>🚨 คำโฆษณาต้องสงสัยที่ตรวจพบ (Suspected Keywords):</span>
                  </div>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #fee2e2',
                    padding: '1.25rem',
                    borderRadius: '8px',
                  }}>
                    {getConciseSuspiciousKeywords(item.evidenceText)}
                  </div>
                  
                  <details style={{ marginTop: '1rem', borderTop: '1px solid #fee2e2', paddingTop: '0.75rem' }}>
                    <summary style={{ fontSize: '0.78rem', color: '#7f1d1d', cursor: 'pointer', fontWeight: 'bold', userSelect: 'none' }}>
                      🔎 ดูเนื้อหาโฆษณาฉบับเต็มทั้งหมด (View Full Text)
                    </summary>
                    <div style={{
                      marginTop: '0.5rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      padding: '1rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      lineHeight: '1.5',
                      color: 'var(--text-main)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '150px',
                      overflowY: 'auto'
                    }}>
                      {item.evidenceText}
                    </div>
                  </details>
                </div>
              )}
            </div>

            {whois && (
              <div className="card card-glow-cyan" style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  🛡️ ข้อมูลความมั่นคงผู้เผยแพร่ (OSINT Security Details)
                </h2>
                <div className="table-wrapper" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 'bold', background: 'rgba(0,0,0,0.02)', width: '35%', padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>ไอพีผู้ให้บริการ (IP Address)</td>
                        <td style={{ fontFamily: 'var(--font-mono)', padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>{whois.ipAddress || 'ไม่พบข้อมูล'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold', background: 'rgba(0,0,0,0.02)', padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>ISP Network</td>
                        <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>{whois.isp || 'ไม่พบข้อมูล'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold', background: 'rgba(0,0,0,0.02)', padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>เจ้าของจดทะเบียน (Registrant)</td>
                        <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>{whois.registrantName || 'ไม่พบข้อมูล'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold', background: 'rgba(0,0,0,0.02)', padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>วันจดทะเบียน (Creation Date)</td>
                        <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>{whois.creationDate || 'ไม่พบข้อมูล'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold', background: 'rgba(0,0,0,0.02)', padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>อีเมลติดต่อกลับ (Contact Email)</td>
                        <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>
                          {whois.contactEmail ? (
                            <a href={`mailto:${whois.contactEmail}`} style={{ textDecoration: 'underline' }}>{whois.contactEmail}</a>
                          ) : 'ไม่พบข้อมูล'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {whois.coordinates && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${whois.coordinates}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-secondary"
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        padding: '0.5rem 1rem', 
                        fontSize: '0.85rem',
                        textDecoration: 'none'
                      }}
                    >
                      📍 แผนที่ Google Maps (ระบุพิกัดนำทาง)
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side: AI Assistant & Screenshot portals */}
          <div className="flex flex-col gap-3">
            <div className="card card-glow-primary">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>⚡ ผลวิเคราะห์อัจฉริยะ (AI Agent)</h2>
                {!item.aiRiskScore && (
                  <button
                    onClick={handleRunAI}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '6px' }}
                  >
                    {actionLoading ? 'กำลังประมวลผล...' : '⚡ รัน AI วิเคราะห์ด่วน'}
                  </button>
                )}
              </div>

              {!item.aiRiskScore ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🤖</span>
                  <p style={{ fontSize: '0.9rem' }}>ยังไม่ได้รันการวิเคราะห์ความเสี่ยงและพยานหลักฐานเบื้องต้น</p>
                  <button
                    onClick={handleRunAI}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                  >
                    วิเคราะห์เลข อย. และโดเมนทันที
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Risk gauge */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>ประเมินระดับความเสี่ยงการละเมิดกฎหมาย:</span>
                      <span style={{
                        fontWeight: 700,
                        color: item.aiRiskScore >= 80 ? 'var(--color-danger)' :
                               item.aiRiskScore >= 50 ? 'var(--color-warning)' : 'var(--color-success)'
                      }}>
                        {item.aiRiskScore >= 80 ? 'ความเสี่ยงสูงมาก' :
                         item.aiRiskScore >= 50 ? 'ความเสี่ยงปานกลาง' : 'ความเสี่ยงต่ำ'} ({item.aiRiskScore}%)
                      </span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${item.aiRiskScore}%`,
                        height: '100%',
                        background: item.aiRiskScore >= 80 ? 'linear-gradient(90deg, var(--color-warning), var(--color-danger))' :
                                    item.aiRiskScore >= 50 ? 'linear-gradient(90deg, var(--color-secondary), var(--color-warning))' : 'linear-gradient(90deg, var(--color-secondary), var(--color-success))',
                        borderRadius: '9999px'
                      }}></div>
                    </div>
                  </div>

                  {/* Verification panels */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>ตรวจสอบใบอนุญาต อย.</div>
                      <div className="flex align-center gap-1">
                        <span style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: item.licenseStatus === 'VALID' ? 'var(--color-success)' : item.licenseStatus === 'INVALID' ? 'var(--color-danger)' : 'var(--color-warning)'
                        }}></span>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {item.licenseStatus === 'VALID' ? 'Verified valid' : item.licenseStatus === 'INVALID' ? 'Invalid or expired' : item.licenseStatus === 'CHECK_OFFICIAL_SOURCE' ? 'Check official source' : 'Not shown on page'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Cross-check with official FDA and OSINT sources</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>ผู้จดโดเมน (Registrant)</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        👤 {whois?.domainRdap?.registrant || whois?.domain || '???????????'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        จดผ่าน: {whois?.domainRdap?.registrar || whois?.domainRdap?.rdapServer || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* AI Diagnosis Details */}
                  {parseAiAnalysis(item.aiAnalysis)}
                </div>
              )}
            </div>

            {item.evidenceImage && (
              <div className="card card-glow-primary" style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  📸 ภาพหน้าจอหลักฐาน (Evidence Screenshot)
                </h2>
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '200px'
                }}>
                  <img
                    src={item.evidenceImage.startsWith('data:image') ? item.evidenceImage : `data:image/png;base64,${item.evidenceImage}`}
                    alt="พยานหลักฐาน"
                    style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Law Matching List Cards */}
        {matchedLaws.length > 0 && (
          <div className="card card-glow-warning" style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚖️ รายการกฎหมายและบทลงโทษที่เกี่ยวข้อง (Law Matching List)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {matchedLaws.map((l: any) => (
                <div key={l.id} className="law-rule-card" style={{ padding: '1.25rem', background: '#ffffff', border: '1px solid #fde68a', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-primary)' }}>
                        {l.section}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        background: l.isConfirmed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                        color: l.isConfirmed ? '#166534' : '#6b21a8',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        fontWeight: 'bold'
                      }}>
                        {l.isConfirmed ? '✅ ยืนยันพยานหลักฐานแล้ว' : '🤖 แนะนำโดย AI'}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 'bold', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {l.lawName}
                    </div>
                    
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: '1.45' }}>
                      {l.description}
                    </p>
                  </div>

                  {renderPenaltyDetails(l.section)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legal Officer Section: Confirm Violation Laws */}
        {(currentUser.role === UserRole.LEGAL_OFFICER || currentUser.role === UserRole.ADMIN) && item.status !== CaseStatus.APPROVED_BLOCKED && (
          <div className="card card-glow-warning" style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚖️ หน้าที่ของนิติกร (Confirm Law Rules)
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              ตรวจสอบเนื้อหาหลักฐานความเห็นของ AI ด้านบน จากนั้นเลือกยืนยันกฎหมายมาตราที่ผู้ลงโฆษณากระทำความผิดเพื่อนำประกอบคดี
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {allLaws.map((l) => (
                <label key={l.id} className="flex align-center gap-2" style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedLawIds.includes(l.id)}
                    onChange={() => handleLawToggle(l.id)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>{l.section} {l.lawName}</span> - 
                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{l.description}</span>
                    <span style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.7rem',
                      background: l.riskLevel === 'HIGH' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: l.riskLevel === 'HIGH' ? 'var(--color-danger)' : 'var(--color-warning)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      fontWeight: 600
                    }}>{l.riskLevel} RISK</span>
                  </div>
                </label>
              ))}
            </div>

            <button
              onClick={handleConfirmLaws}
              disabled={actionLoading || selectedLawIds.length === 0}
              className="btn btn-success"
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
            >
              {actionLoading ? 'กำลังบันทึก...' : '⚖️ ยืนยันมาตรากฎหมายประกอบคดีความ'}
            </button>
          </div>
        )}

        {/* Reviewer Section: Approve and Block Domain */}
        {(currentUser.role === UserRole.REVIEWER || currentUser.role === UserRole.ADMIN) && item.status !== CaseStatus.APPROVED_BLOCKED && (
          <div className="card card-glow-danger" style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🚫 การตัดสินใจอนุมัติ (Reviewer / Supervisor Decision)
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              สำหรับหัวหน้าผู้ตรวจทาน: ยืนยันข้อมูลพยานหลักฐานและข้อกฎหมายที่นิติกรเสนอ
              จากนั้นกดปุ่มเพื่ออนุมัติปิดกั้นหน้าโฆษณา (ส่งสัญญาณบล็อกโดเมนนี้ไปยังส่วนขยาย Ad Shield ของผู้บริโภค)
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>ข้อกฎหมายที่ถูกผูกประกอบคดีในปัจจุบัน:</h4>
              {item.lawRulesConfirmed && item.lawRulesConfirmed.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {item.lawRulesConfirmed.map((l: any) => (
                    <div key={l.id} style={{ fontSize: '0.85rem', color: 'var(--text-main)', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px', borderLeft: '3px solid var(--color-secondary)' }}>
                      <strong>{l.section} {l.lawName}</strong>: {l.description}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-warning)' }}>
                  ⚠️ นิติกรยังไม่ได้กดยืนยันข้อกฎหมายประกอบคดีความนี้ (แนะนำให้นิติกรกดยืนยันมาตรากฎหมายก่อนอนุมัติคดี)
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Reject interface */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label>ระบุเหตุผล หากพิจารณาไม่ฟ้องร้อง / ปฏิเสธคำร้องเรียน</label>
                  <input
                    type="text"
                    placeholder="ระบุสาเหตุ เช่น หลักฐานไม่ชัดเจน, ไม่พบข้อความละเมิดในหน้าเว็บ..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => handleStatusUpdate(CaseStatus.REJECTED)}
                  disabled={actionLoading}
                  className="btn btn-secondary"
                  style={{ height: '42px', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                >
                  ❌ ปฏิเสธและปิดคำร้อง
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  onClick={() => handleStatusUpdate(CaseStatus.APPROVED_BLOCKED)}
                  disabled={actionLoading}
                  className="btn btn-danger"
                  style={{ padding: '0.85rem 2rem', fontSize: '1rem', fontWeight: 700 }}
                >
                  {actionLoading ? 'กำลังทำรายการ...' : '🚫 อนุมัติสั่งปิดกั้นเว็บและบล็อกโดเมนนี้'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audit Logs Timeline */}
        <div className="card" style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            📜 ประวัติการตรวจสอบและการกระทำ (Audit Trail)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)', position: 'relative' }}>
            {item.auditLogs && item.auditLogs.map((log: any) => (
              <div key={log.id} style={{ position: 'relative' }}>
                {/* Timeline node dot */}
                <div style={{
                  position: 'absolute',
                  left: '-21px',
                  top: '4px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: log.action.includes('APPROVED') ? 'var(--color-danger)' :
                              log.action.includes('AI') ? 'var(--color-primary)' :
                              log.action.includes('CREATE') ? 'var(--color-secondary)' : 'var(--text-muted)'
                }}></div>
                
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  {new Date(log.createdAt).toLocaleString('th-TH')} | 
                  กระทำโดย: <strong style={{ color: 'var(--text-main)' }}>{log.user ? `${log.user.name} (${log.user.role})` : 'ระบบ / ผู้ใช้แจ้งเบาะแส'}</strong>
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-main)' }}>
                  [{log.action}] - {log.details}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
