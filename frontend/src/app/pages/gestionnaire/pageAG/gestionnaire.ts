import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService, User } from '../../../services/auth.service';
import { FormsModule } from '@angular/forms';

// ✅ VALIDATEUR : Bloque les dates passées
function dateFutureValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const selectedDate = new Date(control.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) return { datePassee: true };
  return null;
}

@Component({
  selector: 'app-gestionnaire',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './gestionnaire.html',
  styleUrl: './gestionnaire.scss'
})
export class GestionnaireComponent implements OnInit {
  private readonly apiUrl = environment.apiUrl;
  
  user: User | null = null; 
  currentSection: 'dashboard' | 'trajets' | 'reservations' | 'buses' = 'trajets';
  
  loading = true;
  successMsg = '';
  errorMsg = '';

  agence: any = null;
  buses: any[] = [];
  trajets: any[] = [];
  filteredTrajets: any[] = [];
  reservations: any[] = [];

  // ✅ KPIs
  chiffreAffaires = 0;
  totalReservationsCount = 0;
  busesEnRoute = 0;
  tauxOccupation = 0;
  departsAujourdhui = 0;
  revenuPrevisionnel = 0;
  alerteTarif = 'Aucune';

  busForm!: FormGroup;
  trajetForm!: FormGroup;
  isEditingTrajet = false;
  editingTrajetId: number | null = null;
  searchQuery = '';
  filterDate = '';

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient, 
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.initForms();
    this.loadData();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  onLogout(): void { this.authService.logout(); }

  initForms(): void {
    this.busForm = this.fb.group({
      matricule: ['', [Validators.required, Validators.minLength(4)]],
      capacite: [45, [Validators.required, Validators.min(1), Validators.max(80)]],
      type_bus: ['standard', Validators.required]
    });
    this.trajetForm = this.fb.group({
      ville_depart: ['', Validators.required],
      ville_arrivee: ['', Validators.required],
      date_depart: ['', [Validators.required, dateFutureValidator]],
      heure_depart: ['', Validators.required],
      prix: ['', [Validators.required, Validators.min(1)]],
      bus: ['', Validators.required]
    });
  }

  navigateToSection(section: 'dashboard' | 'trajets' | 'reservations' | 'buses'): void {
    this.currentSection = section;
    this.successMsg = '';
    this.errorMsg = '';
    if (section === 'trajets') this.applyTrajetFilters();
  }

  getMinDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  loadData(): void {
    this.loading = true;
    this.errorMsg = '';
    this.http.get<any>(`${this.apiUrl}/agences/ma_gérance/`, { headers: this.getAuthHeaders() }).pipe(
      catchError(() => of({ nom: 'Mon Agence', id: null }))
    ).subscribe({
      next: (data) => { this.agence = data; this.loadAllData(); },
      error: () => { this.agence = { nom: 'Mon Agence', id: null }; this.loadAllData(); }
    });
  }

  loadAllData(): void {
    const headers = this.getAuthHeaders();
    forkJoin({
      trajets: this.http.get<any>(`${this.apiUrl}/trajets/`, { headers }).pipe(catchError(() => of({ results: [] }))),
      reservations: this.http.get<any>(`${this.apiUrl}/reservations/`, { headers }).pipe(catchError(() => of({ results: [] }))),
      buses: this.http.get<any>(`${this.apiUrl}/bus/`, { headers }).pipe(catchError(() => of({ results: [] })))
    }).pipe(
      finalize(() => { this.loading = false; this.applyTrajetFilters(); this.calculateMetrics(); })
    ).subscribe({
      next: (res) => {
        this.trajets = this.extractData(res.trajets);
        this.reservations = this.extractData(res.reservations);
        this.buses = this.extractData(res.buses);
        
        // ✅ DEBUG COMPLET : Voir exactement ce que l'API renvoie
        console.group('📦 DONNÉES REÇUES');
        console.log('🚌 Total trajets:', this.trajets.length);
        if (this.trajets.length > 0) {
          console.log('🔍 Premier trajet:', {
            id: this.trajets[0].id,
            ville: `${this.trajets[0].ville_depart} → ${this.trajets[0].ville_arrivee}`,
            prix: this.trajets[0].prix,
            bus_id: this.trajets[0].bus,
            bus_details: this.trajets[0].bus_details,
            places_disponibles: this.trajets[0].places_disponibles,
            agence_nom: this.trajets[0].agence_nom
          });
        }
        console.groupEnd();
        
        this.calculateMetrics();
      },
      error: (err) => { 
        console.error('❌ Erreur chargement:', err); 
        this.errorMsg = 'Erreur de chargement des données'; 
      }
    });
  }

