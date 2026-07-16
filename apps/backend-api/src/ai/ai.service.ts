import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CasesService } from '../cases/cases.service';

type ModelAssessment = {
  aiRiskScore: number;
  aiAnalysis: string;
  confidence: number;
  evidenceQuotes: string[];
  violationCategories: string[];
  recommendedAction: 'MONITOR' | 'REVIEW_REQUIRED' | 'AUTO_BLOCK';
};

/**
 * Service responsible for AI related operations.
 *
 * To connect a real AI API, set the following environment variables (see .env.example):
 *  - AI_PROVIDER = 'gemini' | 'openai' | 'anthropic'
 *  - GEMINI_API_KEY  (for Google Gemini)
 *  - OPENAI_API_KEY  (for OpenAI)
 *  - ANTHROPIC_API_KEY (for Anthropic Claude)
 *
 * In production, missing credentials or a provider failure returns 503. Rule-based
 * analysis is exposed only as a clearly labelled development fallback.
 */
@Injectable()
export class AiService {
  constructor(private readonly casesService: CasesService) {}

  /**
   * Evaluates a case using AI analysis and returns the updated case.
   * Builds baseline evidence (WHOIS, OCR, keyword and license signals), then requires
   * a successful external AI result in production.
   * @param caseId The case identifier.
   */
  async evaluateCase(caseId: string) {
    const provider = process.env.AI_PROVIDER;

    // Build deterministic evidence first; this is context for the external model,
    // not a result that production is allowed to present as real AI output.
    let analysisResult: any = await this.casesService.analyzeCase(caseId);
    const baselineRiskScore = Number(analysisResult.aiRiskScore) || 0;
    let aiCompleted = false;
    let aiSource: 'GEMINI' | 'OPENAI' | 'ANTHROPIC' | null = null;
    let aiModel: string | null = null;
    let aiFailureReason = provider ? `${provider} is not configured` : 'AI provider is not configured';

    if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
      const prompt = this.buildEvidencePrompt(analysisResult);
      const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
      const fallbackModel = process.env.GEMINI_FALLBACK_MODEL?.trim();
      const models = fallbackModel && primaryModel !== fallbackModel
        ? [primaryModel, fallbackModel]
        : [primaryModel];

      for (const [index, modelName] of models.entries()) {
        try {
          const parsed = await this.requestGeminiAnalysis(
            prompt,
            process.env.GEMINI_API_KEY.trim(),
            modelName,
            index === 0 ? 60000 : 30000,
          );
          const calibrated = this.calibrateAssessment(parsed, analysisResult, baselineRiskScore);
          const updatedCase = await this.casesService.updateAiAnalysis(
            caseId,
            calibrated.aiRiskScore,
            calibrated.aiAnalysis,
            {
              confidence: calibrated.confidence,
              evidenceQuotes: calibrated.evidenceQuotes,
              violationCategories: calibrated.violationCategories,
              aiSource: 'GEMINI',
              aiModelName: modelName,
            },
          );
          analysisResult = {
            ...analysisResult,
            aiRiskScore: updatedCase.aiRiskScore,
            aiAnalysis: updatedCase.aiAnalysis,
            modelAssessment: calibrated,
            enforcementDecision: this.rebuildEnforcementDecision(
              analysisResult.enforcementDecision,
              calibrated.aiRiskScore,
            ),
          };
          aiCompleted = true;
          aiSource = 'GEMINI';
          aiModel = modelName;
          console.log(`[AiService] Gemini analysis complete for case ${caseId} with ${modelName}. Risk Score: ${parsed.aiRiskScore}%`);
          break;
        } catch (error: any) {
          const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
          aiFailureReason = timedOut
            ? `${modelName} request timed out`
            : `${modelName} request failed${error?.message ? ` (${error.message})` : ''}`;
          console.error(`[AiService] ${aiFailureReason}:`, error);
        }
      }
    } else if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      try {
        const prompt = this.buildEvidencePrompt(analysisResult);
        const apiKey = process.env.OPENAI_API_KEY;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(18000),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [{
              role: 'user',
              content: `${prompt}\n\nPlease output valid JSON matches the schema. Do not output markdown codeblocks, just the JSON object.`
            }],
            response_format: { type: 'json_object' }
          })
        });

        if (response.ok) {
          const result = await response.json();
          const text = result?.choices?.[0]?.message?.content;
          if (text) {
            const parsed = this.parseModelAssessment(JSON.parse(text.trim()));
            const calibrated = this.calibrateAssessment(parsed, analysisResult, baselineRiskScore);
            const updatedCase = await this.casesService.updateAiAnalysis(caseId, calibrated.aiRiskScore, calibrated.aiAnalysis, {
              confidence: calibrated.confidence,
              evidenceQuotes: calibrated.evidenceQuotes,
              violationCategories: calibrated.violationCategories,
              aiSource: 'OPENAI',
              aiModelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            });
            analysisResult = {
              ...analysisResult,
              aiRiskScore: updatedCase.aiRiskScore,
              aiAnalysis: updatedCase.aiAnalysis,
              modelAssessment: calibrated,
              enforcementDecision: this.rebuildEnforcementDecision(
                analysisResult.enforcementDecision,
                calibrated.aiRiskScore,
              ),
            };
            aiCompleted = true;
            aiSource = 'OPENAI';
            aiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
            console.log(`[AiService] OpenAI analysis complete for case ${caseId}. Risk Score: ${calibrated.aiRiskScore}%`);
          }
        } else {
          const errText = await response.text();
          console.error(`[AiService] OpenAI API returned error status ${response.status}: ${errText}`);
        }
      } catch (error) {
        console.error('[AiService] Failed calling OpenAI API:', error);
      }
    } else if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      try {
        const prompt = this.buildEvidencePrompt(analysisResult);
        const apiKey = process.env.ANTHROPIC_API_KEY;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          signal: AbortSignal.timeout(18000),
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
            max_tokens: 1500,
            messages: [{
              role: 'user',
              content: `${prompt}\n\nPlease output valid JSON matches the schema. Do not output codeblocks, just the JSON string.`
            }]
          })
        });

        if (response.ok) {
          const result = await response.json();
          const text = result?.content?.[0]?.text;
          if (text) {
            const parsed = this.parseModelAssessment(JSON.parse(text.trim()));
            const calibrated = this.calibrateAssessment(parsed, analysisResult, baselineRiskScore);
            const updatedCase = await this.casesService.updateAiAnalysis(caseId, calibrated.aiRiskScore, calibrated.aiAnalysis, {
              confidence: calibrated.confidence,
              evidenceQuotes: calibrated.evidenceQuotes,
              violationCategories: calibrated.violationCategories,
              aiSource: 'ANTHROPIC',
              aiModelName: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
            });
            analysisResult = {
              ...analysisResult,
              aiRiskScore: updatedCase.aiRiskScore,
              aiAnalysis: updatedCase.aiAnalysis,
              modelAssessment: calibrated,
              enforcementDecision: this.rebuildEnforcementDecision(
                analysisResult.enforcementDecision,
                calibrated.aiRiskScore,
              ),
            };
            aiCompleted = true;
            aiSource = 'ANTHROPIC';
            aiModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
            console.log(`[AiService] Anthropic analysis complete for case ${caseId}. Risk Score: ${calibrated.aiRiskScore}%`);
          }
        } else {
          const errText = await response.text();
          console.error(`[AiService] Anthropic API returned error status ${response.status}: ${errText}`);
        }
      } catch (error) {
        console.error('[AiService] Failed calling Anthropic API:', error);
      }
    }

    if (!aiCompleted) {
      if (process.env.NODE_ENV === 'production') {
        await this.casesService.clearAiAnalysis(
          caseId,
          `External AI provider did not return a valid result (provider: ${provider || 'not configured'}; reason: ${aiFailureReason}).`,
        );
        throw new ServiceUnavailableException(
          'บริการ AI จริงไม่พร้อมใช้งานในขณะนี้ ระบบจะไม่แสดงผลวิเคราะห์จากกฎพื้นฐานแทน AI',
        );
      }

      return {
        ...analysisResult,
        analysisSource: 'RULE_BASED_FALLBACK',
        aiModel: null,
      };
    }

    return {
      ...analysisResult,
      analysisSource: aiSource,
      aiModel,
    };
  }

  private async requestGeminiAnalysis(
    prompt: string,
    apiKey: string,
    modelName: string,
    timeoutMs: number,
  ): Promise<ModelAssessment> {
    const isGemini3 = /^gemini-3(?:\.|-)/.test(modelName);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            thinkingConfig: isGemini3
              ? { thinkingLevel: 'minimal' }
              : { thinkingBudget: 0 },
            maxOutputTokens: 700,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                aiRiskScore: { type: 'NUMBER', description: 'Risk score from 0.0 to 100.0' },
                aiAnalysis: { type: 'STRING', description: 'Detailed analysis in Thai' },
                confidence: { type: 'NUMBER', description: 'Confidence from 0.0 to 1.0' },
                evidenceQuotes: {
                  type: 'ARRAY',
                  description: 'Up to 5 short exact quotes copied from the supplied evidence',
                  items: { type: 'STRING' },
                },
                violationCategories: {
                  type: 'ARRAY',
                  description: 'Detected violation categories supported by evidence',
                  items: { type: 'STRING' },
                },
                recommendedAction: {
                  type: 'STRING',
                  enum: ['MONITOR', 'REVIEW_REQUIRED', 'AUTO_BLOCK'],
                },
              },
              required: [
                'aiRiskScore',
                'aiAnalysis',
                'confidence',
                'evidenceQuotes',
                'violationCategories',
                'recommendedAction',
              ],
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned HTTP ${response.status}`);
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    return this.parseModelAssessment(JSON.parse(text.trim()));
  }

  private parseModelAssessment(parsed: any): ModelAssessment {
    if (
      typeof parsed.aiRiskScore !== 'number' ||
      typeof parsed.aiAnalysis !== 'string' ||
      typeof parsed.confidence !== 'number' ||
      !Array.isArray(parsed.evidenceQuotes) ||
      !Array.isArray(parsed.violationCategories) ||
      !['MONITOR', 'REVIEW_REQUIRED', 'AUTO_BLOCK'].includes(parsed.recommendedAction)
    ) {
      throw new Error('Gemini returned an invalid analysis schema');
    }

    return {
      aiRiskScore: Math.max(0, Math.min(100, parsed.aiRiskScore)),
      aiAnalysis: parsed.aiAnalysis,
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      evidenceQuotes: parsed.evidenceQuotes.filter((quote: unknown) => typeof quote === 'string').slice(0, 5),
      violationCategories: parsed.violationCategories
        .filter((category: unknown) => typeof category === 'string')
        .slice(0, 8),
      recommendedAction: parsed.recommendedAction,
    };
  }

  private calibrateAssessment(
    assessment: ModelAssessment,
    caseData: any,
    baselineRiskScore: number,
  ): ModelAssessment {
    const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
    const evidence = normalize(`${caseData.title || ''} ${caseData.evidenceText || ''}`);
    const verifiedQuotes = assessment.evidenceQuotes.filter((quote) => {
      const normalizedQuote = normalize(quote);
      return normalizedQuote.length >= 4 && evidence.includes(normalizedQuote);
    });
    const hasVerifiedEvidence = verifiedQuotes.length > 0;
    const modelWeight = hasVerifiedEvidence ? 0.68 : 0.42;
    let calibratedScore = Math.round(
      assessment.aiRiskScore * modelWeight + baselineRiskScore * (1 - modelWeight),
    );

    if (!hasVerifiedEvidence) calibratedScore = Math.min(calibratedScore, 79);
    if (assessment.confidence < 0.55) calibratedScore = Math.min(calibratedScore, 69);
    calibratedScore = Math.max(0, Math.min(100, calibratedScore));

    const verificationSummary = hasVerifiedEvidence
      ? `ยืนยันข้อความหลักฐานตรงกับหน้าเว็บ ${verifiedQuotes.length} จุด`
      : 'ไม่พบข้อความอ้างอิงที่ตรงกับหลักฐาน จึงจำกัดระดับความเสี่ยงไว้เพื่อป้องกันผลบวกลวง';

    return {
      ...assessment,
      aiRiskScore: calibratedScore,
      evidenceQuotes: verifiedQuotes,
      recommendedAction:
        calibratedScore >= 85 && hasVerifiedEvidence && assessment.confidence >= 0.7
          ? 'AUTO_BLOCK'
          : calibratedScore >= 50
            ? 'REVIEW_REQUIRED'
            : 'MONITOR',
      aiAnalysis: `${assessment.aiAnalysis}\n\nการตรวจสอบความน่าเชื่อถือ: ${verificationSummary} (AI confidence ${Math.round(assessment.confidence * 100)}%, rule baseline ${Math.round(baselineRiskScore)}%)`,
    };
  }

  private rebuildEnforcementDecision(decision: any, finalScore: number) {
    const reasons = Array.isArray(decision?.reasons) ? decision.reasons : [];
    const valueFor = (prefix: string) =>
      reasons.find((reason: string) => reason.startsWith(`${prefix}:`))?.split(':').slice(1).join(':');
    const legalSignals = Number(valueFor('legal_signals') || 0);
    const keywordSignals = Number(valueFor('keyword_signals') || 0);
    const hasRealOsint = valueFor('osint') === 'REAL';
    const licenseStatus = valueFor('license_status');
    const reportOnly = decision?.recommendedAction === 'REPORT_ONLY';
    const autoBlockEligible =
      !reportOnly &&
      finalScore >= 85 &&
      legalSignals >= 1 &&
      keywordSignals >= 1 &&
      hasRealOsint &&
      licenseStatus !== 'CHECK_OFFICIAL_SOURCE';

    return {
      ...decision,
      recommendedAction: reportOnly
        ? 'REPORT_ONLY'
        : autoBlockEligible
          ? 'AUTO_BLOCK'
          : finalScore >= 50 || legalSignals >= 1
            ? 'REVIEW_REQUIRED'
            : 'MONITOR',
      autoBlockEligible,
      confidence: autoBlockEligible ? 'HIGH' : finalScore >= 50 ? 'MEDIUM' : 'LOW',
      reasons: [...reasons.filter((reason: string) => !reason.startsWith('risk_score:')), `risk_score:${finalScore}`],
    };
  }

  private buildEvidencePrompt(caseData: any): string {
    const evidencePackage = {
      title: caseData.title || '',
      url: caseData.url || '',
      domain: caseData.domain || '',
      productType: caseData.productType || '',
      evidenceText: caseData.evidenceText || '',
      productLicenseNumber: caseData.productLicenseNumber || null,
      licenseStatus: caseData.licenseStatus || 'NOT_FOUND',
      claimSignals: caseData.claimSignals || [],
      matchingRules: caseData.matchingRules || [],
      deterministicRiskScore: Number(caseData.aiRiskScore) || 0,
      osintSourceType: caseData.whoisInfo?.sourceType || null,
    };

    return `You are a cautious Thai health-advertising risk analyst. Analyze only the supplied evidence package.

