import type {
  AiApiResponse,
  AiChatRequest,
  AiChatResponseData,
  AiConversationData,
  AiMenuRequest,
  AiMenuResponseData,
  AiPlateAnalysisFormPayload,
  AiPlateAnalysisResponseData,
  AiProfileExplanationRequest,
  AiProfileExplanationResponseData,
  AiWeeklyMenuRequest,
  AiWeeklyMenuCreateResponse,
  AiWeeklyMenuPlanDto,
} from '../types/ai.types';

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

/**
 * Sends an image + context fields to POST /api/ai/plate-analysis.
 * Uses FormData — do NOT set Content-Type manually (the browser adds the boundary).
 */
export async function sendAiPlateAnalysis(
  payload: AiPlateAnalysisFormPayload,
): Promise<AiApiResponse<AiPlateAnalysisResponseData>> {
  const formData = new FormData();
  formData.append('userId', payload.userId);
  formData.append('image', payload.image);
  if (payload.objective) formData.append('objective', payload.objective);
  if (payload.caloriesTarget !== undefined)
    formData.append('caloriesTarget', String(payload.caloriesTarget));
  if (payload.plan) formData.append('plan', payload.plan);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/ai/plate-analysis`, {
      method: 'POST',
      body: formData,
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

  let data: AiApiResponse<AiPlateAnalysisResponseData>;
  try {
    data = (await response.json()) as AiApiResponse<AiPlateAnalysisResponseData>;
  } catch {
    return {
      success: false,
      error: {
        code: 'parse_error',
        message: `Respuesta no es JSON válido (HTTP ${response.status})`,
      },
    };
  }

  if (!response.ok && !data.error) {
    return {
      success: false,
      error: { code: 'http_error', message: `HTTP ${response.status}: ${response.statusText}` },
    };
  }

  return data;
}

export async function sendAiMenuRequest(
  payload: AiMenuRequest,
): Promise<AiApiResponse<AiMenuResponseData>> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/ai/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'network_error',
        message: err instanceof Error ? `No se pudo conectar al backend: ${err.message}` : 'Error de red desconocido',
        details: err,
      },
    };
  }

  let data: AiApiResponse<AiMenuResponseData>;
  try {
    data = (await response.json()) as AiApiResponse<AiMenuResponseData>;
  } catch {
    return { success: false, error: { code: 'parse_error', message: `Respuesta no es JSON válido (HTTP ${response.status})` } };
  }

  if (!response.ok && !data.error) {
    return { success: false, error: { code: 'http_error', message: `HTTP ${response.status}: ${response.statusText}` } };
  }

  return data;
}

export async function sendAiProfileExplanation(
  payload: AiProfileExplanationRequest,
): Promise<AiApiResponse<AiProfileExplanationResponseData>> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/ai/profile-explanation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'network_error',
        message: err instanceof Error ? `No se pudo conectar al backend: ${err.message}` : 'Error de red desconocido',
        details: err,
      },
    };
  }

  let data: AiApiResponse<AiProfileExplanationResponseData>;
  try {
    data = (await response.json()) as AiApiResponse<AiProfileExplanationResponseData>;
  } catch {
    return { success: false, error: { code: 'parse_error', message: `Respuesta no es JSON válido (HTTP ${response.status})` } };
  }

  if (!response.ok && !data.error) {
    return { success: false, error: { code: 'http_error', message: `HTTP ${response.status}: ${response.statusText}` } };
  }

  return data;
}

export async function sendAiWeeklyMenuRequest(
  payload: AiWeeklyMenuRequest,
): Promise<AiApiResponse<AiWeeklyMenuCreateResponse>> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/ai/menu/weekly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'network_error',
        message: err instanceof Error ? `No se pudo conectar al backend: ${err.message}` : 'Error de red desconocido',
        details: err,
      },
    };
  }

  let data: AiApiResponse<AiWeeklyMenuCreateResponse>;
  try {
    data = (await response.json()) as AiApiResponse<AiWeeklyMenuCreateResponse>;
  } catch {
    return { success: false, error: { code: 'parse_error', message: `Respuesta no es JSON válido (HTTP ${response.status})` } };
  }

  if (!response.ok && !data.error) {
    return { success: false, error: { code: 'http_error', message: `HTTP ${response.status}: ${response.statusText}` } };
  }

  return data;
}

export async function getAiWeeklyMenuPlan(
  planId: string,
): Promise<AiApiResponse<AiWeeklyMenuPlanDto>> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/ai/menu/weekly/${encodeURIComponent(planId)}`);
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'network_error',
        message: err instanceof Error ? `No se pudo conectar al backend: ${err.message}` : 'Error de red desconocido',
        details: err,
      },
    };
  }

  let data: AiApiResponse<AiWeeklyMenuPlanDto>;
  try {
    data = (await response.json()) as AiApiResponse<AiWeeklyMenuPlanDto>;
  } catch {
    return { success: false, error: { code: 'parse_error', message: `Respuesta no es JSON válido (HTTP ${response.status})` } };
  }

  if (!response.ok && !data.error) {
    return { success: false, error: { code: 'http_error', message: `HTTP ${response.status}: ${response.statusText}` } };
  }

  return data;
}

export async function getAiConversation(
  conversationId: string,
): Promise<AiApiResponse<AiConversationData>> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/ai/conversations/${encodeURIComponent(conversationId)}`);
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'network_error',
        message: err instanceof Error ? `No se pudo conectar al backend: ${err.message}` : 'Error de red desconocido',
        details: err,
      },
    };
  }

  let data: AiApiResponse<AiConversationData>;
  try {
    data = (await response.json()) as AiApiResponse<AiConversationData>;
  } catch {
    return { success: false, error: { code: 'parse_error', message: `Respuesta no es JSON válido (HTTP ${response.status})` } };
  }

  if (!response.ok && !data.error) {
    return { success: false, error: { code: 'http_error', message: `HTTP ${response.status}: ${response.statusText}` } };
  }

  return data;
}
