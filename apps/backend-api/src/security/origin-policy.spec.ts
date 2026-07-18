import { isOriginAllowed } from './origin-policy';

const productionPolicy = {
  allowedOrigins: ['https://mp-p-answer-custom-dashboard.vercel.app'],
  isProduction: true,
};

describe('isOriginAllowed', () => {
  it('allows server-to-server requests without an Origin header', () => {
    expect(isOriginAllowed(undefined, productionPolicy)).toBe(true);
  });

  it('allows the configured dashboard and Chrome extensions', () => {
    expect(isOriginAllowed('https://mp-p-answer-custom-dashboard.vercel.app', productionPolicy)).toBe(true);
    expect(isOriginAllowed('chrome-extension://abcdefghijklmnop', productionPolicy)).toBe(true);
  });

  it('rejects unknown production origins', () => {
    expect(isOriginAllowed('https://example.com', productionPolicy)).toBe(false);
    expect(isOriginAllowed('http://localhost:3000', productionPolicy)).toBe(false);
  });

  it('allows local development origins only outside production', () => {
    expect(
      isOriginAllowed('http://127.0.0.1:3000', {
        allowedOrigins: [],
        isProduction: false,
      }),
    ).toBe(true);
  });
});
