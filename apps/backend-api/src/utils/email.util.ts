import * as nodemailer from 'nodemailer';

/**
 * Email utility with multi-provider support.
 *
 * Configuration via environment variables (see .env.example):
 *  - EMAIL_PROVIDER = 'ethereal' | 'smtp' | 'resend'
 *  - For 'smtp': SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
 *  - For 'resend': RESEND_API_KEY (uses SMTP relay api.resend.com)
 *  - EMAIL_FROM, EMAIL_TO
 */
export class EmailUtil {
  private transporter?: nodemailer.Transporter;
  private fromAddress: string;
  private toAddress: string;

  constructor() {
    this.fromAddress = process.env.EMAIL_FROM || 'no-reply@sentinelads.com';
    this.toAddress = process.env.EMAIL_TO || 'inspector@fda.go.th';

    const provider = process.env.EMAIL_PROVIDER || 'ethereal';

    if (provider === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: true,
        },
      });
      console.log(`[EmailUtil] Using SMTP provider: ${process.env.SMTP_HOST}`);
    } else if (provider === 'resend') {
      // Resend uses SMTP relay – set RESEND_API_KEY in env
      this.transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 587,
        secure: false,
        auth: {
          user: 'resend',
          pass: process.env.RESEND_API_KEY,
        },
        tls: {
          rejectUnauthorized: true,
        },
      });
      console.log('[EmailUtil] Using Resend provider');
    } else {
      // Default: Ethereal test account (auto-created for dev/testing)
      nodemailer.createTestAccount().then((account: any) => {
        this.transporter = nodemailer.createTransport({
          host: account.smtp.host,
          port: account.smtp.port,
          secure: account.smtp.secure,
          auth: {
            user: account.user,
            pass: account.pass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });
        console.log('[EmailUtil] Ethereal test account created. Preview emails at https://ethereal.email');
      }).catch((err: any) => {
        console.error('[EmailUtil] Failed to create test email account', err);
      });
    }
  }

  /**
   * Sends a risk-alert email to the FDA inspector.
   */
  async sendRiskAlert(params: {
    caseId: string;
    title: string;
    url: string;
    domain: string;
    riskScore: number;
    aiAnalysis: string;
  }) {
    const mailOptions = {
      from: this.fromAddress,
      to: this.toAddress,
      subject: `[Sentinel ADS] แจ้งเตือนความเสี่ยง – คดี ${params.caseId} (${params.riskScore}%)`,
      text: [
        `=== รายงานความเสี่ยงโฆษณาผิดกฎหมาย ===`,
        ``,
        `รหัสคดี : ${params.caseId}`,
        `ชื่อเรื่อง : ${params.title}`,
        `URL : ${params.url}`,
        `โดเมน : ${params.domain}`,
        `คะแนนความเสี่ยง : ${params.riskScore}%`,
        ``,
        `ผลการวิเคราะห์ AI :`,
        params.aiAnalysis,
        ``,
        `-- Sentinel ADS Shield ระบบเฝ้าระวังโฆษณาผิดกฎหมาย --`,
      ].join('\n'),
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#1e3a8a,#7c3aed);padding:20px;color:white;text-align:center">
            <h2 style="margin:0">🛡️ Sentinel ADS – แจ้งเตือนความเสี่ยง</h2>
          </div>
          <div style="padding:20px">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#64748b;width:120px">รหัสคดี</td><td style="font-weight:bold">${params.caseId}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">ชื่อเรื่อง</td><td>${params.title}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">URL</td><td><a href="${params.url}">${params.url}</a></td></tr>
              <tr><td style="padding:6px 0;color:#64748b">โดเมน</td><td>${params.domain}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">คะแนนความเสี่ยง</td><td><strong style="color:${params.riskScore >= 80 ? '#dc2626' : params.riskScore >= 50 ? '#d97706' : '#16a34a'}">${params.riskScore}%</strong></td></tr>
            </table>
            <hr style="margin:16px 0;border-color:#e2e8f0">
            <p style="color:#374151;font-size:13px;white-space:pre-line">${params.aiAnalysis}</p>
          </div>
          <div style="background:#f8fafc;padding:12px;text-align:center;font-size:12px;color:#94a3b8">
            Sentinel ADS Shield – ระบบเฝ้าระวังโฆษณาผิดกฎหมาย อย.
          </div>
        </div>
      `,
    };

    if (!this.transporter) {
      console.warn('[EmailUtil] Transporter not ready – skipping email send');
      return;
    }

    const info = await this.transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('[EmailUtil] Preview URL:', previewUrl);
    } else {
      console.log('[EmailUtil] Email sent:', info.messageId);
    }
    return info;
  }
}

