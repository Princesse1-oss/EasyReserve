import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean => {
  const authService = inject<AuthService>(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const adminGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean => {
  const authService = inject<AuthService>(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.isAdmin()) {
    return true;
  }

  // ✅ Redirection vers le dashboard principal
  router.navigate(['/Gestionnaire']);
  return false;
};

// ✅ Guard pour les pages réservées aux gestionnaires ET admins (pas les clients)
export const gestionnaireGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean => {
  const authService = inject<AuthService>(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const user = authService.getCurrentUser();
  if (user?.role === 'ADMIN' || user?.role === 'GESTIONNAIRE') {
    return true;
  }

  // Client redirigé vers son espace
  router.navigate(['/client/trajets']);
  return false;
};

// Guard pour les pages publiques (login/register)
// Redirige vers la bonne page d'accueil si déjà connecté
export const publicGuard: CanActivateFn = (): boolean => {
  const authService = inject<AuthService>(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    const user = authService.getCurrentUser();
    if (user?.role === 'ADMIN' || user?.role === 'GESTIONNAIRE') {
      router.navigate(['/Gestionnaire']);
    } else {
      router.navigate(['/client/trajets']);
    }
    return false;
  }

  return true;
};
