'use client';

import { useState } from 'react';
import { apiUrl } from '../lib/api';

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const reset = () => {
    setRating(0);
    setHover(0);
    setComment('');
    setState('idle');
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(reset, 400);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setState('sending');
    try {
      const res = await fetch(apiUrl('/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment || undefined }),
      });
      if (!res.ok) throw new Error('failed');
      setState('done');
      setTimeout(handleClose, 2200);
    } catch {
      setState('error');
    }
  };

  const starLabel = ['', 'แย่มาก', 'พอใช้', 'ปานกลาง', 'ดี', 'ดีเยี่ยม'];
  const displayRating = hover || rating;

  return (
    <>
      {/* FAB trigger */}
      <button
        id="feedback-fab"
        className="feedback-fab"
        onClick={() => setOpen(true)}
        aria-label="ประเมินความพึงพอใจ"
        title="ประเมินความพึงพอใจ"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span>ความพึงพอใจ</span>
      </button>

      {/* Modal backdrop */}
      {open && (
        <div className="feedback-backdrop" onClick={handleClose}>
          <div
            className={`feedback-modal ${open ? 'open' : ''}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="แบบประเมินความพึงพอใจ"
          >
            {state === 'done' ? (
              <div className="feedback-modal__done">
                <div className="feedback-modal__done-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <p className="feedback-modal__done-title">ขอบคุณสำหรับความคิดเห็น!</p>
                <p className="feedback-modal__done-sub">ข้อมูลของคุณจะช่วยพัฒนาระบบให้ดียิ่งขึ้น</p>
              </div>
            ) : (
              <>
                <div className="feedback-modal__header">
                  <div className="feedback-modal__icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="feedback-modal__title">ประเมินความพึงพอใจ</div>
                    <div className="feedback-modal__subtitle">คุณพึงพอใจกับ SENTINEL ADS มากน้อยแค่ไหน?</div>
                  </div>
                  <button className="feedback-modal__close" onClick={handleClose} aria-label="ปิด">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="feedback-modal__body">
                  {/* Stars */}
                  <div className="feedback-stars" role="radiogroup" aria-label="คะแนนความพึงพอใจ">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        className={`feedback-star ${n <= displayRating ? 'active' : ''}`}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(n)}
                        aria-label={`${n} ดาว – ${starLabel[n]}`}
                        role="radio"
                        aria-checked={rating === n}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    ))}
                  </div>

                  {displayRating > 0 && (
                    <div className="feedback-star-label">{starLabel[displayRating]}</div>
                  )}

                  {/* Comment */}
                  <div className="feedback-comment-wrap">
                    <label htmlFor="feedback-comment" className="feedback-comment-label">
                      ความคิดเห็นเพิ่มเติม (ไม่บังคับ)
                    </label>
                    <textarea
                      id="feedback-comment"
                      className="feedback-comment"
                      placeholder="บอกเราว่าอยากให้ปรับปรุงอะไรบ้าง..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      maxLength={500}
                      rows={3}
                    />
                    <div className="feedback-char-count">{comment.length}/500</div>
                  </div>

                  {state === 'error' && (
                    <div className="feedback-error">เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง</div>
                  )}

                  <button
                    id="feedback-submit"
                    className="btn btn-primary feedback-submit"
                    onClick={handleSubmit}
                    disabled={rating === 0 || state === 'sending'}
                  >
                    {state === 'sending' ? (
                      <>
                        <span className="spinner" />
                        กำลังส่ง...
                      </>
                    ) : (
                      'ส่งความคิดเห็น'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
