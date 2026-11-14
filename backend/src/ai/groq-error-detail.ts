import { cancelProviderBody } from './provider-response';

const MAX_ERROR_BYTES = 16 * 1024;
const MAX_INSPECTION_MS = 1000;

const reasonByCode = {
  invalid_json_schema: 'invalid_schema',
  invalid_schema: 'invalid_schema',
  json_validate_failed: 'invalid_generation',
  json_schema_validation_failed: 'invalid_generation',
  tool_use_failed: 'invalid_generation',
  unsupported_parameter: 'invalid_parameter',
  invalid_parameter: 'invalid_parameter',
  context_length_exceeded: 'context_length',
  model_not_found: 'unavailable_model',
  model_decommissioned: 'unavailable_model',
} as const;
type ProviderCode = keyof typeof reasonByCode;
type ProviderReason = typeof reasonByCode[ProviderCode];

const safeParameters = [
  'model', 'messages', 'reasoning_effort', 'include_reasoning', 'reasoning_format',
  'max_completion_tokens', 'response_format', 'response_format.json_schema', 'response_format.json_schema.schema',
] as const;
type ProviderParameter = typeof safeParameters[number];

export type GroqErrorDetail = { reason: ProviderReason; parameter?: ProviderParameter };

function safeDetail(body: unknown): GroqErrorDetail | undefined {
  if (!body || typeof body !== 'object' || !('error' in body)) return;
  const error = body.error;
  if (!error || typeof error !== 'object') return;
  const code = 'code' in error ? error.code : undefined;
  const param = 'param' in error ? error.param : undefined;
  const parameter = safeParameters.find(candidate => candidate === param);
  const declaredReason = typeof code === 'string' && Object.hasOwn(reasonByCode, code)
    ? reasonByCode[code as ProviderCode] : undefined;
  const message = 'message' in error && typeof error.message === 'string' ? error.message.slice(0, 256) : '';

  if (declaredReason) return { reason: declaredReason, ...(parameter ? { parameter } : {}) };
  // Some Groq errors omit code/param and only use a known message prefix.
  if (/^generated json does not match the expected schema\b/i.test(message)) return { reason: 'invalid_generation' };
  if (/^invalid (?:json )?schema\b|^(?:could not|failed to) (?:parse|compile) (?:the )?(?:json )?schema\b/i.test(message)) {
    return { reason: 'invalid_schema', ...(parameter ? { parameter } : {}) };
  }
  if (parameter) return { reason: 'invalid_parameter', parameter };
}

export async function inspectGroqBadRequest(response: Response): Promise<GroqErrorDetail | undefined> {
  const { body, headers } = response;
  if (!body || !/^application\/(?:json|[\w.+-]+\+json)(?:\s*;|$)/i.test(headers.get('content-type') ?? '') ||
      Number(headers.get('content-length')) > MAX_ERROR_BYTES) {
    await cancelProviderBody(body);
    return;
  }

  if (body.locked) return;
  const reader = body.getReader();
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    void cancelProviderBody(reader);
  }, MAX_INSPECTION_MS);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (!expired) {
      const { done, value } = await reader.read();
      if (expired) return;
      if (done) return safeDetail(JSON.parse(Buffer.concat(chunks, bytes).toString('utf8')));
      bytes += value.byteLength;
      if (bytes > MAX_ERROR_BYTES) {
        void cancelProviderBody(reader);
        return;
      }
      chunks.push(value);
    }
  } catch {
    void cancelProviderBody(reader);
    // The HTTP status and reference remain available when the body cannot be read.
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}
