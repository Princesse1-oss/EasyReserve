import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

// ✅ Interface pour le tableau "Taux de Disponibilité"
export interface TrajetStatus {
  id: number;
  ville_depart: string;
  ville_arrivee: string;
  date_depart: string;
  heure_depart: string;
  places_disponibles: number;
}

// ✅ Interface pour les réservations
export interface ReservationItem {
  id: number;
  client_username: string;
  trajet_detail?: { ville_depart: string; ville_arrivee: string };
  trajet?: { id: number };  // ✅ Pour identifier le trajet réservé
  place?: number;
  place_detail?: { numero_siege: number };
  statut: 'en_attente' | 'confirmee' | 'annulee';
}

@Component({
  selector: 'app-gestionnaire-reservations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './reservations.html',
  styleUrl: './reservations.scss'
})
export class GestionnaireReservations implements OnInit {
  private apiUrl = environment.apiUrl;
  
  trajetsStatus: TrajetStatus[] = [];
  reservations: ReservationItem[] = [];
  loading = false;
  selectedTrajet: TrajetStatus | null = null;
  showDetails = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    
    // 1️⃣ Charger les trajets ET les réservations en parallèle
    Promise.all([
      this.http.get<TrajetStatus[]>(`${this.apiUrl}/trajets/`).toPromise(),
      this.http.get<ReservationItem[]>(`${this.apiUrl}/reservations/`).toPromise()
    ]).then(([trajetsResponse, reservationsResponse]) => {
      
      // Extraction sécurisée des données
      const trajetsData: TrajetStatus[] = Array.isArray(trajetsResponse) 
        ? trajetsResponse 
        : (trajetsResponse as any)?.results || [];
      
      const reservationsData: ReservationItem[] = Array.isArray(reservationsResponse)
        ? reservationsResponse
        : (reservationsResponse as any)?.results || [];
      
      // ✅ Étape 1 : Extraire les IDs des trajets déjà réservés
      const reservedTrajetIds = new Set(
        reservationsData
          .filter(r => r.trajet?.id || r.trajet_detail)  // Réservations liées à un trajet
          .map(r => r.trajet?.id)
          .filter((id): id is number => id !== undefined)
      );
      
      // ✅ Étape 2 : Filtrer les trajets disponibles
      this.trajetsStatus = trajetsData.filter(trajet => 
        // Condition 1 : Places disponibles > 0
        trajet.places_disponibles > 0 &&
        // Condition 2 : Trajet NON déjà réservé
        !reservedTrajetIds.has(trajet.id)
      );
      
      this.reservations = reservationsData;
      this.loading = false;
      
    }).catch((err: HttpErrorResponse) => {
      console.error('Erreur chargement données:', err);
      this.trajetsStatus = [];
      this.reservations = [];
      this.loading = false;
    });
  }

  voirDetails(trajet: TrajetStatus): void {
    this.selectedTrajet = trajet;
    this.showDetails = true;
  }

  modifierTrajet(trajet: TrajetStatus): void {
    console.log('Modifier trajet:', trajet.id);
  }

  supprimerTrajet(trajet: TrajetStatus): void {
    const confirmation = confirm(
      `⚠️ SUPPRESSION TOTALE\n\nÊtes-vous sûr de vouloir supprimer CE TRAJET et TOUTES les réservations associées ?\n\nTrajet: ${trajet.ville_depart} → ${trajet.ville_arrivee}\nDate: ${trajet.date_depart}\n\nCette action est IRREVERSIBLE.`
    );

    if (confirmation) {
      this.http.delete(`${this.apiUrl}/trajets/${trajet.id}/`).subscribe({
        next: () => {
          alert('✅ Trajet et toutes ses réservations ont été supprimés.');
          this.loadData();
        },
        error: (err: HttpErrorResponse) => {
          console.error('Erreur suppression:', err);
          if (err.status === 400) {
            alert('❌ Impossible: Ce trajet a des réservations confirmées.');
          } else {
            alert('Erreur lors de la suppression.');
          }
        }
      });
    }
  }

  validerAchat(id: number): void {
    this.http.patch(`${this.apiUrl}/reservations/${id}/`, { statut: 'confirmee' }).subscribe({
      next: () => {
        this.reservations = this.reservations.map((r: ReservationItem) => 
          r.id === id ? { ...r, statut: 'confirmee' } : r
        );
        // ✅ Recharger pour mettre à jour la liste des trajets disponibles
        this.loadData();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erreur validation:', err);
        alert('Erreur lors de la validation.');
      }
    });
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedTrajet = null;
  }

  formatDate(dateStr: string): string {
    const date: Date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  }
}