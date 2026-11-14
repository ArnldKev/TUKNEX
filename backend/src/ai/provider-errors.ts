import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

const diagnostics = {
  NEXI_AI_PROVIDER_REQUEST: [502, 'NEXI no pudo procesar el análisis. Puedes continuar y volver más tarde.'],
  NEXI_AI_PROVIDER_AUTH: [503, 'El análisis de NEXI no está disponible por el momento. Puedes continuar con el cuestionario.'],
  NEXI_AI_PROVIDER_PERMISSION: [503, 'El análisis de NEXI no está disponible por el momento. Puedes continuar con el cuestionario.'],
  NEXI_AI_PROVIDER_MODEL: [503, 'El análisis de NEXI no está disponible por el momento. Puedes continuar con el cuestionario.'],
  NEXI_AI_PROVIDER_TOO_LARGE: [413, 'La idea es demasiado extensa para analizarla. Prueba con una descripción más breve.'],
  NEXI_AI_PROVIDER_UNPROCESSABLE: [502, 'NEXI no pudo procesar este análisis. Revisa la descripción o continúa sin IA.'],
  NEXI_AI_PROVIDER_RATE_LIMIT: [429, 'La cuota de NEXI está ocupada. Puedes seguir y volver a intentarlo más tarde.'],
  NEXI_AI_PROVIDER_UNAVAILABLE: [503, 'NEXI no está disponible por el momento. Puedes continuar con el cuestionario.'],
  NEXI_AI_PROVIDER_HTTP: [503, 'NEXI no pudo consultar la IA. Puedes continuar con el cuestionario.'],
  NEXI_AI_NETWORK: [503, 'No pudimos conectar con NEXI. Puedes continuar con el cuestionario e intentarlo más tarde.'],
  NEXI_AI_TIMEOUT: [503, 'NEXI tardó demasiado en responder. Puedes intentarlo de nuevo.'],
  NEXI_AI_CANCELLED: [503, 'Se canceló el análisis de NEXI.'],
  NEXI_AI_RESPONSE_TOO_LARGE: [502, 'La respuesta de la IA fue demasiado extensa. Puedes intentarlo con una descripción más breve.'],
  NEXI_AI_TRUNCATED: [502, 'La IA no terminó el análisis. Puedes volver a intentarlo con una descripción más breve.'],
  NEXI_AI_FORMAT: [502, 'La IA devolvió un análisis que no podemos leer. Puedes intentarlo de nuevo.'],
  NEXI_AI_VALIDATION: [502, 'Las sugerencias de la IA no cumplen las opciones de esta cotización. Puedes intentarlo de nuevo.'],
  NEXI_AI_REFUSED: [502, 'La IA no pudo responder a esta consulta. Revisa la descripción o continúa sin IA.'],
} as const;

type AiDiagnosticCode = keyof typeof diagnostics;

export class AiProviderError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    private readonly diagnostic?: { code: AiDiagnosticCode; reference: string; retryAfter?: number },
  ) {
    super(message);
  }
  get diagnosticCode() { return this.diagnostic?.code; }
  get reference() { return this.diagnostic?.reference; }
  get retryAfter() { return this.diagnostic?.retryAfter; }
}

export function diagnosticError(code: AiDiagnosticCode, providerStatus?: number, retryAfter?: number) {
  const [status, message] = diagnostics[code];
  const reference = randomUUID();
  // Use API-independent IDs and fixed categories. Never log upstream bodies or thrown values.
  Logger.warn({ code, providerStatus: providerStatus ?? null, reference }, 'NexiAI');
  return new AiProviderError(status, message, { code, reference, retryAfter });
}

const httpCodes: Partial<Record<number, AiDiagnosticCode>> = {
  400: 'NEXI_AI_PROVIDER_REQUEST',
  401: 'NEXI_AI_PROVIDER_AUTH',
  403: 'NEXI_AI_PROVIDER_PERMISSION',
  404: 'NEXI_AI_PROVIDER_MODEL',
  413: 'NEXI_AI_PROVIDER_TOO_LARGE',
  422: 'NEXI_AI_PROVIDER_UNPROCESSABLE',
  429: 'NEXI_AI_PROVIDER_RATE_LIMIT',
};

function readRetryAfter(value: string | null): number | undefined {
  if (!value) return;
  const seconds = /^\d{1,10}$/.test(value)
    ? Number(value)
    : /^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)
      ? Math.ceil((Date.parse(value) - Date.now()) / 1000)
      : NaN;
  if (Number.isFinite(seconds)) return Math.max(1, Math.min(3600, seconds));
}

export function diagnoseProviderHttp(response: Response) {
  const { status } = response;
  const code = httpCodes[status] ?? (status >= 500 && status < 600
    ? 'NEXI_AI_PROVIDER_UNAVAILABLE' : 'NEXI_AI_PROVIDER_HTTP');
  const delay = code === 'NEXI_AI_PROVIDER_RATE_LIMIT' || code === 'NEXI_AI_PROVIDER_UNAVAILABLE'
    ? readRetryAfter(response.headers.get('retry-after')) : undefined;
  return diagnosticError(code, status, delay ?? (status === 429 ? 60 : undefined));
}
