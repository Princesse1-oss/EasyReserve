import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Navbar } from '../../components/navbar/navbar';

interface Trajet {
  id: number;
  bus: number;
  bus_matricule?: string;
  bus_type?: string;
  bus_capacite?: number;
  ville_depart: string;
  ville_arrivee: string;
  date_depart: string;
  heure_depart: string;
  prix: number;
  places_disponibles: number;
  statut?: 'planifie' | 'en_cours' | 'termine' | 'annule';
  agence_nom?: string;
}

interface Bus {
  id: number;
  matricule: string;
  capacite: number;
  type_bus: string;
  agence?: number | null;
  agence_nom?: string;
}

@Component({
  selector: 'app-trajets',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './trajets.html',
  styleUrl: './trajets.scss'
})
export class GestionnaireTrajets implements OnInit {
  private readonly apiUrl = environment.apiUrl;
  
  trajetForm!: FormGroup;
  trajets: Trajet[] = [];
  busDisponibles: Bus[] = [];
  
  loading = false;
  successMsg = '';
  errorMsg = '';
  
  // KPIs
  departsAujourdhui = 0;
  tauxOccupationMoyen = 78;
  alerteTarif = 'Aucune';
  revenuPrevisionnel = 0;

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadTrajets();
    this.loadBusDisponibles();
  }

  private initForm(): void {
    this.trajetForm = this.fb.group({
      ville_depart: ['', [Validators.required, Validators.minLength(2)]],
      ville_arrivee: ['', [Validators.required, Validators.minLength(2)]],
      date_depart: ['', Validators.required],
      heure_depart: ['', Validators.required],
      prix: ['', [Validators.required, Validators.min(500)]],
      bus: [null, Validators.required],
      places_disponibles: [null]
    });
  }

  // ===== CHARGEMENT DES TRAJETS =====
  loadTrajets(): void {
    this.loading = true;
    
    this.http.get<any>(`${this.apiUrl}/trajets/`).subscribe({
      next: (response) => {
        // ✅ Extraction sécurisée du format Django REST Framework
        const data = response?.results || (Array.isArray(response) ? response : []);
        
        // ✅ Enrichissement avec les infos du bus pour l'affichage
        this.trajets = data.map((t: any) => ({
          ...t,
          bus_matricule: t.bus_detail?.matricule || t.bus_matricule || `Bus #${t.bus}`,
          bus_type: t.bus_detail?.type_bus || t.bus_type || 'standard',
          bus_capacite: t.bus_detail?.capacite || t.bus_capacite || 45
        }));
        
        // ✅ Calcul des KPIs
        this.departsAujourdhui = this.trajets.filter((t: Trajet) => 
          t.date_depart === new Date().toISOString().split('T')[0]
        ).length;
        
        this.revenuPrevisionnel = this.trajets
          .filter((t: Trajet) => t.statut !== 'annule')
          .reduce((acc, t) => acc + (Number(t.prix) * (t.bus_capacite || 45)), 0);
        
        this.loading = false;
        console.log('✅ Trajets chargés:', this.trajets.length);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = 'Impossible de charger les trajets.';
        console.error('Erreur chargement trajets:', err);
      }
    });
  }

  // ===== CHARGEMENT DES BUS DISPONIBLES =====
  loadBusDisponibles(): void {
    const params: any = { is_active: 'true' };
    
    // ✅ Si gestionnaire, filtrer uniquement les bus de son agence
    if (this.authService.isGestionnaire()) {
      const user: any = this.authService.getCurrentUser();
      if (user?.agence_id) {
        params.agence = user.agence_id;
      }
    }
    
    this.http.get<any>(`${this.apiUrl}/bus/`, { params }).subscribe({
      next: (response) => {
        const data = response?.results || (Array.isArray(response) ? response : []);
        this.busDisponibles = data;
        console.log('🚌 Bus disponibles:', this.busDisponibles.length);
      },
      error: (err) => {
        console.error('Erreur chargement bus:', err);
        this.busDisponibles = [];
      }
    });
  }

  // ===== CRÉATION D'UN TRAJET =====
  onSubmit(): void {
    if (this.trajetForm.invalid) {
      this.trajetForm.markAllAsTouched();
      this.errorMsg = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    const rawValue = this.trajetForm.getRawValue();
    
    // ✅ Construction du payload pour Django
    const payload = {
      bus: Number(rawValue.bus),
      ville_depart: rawValue.ville_depart.trim(),
      ville_arrivee: rawValue.ville_arrivee.trim(),
      date_depart: rawValue.date_depart,
      heure_depart: rawValue.heure_depart,
      prix: Number(rawValue.prix),
      // ✅ Places disponibles = capacité du bus si non spécifié
      places_disponibles: rawValue.places_disponibles || 
        this.busDisponibles.find(b => b.id === rawValue.bus)?.capacite || 45,
      statut: 'planifie'
    };

    console.log('📤 Payload trajet:', payload);

    this.http.post<Trajet>(`${this.apiUrl}/trajets/`, payload).subscribe({
      next: (response) => {
        this.loading = false;
        this.successMsg = `✅ Trajet "${payload.ville_depart} → ${payload.ville_arrivee}" créé !`;
        
        this.trajetForm.reset({ 
          prix: '', 
          places_disponibles: null,
          bus: null 
        });
        
        // ✅ Rafraîchissement des listes
        this.loadTrajets();
        this.loadBusDisponibles();
        
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        console.error('❌ Erreur création trajet:', err);
        
        if (err.status === 400) {
          this.errorMsg = Object.entries(err.error || {})
            .map(([k, v]: any) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
            .join(' | ');
        } else if (err.status === 0) {
          this.errorMsg = '🔌 Serveur injoignable.';
        } else {
          this.errorMsg = 'Erreur lors de la création du trajet.';
        }
      }
    });
  }

  // ===== UTILITAIRES =====
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short', day: 'numeric', month: 'short' 
    });
  }

  getStatutColor(statut: string): string {
    const colors: Record<string, string> = {
      'planifie': 'badge-blue',
      'en_cours': 'badge-green',
      'termine': 'badge-gray',
      'annule': 'badge-red'
    };
    return colors[statut || 'planifie'] || 'badge-gray';
  }

  // ===== GETTERS POUR VALIDATION =====
  get f() { return this.trajetForm.controls; }
}