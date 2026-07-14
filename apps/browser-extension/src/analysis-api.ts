type AnalyzeCaseOptions = {
  apiUrl: string;
  caseId: string;
  headers?: HeadersInit;
  readJson: (response: Response, operation: string) => Promise<any>;
  operation: string;
  fallbackMessage: string;
  onRetry?: (details: { attempt: number; delayMs: number; error: Error }) => void;
};

const ANALYSIS_RETRY_DELAYS_MS = [2500, 6000];
const RETRYABLE_ANALYSIS_STATUSES = new Set([429, 502, 503, 504]);

const wait = (delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs));

const toError = (error: unknown, fallbackMessage: string) =>
  error instanceof Error ? error : new Error(fallbackMessage);

export async function analyzeCaseWithRetry({
  apiUrl,
  caseId,
  headers,
  readJson,
  operation,
  fallbackMessage,
  onRetry,
}: AnalyzeCaseOptions) {
  let lastError = new Error(fallbackMessage);

  for (let attempt = 0; attempt <= ANALYSIS_RETRY_DELAYS_MS.length; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(`${apiUrl}/cases/${caseId}/analyze`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(70000),
      });
    } catch (error) {
      lastError = toError(error, fallbackMessage);
      if (attempt >= ANALYSIS_RETRY_DELAYS_MS.length) throw lastError;

      const delayMs = ANALYSIS_RETRY_DELAYS_MS[attempt];
      onRetry?.({ attempt: attempt + 1, delayMs, error: lastError });
      await wait(delayMs);
      continue;
    }

    let data: any;
    try {
      data = await readJson(response, operation);
    } catch (error) {
      lastError = toError(error, fallbackMessage);
      if (!RETRYABLE_ANALYSIS_STATUSES.has(response.status) || attempt >= ANALYSIS_RETRY_DELAYS_MS.length) {
        throw lastError;
      }

      const delayMs = ANALYSIS_RETRY_DELAYS_MS[attempt];
      onRetry?.({ attempt: attempt + 1, delayMs, error: lastError });
      await wait(delayMs);
      continue;
    }

    if (response.ok) return data;

    lastError = new Error(data.message || `${fallbackMessage} (HTTP ${response.status})`);
    if (!RETRYABLE_ANALYSIS_STATUSES.has(response.status) || attempt >= ANALYSIS_RETRY_DELAYS_MS.length) {
      throw lastError;
    }

    const delayMs = ANALYSIS_RETRY_DELAYS_MS[attempt];
    onRetry?.({ attempt: attempt + 1, delayMs, error: lastError });
    await wait(delayMs);
  }

  throw lastError;
}
