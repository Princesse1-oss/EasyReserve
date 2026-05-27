import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-client-reservation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-reservation.html',
  styleUrl: './client-reservation.scss'
})
export class ClientReservation implements OnInit {
  private readonly apiUrl = environment.apiUrl;
  bookingForm!: FormGroup;
  trajet: any = null;
  loading = true;
  processing = false;
  errorText = '';
  successText = '';
  trajetId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { return: this.router.url } });
      return;
    }

    this.trajetId = Number(this.route.snapshot.paramMap.get('id'));
    
    if (this.trajetId) {
      this.loadTripDetails(this.trajetId);
    } else {
      this.router.navigate(['/client/trajets']);
    }
  }

  loadTripDetails(id: number): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/trajets/${id}/`).subscribe({
      next: (data) => {
        this.trajet = data;
        this.initForm();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement trajet:', err);
        this.errorText = 'Trajet non trouvé ou indisponible.';
        this.loading = false;
      }
    });
  }

  private initForm(): void {
    const maxPlaces = this.trajet?.places_disponibles || 1;
    this.bookingForm = this.fb.group({
      nombre_places: [1, [Validators.required, Validators.min(1), Validators.max(maxPlaces)]],
      passager_nom: ['', [Validators.required, Validators.minLength(2)]],
      passager_tel: ['', [Validators.required, Validators.pattern(/^[0-9]{9,15}$/)]],
      mode_paiement: ['orange_money', Validators.required]
    });
  }

  submitReservation(): void {
    if (this.bookingForm.invalid || !this.trajet) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    this.processing = true;
    this.errorText = '';
    this.successText = '';

    const payload = {
      trajet: this.trajet.id,
      nombre_places: this.bookingForm.value.nombre_places,
      passager_nom: this.bookingForm.value.passager_nom.trim(),
      passager_tel: this.bookingForm.value.passager_tel.trim(),
      mode_paiement: this.bookingForm.value.mode_paiement,
      statut: 'confirmee'
    };

    console.log('📤 Payload réservation:', payload);

    this.http.post<any>(`${this.apiUrl}/reservations/`, payload).subscribe({
      next: (reservation) => {
        console.log('✅ Réservation créée:', reservation);
        this.successText = '🎉 Réservation confirmée ! Redirection...';
        setTimeout(() => {
          this.router.navigate(['/client/mes-reservations']);
        }, 2000);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Erreur réservation:', err);
        this.processing = false;
        
        if (err.status === 0) {
          this.errorText = '🔌 Serveur injoignable.';
        } else if (err.error?.nombre_places) {
          this.errorText = `Places: ${err.error.nombre_places[0]}`;
        } else if (err.error?.passager_nom) {
          this.errorText = `Nom: ${err.error.passager_nom[0]}`;
        } else if (err.error?.passager_tel) {
          this.errorText = `Téléphone: ${err.error.passager_tel[0]}`;
        } else if (err.error?.trajet) {
          this.errorText = `Trajet: ${err.error.trajet[0]}`;
        } else if (err.error?.detail) {
          this.errorText = err.error.detail;
        } else if (err.error?.non_field_errors) {
          this.errorText = err.error.non_field_errors[0];
        } else {
          this.errorText = 'Erreur lors de la réservation. Réessayez.';
        }
      }
    });
  }

  // ✅ MÉTHODES UTILISATEUR & DÉCONNEXION
  getUserName(): string {
    const user = this.auth.getCurrentUser();
    return user?.first_name || user?.username || 'Client';
  }

  getUserEmail(): string {
    const user = this.auth.getCurrentUser();
    return user?.email || '';
  }

  getUserAvatar(): string {
    const user = this.auth.getCurrentUser();
    const initials = user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'C';
    return `https://ui-avatars.com/api/?name=${initials}&background=667eea&color=fff&size=128`;
  }

  logout(): void {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      this.auth.logout();
    }
  }

  // ✅ UTILITAIRES D'AFFICHAGE
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  }

  get totalPrice(): number {
    if (!this.trajet || !this.bookingForm?.value?.nombre_places) return 0;
    return this.trajet.prix * this.bookingForm.value.nombre_places;
  }

  cancel(): void {
    this.router.navigate(['/client/trajets']);
  }
}