/**
 * Plugin pour initialiser le token CSRF au démarrage de l'application
 */
export default defineNuxtPlugin(async () => {
  // Récupérer le token CSRF au démarrage pour éviter les erreurs lors de la première requête
  if (import.meta.client) {
    try {
      // Utiliser directement fetch pour éviter les dépendances circulaires
      const config = useRuntimeConfig();
      const apiBase = config.public.apiBase || 'http://localhost:8888/api';
      
      const response = await fetch(`${apiBase}/auth/csrf-token`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'include', // Envoyer les cookies de session pour CSRF
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.csrf_token) {
          // Le token sera mis en cache automatiquement lors de la prochaine utilisation d'apiFetch
          // On le met aussi dans le cache directement pour éviter un double appel
          if (typeof window !== 'undefined') {
            (window as any).__csrfTokenCache = data.data.csrf_token;
          }
        }
      }
    } catch (error) {
      // Ne pas bloquer le démarrage si le token CSRF ne peut pas être récupéré
      console.warn('Impossible de récupérer le token CSRF au démarrage:', error);
    }
  }
});

