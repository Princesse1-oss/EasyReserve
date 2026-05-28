import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

export interface ReservationSummary {
  id: number;
  trajet?: { id: number; ville_depart: string; ville_arrivee: string; date_depart: string; heure_depart: string; prix: number; };
  trajet_detail?: { id: number; ville_depart: string; ville_arrivee: string; date_depart: string; heure_depart: string; prix: number; };
  nombre_places: number;
  passager_nom: string;
  passager_tel: string;
  statut: string;
  created_at?: string;
}

export interface TrajetDetail {
  id: number;
  ville_depart: string;
  ville_arrivee: string;
  date_depart: string;
  heure_depart: string;
  prix: number;
  places_disponibles: number;
  bus_details?: { matricule: string; type_bus: string; agence_nom?: string; };
}

@Component({
  selector: 'app-client-reservation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './client-reservation.html',
  styleUrl: './client-reservation.scss'
})
export class ClientReservation implements OnInit {
  private readonly apiUrl = environment.apiUrl;
  bookingForm!: FormGroup;
  trajet: TrajetDetail | null = null;
  reservationsHistory: ReservationSummary[] = [];
  loading = true;
  processing = false;
  errorText = '';
  successText = '';
  trajetId: number | null = null;
  mode: 'reservation' | 'historique' = 'reservation';

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

    const trajetIdParam = this.route.snapshot.paramMap.get('id');
    
    if (trajetIdParam) {
      this.mode = 'reservation';
      this.trajetId = Number(trajetIdParam);
      this.loadTripDetails(this.trajetId);
    } else {
      this.mode = 'historique';
      this.loadReservationHistory();
    }
  }

  loadTripDetails(id: number): void {
    this.loading = true;
    this.http.get<TrajetDetail>(`${this.apiUrl}/trajets/${id}/`).subscribe({
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

  loadReservationHistory(): void {
    this.loading = true;
    const user = this.auth.getCurrentUser();
    
    if (!user?.id) {
      this.errorText = 'Utilisateur non authentifié.';
      this.loading = false;
      return;
    }

    this.http.get<ReservationSummary[] | { results?: ReservationSummary[] }>(
      `${this.apiUrl}/reservations/`,
      { params: { client: user.id.toString() } }
    ).subscribe({
      next: (response) => {
        const data = Array.isArray(response) ? response : (response as { results?: ReservationSummary[] })?.results || [];
        this.reservationsHistory = data;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erreur chargement historique:', err);
        this.errorText = 'Impossible de charger vos réservations.';
        this.loading = false;
      }
    });
  }

  private initForm(): void {
    if (!this.trajet) return;
    const maxPlaces = this.trajet.places_disponibles || 1;
    this.bookingForm = this.fb.group({
      nombre_places: [1, [Validators.required, Validators.min(1), Validators.max(maxPlaces)]],
      passager_nom: ['', [Validators.required, Validators.minLength(2)]],
      passager_tel: ['', [Validators.required, Validators.pattern(/^[0-9]{9,15}$/)]],
      mode_paiement: ['orange_money', Validators.required]
    });
  }

  // ✅ MÉTHODE PRINCIPALE : Création réservation + redirection vers paiement
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
      statut: 'en_attente'
    };

    console.log('📤 Payload réservation:', payload);

    this.http.post<{ id: number }>(`${this.apiUrl}/reservations/`, payload).subscribe({
      next: (reservation) => {
        console.log('✅ Réservation créée:', reservation);
        this.successText = '🎉 Réservation confirmée ! Redirection vers le paiement...';
        
        // ✅ REDIRECTION VERS CLIENT-PAIEMENT AVEC L'ID DE LA RÉSERVATION
        setTimeout(() => {
          this.router.navigate(['/client/paiement'], { 
            queryParams: { reservationId: reservation.id } 
          });
        }, 1500);
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

  goToTrajets(): void {
    this.router.navigate(['/client/trajets']);
  }

  cancel(): void {
    this.router.navigate(['/client/trajets']);
  }
}