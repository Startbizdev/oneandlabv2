export default defineNuxtRouteMiddleware((to, from) => {
  const { isAuthenticated, token, user } = useAuth();
  
  // Vérifier le state ET le localStorage pour être sûr
  // Cela évite les problèmes si le state n'est pas synchronisé
  if (process.client) {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'AUTH1',
          location: 'middleware/auth.ts:8',
          message: 'Auth middleware check',
          data: {
            to: to.path,
            hasStoredToken: !!storedToken,
            hasStoredUser: !!storedUser,
            hasTokenValue: !!token.value,
            hasUserValue: !!user.value,
            isAuthenticatedValue: isAuthenticated.value,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
    
    // PRIORITÉ 1: Si localStorage n'a pas de token, FORCER le nettoyage et bloquer
    // Le token est suffisant pour l'authentification, storedUser est optionnel
    if (!storedToken) {
      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'AUTH2',
            location: 'middleware/auth.ts:16',
            message: 'Redirecting to login - no token in localStorage',
            data: {
              to: to.path,
              hasStoredToken: !!storedToken,
              hasStoredUser: !!storedUser,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion
      
      // Nettoyer complètement le state
      token.value = null;
      user.value = null;
      // Bloquer l'accès immédiatement
      return navigateTo('/login');
    }
    
    // PRIORITÉ 2: Si localStorage a un token mais que le state est null, recharger depuis localStorage
    if (storedToken && !token.value) {
      token.value = storedToken;
      
      // Charger l'utilisateur depuis localStorage s'il existe, sinon il sera chargé via l'API plus tard
      if (storedUser && !user.value) {
        try {
          user.value = JSON.parse(storedUser);
          
          // #region agent log
          if (typeof window !== 'undefined') {
            fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'run1',
                hypothesisId: 'AUTH3',
                location: 'middleware/auth.ts:35',
                message: 'Synced state from localStorage',
                data: {
                  to: to.path,
                  tokenSynced: !!token.value,
                  userSynced: !!user.value,
                },
                timestamp: Date.now(),
              }),
            }).catch(() => {});
          }
          // #endregion
        } catch (error) {
          // #region agent log
          if (typeof window !== 'undefined') {
            fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'run1',
                hypothesisId: 'AUTH4',
                location: 'middleware/auth.ts:45',
                message: 'Error parsing storedUser - continuing without user',
                data: {
                  to: to.path,
                  error: error instanceof Error ? error.message : String(error),
                },
                timestamp: Date.now(),
              }),
            }).catch(() => {});
          }
          // #endregion
          
          // Si erreur de parsing, nettoyer seulement auth_user mais garder le token
          // L'utilisateur sera chargé via l'API plus tard
          localStorage.removeItem('auth_user');
          user.value = null;
        }
      }
    }
    
    // PRIORITÉ 3: Si localStorage n'a pas de token mais que le state a des valeurs, nettoyer le state
    if (!storedToken && (token.value || user.value)) {
      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'AUTH5',
            location: 'middleware/auth.ts:60',
            message: 'Cleaning state - no token in localStorage but state has values',
            data: {
              to: to.path,
              hasStoredToken: !!storedToken,
              hasStoredUser: !!storedUser,
              hasTokenValue: !!token.value,
              hasUserValue: !!user.value,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion
      
      token.value = null;
      user.value = null;
      return navigateTo('/login');
    }
    
    // Vérifier l'authentification après synchronisation
    // Utiliser directement localStorage pour le token (storedUser est optionnel)
    if (!storedToken) {
      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'AUTH6',
            location: 'middleware/auth.ts:75',
            message: 'Redirecting to login - final check failed (no token)',
            data: {
              to: to.path,
              hasStoredToken: !!storedToken,
              hasStoredUser: !!storedUser,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion
      
      return navigateTo('/login');
    }
    
    // S'assurer que le state est synchronisé
    if (!token.value && storedToken) {
      token.value = storedToken;
    }
    if (!user.value && storedUser) {
      try {
        user.value = JSON.parse(storedUser);
      } catch (error) {
        // #region agent log
        if (typeof window !== 'undefined') {
          fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'AUTH7',
              location: 'middleware/auth.ts:90',
              message: 'Error parsing storedUser in final sync',
              data: {
                to: to.path,
                error: error instanceof Error ? error.message : String(error),
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        }
        // #endregion
        
        // Si erreur de parsing, nettoyer
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        token.value = null;
        user.value = null;
        return navigateTo('/login');
      }
    }
    
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'AUTH8',
          location: 'middleware/auth.ts:105',
          message: 'Auth middleware passed',
          data: {
            to: to.path,
            hasToken: !!token.value,
            hasUser: !!user.value,
            isAuthenticated: isAuthenticated.value,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
  } else {
    // Côté serveur, ne pas bloquer - laisser le client gérer l'authentification
    // Le localStorage n'existe pas côté serveur, donc on ne peut pas vérifier l'authentification
    // Le middleware côté client s'exécutera après l'hydratation et vérifiera correctement
    return;
  }
});

