export default defineNuxtRouteMiddleware((to, from) => {
  const { isAuthenticated, token, user } = useAuth();
  
  // Vérifier le state ET le localStorage pour être sûr
  // Cela évite les problèmes si le state n'est pas synchronisé
  if (process.client) {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    // PRIORITÉ 1: Si localStorage n'a pas de token, FORCER le nettoyage et bloquer
    // Le token est suffisant pour l'authentification, storedUser est optionnel
    if (!storedToken) {
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
        } catch (error) {
          // Si erreur de parsing, nettoyer seulement auth_user mais garder le token
          // L'utilisateur sera chargé via l'API plus tard
          localStorage.removeItem('auth_user');
          user.value = null;
        }
      }
    }
    
    // PRIORITÉ 3: Si localStorage n'a pas de token mais que le state a des valeurs, nettoyer le state
    if (!storedToken && (token.value || user.value)) {
      token.value = null;
      user.value = null;
      return navigateTo('/login');
    }
    
    // Vérifier l'authentification après synchronisation
    // Utiliser directement localStorage pour le token (storedUser est optionnel)
    if (!storedToken) {
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
        // Si erreur de parsing, nettoyer
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        token.value = null;
        user.value = null;
        return navigateTo('/login');
      }
    }
  } else {
    // Côté serveur, ne pas bloquer - laisser le client gérer l'authentification
    // Le localStorage n'existe pas côté serveur, donc on ne peut pas vérifier l'authentification
    // Le middleware côté client s'exécutera après l'hydratation et vérifiera correctement
    return;
  }
});

