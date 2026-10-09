/**
 * Client HTTP — port fidèle de frontend/utils/api.ts
 */
import axios, { type AxiosRequestConfig, type Method } from 'axios';
import { fetch as streamingFetch } from 'expo/fetch';
import {
  type ApiResponse,
  CSRF_ERROR_CODES,
  requiresCsrf,
} from '@oneandlab/shared-api';
import { getApiBase } from '@/config/env';
import { getAuthToken } from '@/lib/auth-token';
import { logApiTiming } from '@/lib/api-timing';
import {
  SESSION_EXPIRED_MESSAGE,
  isSessionExpiryResponse,
  notifySessionExpired,
} from '@/lib/auth/session-expiry';
import { ApiRequestError, parseRetryAfterSeconds } from '@/lib/errors/api-request-error';

let csrfTokenCache: string | null = null;
let csrfInFlight: Promise<string | null> | null = null;

async function fetchCsrfToken(): Promise<string | null> {
  if (csrfTokenCache) return csrfTokenCache;
  if (!csrfInFlight) {
    csrfInFlight = axios
      .get<ApiResponse<{ csrf_token: string }>>(`${getApiBase()}/auth/csrf-token`, {
        withCredentials: true,
      })
      .then((res) => {
        const token = res.data?.data?.csrf_token ?? null;
        csrfTokenCache = token;
        return token;
      })
      .catch(() => null)
      .finally(() => {
        csrfInFlight = null;
      });
  }
  return csrfInFlight;
}

export function clearCsrfCache(): void {
  csrfTokenCache = null;
}

async function buildRequestHeaders(
  path: string,
  method: string,
  options: { headers?: Record<string, string>; body?: unknown; isFormData?: boolean },
): Promise<{ headers: Record<string, string>; token: string | null }> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };

  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (requiresCsrf(path, method)) {
    const csrf = await fetchCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  if (options.isFormData) {
    // Sans type explicite, axios envoie le multipart en x-www-form-urlencoded : Android le rejette avant l'envoi.
    headers['Content-Type'] = 'multipart/form-data';
  } else if (options.body != null) {
    headers['Content-Type'] = 'application/json';
  }
  return { headers, token: token ?? null };
}

export const INVALID_API_RESPONSE_MESSAGE = 'Réponse inattendue du serveur. Réessayez dans un instant.';

/**
 * axios rend le texte brut quand le JSON est illisible : avec `display_errors`, un avertissement PHP
 * arrive en 200 devant (ou à la place) de l'enveloppe.
 */
function jsonEnvelope<T>(path: string, status: number, data: ApiResponse<T> | string): ApiResponse<T> {
  if (typeof data !== 'string') return data;
  console.warn(`[api] réponse non JSON ${status} ${path}`, data.slice(0, 300));
  throw new ApiRequestError(INVALID_API_RESPONSE_MESSAGE, status, 'INVALID_API_RESPONSE');
}

