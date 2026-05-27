import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';


interface Trajet {
  id: number;
  ville_depart: string;
  ville_arrivee: string;
  date_depart: string;
  heure_depart: string;
  prix: number;
  places_disponibles: number;
  statut: string;
  bus_details?: {
    matricule: string;
    type_bus: string;
    capacite?: number;
    agence_nom?: string;
  };
  agence_nom?: string;
}

@Component({
  selector: 'app-client-trajets',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './client-trajets.html',
  styleUrl: './client-trajets.scss'
})
export class ClientTrajets implements OnInit {
  private readonly apiUrl = environment.apiUrl;
  searchForm!: FormGroup;
  trajets: Trajet[] = [];
  loading = false;
  searched = false;
  today = new Date().toISOString().split('T')[0];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.searchForm = this.fb.group({
      ville_depart: [''],
      ville_arrivee: [''],
      date_depart: [this.today]
    });
    this.loadTrajets();
  }

  loadTrajets(): void {
    this.loading = true;
    
    const params: any = {};
    const { ville_depart, ville_arrivee, date_depart } = this.searchForm.value;
    
    if (ville_depart?.trim()) params.ville_depart__icontains = ville_depart.trim();
    if (ville_arrivee?.trim()) params.ville_arrivee__icontains = ville_arrivee.trim();
    if (date_depart) params.date_depart = date_depart;
    params.places_disponibles__gt = 0;

    this.http.get<any>(`${this.apiUrl}/trajets/`, { params }).subscribe({
      next: (data) => {
        this.trajets = data?.results || data || [];
        this.loading = false;
        this.searched = true;
      },
      error: (err) => {
        console.error('Erreur chargement trajets:', err);
        this.trajets = [];
        this.loading = false;
        this.searched = true;
      }
    });
  }

  search(): void {
    this.searched = false;
    this.loadTrajets();
  }

  resetSearch(): void {
    this.searchForm.reset({ date_depart: this.today });
    this.loadTrajets();
  }

  goToReservation(trajetId: number): void {
    this.router.navigate(['/client/reservation', trajetId]);
  }

  // ✅ MÉTHODES POUR AFFICHER LES INFOS UTILISATEUR
  getUserName(): string {
    const user = this.auth.getCurrentUser();
    return user?.first_name || user?.username || 'Client';
  }

  getUserEmail(): string {
    const user = this.auth.getCurrentUser();
    return user?.email || '';
  }

  getUserAvatar(): string {
    // Génère un avatar avec les initiales ou retourne une image par défaut
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
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  }
}