Accuracy and safety rules:
- Separate an advertiser's own claim from news reporting, criticism, warnings, menus, navigation, and quoted third-party text. News reporting about an illegal product is not itself an illegal advertisement.
- Never invent a claim, product, registration status, legal provision, or source. Absence of a license number is not proof of illegality.
- Every material finding must be supported by an exact short quote copied character-for-character from title or evidenceText. Put those quotes in evidenceQuotes. If no exact supporting quote exists, return an empty evidenceQuotes array, keep confidence low, and do not recommend AUTO_BLOCK.
- Use AUTO_BLOCK only for an explicit high-harm health-product advertising claim with direct quoted evidence and high confidence. Ambiguous context must be REVIEW_REQUIRED. Benign or irrelevant content must be MONITOR.
- confidence is a number from 0 to 1. aiRiskScore is 0 to 100.
- Write aiAnalysis in concise Thai (roughly 120-220 words) and explicitly state the evidence, uncertainty, and recommended next step. Do not present legal conclusions as final adjudication.
- violationCategories must contain only categories supported by exact evidence, such as disease-cure, rapid-weight-loss, absolute-safety, false-authority, or misleading-health-claim.

Return the structured fields required by the response schema and no additional prose.

EVIDENCE_PACKAGE:
${JSON.stringify(evidencePackage)}`;
  }

  private buildPrompt(caseData: any): string {
    return `คุณคือผู้เชี่ยวชาญด้านกฎหมายอาหารและยาและการคุ้มครองผู้บริโภคของไทย 
