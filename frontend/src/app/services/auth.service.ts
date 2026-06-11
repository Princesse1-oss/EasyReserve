import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable, throwError, tap, map } from 'rxjs'; // ✅ Ajout des opérateurs

// ✅ Interface User exportée pour être réutilisée ailleurs
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  telephone: string;
  profile_picture: string | null;
  role: 'ADMIN' | 'GESTIONNAIRE' | 'CLIENT';
  agence_id?: number | null;
  is_active?: boolean;
  date_joined?: string;
}

// ✅ Interface pour la réponse JWT du backend
interface JwtResponse {
  access: string;
  refresh?: string;
  user?: Partial<User>;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(private http: HttpClient, private router: Router) {
    const stored = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      stored ? JSON.parse(stored) : null
    );
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  // ✅ Helpers de rôle
  isAdmin(): boolean { return this.currentUserSubject.value?.role === 'ADMIN'; }
  isGestionnaire(): boolean { return this.currentUserSubject.value?.role === 'GESTIONNAIRE'; }
  isClient(): boolean { return this.currentUserSubject.value?.role === 'CLIENT'; }

  updateCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const decoded: any = jwtDecode(token);
      // exp est en secondes Unix, Date.now() en millisecondes
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        // Token expiré : nettoyage silencieux
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // ✅ Rafraîchissement du token
  refreshToken(): Observable<{ access: string; refresh?: string }> {
    const refresh = localStorage.getItem('refreshToken');
    if (!refresh) return throwError(() => new Error('No refresh token'));
    
    return this.http.post<{ access: string; refresh?: string }>(
      `${this.apiUrl}/auth/jwt/refresh/`,
      { refresh }
    );
  }

  // ✅ MÉTHODE LOGIN CORRIGÉE (plus d'erreurs TypeScript)
  login(credentials: { username: string; password: string }): Observable<User | null> {
    return this.http.post<JwtResponse>(`${this.apiUrl}/auth/jwt/create/`, credentials).pipe(
      tap((response: JwtResponse) => { // ✅ Typage explicite de response
        if (response.access) {
          localStorage.setItem('token', response.access);
          if (response.refresh) {
            localStorage.setItem('refreshToken', response.refresh);
          }
          
          try {
            const decoded: any = jwtDecode(response.access);
            const user: User = {
              id: decoded.user_id,
              username: decoded.username,
              email: decoded.email,
              first_name: decoded.first_name || '',
              last_name: decoded.last_name || '',
              telephone: decoded.telephone || '',
              profile_picture: decoded.profile_picture || null,
              role: (decoded.role || 'CLIENT') as 'ADMIN' | 'GESTIONNAIRE' | 'CLIENT',
              agence_id: decoded.agence_id || null,
              is_active: decoded.is_active,
              date_joined: decoded.date_joined
            };
            this.currentUserSubject.next(user);
            localStorage.setItem('currentUser', JSON.stringify(user));
            console.log('✅ User mis à jour:', user.username);
          } catch (e) {
            console.warn('⚠️ Token decode error:', e);
          }
        }
      }),
      // ✅ Retourne l'utilisateur courant (pas besoin de 'response' ici)
      map(() => this.currentUserSubject.value) // ✅ Utilise () => pour ignorer la valeur d'entrée
    );
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/register/`, data);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }
}