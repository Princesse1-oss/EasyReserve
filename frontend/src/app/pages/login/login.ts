import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginForm: FormGroup;
  loading = false;
  erreur = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]],
    });

    // Si déjà connecté, redirige selon le rôle
    if (this.authService.isLoggedIn()) {
      this.redirigerSelonRole();
    }
  }

  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }

  // ✅ MÉTHODE DE REDIRECTION CORRIGÉE
  redirigerSelonRole(): void {
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      console.warn('⚠️ Aucun utilisateur trouvé, redirection vers login');
      this.router.navigate(['/login']);
      return;
    }

    console.log('🔀 Redirection pour rôle:', user.role);
    
    switch (user.role) {
      case 'ADMIN':
        // 👑 Admin → Dashboard principal
        this.router.navigate(['/dashboard']);
        break;
        
      case 'GESTIONNAIRE':
        // 👨‍💼 Gestionnaire → Espace gestionnaire
        this.router.navigate(['/gestionnaire']);
        break;
        
      case 'CLIENT':
        // 🎫 CLIENT → Page de recherche de trajets (ROUTE CORRIGÉE)
        // ✅ '/client' n'existe pas, la bonne route est '/client/trajets'
        console.log('🎫 Redirection CLIENT vers /client/trajets');
        this.router.navigate(['/client/trajets']);
        break;
        
      default:
        // 🔒 Sécurité : rôle inconnu → déconnexion
        console.warn('⚠️ Rôle inconnu:', user.role);
        this.authService.logout();
        this.router.navigate(['/login']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    
    this.loading = true;
    this.erreur = '';

    console.log('🔐 Tentative de login avec:', this.loginForm.value);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        console.log('✅ Login réussi, tokens stockés');
        
        // ✅ Petit délai pour laisser le temps au décodage du token
        setTimeout(() => {
          const user = this.authService.getCurrentUser();
          console.log('👤 getCurrentUser() retourne:', user);
          
          this.loading = false;
          this.redirigerSelonRole();
        }, 100);
      },
      error: (err) => {
        console.error('❌ Erreur login:', err);
        this.loading = false;
        
        if (err.status === 401) {
          this.erreur = "Nom d'utilisateur ou mot de passe incorrect.";
        } else if (err.status === 0) {
          this.erreur = "🔌 Serveur injoignable. Django tourne-t-il ?";
        } else {
          this.erreur = 'Une erreur est survenue. Veuillez réessayer.';
        }
      },
    });
  }
}