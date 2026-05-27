import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject<AuthService>(AuthService);
  const token = authService.getToken();

  // 💡 Optimisation : Détection plus robuste des routes publiques d'authentification
  const isTokenUrl = req.url.includes('/token/');
  const isRegisterUrl = req.url.includes('/users/register/');
  const isPublicUrl = isTokenUrl || isRegisterUrl;

  // 💡 Sécurité : On injecte le token uniquement s'il existe physiquement ET que ce n'est pas une route publique
  const authReq = token && !isPublicUrl
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si l'erreur est 401 (Non autorisé) et qu'on ne tente pas déjà de rafraîchir ou de se connecter
      if (error.status === 401 && !isPublicUrl && !req.url.includes('/token/refresh/')) {
        return authService.refreshToken().pipe(
          switchMap((response) => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${response.access}` },
            });
            return next(retryReq);
          }),
          catchError((refreshError: unknown) => {
            // Si le refresh token a expiré lui aussi, déconnexion immédiate
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
