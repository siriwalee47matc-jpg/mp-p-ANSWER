const path = require('path');
const isProduction = process.env.NODE_ENV === 'production';

const apiOrigin = (() => {
  try {
    const fallback = isProduction ? 'https://mp-p-answer-custom-backend.vercel.app' : 'http://localhost:3001';
    return new URL(process.env.NEXT_PUBLIC_API_URL || fallback).origin;
  } catch {
    return 'https://mp-p-answer-custom-backend.vercel.app';
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${apiOrigin}${isProduction ? '' : ' ws: http://localhost:*'}`,
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
}

module.exports = nextConfig;
