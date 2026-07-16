const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_URL = (configuredApiUrl || 'http://localhost:3001').replace(/\/$/, '');

export function apiUrl(path: string): string {
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const TRANSIENT_API_STATUSES = new Set([429, 502, 503, 504]);

export async function fetchApi(
  path: string,
  init?: RequestInit,
  retryDelays = [1500, 4000],
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      const response = await fetch(apiUrl(path), init);
      if (!TRANSIENT_API_STATUSES.has(response.status) || attempt === retryDelays.length) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt === retryDelays.length) break;
    }

    await new Promise((resolve) => window.setTimeout(resolve, retryDelays[attempt]));
  }

  throw new Error(
    lastError instanceof Error && lastError.message !== 'Failed to fetch'
      ? lastError.message
      : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ชั่วคราว กรุณารอสักครู่แล้วลองใหม่',
  );
}

export async function readApiResponse(response: Response): Promise<Record<string, any>> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`เซิร์ฟเวอร์ตอบกลับผิดรูปแบบ (HTTP ${response.status})`);
  }
}
