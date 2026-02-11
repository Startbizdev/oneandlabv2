export default defineNuxtRouteMiddleware((to) => {
  const { user, token } = useAuth();

  // Côté serveur, ne pas bloquer - laisser le client gérer
  if (!process.client) {
    return;
  }

  // Vérifier localStorage si user.value est null
  if (!user.value && process.client) {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    // Si on a un token mais pas d'utilisateur dans le state, charger depuis localStorage
    if (storedToken && storedUser) {
      try {
        user.value = JSON.parse(storedUser);
        token.value = storedToken;
      } catch (error) {
        // Si erreur de parsing, continuer sans user
      }
    }
  }

  // Redirection si non connecté (après tentative de chargement depuis localStorage)
  if (!user.value) {
    return navigateTo('/login');
  }

  // Si aucun rôle requis → ne rien faire
  const requiredRole = to.meta.role;
  if (!requiredRole) {
    return;
  }

  // Rôle unique (string)
  if (typeof requiredRole === 'string') {
    if (user.value.role !== requiredRole) {
      // Rediriger vers le dashboard approprié selon le rôle de l'utilisateur
      const roleRoutes: Record<string, string> = {
        super_admin: '/admin',
        admin: '/admin',
        lab: '/lab',
        subaccount: '/subaccount',
        nurse: '/nurse/appointments',
        preleveur: '/preleveur',
        pro: '/pro',
        patient: '/patient',
      };
      
      const defaultRoute = roleRoutes[user.value.role] || '/patient';
      return navigateTo(defaultRoute);
    }
    return;
  }

  // Liste de rôles (array)
  if (Array.isArray(requiredRole)) {
    if (!requiredRole.includes(user.value.role)) {
      // Rediriger vers le dashboard approprié selon le rôle de l'utilisateur
      const roleRoutes: Record<string, string> = {
        super_admin: '/admin',
        admin: '/admin',
        lab: '/lab',
        subaccount: '/subaccount',
        nurse: '/nurse/appointments',
        preleveur: '/preleveur',
        pro: '/pro',
        patient: '/patient',
      };
      
      const defaultRoute = roleRoutes[user.value.role] || '/patient';
      return navigateTo(defaultRoute);
    }
    return;
  }
});