หน้าที่ของคุณคือประเมินความเสี่ยงและวิเคราะห์การโฆษณาที่ผิดกฎหมาย/อวดอ้างสรรพคุณเกินจริงจากข้อมูลคดีดังต่อไปนี้:

หัวข้อโฆษณา: "${caseData.title}"
รายละเอียดคดี/หลักฐาน: "${caseData.evidenceText || 'ไม่มีข้อมูลเพิ่มเติม'}"
ประเภทผลิตภัณฑ์: "${caseData.productType}"
เลขจดแจ้ง/เลขอย.: "${caseData.productLicenseNumber || 'ไม่ระบุ'}"
โดเมนเว็บไซต์: "${caseData.domain}"
สถานะการตรวจสอบเลขสารบบ (ผลจากการตรวจสอบเบื้องต้น): "${caseData.licenseStatus || 'NOT_FOUND'}"

ให้ทำการประเมินความเสี่ยงและตอบกลับในรูปแบบ JSON ตามคำแนะนำดังนี้:
1. ประเมินคะแนนความเสี่ยง (aiRiskScore) เป็นตัวเลขทศนิยมระหว่าง 0.0 ถึง 100.0 (เช่น 85.5) โดยพิจารณาตามเกณฑ์ความรุนแรง:
   - โฆษณาอวดอ้างรักษามะเร็ง, โรคร้ายแรง หรือยาอันตราย (ความเสี่ยงสูงมาก: 80 - 100)
   - โฆษณาคุมหิว, ลดน้ำหนักฮวบฮาบ, สลายไขมัน หรือโฆษณาเครื่องสำอางผิวขาวใสใน 3 วัน (ความเสี่ยงปานกลางถึงสูง: 50 - 80)
   - โฆษณาทั่วไปแต่ไม่มีเลข อย. หรือเลข อย. ไม่ถูกต้อง (ความเสี่ยงปานกลาง: 40 - 60)
   - โฆษณาที่ดูสมเหตุสมผลและมีเลขสารบบถูกต้อง (ความเสี่ยงต่ำ: 0 - 40)