  private extractData(response: any): any[] {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.results && Array.isArray(response.results)) return response.results;
    return [];
  }

  // ✅ CALCUL DES MÉTRIQUES - Version ultra-robuste
  private calculateMetrics(): void {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1️⃣ Départs aujourd'hui
    this.departsAujourdhui = this.trajets.filter((t: any) => t.date_depart === todayStr).length;
    
    // 2️⃣ Bus en route + calcul sécurisé capacité/dispo
    this.busesEnRoute = this.trajets.filter((t: any) => {
      const cap = this.getCapacite(t);
      const dispo = this.getPlacesDisponibles(t, cap);
      return dispo < cap;
    }).length;
    
    // 3️⃣ Revenu prévisionnel
    this.revenuPrevisionnel = this.trajets.reduce((acc, t: any) => {
      const prix = Number(t.prix) || 0;
      const cap = this.getCapacite(t);
      const dispo = this.getPlacesDisponibles(t, cap);
      const vendues = Math.max(0, cap - dispo);
      return acc + (prix * vendues);
    }, 0);
    
    // 4️⃣ Chiffre d'affaires (réservations confirmées)
    this.totalReservationsCount = this.reservations.length;
    this.chiffreAffaires = this.reservations
      .filter((r: any) => r.statut === 'confirmee')
      .reduce((acc, r: any) => {
        const prix = Number(r.trajet_detail?.prix || r.trajet?.prix || 0);
        const places = Number(r.nombre_places) || 1;
        return acc + (prix * places);
      }, 0);
    
    // 5️⃣ Taux d'occupation
    if (this.trajets.length > 0) {
      const totalPlaces = this.trajets.reduce((sum, t: any) => sum + this.getCapacite(t), 0);
      const placesOccupees = this.trajets.reduce((sum, t: any) => {
        const cap = this.getCapacite(t);
        const dispo = this.getPlacesDisponibles(t, cap);
        return sum + Math.max(0, cap - dispo);
      }, 0);
      this.tauxOccupation = totalPlaces > 0 ? Math.round((placesOccupees / totalPlaces) * 100) : 0;
    } else {
      this.tauxOccupation = 0;
    }
    
    // 6️⃣ Alerte tarifs
    const basPrix = this.trajets.filter((t: any) => (Number(t.prix) || 0) < 3000);
    this.alerteTarif = basPrix.length > 0 ? `${basPrix.length} trajet(s) < 3000 FCFA` : 'Aucune';
    
    // ✅ Log final pour vérification
    console.log('📊 KPIs finaux:', {
      trajets: this.trajets.length,
      departsAujourdhui: this.departsAujourdhui,
      busesEnRoute: this.busesEnRoute,
      revenuPrevisionnel: this.revenuPrevisionnel,
      tauxOccupation: this.tauxOccupation,
      chiffreAffaires: this.chiffreAffaires
    });
  }

  // ✅ Helper : Extraire la capacité du bus (fallback sécurisé)
  private getCapacite(trajet: any): number {
    return trajet.bus_details?.capacite 
        ?? trajet.bus?.capacite 
        ?? 45; // Valeur par défaut si tout échoue
  }

  // ✅ Helper : Extraire places disponibles (fallback sur capacité si null)
  private getPlacesDisponibles(trajet: any, capacite: number): number {
    const dispo = trajet.places_disponibles;
    // Si null, undefined ou négatif → on suppose que tout est disponible
    if (dispo === null || dispo === undefined || dispo < 0) return capacite;
    return dispo;
  }

  // ✅ VALIDATION RÉSERVATION
  validerBilletAchat(id: number): void {
    if (!confirm('Confirmer cette réservation ?')) return;
    this.http.post(`${this.apiUrl}/reservations/${id}/confirmer/`, {}, { headers: this.getAuthHeaders() }).subscribe({
      next: () => { this.successMsg = '✅ Réservation confirmée !'; this.loadAllData(); },
      error: () => this.errorMsg = '❌ Erreur validation.'
    });
  }

  // ✅ AJOUT BUS
  addBusSubmit(): void {
    if (this.busForm.invalid) { this.busForm.markAllAsTouched(); return; }
    this.http.post(`${this.apiUrl}/bus/`, this.busForm.value, { headers: this.getAuthHeaders() }).subscribe({
      next: () => { 
        this.successMsg = '✅ Bus ajouté !'; 
        this.busForm.reset({ capacite: 45, type_bus: 'standard' }); 
        this.loadAllData(); 
      },
      error: () => this.errorMsg = '❌ Erreur ajout bus.'
    });
  }

  // ✅ FILTRES TRAJETS
  applyTrajetFilters(): void {
    let filtered = [...this.trajets];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.ville_depart?.toLowerCase().includes(q) ||
        t.ville_arrivee?.toLowerCase().includes(q) ||
        t.id?.toString().includes(q)
      );
    }
    if (this.filterDate) {
      filtered = filtered.filter(t => t.date_depart === this.filterDate);
    }
    this.filteredTrajets = filtered.sort((a, b) => 
      new Date(b.date_depart).getTime() - new Date(a.date_depart).getTime()
    );
  }

  resetTrajetFilters(): void {
    this.searchQuery = '';
    this.filterDate = '';
    this.applyTrajetFilters();
  }

  // ✅ CRÉATION TRAJET
  addTrajetSubmit(): void {
    if (this.trajetForm.invalid) {
      this.trajetForm.markAllAsTouched();
      if (this.trajetForm.get('date_depart')?.errors?.['datePassee']) {
        this.errorMsg = '❌ Date passée interdite';
        return;
      }
      this.errorMsg = 'Veuillez corriger le formulaire';
      return;
    }

    this.loading = true;
    const formValue = this.trajetForm.value;
    
    const payload = {
      ville_depart: formValue.ville_depart.trim(),
      ville_arrivee: formValue.ville_arrivee.trim(),
      date_depart: formValue.date_depart,
      heure_depart: formValue.heure_depart,
      prix: Number(formValue.prix),
      bus: Number(formValue.bus)
    };

    console.log('📤 Payload envoyé:', payload);
    console.log('🔍 Agence:', this.agence);
    console.log('🚌 Bus sélectionné:', this.buses.find(b => b.id === payload.bus));

    this.http.post(`${this.apiUrl}/trajets/`, payload, { headers: this.getAuthHeaders() }).subscribe({
      next: (response) => {
        console.log('✅ Trajet créé - Réponse:', response);
        this.successMsg = '✅ Trajet créé avec succès !';
        this.trajetForm.reset();
        this.loadAllData(); // ✅ Recharge IMMÉDIATEMENT pour mettre à jour les compteurs
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Erreur création:', err);
        console.error('📄 Détails:', err.error);
        this.errorMsg = err.error?.detail || Object.values(err.error || {})[0] || 'Erreur serveur';
        this.loading = false;
      }
    });
  }

  // ✅ ÉDITION TRAJET
  editTrajet(trajet: any): void {
    this.isEditingTrajet = true;
    this.editingTrajetId = trajet.id;
    this.trajetForm.patchValue({
      ville_depart: trajet.ville_depart,
      ville_arrivee: trajet.ville_arrivee,
      date_depart: trajet.date_depart,
      heure_depart: trajet.heure_depart,
      prix: trajet.prix,
      bus: trajet.bus?.id || trajet.bus
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateTrajetSubmit(): void {
    if (this.trajetForm.invalid || !this.editingTrajetId) return;
    this.loading = true;
    const payload = { ...this.trajetForm.value };
    this.http.put<any>(`${this.apiUrl}/trajets/${this.editingTrajetId}/`, payload, { headers: this.getAuthHeaders() }).pipe(
      finalize(() => { this.loading = false; })
    ).subscribe({
      next: () => {
        this.successMsg = '✅ Trajet mis à jour.';
        this.cancelEdit();
        this.loadAllData();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err) => { this.errorMsg = err.error?.detail || 'Erreur mise à jour.'; }
    });
  }

  // ✅ SUPPRESSION TRAJET
  deleteTrajet(id: number): void {
    if (!confirm('⚠️ Supprimer ce trajet ?')) return;
    this.http.delete(`${this.apiUrl}/trajets/${id}/`, { headers: this.getAuthHeaders() }).subscribe({
      next: () => { this.successMsg = '✅ Trajet supprimé.'; this.loadAllData(); },
      error: () => { this.errorMsg = '❌ Impossible de supprimer.'; }
    });
  }

  cancelEdit(): void {
    this.isEditingTrajet = false;
    this.editingTrajetId = null;
    this.trajetForm.reset();
  }

  // ✅ HELPERS d'affichage
  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  formatPrice(prix: number): string {
    return new Intl.NumberFormat('fr-FR').format(prix) + ' FCFA';
  }

  getStatutBadge(statut: string): string {
    switch(statut) {
      case 'confirmee': return 'badge-success';
      case 'annulee': return 'badge-danger';
      default: return 'badge-warning text-dark';
    }
  }
}