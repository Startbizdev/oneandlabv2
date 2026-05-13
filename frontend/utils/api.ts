// utils/api.ts

import { bookingDbg } from '~/utils/booking-celebration-debug';

// Cache pour le token CSRF
let csrfTokenCache: string | null = null;

/** Une seule requête réseau CSRF à la fois : évite la tempête quand plusieurs POST partent en parallèle. */
let csrfTokenInFlight: Promise<string | null> | null = null;

// Récupérer le token depuis le cache global si disponible (initialisé par le plugin)
if (typeof window !== 'undefined' && (window as any).__csrfTokenCache) {
  csrfTokenCache = (window as any).__csrfTokenCache;
}

// Routes publiques qui ne nécessitent pas de CSRF
const PUBLIC_ROUTES = [
  '/auth/check-email',
  '/auth/request-otp',
  '/auth/verify-otp',
  '/auth/guest-to-user',
  '/auth/csrf-token',
  '/auth/logout',
  '/ban/search',
  '/registration-requests',
  '/contact',
];

async function fetchCsrfTokenFromNetwork(apiBase: string): Promise<string | null> {
  if (import.meta.dev && import.meta.client) {
    bookingDbg('getCSRFToken: requête réseau (pas de cache)');
  }

  try {
    const controller = new AbortController();
    const csrfTimeoutMs = 15000;
    const timeoutId = setTimeout(() => controller.abort(), csrfTimeoutMs);
    try {
      const response = await fetch(`${apiBase}/auth/csrf-token`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
        signal: controller.signal,
      });

      if (import.meta.dev && import.meta.client) {
        bookingDbg('getCSRFToken: réponse HTTP', { ok: response.ok, status: response.status });
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.csrf_token) {
          csrfTokenCache = data.data.csrf_token;
          if (typeof window !== 'undefined') {
            (window as any).__csrfTokenCache = csrfTokenCache;
          }
          return csrfTokenCache;
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    // Ignorer les erreurs CSRF
  }

  return null;
}

/**
 * Récupère le token CSRF (cache → une seule requête partagée si vide).
 */
async function getCSRFToken(apiBase: string): Promise<string | null> {
  if (csrfTokenCache) {
    return csrfTokenCache;
  }
  if (!csrfTokenInFlight) {
    csrfTokenInFlight = fetchCsrfTokenFromNetwork(apiBase).finally(() => {
      csrfTokenInFlight = null;
    });
  }
  return csrfTokenInFlight;
}

/** Précharge le CSRF après login / avant série de POST (optionnel, UX plus fluide). */
export async function preloadCsrfToken(): Promise<void> {
  if (!import.meta.client) {
    return;
  }
  await getCSRFToken(resolveApiBase());
}

/**
 * Vérifie si une route nécessite un token CSRF
 */
function requiresCSRF(path: string, method: string): boolean {
  // Les requêtes GET/OPTIONS ne nécessitent pas de CSRF
  if (['GET', 'OPTIONS'].includes(method.toUpperCase())) {
    return false;
  }

  // Vérifier si c'est une route publique
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  return !PUBLIC_ROUTES.some(route => normalizedPath.startsWith(route));
}

function resolveApiBase(): string {
  let apiBase = 'http://localhost:8888/api';
  if (import.meta.client) {
    if ((window as any).__NUXT__?.config?.public?.apiBase) {
      apiBase = (window as any).__NUXT__.config.public.apiBase;
    } else if (import.meta.env?.NUXT_PUBLIC_API_BASE) {
      apiBase = import.meta.env.NUXT_PUBLIC_API_BASE;
    }
  }
  return apiBase;
}

/**
 * GET binaire (ex. /medical-documents/:id/download) avec le même Bearer que apiFetch.
 * Les liens <a href> n’envoient pas Authorization — utiliser cette fonction + blob / ouverture onglet.
 */
export async function apiFetchBlob(
  path: string,
  options: { timeout?: number } = {},
): Promise<{ blob: Blob; filenameHint: string | null }> {
  if (!import.meta.client) {
    throw new Error('apiFetchBlob est réservé au client');
  }
  const apiBase = resolveApiBase();
  const url = `${apiBase}${path.startsWith('/') ? path : '/' + path}`;
  const authToken = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const timeoutMs = options.timeout ?? 120000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
      signal: controller.signal,
      mode: 'cors',
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const err = new Error((data as any)?.error || (data as any)?.message || `Erreur ${response.status}`) as Error & {
        code?: string;
      };
      err.code = (data as any)?.code;
      throw err;
    }
    const cd = response.headers.get('Content-Disposition');
    let filenameHint: string | null = null;
    if (cd) {
      const m = /filename\*?=(?:UTF-8'')?["']?([^"'\s;]+)/i.exec(cd);
      if (m?.[1]) {
        try {
          filenameHint = decodeURIComponent(m[1].replace(/\+/g, ' '));
        } catch {
          filenameHint = m[1];
        }
      }
    }
    const blob = await response.blob();
    return { blob, filenameHint };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiFetch(path: string, options: any = {}) {
  // Récupérer l'URL de base de la configuration Nuxt
  let apiBase = resolveApiBase();
  
  const url = `${apiBase}${path.startsWith('/') ? path : '/' + path}`;
  const isFormData = options.body instanceof FormData;
  // Utiliser GET par défaut si pas de body, sinon POST
  const method = options.method || (options.body ? 'POST' : 'GET');

  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  const dbgApptCreate =
    import.meta.dev && import.meta.client && normalizedPath === '/appointments' && method.toUpperCase() === 'POST';

  const timeoutMs = options.timeout ?? 60000;

  // Récupérer le token d'authentification depuis localStorage
  let authToken: string | null = null;
  if (import.meta.client) {
    authToken = localStorage.getItem('auth_token');
  }

  // Construire les headers
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  // Ajouter le token d'authentification si disponible
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Récupérer et ajouter le token CSRF si nécessaire
  // Pour FormData, le CSRF doit aussi être envoyé dans les headers
  if (requiresCSRF(path, method) && import.meta.client) {
    try {
      const csrfToken = await getCSRFToken(apiBase);
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    } catch (csrfError) {
      // Ne pas bloquer la requête si le CSRF échoue, mais logger l'erreur
      console.warn('Erreur lors de la récupération du token CSRF:', csrfError);
    }
  }

  if (dbgApptCreate) {
    bookingDbg('apiFetch POST /appointments: avant fetch()', {
      timeoutMs,
      hasCsrfHeader: Boolean(headers['X-CSRF-Token']),
      hasBearer: Boolean(authToken),
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
    const response = await fetch(url, {
      method,
      headers,
      body: isFormData
        ? options.body
        : options.body
        ? JSON.stringify(options.body)
        : null,
      signal: controller.signal,
      mode: 'cors',
      credentials: 'include', // Envoyer les cookies de session pour CSRF
    });

    if (dbgApptCreate) {
      bookingDbg('apiFetch POST /appointments: réponse HTTP', {
        ok: response.ok,
        status: response.status,
      });
    }

    // Vérifier si la réponse est valide avant de parser le JSON
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      
      // Si erreur CSRF, réinitialiser le cache et réessayer une fois (sauf FormData : corps non rejouable)
      if (data.code === 'CSRF_TOKEN_MISSING' || data.code === 'CSRF_TOKEN_INVALID' || data.error === 'Token CSRF manquant') {
        csrfTokenCache = null; // Réinitialiser le cache
        // Réinitialiser aussi le cache global
        if (typeof window !== 'undefined') {
          (window as any).__csrfTokenCache = null;
        }

        if (!isFormData && requiresCSRF(path, method) && import.meta.client) {
          const newCsrfToken = await getCSRFToken(apiBase);
          if (newCsrfToken) {
            headers['X-CSRF-Token'] = newCsrfToken;

            const retryResponse = await fetch(url, {
              method,
              headers,
              body: options.body ? JSON.stringify(options.body) : null,
              signal: controller.signal,
              mode: 'cors',
              credentials: 'include',
            });

            if (retryResponse.ok) {
              const retryData = await retryResponse.json().catch(() => null);
              if (retryData) {
                return retryData;
              }
            }
          }
        }
      }
      
      const err = new Error(data?.error || data?.message || `Erreur serveur: ${response.status} ${response.statusText}`) as Error & { code?: string };
      err.code = data?.code;
      if (dbgApptCreate) {
        bookingDbg('apiFetch POST /appointments: HTTP erreur', {
          status: response.status,
          code: data?.code,
          error: data?.error ?? data?.message,
        });
      }
      throw err;
    }

    // Parser le JSON avec meilleure gestion d'erreur
    let data;
    try {
      if (dbgApptCreate) {
        bookingDbg('apiFetch POST /appointments: lecture corps + parse JSON…');
      }
      const text = await response.text();
      if (!text || text.trim() === '') {
        throw new Error('Réponse vide du serveur (aucune donnée)');
      }
      
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Réponse invalide du serveur: ${text.substring(0, 100)}`);
      }
    } catch (error: any) {
      if (error.message && !error.message.includes('Réponse')) {
        throw error;
      }
      throw new Error(error.message || 'Réponse vide ou invalide du serveur');
    }
    
    if (!data) {
      throw new Error('Réponse vide du serveur (données null)');
    }

    if (dbgApptCreate) {
      const d = data as { success?: boolean; data?: { id?: string }; error?: string; message?: string; code?: string };
      bookingDbg('apiFetch POST /appointments: terminé', {
        success: Boolean(d.success),
        id: d?.data?.id ?? null,
        error: d.success === false ? (d.error ?? d.message ?? null) : null,
        code: d.code ?? null,
      });
    }

    return data;
    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error: any) {
    if (dbgApptCreate) {
      bookingDbg('apiFetch POST /appointments: erreur / annulation', {
        name: error?.name,
        message: error?.message != null ? String(error.message).slice(0, 200) : '',
      });
    }
    // Extraire le message d'erreur de différentes façons possibles
    let errorMessage = "";
    if (typeof error === "string") {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = String(error.message);
    } else if (error?.toString) {
      errorMessage = error.toString();
    } else {
      errorMessage = String(error);
    }

    // Détecter spécifiquement les erreurs réseau
    const errorString = JSON.stringify(error || {});
    const errorMessageLower = errorMessage.toLowerCase();
    const errorName = error?.name || '';
    
    const isNetworkError = 
      errorName === "TypeError" ||
      errorName === "NetworkError" ||
      errorName === "AbortError" ||
      errorMessageLower.includes("failed to fetch") ||
      errorMessageLower.includes("networkerror") ||
      errorMessageLower.includes("network request failed") ||
      errorMessageLower.includes("aucune réponse du serveur") ||
      errorMessageLower.includes("<no response>") ||
      errorMessageLower.includes("no response") ||
      errorMessageLower.includes("aborted") ||
      errorString.toLowerCase().includes("failed to fetch") ||
      errorString.toLowerCase().includes("<no response>") ||
      errorString.toLowerCase().includes("no response") ||
      (error?.status === undefined && error?.statusText === undefined && errorMessageLower.includes("fetch"));

    if (isNetworkError) {
      const fullUrl = `${apiBase}${path}`;
      
      // Message d'erreur plus détaillé selon le type d'erreur
      let userMessage = `Impossible de se connecter au serveur backend sur ${apiBase}`;
      
      if (errorName === 'AbortError') {
        userMessage = `La requête a expiré (timeout). Le backend ne répond pas (${apiBase}).`;
      } else if (errorMessageLower.includes('failed to fetch') || errorMessageLower.includes('networkerror')) {
        userMessage = `Connexion impossible au backend (${apiBase}). Vérifiez que le serveur est démarré.`;
      }
      
      const backendHint = 'Pour démarrer le backend : cd backend && ./start-server.sh';
      const proxyHint = apiBase.startsWith('http') ? '' : ' En dev, les appels passent par le proxy (Nuxt sur :3000 → backend :8888). Si le timeout persiste, essayez NUXT_PUBLIC_API_BASE=http://localhost:8888/api pour appeler le backend directement.';
      throw new Error(`${userMessage}\n\n${backendHint}${proxyHint}`);
    }

    // Pour les autres erreurs, préserver le message original
    throw new Error(errorMessage || "Erreur lors de la connexion au backend");
  }
}
