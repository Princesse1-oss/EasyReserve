import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-gestionnaire-reservations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './reservations.html',
  styleUrl: './reservations.scss'
})
export class GestionnaireReservations implements OnInit {
  private readonly apiUrl = environment.apiUrl;
  trajetsStatus: any[] = [];
  reservations: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadOccupancyMetrics();
    this.loadReservations();
  }

  loadOccupancyMetrics(): void {
    this.http.get<any>(`${this.apiUrl}/trajets/`).subscribe({
      next: (data) => this.trajetsStatus = data?.results || data || []
    });
  }

  loadReservations(): void {
    this.http.get<any>(`${this.apiUrl}/reservations/`).subscribe({
      next: (data) => this.reservations = data?.results || data || []
    });
  }

  validerAchat(id: number): void {
    if (!confirm('Confirmer le paiement et générer le billet PDF ?')) return;
    this.http.post<any>(`${this.apiUrl}/reservations/${id}/confirmer/`, {}).subscribe({
      next: () => {
        alert('Réservation confirmée avec succès !');
        this.loadReservations();
        this.loadOccupancyMetrics();
      }
    });
  }
}
