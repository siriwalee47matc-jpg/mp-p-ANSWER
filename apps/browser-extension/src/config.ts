const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

export const API_URL = trimTrailingSlash(import.meta.env.VITE_API_URL || 'http://localhost:3001');
export const DASHBOARD_URL = trimTrailingSlash(import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3000');
