import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-client-paiement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-paiement.html',
  styleUrl: './client-paiement.scss'
})
export class ClientPaiement implements OnInit {
  private readonly apiUrl = environment.apiUrl;
  paiementForm!: FormGroup;
  reservation: any = null;
  loading = true;
  processing = false;
  success = false;
  errorText = '';
  
  // ✅ Valeurs exactement comme définies dans le backend (METHODE_CHOICES)
  selectedMethod: 'orange_money' | 'mtn_momo' | 'carte' = 'orange_money';

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    // ✅ Vérification authentification
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { return: this.router.url } });
      return;
    }

    const resId = this.route.snapshot.queryParamMap.get('reservationId');
    if (resId) {
      this.loadReservationSummary(Number(resId));
    } else {
      this.router.navigate(['/client/trajets']);
    }
  }

  loadReservationSummary(id: number): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/reservations/${id}/`).subscribe({
      next: (data) => {
        this.reservation = data;
        this.initForm();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement réservation:', err);
        this.errorText = 'Impossible de charger les détails de la réservation.';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/client/trajets']), 2000);
      }
    });
  }

  private initForm(): void {
    this.paiementForm = this.fb.group({
      // ✅ transaction_id optionnel pour le MVP (simulé par le backend)
      transaction_id: [''],
      // ✅ Téléphone requis seulement pour Mobile Money
      telephone_paiement: ['', [Validators.required, Validators.pattern(/^[0-9]{9,15}$/)]]
    });
    
    // Mise à jour des validateurs selon la méthode sélectionnée
    this.updatePhoneValidation();
  }

  // ✅ Change la méthode de paiement et adapte la validation
  setMethod(method: 'orange_money' | 'mtn_momo' | 'carte'): void {
    this.selectedMethod = method;
    this.updatePhoneValidation();
  }

  private updatePhoneValidation(): void {
    const phoneControl = this.paiementForm.get('telephone_paiement');
    
    if (this.selectedMethod === 'carte') {
      // Carte bancaire : téléphone non requis
      phoneControl?.clearValidators();
      phoneControl?.setValue(null);
    } else {
      // Mobile Money : téléphone requis et validé
      phoneControl?.setValidators([Validators.required, Validators.pattern(/^[0-9]{9,15}$/)]);
    }
    phoneControl?.updateValueAndValidity();
  }

  // ✅ Soumission du paiement
  processPayment(): void {
    if (this.paiementForm.invalid || !this.reservation) {
      this.paiementForm.markAllAsTouched();
      return;
    }

    this.processing = true;
    this.errorText = '';
    this.success = false;

    // ✅ Calcul du montant total : prix × nombre de places
    const prixUnitaire = this.reservation.trajet?.prix || this.reservation.trajet_detail?.prix || 0;
    const nombrePlaces = this.reservation.nombre_places || 1;
    const montantTotal = prixUnitaire * nombrePlaces;

    const payload = {
      reservation: this.reservation.id,
      montant: montantTotal,
      methode: this.selectedMethod,
      transaction_id: this.paiementForm.value.transaction_id?.trim() || null,
      telephone_paiement: this.selectedMethod !== 'carte' 
        ? this.paiementForm.value.telephone_paiement?.trim() 
        : null
    };

    console.log('📤 Payload paiement:', payload);

    this.http.post<any>(`${this.apiUrl}/paiements/`, payload).subscribe({
      next: (response) => {
        console.log('✅ Paiement enregistré:', response);
        this.processing = false;
        this.success = true;
        
        // ✅ Redirection vers l'historique après succès
        setTimeout(() => {
          this.router.navigate(['/client/mes-reservations']);
        }, 2500);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Erreur paiement:', err);
        this.processing = false;
        
        // ✅ Gestion précise des erreurs
        if (err.status === 0) {
          this.errorText = '🔌 Serveur injoignable. Vérifiez votre connexion.';
        } else if (err.error?.montant) {
          this.errorText = `Montant: ${err.error.montant[0]}`;
        } else if (err.error?.telephone_paiement) {
          this.errorText = `Téléphone: ${err.error.telephone_paiement[0]}`;
        } else if (err.error?.reservation) {
          this.errorText = `Réservation: ${err.error.reservation[0]}`;
        } else if (err.error?.detail) {
          this.errorText = err.error.detail;
        } else if (err.error?.non_field_errors) {
          this.errorText = err.error.non_field_errors[0];
        } else {
          this.errorText = 'Erreur lors du traitement du paiement. Réessayez.';
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

  // ✅ MÉTHODE DÉCONNEXION
  logout(): void {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      this.auth.logout();
    }
  }

  // ===== UTILITAIRES =====
  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  }

  get totalPrice(): number {
    if (!this.reservation) return 0;
    const prix = this.reservation.trajet?.prix || this.reservation.trajet_detail?.prix || 0;
    const places = this.reservation.nombre_places || 1;
    return prix * places;
  }

  cancel(): void {
    if (confirm('Annuler le paiement ? Vous pourrez reprendre plus tard.')) {
      this.router.navigate(['/client/trajets']);
    }
  }

  // Getter pour les messages d'erreur de validation
  get f() { return this.paiementForm.controls; }
}