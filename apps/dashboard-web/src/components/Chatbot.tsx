'use client';

import { FormEvent, useState } from 'react';

type ChatMessage = {
  role: 'assistant' | 'user';
  text: string;
};

const quickQuestions = [
  'ระบบประเมินความเสี่ยงอย่างไร',
  'ควรเริ่มตรวจสอบคดีจากตรงไหน',
  'โหมดปิดกั้นอัตโนมัติทำงานอย่างไร',
];

function answerQuestion(question: string) {
  const text = question.toLowerCase();
  if (text.includes('ความเสี่ยง') || text.includes('risk')) {
    return 'ระบบประเมินจากเนื้อหาโฆษณา ประเภทผลิตภัณฑ์ เลข อย. แหล่งที่มา และสัญญาณทางกฎหมาย จากนั้นจัดระดับเป็นตรวจสอบโดยเจ้าหน้าที่ ตรวจจับอัตโนมัติ หรือปิดกั้นอัตโนมัติ';
  }
  if (text.includes('คดี') || text.includes('ตรวจสอบ')) {
    return 'เริ่มจากหน้าคดี เลือกคดีที่มีคะแนนความเสี่ยงสูง ตรวจหลักฐานและแหล่งข้อมูลทางการ แล้วส่งต่อให้นิติกรยืนยันข้อกฎหมายก่อนดำเนินการ';
  }
  if (text.includes('block') || text.includes('บล็อก')) {
    return 'การปิดกั้นอัตโนมัติใช้กับสัญญาณความเสี่ยงสูงที่ผ่านเงื่อนไขความมั่นใจและรายการยกเว้นเท่านั้น ควรเริ่มจากการตรวจจับอัตโนมัติเพื่อปรับเกณฑ์ให้เหมาะกับหน่วยงาน';
  }
  return 'ผมช่วยอธิบายการตรวจโฆษณา การจัดการคดี และการตั้งค่าความเสี่ยงได้ ลองเลือกคำถามด้านบนหรือพิมพ์คำถามของคุณได้เลย';
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'สวัสดีครับ ผมคือผู้ช่วย Sentinel ADS มีอะไรให้ช่วยอธิบายไหมครับ' },
  ]);

  const sendMessage = (event?: FormEvent, preset?: string) => {
    event?.preventDefault();
    const question = (preset || input).trim();
    if (!question) return;
    setMessages((current) => [
      ...current,
      { role: 'user', text: question },
      { role: 'assistant', text: answerQuestion(question) },
    ]);
    setInput('');
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
          </div>
          <div className="chatbot__quick-actions">
            {quickQuestions.map((question) => (
              <button type="button" key={question} onClick={() => sendMessage(undefined, question)}>{question}</button>
            ))}
          </div>
          <form className="chatbot__form" onSubmit={sendMessage}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="พิมพ์คำถาม..." aria-label="พิมพ์คำถาม" />
            <button type="submit" aria-label="ส่งคำถาม">ส่ง</button>
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
