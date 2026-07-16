const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

function requireEnv(key: string, devFallback: string): string {
  const value = import.meta.env[key];
  if (value) return trimTrailingSlash(value);
  if (import.meta.env.DEV) return trimTrailingSlash(devFallback);
  throw new Error(`${key} must be set for production builds`);
}

export const API_URL = requireEnv('VITE_API_URL', 'http://localhost:3001');
export const DASHBOARD_URL = requireEnv('VITE_DASHBOARD_URL', 'http://localhost:3000');