2. เขียนบทวิเคราะห์ทางกฎหมาย (aiAnalysis) เป็นภาษาไทยอย่างละเอียด อธิบายว่าพบคำค้นหาหรือข้อความโฆษณาใดบ้างที่น่าจะเข้าข่ายโฆษณาเกินจริง ผิดกฎหมายฉบับใด (เช่น พ.ร.บ. อาหาร พ.ศ. 2522 มาตรา 40 มาตรา 41 หรือ พ.ร.บ. ยา มาตรา 113) และแนะนำว่าควรให้ผู้ตรวจการดำเนินการอย่างไร (เช่น บล็อกการเข้าถึง หรือตรวจสอบสถานประกอบการ)

การตอบกลับต้องเป็น JSON ที่ตรงตามโครงสร้างนี้อย่างเคร่งครัด ห้ามมีข้อความเกริ่นหรือโค้ดบล็อกใดๆ ทั้งสิ้น:
{
  "aiRiskScore": 85.5,
  "aiAnalysis": "คำวิเคราะห์เป็นภาษาไทยอย่างละเอียด..."
}`;
  }

  /**
   * AI Chat capability for the dashboard assistant.
   */
  async chat(message: string, history: any[] = []): Promise<{ reply: string }> {
    const provider = process.env.AI_PROVIDER;
    const systemPrompt = `คุณคือผู้ช่วยระบบอัจฉริยะ (AI Assistant) ของระบบ Sentinel ADS (ระบบบล็อกโฆษณาด้านสุขภาพที่ผิดกฎหมายของจังหวัดศรีสะเกษ)
