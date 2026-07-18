import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_URL, apiUrl, fetchApi, readApiResponse } from './api';

describe('dashboard API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('normalizes API paths', () => {
    expect(apiUrl('/metrics/public')).toBe(`${API_URL}/metrics/public`);
    expect(apiUrl('metrics/public')).toBe(`${API_URL}/metrics/public`);
  });

  it('retries transient responses and returns the successful response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchApi('/health', undefined, [0]);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry authentication failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchApi('/cases', undefined, [0, 0]);

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('parses JSON and rejects malformed API responses', async () => {
    await expect(readApiResponse(new Response('{"value":1}', { status: 200 }))).resolves.toEqual({ value: 1 });
    await expect(readApiResponse(new Response('<html>', { status: 502 }))).rejects.toThrow('HTTP 502');
  });
});
