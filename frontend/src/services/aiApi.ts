import type { AiChatRequest, AiApiResponse, AiChatResponseData } from '../types/ai.types';

// VITE_API_URL can override the base URL (e.g. for staging).
// In development the Vite proxy handles /api → http://localhost:3000.
const BASE_URL: string = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '';

export async function sendAiChatMessage(
  payload: AiChatRequest,
): Promise<AiApiResponse<AiChatResponseData>> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'network_error',
        message:
          err instanceof Error
            ? `No se pudo conectar al backend: ${err.message}`
            : 'Error de red desconocido',
        details: err,
      },
    };
  }

  let data: AiApiResponse<AiChatResponseData>;
  try {
    data = (await response.json()) as AiApiResponse<AiChatResponseData>;
  } catch {
    return {
      success: false,
      error: {
        code: 'parse_error',
        message: `Respuesta no es JSON válido (HTTP ${response.status})`,
      },
    };
  }

  // If the server returned a non-2xx without a structured error, wrap it
  if (!response.ok && !data.error) {
    return {
      success: false,
      error: { code: 'http_error', message: `HTTP ${response.status}: ${response.statusText}` },
    };
  }

  return data;
}