หน้าที่ของคุณคือช่วยเหลือเจ้าหน้าที่ตรวจการ, นิติกร, ผู้ทบทวน และผู้บริหารในการตอบคำถามเกี่ยวกับ:
1. การระบุและตรวจจับโฆษณาผลิตภัณฑ์สุขภาพที่ผิดกฎหมาย (เช่น โอ้อวดสรรพคุณเกินจริง, ไม่มีเลข อย., แหล่งที่มาไม่ชัดเจน)
2. การตีความกฎหมายที่เกี่ยวข้อง (พ.ร.บ. อาหาร พ.ศ. 2522 มาตรา 40-41, พ.ร.บ. ยา, พ.ร.บ. เครื่องสำอาง)
3. การใช้งานระบบ Sentinel ADS เช่น การบริหารจัดการคดีความ การบล็อกโดเมนอัตโนมัติ การรายงานความเสี่ยง และการดูสถิติต่างๆ
4. แนะนำขั้นตอนในการตรวจสอบและการดำเนินคดีทางกฎหมาย

กรุณาตอบคำถามอย่างเป็นมิตร มีความเป็นมืออาชีพ และตอบเป็นภาษาไทยอย่างกระชับและสุภาพ`;

    if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
      try {
        const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
        const apiKey = process.env.GEMINI_API_KEY.trim();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

        const contents = history.map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.text }]
        }));
        contents.push({ role: 'user', parts: [{ text: message }] });

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents
          })
        });

        if (response.ok) {
          const result = await response.json();
          const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return { reply };
        } else {
          const errText = await response.text();
          console.error(`[AiService] Gemini Chat API returned error status ${response.status}: ${errText}`);
        }
      } catch (error) {
        console.error('[AiService] Gemini Chat API failed:', error);
      }
    } else if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        const messages = [{ role: 'system', content: systemPrompt }];
        history.forEach(h => {
          messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.text });
        });
        messages.push({ role: 'user', content: message });

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages
          })
        });

        if (response.ok) {
          const result = await response.json();
          const reply = result?.choices?.[0]?.message?.content;
          if (reply) return { reply };
        }
      } catch (error) {
        console.error('[AiService] OpenAI Chat API failed:', error);
      }
    } else if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      try {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        const messages = history.map(h => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.text
        }));
        messages.push({ role: 'user', content: message });

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
            max_tokens: 1000,
            system: systemPrompt,
            messages
          })
        });

        if (response.ok) {
          const result = await response.json();
          const reply = result?.content?.[0]?.text;
          if (reply) return { reply };
        }
      } catch (error) {
        console.error('[AiService] Anthropic Chat API failed:', error);
      }
    }

    if (process.env.NODE_ENV === 'production') {
      console.error('[AiService] Gemini chat is not configured or did not return a response.');
      throw new ServiceUnavailableException(
        'ผู้ช่วยอัจฉริยะยังไม่พร้อมใช้งาน กรุณาตรวจสอบการตั้งค่า Gemini ของระบบหลังบ้าน',
      );
    }

    // Local-development fallback only. Production must never present canned answers as AI output.
    const text = message.toLowerCase();
    let reply = '[DEV FALLBACK] ผมช่วยอธิบายการตรวจโฆษณา การจัดการคดี และการตั้งค่าความเสี่ยงได้ ลองพิมพ์ถามใหม่ได้เลยครับ';
    if (text.includes('ความเสี่ยง') || text.includes('risk')) {
      reply = '[DEV FALLBACK] ระบบประเมินจากเนื้อหาโฆษณา ประเภทผลิตภัณฑ์ เลข อย. แหล่งที่มา และสัญญาณทางกฎหมาย จากนั้นจัดระดับเป็นตรวจสอบโดยเจ้าหน้าที่ ตรวจจับอัตโนมัติ หรือปิดกั้นอัตโนมัติ';
    } else if (text.includes('คดี') || text.includes('ตรวจสอบ')) {
      reply = '[DEV FALLBACK] เริ่มจากหน้าคดี เลือกคดีที่มีคะแนนความเสี่ยงสูง ตรวจหลักฐานและแหล่งข้อมูลทางการ แล้วส่งต่อให้นิติกรยืนยันข้อกฎหมายก่อนดำเนินการ';
    } else if (text.includes('block') || text.includes('บล็อก')) {
      reply = '[DEV FALLBACK] การปิดกั้นอัตโนมัติใช้กับสัญญาณความเสี่ยงสูงที่ผ่านเงื่อนไขความมั่นใจและรายการยกเว้นเท่านั้น ควรเริ่มจากการตรวจจับอัตโนมัติเพื่อปรับเกณฑ์ให้เหมาะกับหน่วยงาน';
    } else if (text.includes('สวัสดี') || text.includes('hello') || text.includes('hi')) {
      reply = '[DEV FALLBACK] สวัสดีครับ ผมคือผู้ช่วยอัจฉริยะ Sentinel ADS ระบบเบื้องหลังออนไลน์ปกติและสามารถคุยกับผมได้แล้วครับ!';
    }
    return { reply };
  }
}
