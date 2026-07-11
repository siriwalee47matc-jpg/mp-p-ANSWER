'use client';

import { FormEvent, useState } from 'react';
import { apiUrl } from '@/lib/api';

type ChatMessage = {
  role: 'assistant' | 'user';
  text: string;
};

const quickQuestions = [
  'ระบบประเมินความเสี่ยงอย่างไร',
  'ควรเริ่มตรวจสอบคดีจากตรงไหน',
  'โหมดปิดกั้นอัตโนมัติทำงานอย่างไร',
];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'สวัสดีครับ ผมคือผู้ช่วย Sentinel ADS มีอะไรให้ช่วยอธิบายไหมครับ' },
  ]);

  const sendMessage = async (event?: FormEvent, preset?: string) => {
    event?.preventDefault();
    const question = (preset || input).trim();
    if (!question || loading) return;

    const newMessages = [...messages, { role: 'user', text: question } as ChatMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(apiUrl('/ai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, history: messages }),
      });
      if (response.ok) {
        const data = await response.json();
        setMessages([...newMessages, { role: 'assistant', text: data.reply }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบหลังบ้าน' }]);
      }
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', text: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ AI หลังบ้านได้' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`chatbot${open ? ' chatbot--open' : ''}`}>
      {open && (
        <section className="chatbot__panel" aria-label="ผู้ช่วยอัจฉริยะ">
          <header className="chatbot__header">
            <div>
              <span className="chatbot__eyebrow">ผู้ช่วยระบบ</span>
              <h2>ผู้ช่วยอัจฉริยะ</h2>
            </div>
            <button className="chatbot__close" type="button" onClick={() => setOpen(false)} aria-label="ปิดผู้ช่วย">×</button>
          </header>
          <div className="chatbot__messages" aria-live="polite">
            {messages.map((message, index) => (
              <div className={`chatbot__message chatbot__message--${message.role}`} key={`${message.role}-${index}`}>
                {message.text}
              </div>
            ))}
            {loading && (
              <div className="chatbot__message chatbot__message--assistant chatbot__message--loading" style={{ opacity: 0.7 }}>
                กำลังคิด...
              </div>
            )}
          </div>
          <div className="chatbot__quick-actions">
            {quickQuestions.map((question) => (
              <button type="button" key={question} disabled={loading} onClick={() => sendMessage(undefined, question)}>{question}</button>
            ))}
          </div>
          <form className="chatbot__form" onSubmit={sendMessage}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={loading ? "กำลังประมวลผล..." : "พิมพ์คำถาม..."} disabled={loading} aria-label="พิมพ์คำถาม" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="ส่งคำถาม">ส่ง</button>
          </form>
        </section>
      )}
      <button className="chatbot__launcher" type="button" onClick={() => setOpen((current) => !current)} aria-label="เปิดผู้ช่วยอัจฉริยะ">
        <img src="/chatbot/assistant.png" alt="" />
        <span>ผู้ช่วยอัจฉริยะ</span>
      </button>
    </div>
  );
}
