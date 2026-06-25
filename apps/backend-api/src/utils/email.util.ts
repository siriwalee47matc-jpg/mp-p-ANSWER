import * as nodemailer from 'nodemailer';

/**
 * Simple email utility using Nodemailer.
 * In a real deployment replace the transport configuration with your SMTP server.
 */
export class EmailUtil {
  private transporter?: nodemailer.Transporter;

  constructor() {
    // For demonstration we use Ethereal test account (auto‑created).
    // In production you would configure host, port, auth, etc.
    nodemailer.createTestAccount().then((account: any) => {
      this.transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass,
        },
      });
    }).catch((err: any) => {
      console.error('Failed to create test email account', err);
    });
  }

  /**
   * Sends a risk‑alert email to the FDA inspector.
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
      from: 'no-reply@sentinelads.com',
      to: 'inspector@fda.go.th',
      subject: `[Risk Alert] Case ${params.caseId} – Risk ${params.riskScore}%`,
      text: `Risk alert for case ${params.caseId}\n\nTitle: ${params.title}\nURL: ${params.url}\nDomain: ${params.domain}\nRisk Score: ${params.riskScore}%\n\nAI Analysis:\n${params.aiAnalysis}\n`,
    };

    if (!this.transporter) {
      console.warn('Email transporter not ready – skipping send');
      return;
    }
    const info = await this.transporter.sendMail(mailOptions);
    console.log('Risk alert email sent, preview URL:', nodemailer.getTestMessageUrl(info));
  }
}
