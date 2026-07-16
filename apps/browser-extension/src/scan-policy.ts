export type AllowlistEntry = {
  domain: string;
  listType: 'TRUSTED_OFFICIAL' | 'MARKETPLACE' | 'PLATFORM';
  action: 'SKIP_SCAN' | 'REPORT_ONLY' | 'NO_AUTO_BLOCK';
  reason: string;
};

const HEALTH_CONTEXT_PATTERNS: RegExp[] = [
  /ยา|อาหารเสริม|สมุนไพร|ผลิตภัณฑ์สุขภาพ|เครื่องมือแพทย์|คลินิก|รักษาโรค|ลดน้ำหนัก|คุมหิว|ผอม|ครีม|เซรั่ม|อย\.|เลขสารบบ/i,
  /drug|medicine|supplement|herbal|medical device|clinic|weight loss|slimming|skincare|cosmetic|fda/i,
];

const EDITORIAL_CONTEXT_PATTERNS: RegExp[] = [
  /ข่าว|บทความ|รายงานข่าว|ผู้สื่อข่าว|ตำรวจ|จับกุม|ดำเนินคดี|เตือนภัย|อย\.\s*เตือน/i,
  /news|reporter|investigation|police|arrested|public warning|fact.?check/i,
];

const COMMERCE_INTENT_PATTERNS: RegExp[] = [
  /สั่งซื้อ|ซื้อเลย|ราคา\s*\d|โปรโมชั่น|แอดไลน์|ไลน์\s*@|อินบ็อกซ์|โทร\.?\s*\d|เก็บเงินปลายทาง/i,
  /buy\s*now|add\s*to\s*cart|order\s*now|price\s*[:฿$]|shop\s*now|contact\s*us/i,
];

const CLAIM_GROUPS: Array<{ id: string; label: string; weight: number; patterns: RegExp[] }> = [
  {
    id: 'disease-cure',
    label: 'อ้างรักษาโรคหรือหายขาด',
    weight: 88,
    patterns: [/รักษา.{0,20}(มะเร็ง|เบาหวาน|ไต|อัมพาต|โรค)/i, /หายขาด|รักษาได้ทุกโรค/i, /cure.{0,20}(cancer|diabetes|disease)/i],
  },
  {
    id: 'rapid-weight-loss',
    label: 'อ้างลดน้ำหนักหรือเห็นผลรวดเร็ว',
    weight: 74,
    patterns: [/ลด.{0,12}\d+\s*(กิโล|kg)/i, /ผอม.{0,12}(วัน|เร็ว|ทันใจ)/i, /คุมหิว|สลายไขมัน/i, /weight\s*loss|slim\s*fast/i],
  },
  {
    id: 'absolute-safety',
    label: 'อ้างปลอดภัยแน่นอนหรือไม่มีผลข้างเคียง',
    weight: 68,
    patterns: [/ปลอดภัย\s*100\s*%|ไม่มีผลข้างเคียง|ธรรมชาติ\s*100\s*%/i, /100\s*%\s*safe|no\s*side\s*effects/i],
  },
  {
    id: 'authority-claim',
    label: 'อ้างการรับรองจาก อย. หรือผู้เชี่ยวชาญ',
    weight: 62,
    patterns: [/ผ่าน\s*อย\.|อย\.\s*รับรอง|แพทย์แนะนำ|หมอแนะนำ/i, /fda\s*approved|doctor\s*recommended/i],
  },
  {
    id: 'urgency-scarcity',
    label: 'เร่งรัดหรือสร้างความขาดแคลน',
    weight: 12,
    patterns: [/วันนี้เท่านั้น|ด่วน|จำนวนจำกัด|โปรสุดท้าย/i, /buy\s*now|limited\s*time/i],
  },
];

export function analyzeLocalPageSignals(text: string) {
  const normalized = text.replace(/\s+/g, ' ').slice(0, 12000);
  const healthContextCount = HEALTH_CONTEXT_PATTERNS.reduce(
    (count, pattern) => count + (pattern.test(normalized) ? 1 : 0),
    0,
  );
  const matchedGroups = CLAIM_GROUPS.filter((group) => group.patterns.some((pattern) => pattern.test(normalized)));
  const editorialSignals = EDITORIAL_CONTEXT_PATTERNS.filter((pattern) => pattern.test(normalized)).length;
  const commerceSignals = COMMERCE_INTENT_PATTERNS.filter((pattern) => pattern.test(normalized)).length;
  const editorialOnly = editorialSignals > 0 && commerceSignals === 0;
  const primaryRisk = matchedGroups.reduce((highest, group) => Math.max(highest, group.weight), 0);
  const supportingSignals = Math.max(0, matchedGroups.length - 1) * 4;
  const localRiskScore = Math.min(96, primaryRisk + supportingSignals);

  return {
    shouldAnalyze:
      !editorialOnly && healthContextCount > 0 && (matchedGroups.length > 0 || healthContextCount >= 2),
    shouldWarn: !editorialOnly && matchedGroups.some((group) => group.id !== 'urgency-scarcity'),
    localRiskScore,
    contentContext: commerceSignals > 0 ? 'COMMERCIAL' : editorialSignals > 0 ? 'EDITORIAL' : 'UNCERTAIN',
    claimSignals: matchedGroups.map((group) => group.id),
    matchedClaims: matchedGroups.map((group) => group.label),
  };
}

export function buildScanDecision(aiResult: any, riskLevel: string, allowlistEntry: AllowlistEntry | null) {
  const score = Number(aiResult.aiRiskScore) || 0;
  const decision = aiResult.enforcementDecision || {};
  const matchedRuleSignals = Array.isArray(aiResult.matchingRules) ? aiResult.matchingRules.length : 0;
  const evidenceBackedCategories = Array.isArray(aiResult.modelAssessment?.violationCategories)
    ? aiResult.modelAssessment.violationCategories.length
    : 0;
  const legalSignals = Math.max(matchedRuleSignals, evidenceBackedCategories);
  const hasOfficialLicenseReference = aiResult.licenseStatus === 'CHECK_OFFICIAL_SOURCE';
  const hasRealOsint = aiResult.whoisInfo?.sourceType === 'REAL_OSINT';
  const hasRealAi = ['GEMINI', 'OPENAI', 'ANTHROPIC'].includes(aiResult.analysisSource);
  const allowlistAction = allowlistEntry?.action || null;
  const reportOnly = allowlistAction === 'REPORT_ONLY' || allowlistAction === 'NO_AUTO_BLOCK';
  const skipScan = allowlistAction === 'SKIP_SCAN';
  const canProtectLocally =
    !skipScan &&
    !reportOnly &&
    riskLevel === 'AUTO_BLOCK' &&
    score >= 80 &&
    hasRealAi &&
    legalSignals >= 1 &&
    decision.recommendedAction !== 'MONITOR';
  const canRegisterServerBlock =
    canProtectLocally &&
    score >= 85 &&
    !hasOfficialLicenseReference &&
    hasRealOsint &&
    decision.autoBlockEligible === true;

  return {
    notify: score >= 50 && hasRealAi,
    protectiveBlockEligible: canProtectLocally,
    serverBlockEligible: canRegisterServerBlock,
    score,
    legalSignals,
    recommendedAction: skipScan ? 'SKIP_SCAN' : reportOnly ? 'REPORT_ONLY' : decision.recommendedAction || 'REVIEW_REQUIRED',
  };
}