export async function apiRequest<T = unknown>(
  path: string,
  options: {
    method?: Method;
    body?: unknown;
    headers?: Record<string, string>;
    timeout?: number;
    isFormData?: boolean;
  } = {},
): Promise<ApiResponse<T>> {
  const method = (options.method ?? (options.body ? 'POST' : 'GET')) as Method;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${getApiBase()}${normalizedPath}`;
  const { headers, token } = await buildRequestHeaders(path, method, options);

  const config: AxiosRequestConfig = {
    method,
    url,
    headers,
    data: options.body,
    timeout: options.timeout ?? 60_000,
    withCredentials: true,
  };

  const startedAt = Date.now();
  try {
    const response = await axios.request<ApiResponse<T> | string>(config);
    const data = jsonEnvelope(normalizedPath, response.status, response.data);
    logApiTiming(path, startedAt, true);
    return data;
  } catch (err: unknown) {
    if (err instanceof ApiRequestError) {
      logApiTiming(path, startedAt, false);
      throw err;
    }
    logApiTiming(path, startedAt, false);
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data as ApiResponse;
      const code = data.code ?? '';
      if (CSRF_ERROR_CODES.includes(code as (typeof CSRF_ERROR_CODES)[number])) {
        clearCsrfCache();
        const newCsrf = await fetchCsrfToken();
        if (newCsrf) {
          headers['X-CSRF-Token'] = newCsrf;
          const retry = await axios.request<ApiResponse<T> | string>({ ...config, headers });
          return jsonEnvelope(normalizedPath, retry.status, retry.data);
        }
      }
      if (token && isSessionExpiryResponse(normalizedPath, err.response.status, data.code)) {
        void notifySessionExpired(token);
        throw new ApiRequestError(SESSION_EXPIRED_MESSAGE, err.response.status, data.code);
      }
      throw new ApiRequestError(
        data.error ?? data.message ?? `Erreur ${err.response.status}`,
        err.response.status,
        data.code,
        data.existing_patient_id,
        parseRetryAfterSeconds(err.response.headers?.['retry-after']),
      );
    }
    if (axios.isAxiosError(err) && err.response) {
      const status = err.response.status;
      if (status === 413) {
        throw new ApiRequestError(
          'Fichier trop volumineux (max. 25 Mo). Réessayez avec une photo plus légère ou un PDF plus petit.',
          status,
        );
      }
      throw new ApiRequestError(
        status === 500
          ? 'Erreur serveur (500). Réessayez dans un instant.'
          : `Erreur ${status}`,
        status,
      );
    }
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        const base = getApiBase();
        const hint =
          err.code === 'ECONNABORTED'
            ? 'Délai dépassé'
            : 'Serveur injoignable';
        throw new ApiRequestError(
          __DEV__
            ? `${hint} — ${base}\nVérifiez la connexion internet ou EXPO_PUBLIC_API_BASE dans apps/mobile/.env`
            : err.code === 'ECONNABORTED'
              ? 'Délai dépassé. Vérifiez votre connexion puis réessayez.'
              : 'Erreur réseau. Vérifiez votre connexion.',
          null,
        );
      }
      throw new ApiRequestError(err.message || 'Erreur réseau', null);
    }
    throw err;
  }
}

async function readStreamErrorBody(response: Response): Promise<ApiResponse> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    return { success: false };
  }
}

async function forwardStreamBody(response: Response, onChunk: (text: string) => void): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader || typeof TextDecoder === 'undefined') {
    onChunk(await response.text());
    return;
  }
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) onChunk(decoder.decode(value, { stream: true }));
  }
  const tail = decoder.decode();
  if (tail) onChunk(tail);
}

/**
 * POST JSON dont la réponse (SSE) est transmise morceau par morceau à `onChunk`.
 * Mêmes en-têtes, CSRF, expiration de session et erreurs typées que `apiRequest` ;
 * l'appelant gère l'annulation et le délai via `signal`.
 */
export async function apiStreamRequest(
  path: string,
  options: { body: unknown; signal?: AbortSignal; headers?: Record<string, string> },
  onChunk: (text: string) => void,
): Promise<void> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${getApiBase()}${normalizedPath}`;
  const { headers, token } = await buildRequestHeaders(path, 'POST', options);
  const send = () =>
    streamingFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(options.body),
      credentials: 'include',
      signal: options.signal,
    });

  const startedAt = Date.now();
  let response: Response;
  let errorData: ApiResponse | null = null;
  try {
    response = await send();
    if (!response.ok) {
      errorData = await readStreamErrorBody(response);
      if (CSRF_ERROR_CODES.includes((errorData.code ?? '') as (typeof CSRF_ERROR_CODES)[number])) {
        clearCsrfCache();
        const newCsrf = await fetchCsrfToken();
        if (newCsrf) {
          headers['X-CSRF-Token'] = newCsrf;
          response = await send();
          errorData = response.ok ? null : await readStreamErrorBody(response);
        }
      }
    }
  } catch (err: unknown) {
    logApiTiming(path, startedAt, false);
    if (options.signal?.aborted) throw err;
    throw new ApiRequestError('Erreur réseau. Vérifiez votre connexion.', null);
  }

  if (!response.ok) {
    logApiTiming(path, startedAt, false);
    const data = errorData ?? { success: false };
    if (token && isSessionExpiryResponse(normalizedPath, response.status, data.code)) {
      void notifySessionExpired(token);
      throw new ApiRequestError(SESSION_EXPIRED_MESSAGE, response.status, data.code);
    }
    throw new ApiRequestError(
      data.error ?? data.message ?? `Erreur ${response.status}`,
      response.status,
      data.code,
      undefined,
      parseRetryAfterSeconds(response.headers.get('retry-after')),
    );
  }

  try {
    await forwardStreamBody(response, onChunk);
    logApiTiming(path, startedAt, true);
  } catch (err: unknown) {
    logApiTiming(path, startedAt, false);
    if (options.signal?.aborted) throw err;
    throw new ApiRequestError('Erreur réseau. Vérifiez votre connexion.', null);
  }
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'DELETE', body }),
  postForm: <T>(path: string, formData: FormData) =>
    apiRequest<T>(path, { method: 'POST', body: formData, isFormData: true }),
};
