import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map } from 'rxjs'; // ✅ AJOUT DE 'map' ICI
import { environment } from '../../environments/environment';

export interface LoginRequest {
  username: string; 
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  agence_id?: number | null;
  role?: 'CLIENT' | 'GESTIONNAIRE' | 'ADMIN';
}

export interface AuthResponse {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'CLIENT' | 'ADMIN' | 'GESTIONNAIRE';
  first_name?: string;
  last_name?: string;
  telephone?: string;
  is_active?: boolean;
  agence_id?: number | null;
  agence_nom?: string;
  date_joined?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl: string = environment.apiUrl;

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

// ===== LOGIN — CORRIGÉ ✅ =====
login(credentials: LoginRequest): Observable<AuthResponse> {
  return this.http
    .post<AuthResponse>(`${this.apiUrl}/token/`, credentials)
    .pipe(
      tap((response: AuthResponse) => {
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
      }),
      tap((response: AuthResponse) => {
        try {
          const token = response.access;
          const payload = JSON.parse(atob(token.split('.')[1]));
          
          const currentUser: User = {
            id: payload.user_id || payload.id,
            username: payload.username,
            email: payload.email,
            role: payload.role || 'CLIENT',
            agence_id: payload.agence_id || null,
            first_name: payload.first_name,
            last_name: payload.last_name,
            telephone: payload.telephone,
            is_active: payload.is_active,
            agence_nom: payload.agence_nom,
            date_joined: payload.date_joined,
          };
          localStorage.setItem('current_user', JSON.stringify(currentUser));
        } catch (e) {
          console.warn('⚠️ Erreur décodage token login:', e);
        }
      })
    );
}
  // ===== REGISTER — CORRIGÉ ✅ =====
  register(data: RegisterRequest): Observable<{ user: User; tokens: AuthResponse }> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/users/register/`, data)
      .pipe(
        // ✅ 1. Stocker les tokens (tap ne modifie pas le flux)
        tap((response: AuthResponse) => {
          localStorage.setItem('access_token', response.access);
          localStorage.setItem('refresh_token', response.refresh);
        }),
        
        // ✅ 2. Décoder le token pour extraire le rôle (avec typage explicite)
        tap((response: AuthResponse) => {
          try {
            const token = response.access;
            const payload = JSON.parse(atob(token.split('.')[1]));
            
            const currentUser: User = {
              id: payload.user_id || payload.id,
              username: payload.username,
              email: payload.email,
              role: payload.role || 'CLIENT',
              agence_id: payload.agence_id || null,
              first_name: payload.first_name,
              last_name: payload.last_name,
            };
            localStorage.setItem('current_user', JSON.stringify(currentUser));
          } catch (e) {
            console.warn('⚠️ Erreur décodage token:', e);
          }
        }),
        
        // ✅ 3. Retourner user + tokens avec typage explicite sur 'response'
        map((response: AuthResponse): { user: User; tokens: AuthResponse } => {
          const user = this.getCurrentUser();
          return { 
            user: user || { id: 0, username: '', email: '', role: 'CLIENT' }, 
            tokens: response 
          };
        })
      );
  }

  // ===== REFRESH TOKEN =====
  refreshToken(): Observable<AuthResponse> {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
      throw new Error('No refresh token available');
    }
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/token/refresh/`, { refresh })
      .pipe(
        tap((response: AuthResponse) => {
          localStorage.setItem('access_token', response.access);
          localStorage.setItem('refresh_token', response.refresh);
        })
      );
  }

  // ===== LOGOUT =====
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    this.router.navigate(['/login']);
  }

  // ===== UTILITAIRES =====
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return !this.isTokenExpired(token);
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'ADMIN';
  }

  isGestionnaire(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'GESTIONNAIRE';
  }

  isClient(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'CLIENT';
  }

  // ✅ getCurrentUser avec typage sécurisé
  getCurrentUser(): User | null {
    // 1️⃣ Essayer localStorage d'abord (plus fiable)
    const stored = localStorage.getItem('current_user');
    if (stored) {
      try {
        return JSON.parse(stored) as User;
      } catch {}
    }
    
    // 2️⃣ Sinon décoder le token JWT
    const token = this.getToken();
    if (!token) return null;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const payload: any = JSON.parse(jsonPayload);
      
      return {
        id: payload.user_id || payload.id,
        username: payload.username,
        email: payload.email,
        role: payload.role || 'CLIENT',
        first_name: payload.first_name,
        last_name: payload.last_name,
        telephone: payload.telephone,
        is_active: payload.is_active,
        agence_id: payload.agence_id ?? null,
        agence_nom: payload.agence_nom,
        date_joined: payload.date_joined,
      };
    } catch (e) {
      console.warn('⚠️ Erreur décodage token:', e);
      return null;
    }
  }

  // ✅ Méthode utilitaire pour récupérer le rôle rapidement
  getUserRole(): 'CLIENT' | 'GESTIONNAIRE' | 'ADMIN' | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  // ✅ Vérification d'expiration du token
  private isTokenExpired(token: string): boolean {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}

