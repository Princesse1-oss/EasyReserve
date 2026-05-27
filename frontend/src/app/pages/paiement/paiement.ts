import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PaiementService } from '../../services/paiement.service';
import { ReservationService, Reservation } from '../../services/reservation.service';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-paiement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, Navbar],
  templateUrl: './paiement.html',
  styleUrl: './paiement.css'
})
export class Paiement implements OnInit {
  paiementForm!: FormGroup;
  reservation!: Reservation;
  loadingData = true;
  submitting = false;
  erreur = '';
  succes = '';
  methodeSelectionnee: 'orange_money' | 'mtn_money' | 'carte_bancaire' = 'orange_money';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private paiementService: PaiementService,
    private reservationService: ReservationService
  ) {}

  ngOnInit(): void {
    const reservationId = this.route.snapshot.queryParamMap.get('reservationId');
    if (reservationId) {
      this.chargerDetailsReservation(Number(reservationId));
    } else {
      this.router.navigate(['/mes-reservations']);
    }
  }

  chargerDetailsReservation(id: number): void {
    this.reservationService.getReservation(id).subscribe({
      next: (data) => {
        this.reservation = data;
        this.loadingData = false;
        this.initialiserFormulaire();
      },
      error: () => {
        this.erreur = 'Impossible de charger les spécifications de votre réservation.';
        this.loadingData = false;
      }
    });
  }

  initialiserFormulaire(): void {
    this.paiementForm = this.fb.group({
      methode: [this.methodeSelectionnee, Validators.required],
      montant: [this.reservation.trajet_detail.prix, Validators.required],
      transaction_id: ['', [Validators.required, Validators.minLength(6)]],
      telephone_paiement: ['', [Validators.pattern('^[0-9]{9,15}$')]]
    });
  }

  changerMethode(methode: 'orange_money' | 'mtn_money' | 'carte_bancaire'): void {
    this.methodeSelectionnee = methode;
    this.paiementForm.patchValue({ methode: methode });
    
    const telephoneControl = this.paiementForm.get('telephone_paiement');
    if (methode === 'carte_bancaire') {
      telephoneControl?.clearValidators();
    } else {
      telephoneControl?.setValidators([Validators.required, Validators.pattern('^[0-9]{9,15}$')]);
    }
    telephoneControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.paiementForm.invalid || this.submitting) return;

    this.submitting = true;
    this.erreur = '';
    this.succes = '';

    const payload = {
      reservation: this.reservation.id,
      montant: Number(this.paiementForm.value.montant),
      methode: this.paiementForm.value.methode,
      transaction_id: this.paiementForm.value.transaction_id,
      telephone_paiement: this.paiementForm.value.telephone_paiement || null
    };

    this.paiementService.creerPaiement(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.succes = 'Déclaration de transaction transmise ! En attente de validation comptable.';
        setTimeout(() => this.router.navigate(['/mes-reservations']), 2000);
      },
      error: (err) => {
        this.submitting = false;
        this.erreur = err.error?.detail || err.error?.transaction_id?.[0] || 'Erreur lors du traitement du versement.';
      }
    });
  }
}
