import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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
    let analysisResult = await this.casesService.analyzeCase(caseId);
    let aiCompleted = false;
    let aiSource: 'GEMINI' | 'OPENAI' | 'ANTHROPIC' | null = null;
    let aiModel: string | null = null;

    if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
      try {
        const prompt = this.buildPrompt(analysisResult);
        const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
        const apiKey = process.env.GEMINI_API_KEY.trim();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          signal: AbortSignal.timeout(18000),
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
              aiCompleted = true;
              aiSource = 'GEMINI';
              aiModel = modelName;
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
            const parsed = JSON.parse(text.trim());
            if (typeof parsed.aiRiskScore === 'number' && parsed.aiAnalysis) {
              const updatedCase = await this.casesService.updateAiAnalysis(caseId, parsed.aiRiskScore, parsed.aiAnalysis);
              analysisResult = {
                ...analysisResult,
                aiRiskScore: updatedCase.aiRiskScore,
                aiAnalysis: updatedCase.aiAnalysis,
              };
              aiCompleted = true;
              aiSource = 'OPENAI';
              aiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
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
            const parsed = JSON.parse(text.trim());
            if (typeof parsed.aiRiskScore === 'number' && parsed.aiAnalysis) {
              const updatedCase = await this.casesService.updateAiAnalysis(caseId, parsed.aiRiskScore, parsed.aiAnalysis);
              analysisResult = {
                ...analysisResult,
                aiRiskScore: updatedCase.aiRiskScore,
                aiAnalysis: updatedCase.aiAnalysis,
              };
              aiCompleted = true;
              aiSource = 'ANTHROPIC';
              aiModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
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

    if (!aiCompleted) {
      if (process.env.NODE_ENV === 'production') {
        await this.casesService.clearAiAnalysis(
          caseId,
          `External AI provider did not return a valid result (provider: ${provider || 'not configured'}).`,
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
    let reply = 'ผมช่วยอธิบายการตรวจโฆษณา การจัดการคดี และการตั้งค่าความเสี่ยงได้ ลองพิมพ์ถามใหม่ได้เลยครับ';
    if (text.includes('ความเสี่ยง') || text.includes('risk')) {
      reply = 'ระบบประเมินจากเนื้อหาโฆษณา ประเภทผลิตภัณฑ์ เลข อย. แหล่งที่มา และสัญญาณทางกฎหมาย จากนั้นจัดระดับเป็นตรวจสอบโดยเจ้าหน้าที่ ตรวจจับอัตโนมัติ หรือปิดกั้นอัตโนมัติ';
    } else if (text.includes('คดี') || text.includes('ตรวจสอบ')) {
      reply = 'เริ่มจากหน้าคดี เลือกคดีที่มีคะแนนความเสี่ยงสูง ตรวจหลักฐานและแหล่งข้อมูลทางการ แล้วส่งต่อให้นิติกรยืนยันข้อกฎหมายก่อนดำเนินการ';
    } else if (text.includes('block') || text.includes('บล็อก')) {
      reply = 'การปิดกั้นอัตโนมัติใช้กับสัญญาณความเสี่ยงสูงที่ผ่านเงื่อนไขความมั่นใจและรายการยกเว้นเท่านั้น ควรเริ่มจากการตรวจจับอัตโนมัติเพื่อปรับเกณฑ์ให้เหมาะกับหน่วยงาน';
    } else if (text.includes('สวัสดี') || text.includes('hello') || text.includes('hi')) {
      reply = 'สวัสดีครับ ผมคือผู้ช่วยอัจฉริยะ Sentinel ADS ระบบเบื้องหลังออนไลน์ปกติและสามารถคุยกับผมได้แล้วครับ!';
    }
    return { reply };
  }
}

