/**
 * Client HTTP — port fidèle de frontend/utils/api.ts
 */
import axios, { type AxiosRequestConfig, type Method } from 'axios';
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
import { ApiRequestError } from '@/lib/errors/api-request-error';

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
  const headers: Record<string, string> = { ...(options.headers ?? {}) };

  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (requiresCsrf(path, method)) {
    const csrf = await fetchCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  if (!options.isFormData && options.body != null) {
    headers['Content-Type'] = 'application/json';
  }

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
    const response = await axios.request<ApiResponse<T>>(config);
    logApiTiming(path, startedAt, true);
    return response.data;
  } catch (err: unknown) {
    logApiTiming(path, startedAt, false);
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data as ApiResponse;
      const code = data.code ?? '';
      if (CSRF_ERROR_CODES.includes(code as (typeof CSRF_ERROR_CODES)[number])) {
        clearCsrfCache();
        const newCsrf = await fetchCsrfToken();
        if (newCsrf) {
          headers['X-CSRF-Token'] = newCsrf;
          const retry = await axios.request<ApiResponse<T>>({ ...config, headers });
          return retry.data;
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
            : 'Erreur réseau. Vérifiez votre connexion.',
          null,
        );
      }
      throw new ApiRequestError(err.message || 'Erreur réseau', null);
    }
    throw err;
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
