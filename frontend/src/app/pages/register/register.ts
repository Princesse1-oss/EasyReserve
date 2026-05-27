import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
  registerForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      first_name: [''],
      last_name: [''],
      telephone: [''],  // ✅ Ajouté pour cohérence avec le modèle User
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirm: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('password_confirm')?.value
      ? null : { 'mismatch': true };
  }

  onSubmit(): void {
    // ✅ 1. Validation du formulaire
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // ✅ 2. Construction du payload avec rôle CLIENT par défaut
    const formValue = this.registerForm.value;
    const payload = {
      email: formValue.email?.trim()?.toLowerCase(),
      username: formValue.username?.trim(),
      first_name: formValue.first_name?.trim() || '',
      last_name: formValue.last_name?.trim() || '',
      telephone: formValue.telephone?.trim() || '',
      password: formValue.password,
      password_confirm: formValue.password_confirm,
      role: 'CLIENT' as const 
    };

    console.log('📤 Payload inscription:', payload);

    // ✅ 3. Appel au service d'authentification
    this.authService.register(payload).subscribe({
      next: ({ user }) => {
        console.log('✅ Inscription réussie, utilisateur:', user);
        this.successMessage = '✅ Inscription réussie ! Redirection...';
        this.isLoading = false;
        
        // ✅ 4. Redirection selon le rôle (avec délai pour afficher le message)
        setTimeout(() => {
          switch (user.role) {
            case 'CLIENT':
              // 🎫 Client → Page publique de recherche de trajets
              console.log('🔀 Redirection CLIENT → /client/trajets');
              this.router.navigate(['/client/clients']);
              break;
            case 'GESTIONNAIRE':
              // 👨‍💼 Gestionnaire → Dashboard protégé
              console.log('🔀 Redirection GESTIONNAIRE → /dashboard');
              this.router.navigate(['/dashboard']);
              break;
            case 'ADMIN':
              // 👑 Admin → Dashboard complet
              console.log('🔀 Redirection ADMIN → /dashboard');
              this.router.navigate(['/dashboard']);
              break;
            default:
              // 🔒 Fallback sécurisé en cas de rôle inconnu
              console.warn('⚠️ Rôle inconnu, redirection vers login');
              this.router.navigate(['/login']);
          }
        }, 1500);
      },
      error: (err) => {
        console.error('❌ Erreur inscription:', err);
        this.isLoading = false;
        
        // ✅ 5. Gestion précise des erreurs Django
        if (err.status === 0) {
          this.errorMessage = '🔌 Serveur injoignable. Vérifiez que Django tourne.';
        } else if (err.error?.username) {
          this.errorMessage = `Username: ${err.error.username[0]}`;
        } else if (err.error?.email) {
          this.errorMessage = `Email: ${err.error.email[0]}`;
        } else if (err.error?.password) {
          this.errorMessage = `Mot de passe: ${err.error.password[0]}`;
        } else if (err.error?.password_confirm) {
          this.errorMessage = `Confirmation: ${err.error.password_confirm[0]}`;
        } else if (err.error?.non_field_errors) {
          this.errorMessage = err.error.non_field_errors[0];
        } else if (err.error?.telephone) {
          this.errorMessage = `Téléphone: ${err.error.telephone[0]}`;
        } else {
          this.errorMessage = 'Une erreur est survenue. Réessayez.';
        }
      }
    });
  }
}