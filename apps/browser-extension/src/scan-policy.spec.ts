import { describe, it, expect } from 'vitest';
import { analyzeLocalPageSignals } from './scan-policy';

describe('scan-policy', () => {
  it('should detect food disease claims', () => {
    const text = 'อาหารเสริมรักษามะเร็ง และลดน้ำหนักได้ 10 กิโล';
    const result = analyzeLocalPageSignals(text);
    expect(result.shouldWarn).toBe(true);
    expect(result.matchedClaims).toContain('อ้างรักษาโรคหรือหายขาด');
    expect(result.matchedClaims).toContain('อ้างลดน้ำหนักหรือเห็นผลรวดเร็ว');
  });

  it('should detect cosmetic illegal claims', () => {
    const text = 'ครีมบำรุงผิวขาวถาวร เห็นผลใน 3 วัน แก้ฝ้ากระหายขาด';
    const result = analyzeLocalPageSignals(text);
    expect(result.shouldWarn).toBe(true);
    expect(result.matchedClaims).toContain('อ้างรักษาโรคหรือหายขาด');
  });

  it('should ignore editorial or safe contexts', () => {
    const text = 'บทความนี้พูดถึงการป้องกันโรคเบาหวานด้วยการออกกำลังกาย';
    const result = analyzeLocalPageSignals(text);
    // Since it's an editorial context without commerce signals, matchedClaims might be empty
    expect(result.matchedClaims.length).toBe(0);
  });
});
