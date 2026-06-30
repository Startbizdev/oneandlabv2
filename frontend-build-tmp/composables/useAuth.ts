/**
 * Composable pour la gestion de l'authentification
 */

import { apiFetch } from '~/utils/api';

export const useAuth = () => {
  const token = useState<string | null>('auth.token', () => null);
  const user = useState<any | null>('auth.user', () => null);
  
  const isAuthenticated = computed(() => {
    return !!token.value;
  });
  
  const login = async (email: string): Promise<{ success: boolean; userId?: string; sessionId?: string; error?: string }> => {
    try {
      const response = await apiFetch('/auth/request-otp', {
        method: 'POST',
        body: { email },
      });
      
      if (response.success && response.user_id) {
        return { 
          success: true, 
          userId: response.user_id,
          sessionId: response.session_id,
        };
      }
      
      return { success: false, error: response.error || 'Erreur lors de la connexion' };
    } catch (error: any) {
      // Le message d'erreur est déjà formaté par api.ts
      const errorMessage = error?.message || error?.toString() || 'Erreur lors de la connexion';
      return { success: false, error: errorMessage };
    }
  };
  
  const verifyOTP = async (userId: string, otp: string, sessionId?: string): Promise<{ success: boolean; error?: string; user?: any }> => {
    try {
      // S'assurer que l'OTP est bien une string et nettoyée
      const cleanOTP = String(otp).replace(/[^0-9]/g, '').trim();
      
      if (cleanOTP.length !== 6) {
        return { success: false, error: 'Le code OTP doit contenir exactement 6 chiffres' };
      }
      
      const response = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: { 
          user_id: String(userId), 
          otp: cleanOTP,
          ...(sessionId && { session_id: String(sessionId) })
        },
      });
      
      if (response.success && response.token) {
        const session = await applySessionFromToken(response);
        return { success: true, user: session.user };
      }
      
      return { success: false, error: response.error || 'Code OTP invalide' };
    } catch (error: any) {
      // Le message d'erreur est déjà formaté par api.ts pour les erreurs réseau
      const errorMessage = error?.message || error?.toString() || 'Erreur lors de la vérification';
      
      // Messages spéciaux pour différents cas d'erreur
      if (errorMessage.includes('Session OTP introuvable') || errorMessage.includes('expirée') || errorMessage.includes('expiré')) {
        return { 
          success: false, 
          error: 'Le code a expiré. Veuillez demander un nouveau code.' 
        };
      }
      
      if (errorMessage.includes('déjà utilisé') || errorMessage.includes('déjà été utilisé')) {
        return { 
          success: false, 
          error: 'Ce code a déjà été utilisé. Veuillez demander un nouveau code.' 
        };
      }
      
      if (errorMessage.includes('Code OTP incorrect') || errorMessage.includes('invalide')) {
        return { 
          success: false, 
          error: 'Code OTP incorrect. Vérifiez le code reçu par email et réessayez.' 
        };
      }
      
      return { success: false, error: errorMessage };
    }
  };
  
  const logout = async () => {
    if (!process.client) {
      return;
    }
    
    try {
      // Nettoyer le state immédiatement
      token.value = null;
      user.value = null;
      
      // Nettoyer le localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      
      // Réinitialiser le cache CSRF
      if (typeof window !== 'undefined') {
        (window as any).__csrfTokenCache = null;
      }
      
      // Appeler l'endpoint logout (ne pas attendre)
      try {
        await apiFetch('/auth/logout', { method: 'POST' });
      } catch (error) {
        // Ignorer les erreurs de l'API logout
      }
      
      // Rediriger vers login
      await navigateTo('/login', { replace: true });
      
    } catch (error) {
      // En cas d'erreur, forcer le nettoyage et la redirection
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      token.value = null;
      user.value = null;
      await navigateTo('/login', { replace: true });
    }
  };
  
  const fetchCurrentUser = async () => {
    if (!token.value) {
      return null;
    }
    
    try {
      const response = await apiFetch('/auth/me', {
        method: 'GET',
      });
      
      if (response.success && response.data) {
        user.value = response.data;
        // Mettre à jour le localStorage
        if (process.client) {
          localStorage.setItem('auth_user', JSON.stringify(response.data));
        }
        return response.data;
      }
      // Si le token est invalide, nettoyer
      if (process.client) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        token.value = null;
        user.value = null;
      }
      return null;
    } catch (error: any) {
      // Si erreur 401 (token invalide), nettoyer
      if (error?.message?.includes('401') || error?.message?.includes('Token invalide') || error?.message?.includes('Unauthorized')) {
        if (process.client) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          token.value = null;
          user.value = null;
        }
      }
      return null;
    }
  };
  
  const applySessionFromToken = async (response: {
    token: string;
    user?: { id?: string; role?: string; must_change_password?: boolean };
    must_change_password?: boolean;
  }) => {
    token.value = response.token;
    if (process.client) {
      localStorage.setItem('auth_token', response.token);
      if (typeof window !== 'undefined') {
        (window as any).__csrfTokenCache = null;
      }
      let apiBase = 'http://localhost:8888/api';
      if (typeof window !== 'undefined') {
        if ((window as any).__NUXT__?.config?.public?.apiBase) {
          apiBase = (window as any).__NUXT__.config.public.apiBase;
        } else if (import.meta.env?.NUXT_PUBLIC_API_BASE) {
          apiBase = import.meta.env.NUXT_PUBLIC_API_BASE;
        }
      }
      try {
        const csrfResponse = await fetch(`${apiBase}/auth/csrf-token`, {
          method: 'GET',
          mode: 'cors',
          credentials: 'include',
        });
        if (csrfResponse.ok) {
          const csrfData = await csrfResponse.json();
          if (csrfData.success && csrfData.data?.csrf_token && typeof window !== 'undefined') {
            (window as any).__csrfTokenCache = csrfData.data.csrf_token;
          }
        }
      } catch {
        /* ignore */
      }
    }
    const userData = await fetchCurrentUser();
    const mustChange =
      response.must_change_password === true ||
      response.user?.must_change_password === true ||
      userData?.must_change_password === true;
    return { user: userData ?? user.value, mustChangePassword: mustChange };
  };

  const loginWithPassword = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }> => {
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (response.success && response.token) {
        const session = await applySessionFromToken(response);
        return { success: true, mustChangePassword: session.mustChangePassword };
      }
      return { success: false, error: response.error || 'Connexion impossible' };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Connexion impossible' };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await apiFetch('/auth/password/forgot', {
        method: 'POST',
        body: { email },
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Erreur' };
    }
  };

  const resetPassword = async (payload: {
    new_password: string;
    confirm_password: string;
    token?: string;
    code?: string;
    email?: string;
  }) => {
    try {
      await apiFetch('/auth/password/reset', {
        method: 'POST',
        body: payload,
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Erreur' };
    }
  };

  const updatePassword = async (payload: {
    new_password: string;
    confirm_password: string;
    current_password?: string;
  }) => {
    try {
      const response = await apiFetch('/auth/password', {
        method: 'PUT',
        body: payload,
      });
      if (response.success) {
        await fetchCurrentUser();
      }
      return { success: response.success, error: response.error };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Erreur' };
    }
  };

  const initAuth = async () => {
    if (process.client) {
      // Vérifier si un logout est en cours - si oui, ne rien charger
      if (sessionStorage.getItem('logout_in_progress') === 'true') {
        // Nettoyer le flag et s'assurer que tout est null
        sessionStorage.removeItem('logout_in_progress');
        token.value = null;
        user.value = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        return;
      }
      
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      
      // Si localStorage est vide, s'assurer que le state est null
      if (!storedToken) {
        token.value = null;
        user.value = null;
        return;
      }
      
      // Charger le token
      token.value = storedToken;

      // Hydrater tout de suite depuis le cache pour éviter un flash UI "invité"
      // (layouts qui testent `isAuthenticated && user` pendant l’appel /auth/me).
      if (storedUser) {
        try {
          user.value = JSON.parse(storedUser);
        } catch {
          localStorage.removeItem('auth_user');
        }
      }
      
      // Toujours vérifier que le token est valide en appelant l'API
      // Si on a un token mais pas d'infos utilisateur complètes, les récupérer
      if (storedToken) {
        // Vérifier la validité du token en récupérant les infos utilisateur
        const userData = await fetchCurrentUser();
        if (!userData && storedUser) {
          // Si le token est invalide mais qu'on a des données en cache, nettoyer
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          token.value = null;
          user.value = null;
        } else if (!userData && !storedUser) {
          // Si pas de données utilisateur et token invalide, nettoyer
          localStorage.removeItem('auth_token');
          token.value = null;
          user.value = null;
        }
      } else if (storedUser) {
        // Charger depuis localStorage si pas de token (ne devrait pas arriver)
        try {
          user.value = JSON.parse(storedUser);
        } catch (error) {
          // Si erreur de parsing, nettoyer
          localStorage.removeItem('auth_user');
          user.value = null;
        }
      }
    }
  };
  
  return {
    token,
    user,
    isAuthenticated,
    login,
    loginWithPassword,
    verifyOTP,
    forgotPassword,
    resetPassword,
    updatePassword,
    logout,
    initAuth,
    fetchCurrentUser,
  };
};

