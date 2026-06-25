import { Injectable } from '@nestjs/common';
import { ProductType } from '@kp-ads/shared';
import { createWorker } from 'tesseract.js';

type ClassificationResult = {
  productType: ProductType;
  confidence: number;
  reasons: string[];
  combinedText: string;
  imageText: string;
  claimSignals: string[];
};

const PRODUCT_PATTERNS: Array<{ productType: ProductType; keywords: string[] }> = [
  { productType: ProductType.DRUG, keywords: ['ยา', 'drug', 'capsule', 'tablet', 'antibiotic', 'medicine'] },
  { productType: ProductType.COSMETIC, keywords: ['cosmetic', 'ครีม', 'serum', 'whitening', 'skin care', 'skincare', 'beauty'] },
  { productType: ProductType.MEDICAL_DEVICE, keywords: ['medical device', 'เครื่องมือแพทย์', 'mask', 'test kit', 'monitor'] },
  { productType: ProductType.CLINIC, keywords: ['clinic', 'คลินิก', 'hospital', 'doctor', 'treatment center'] },
  { productType: ProductType.HERBAL, keywords: ['สมุนไพร', 'herbal', 'botanical', 'traditional herb'] },
  { productType: ProductType.FOOD, keywords: ['อาหาร', 'food', 'supplement', 'dietary', 'beverage', 'ชา', 'coffee'] },
];

const CLAIM_PATTERNS: Array<{ label: string; patterns: RegExp[] }> = [
  {
    label: 'weight-loss-fast',
    patterns: [/lose\s*\d+\s*(kg|kgs|kilo)/i, /weight\s*loss/i, /slim\s*fast/i, /ลด\s*\d+\s*กิโล/i, /คุมหิว/i],
  },
  {
    label: 'disease-cure',
    patterns: [/cure\s*(cancer|diabetes|kidney|stroke)/i, /treat\s*disease/i, /รักษา(มะเร็ง|เบาหวาน|ไต|โรค)/i, /หายขาด/i],
  },
  {
    label: 'fake-safety',
    patterns: [/100%\s*safe/i, /no\s*side\s*effects/i, /ปลอดภัย\s*100%/i, /ไม่มีผลข้างเคียง/i],
  },
  {
    label: 'fake-authority',
    patterns: [/fda\s*approved/i, /doctor\s*recommended/i, /ผ่านอย\./i, /แพทย์แนะนำ/i],
  },
  {
    label: 'urgency-scarcity',
    patterns: [/buy\s*now/i, /limited\s*time/i, /วันนี้เท่านั้น/i, /ด่วน/i, /โปรสุดท้าย/i],
  },
];

@Injectable()
export class ScanIntelligenceService {
  async analyzeInput(input: {
    title?: string;
    url?: string;
    evidenceText?: string;
    evidenceImage?: string | null;
    imageSignalsText?: string | null;
    productLicenseNumber?: string | null;
  }): Promise<ClassificationResult> {
    const imageText = await this.extractImageText(input.evidenceImage);
    const combinedText = [
      input.title || '',
      input.url || '',
      input.evidenceText || '',
      input.imageSignalsText || '',
      imageText,
      input.productLicenseNumber || '',
    ]
      .join(' \n ')
      .trim();

    const normalized = combinedText.toLowerCase();
    const scores = new Map<ProductType, number>();
    const reasons: string[] = [];

    for (const rule of PRODUCT_PATTERNS) {
      let score = 0;
      for (const keyword of rule.keywords) {
        if (normalized.includes(keyword.toLowerCase())) {
          score += 1;
          reasons.push(`${rule.productType}:${keyword}`);
        }
      }
      scores.set(rule.productType, score);
    }

    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const [topType, topScore] = ranked[0] || [ProductType.FOOD, 0];
    const [, secondScore] = ranked[1] || [ProductType.FOOD, 0];
    const confidence = topScore === 0 ? 0.35 : Math.min(0.95, 0.45 + topScore * 0.12 - secondScore * 0.04);
    const claimSignals = this.detectClaimSignals(combinedText);

    return {
      productType: topType,
      confidence,
      reasons,
      combinedText,
      imageText,
      claimSignals,
    };
  }

  detectClaimSignals(text: string) {
    return CLAIM_PATTERNS.filter((group) => group.patterns.some((pattern) => pattern.test(text))).map(
      (group) => group.label,
    );
  }

  private async extractImageText(evidenceImage?: string | null) {
    if (!evidenceImage || !evidenceImage.startsWith('data:image')) {
      return '';
    }

    const worker = await createWorker('eng+tha');
    try {
      const result = await worker.recognize(evidenceImage);
      return result.data.text?.trim() || '';
    } catch {
      return '';
    } finally {
      await worker.terminate();
    }
  }
}
