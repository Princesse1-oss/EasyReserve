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

  // 💡 Correction : Redirection révisée vers /gestionnaire puisque /dashboard n'existe plus
  router.navigate(['/gestionnaire']);
  return false;
};

// Guard pour les pages publiques (login/register)
// Redirige vers la bonne page d'accueil si déjà connecté
export const publicGuard: CanActivateFn = (): boolean => {
  const authService = inject<AuthService>(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    // 💡 Correction : Redirection intelligente selon le rôle pour éviter les erreurs de routes inexistantes
    const user = authService.getCurrentUser();
    if (user?.role === 'ADMIN' || user?.role === 'GESTIONNAIRE') {
      router.navigate(['/gestionnaire']);
    } else {
      router.navigate(['/trajets']);
    }
    return false;
  }

  return true;
};
