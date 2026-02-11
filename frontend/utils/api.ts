// utils/api.ts

// Cache pour le token CSRF
let csrfTokenCache: string | null = null;

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
];

/**
 * Récupère le token CSRF depuis le serveur
 */
async function getCSRFToken(apiBase: string): Promise<string | null> {
  // Si on a déjà un token en cache, le retourner
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  try {
    const response = await fetch(`${apiBase}/auth/csrf-token`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'include', // Envoyer les cookies de session pour CSRF
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.csrf_token) {
        csrfTokenCache = data.data.csrf_token;
        // Synchroniser avec le cache global
        if (typeof window !== 'undefined') {
          (window as any).__csrfTokenCache = csrfTokenCache;
        }
        return csrfTokenCache;
      }
    }
  } catch (error) {
    // Ignorer les erreurs CSRF
  }

  return null;
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

export async function apiFetch(path: string, options: any = {}) {
  // Récupérer l'URL de base de la configuration Nuxt
  // Essayer plusieurs méthodes pour obtenir la configuration
  let apiBase = 'http://localhost:8888/api';
  
  if (import.meta.client) {
    // Méthode 1: Via window.__NUXT__ (disponible après le chargement initial de Nuxt)
    if ((window as any).__NUXT__?.config?.public?.apiBase) {
      apiBase = (window as any).__NUXT__.config.public.apiBase;
    }
    // Méthode 2: Via variable d'environnement si définie
    else if (import.meta.env?.NUXT_PUBLIC_API_BASE) {
      apiBase = import.meta.env.NUXT_PUBLIC_API_BASE;
    }
  }
  
  const url = `${apiBase}${path.startsWith('/') ? path : '/' + path}`;
  const isFormData = options.body instanceof FormData;
  // Utiliser GET par défaut si pas de body, sinon POST
  const method = options.method || (options.body ? 'POST' : 'GET');

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

  try {
    // Créer un AbortController pour gérer les timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes de timeout pour les uploads
    
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
    
    clearTimeout(timeoutId);

    // Vérifier si la réponse est valide avant de parser le JSON
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      
      // Si erreur CSRF, réinitialiser le cache et réessayer une fois
      if (data.code === 'CSRF_TOKEN_MISSING' || data.code === 'CSRF_TOKEN_INVALID' || data.error === 'Token CSRF manquant') {
        csrfTokenCache = null; // Réinitialiser le cache
        // Réinitialiser aussi le cache global
        if (typeof window !== 'undefined') {
          (window as any).__csrfTokenCache = null;
        }
        
        // Réessayer une fois avec un nouveau token CSRF
        if (requiresCSRF(path, method) && import.meta.client) {
          const newCsrfToken = await getCSRFToken(apiBase);
          if (newCsrfToken) {
            headers['X-CSRF-Token'] = newCsrfToken;
            
            // Réessayer la requête
            const retryResponse = await fetch(url, {
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
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json().catch(() => null);
              if (retryData) {
                return retryData;
              }
            }
          }
        }
      }
      
      throw new Error(data?.error || data?.message || `Erreur serveur: ${response.status} ${response.statusText}`);
    }

    // Parser le JSON avec meilleure gestion d'erreur
    let data;
    try {
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

    return data;

  } catch (error: any) {
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
        userMessage = `La requête a expiré (timeout). Le serveur backend ne répond pas sur ${apiBase}`;
      } else if (errorMessageLower.includes('failed to fetch') || errorMessageLower.includes('networkerror')) {
        userMessage = `Connexion impossible au serveur backend. Assurez-vous que le serveur est démarré sur ${apiBase}`;
      }
      
      throw new Error(
        `${userMessage}\n\nPour démarrer le serveur backend:\n  cd backend && ./start-server.sh`
      );
    }

    // Pour les autres erreurs, préserver le message original
    throw new Error(errorMessage || "Erreur lors de la connexion au backend");
  }
}
