import { EmailUtil } from './email.util';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
  createTestAccount: jest.fn().mockResolvedValue({
    smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
    user: 'test',
    pass: 'test',
  }),
  getTestMessageUrl: jest.fn().mockReturnValue('http://preview.url'),
}));

import * as nodemailer from 'nodemailer';

describe('EmailUtil', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use Ethereal by default when no provider specified', async () => {
    process.env = { ...originalEnv };
    delete process.env.EMAIL_PROVIDER;
    
    new EmailUtil();
    
    // We can't directly check the internal state easily without a delay 
    // because createTestAccount is async in the constructor, 
    // but we can check if it was called.
    expect(nodemailer.createTestAccount).toHaveBeenCalled();
  });

  it('should enable TLS verification for SMTP provider', () => {
    process.env = {
      ...originalEnv,
      EMAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'smtp.test.com',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
    };

    new EmailUtil();

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.test.com',
        tls: { rejectUnauthorized: true },
      })
    );
  });

  it('should enable TLS verification for Resend provider', () => {
    process.env = {
      ...originalEnv,
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 'test-key',
    };

    new EmailUtil();

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.resend.com',
        tls: { rejectUnauthorized: true },
      })
    );
  });
});
