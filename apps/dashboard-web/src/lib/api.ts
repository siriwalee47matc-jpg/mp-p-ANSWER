const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_URL = (configuredApiUrl || 'http://localhost:3001').replace(/\/$/, '');

export function apiUrl(path: string): string {
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
