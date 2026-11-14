export class AiRequestError extends Error {
  constructor(message: string, readonly retryAfterSeconds: number) {
    super(message);
    this.name = 'AiRequestError';
  }
}

export async function readAiRequestError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  const message = typeof body?.message === 'string' && body.message ? body.message : fallback;
  const reference = response.headers.get('X-Nexi-Reference');
  const validReference = reference && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reference);
  const retryAfter = response.headers.get('Retry-After');
  const seconds = (response.status === 429 || response.status === 503) && retryAfter && /^\d{1,5}$/.test(retryAfter)
    ? Math.min(Number(retryAfter), 86400)
    : 0;
  return new AiRequestError(validReference ? message + ' Referencia: ' + reference + '.' : message, seconds);
}
