import { Injectable } from '@nestjs/common';
import { CasesService } from '../cases/cases.service';

/**
 * Service responsible for AI related operations.
 *
 * To connect a real AI API, set the following environment variables (see .env.example):
 *  - AI_PROVIDER = 'gemini' | 'openai' | 'anthropic'
 *  - GEMINI_API_KEY  (for Google Gemini)
 *  - OPENAI_API_KEY  (for OpenAI)
 *  - ANTHROPIC_API_KEY (for Anthropic Claude)
 *
 * When no API key is configured, the service falls back to the built-in mock analysis
 * in CasesService.analyzeCase() which uses keyword matching + license checks.
 */
@Injectable()
export class AiService {
  constructor(private readonly casesService: CasesService) {}

  /**
   * Evaluates a case using AI analysis and returns the updated case.
   * Runs baseline mock checks (WHOIS and license validation), then overlays real AI analysis if keys are configured.
   * @param caseId The case identifier.
   */
  async evaluateCase(caseId: string) {
    const provider = process.env.AI_PROVIDER;

    // Run baseline mock analysis first
    let analysisResult = await this.casesService.analyzeCase(caseId);

    if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
      try {
        const prompt = this.buildPrompt(analysisResult);
        const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  aiRiskScore: { type: 'NUMBER', description: 'Risk score from 0.0 to 100.0' },
                  aiAnalysis: { type: 'STRING', description: 'Detailed analysis in Thai' }
                },
                required: ['aiRiskScore', 'aiAnalysis']
              }
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text.trim());
            if (typeof parsed.aiRiskScore === 'number' && parsed.aiAnalysis) {
              const updatedCase = await this.casesService.updateAiAnalysis(caseId, parsed.aiRiskScore, parsed.aiAnalysis);
              analysisResult = {
                ...analysisResult,
                aiRiskScore: updatedCase.aiRiskScore,
                aiAnalysis: updatedCase.aiAnalysis,
              };
              console.log(`[AiService] Gemini analysis complete for case ${caseId}. Risk Score: ${parsed.aiRiskScore}%`);
            }
          }
        } else {
          const errText = await response.text();
          console.error(`[AiService] Gemini API returned error status ${response.status}: ${errText}`);
        }
      } catch (error) {
        console.error('[AiService] Failed calling Gemini API:', error);
      }
    } else if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      try {
        const prompt = this.buildPrompt(analysisResult);
        const apiKey = process.env.OPENAI_API_KEY;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
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
            const parsed = JSON.parse(text.trim());
            if (typeof parsed.aiRiskScore === 'number' && parsed.aiAnalysis) {
              const updatedCase = await this.casesService.updateAiAnalysis(caseId, parsed.aiRiskScore, parsed.aiAnalysis);
              analysisResult = {
                ...analysisResult,
                aiRiskScore: updatedCase.aiRiskScore,
                aiAnalysis: updatedCase.aiAnalysis,
              };
              console.log(`[AiService] OpenAI analysis complete for case ${caseId}. Risk Score: ${parsed.aiRiskScore}%`);
            }
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
        const prompt = this.buildPrompt(analysisResult);
        const apiKey = process.env.ANTHROPIC_API_KEY;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
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
            const parsed = JSON.parse(text.trim());
            if (typeof parsed.aiRiskScore === 'number' && parsed.aiAnalysis) {
              const updatedCase = await this.casesService.updateAiAnalysis(caseId, parsed.aiRiskScore, parsed.aiAnalysis);
              analysisResult = {
                ...analysisResult,
                aiRiskScore: updatedCase.aiRiskScore,
                aiAnalysis: updatedCase.aiAnalysis,
              };
              console.log(`[AiService] Anthropic analysis complete for case ${caseId}. Risk Score: ${parsed.aiRiskScore}%`);
            }
          }
        } else {
          const errText = await response.text();
          console.error(`[AiService] Anthropic API returned error status ${response.status}: ${errText}`);
        }
      } catch (error) {
        console.error('[AiService] Failed calling Anthropic API:', error);
      }
    }

    return analysisResult;
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
}

