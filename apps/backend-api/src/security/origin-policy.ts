export interface OriginPolicyOptions {
  allowedOrigins: readonly string[];
  isProduction: boolean;
}
export function isOriginAllowed(
  origin: string | undefined,
  { allowedOrigins, isProduction }: OriginPolicyOptions,
): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.startsWith('chrome-extension://')) return true;
  return !isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}
