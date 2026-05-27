import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService, User } from '../../services/auth.service';
import { ReservationService, Reservation } from '../../services/reservation.service';
import { environment } from '../../../environments/environment';

// ==================== INTERFACES ====================
interface Agence {
  id: number;
  nom: string;
  adresse: string;
  telephone: string;
  email_contact: string;
  gestionnaire: number | null;
  gestionnaire_username: string;
  is_active?: boolean;
}

interface Gestionnaire {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  telephone?: string;
  is_active: boolean;
  agence?: Agence | null;
  agence_nom?: string;
}

// ==================== COMPOSANT ====================
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  user: User | null = null;
  reservations: Reservation[] = [];
  gestionnaires: Gestionnaire[] = [];
  agences: Agence[] = [];
  loading = false;
  loadingGestionnaires = false;
  activeSection = 'tableau-bord';

  // ===== ÉTAT AGENCES =====
  showFormAgence = false;
  agenceForm: FormGroup;
  loadingFormA = false;
  erreurFormA = '';
  succesFormA = '';
  agenceSelectionnee: Agence | null = null;
  showDetailAgence = false;
  agenceAModifier: Agence | null = null;
  showModifierAgence = false;
  modifAgenceForm: FormGroup;
  loadingModif = false;
  erreurModif = '';
  succesModif = '';

  // ===== ÉTAT GESTIONNAIRES =====
  showFormGestionnaire = false;
  gestionnaireForm: FormGroup;
  loadingFormG = false;
  erreurFormG = '';
  succesFormG = '';
  gestionnaireSelectionne: Gestionnaire | null = null;
  showDetailGestionnaire = false;
  reservationsGestionnaire: any[] = [];
  loadingDetail = false;
  gestionnaireAModifier: Gestionnaire | null = null;
  showModifierGestionnaire = false;
  modifGestionnaireForm: FormGroup;
  loadingModifG = false;
  erreurModifG = '';
  succesModifG = '';

  private apiUrl = environment.apiUrl;

  constructor(
    private readonly authService: AuthService,
    private readonly reservationService: ReservationService,
    private readonly fb: FormBuilder,
    private readonly http: HttpClient
  ) {
    // Formulaire Agence
    this.agenceForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(3)]],
      adresse: ['', Validators.required],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{9,15}$/)]],
      email_contact: ['', [Validators.email]],
    });

    // Formulaire Création Gestionnaire
    this.gestionnaireForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: [''],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{9,15}$/)]],
      agence_id: ['', Validators.required],
    });

    // Formulaire Modification Agence
    this.modifAgenceForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(3)]],
      adresse: [''],
      telephone: [''],
      email_contact: ['', [Validators.email]],
    });

    // Formulaire Modification Gestionnaire
    this.modifGestionnaireForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: [''],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.pattern(/^[0-9]{9,15}$/)]],
      is_active: [true],
    });
  }

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.chargerReservations();
    if (this.user?.role === 'ADMIN') {
      this.chargerAgences();
      this.chargerGestionnaires();
      
    }
    
  }
  

  setSection(section: string): void {
    this.activeSection = section;
    this.showFormAgence = false;
    this.showFormGestionnaire = false;
    this.showModifierAgence = false;
    this.showModifierGestionnaire = false;
    this.erreurFormA = this.succesFormA = '';
    this.erreurFormG = this.succesFormG = '';
  }

  // ===== CHARGEMENT DES DONNÉES =====
  chargerReservations(): void {
    this.loading = true;
    this.reservationService.getMesReservations().subscribe({
      next: (data: any) => {
        this.reservations = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  chargerAgences(): void {
    this.http.get<any>(`${this.apiUrl}/agences/?page_size=100`).subscribe({
      next: (data) => {
        this.agences = Array.isArray(data) ? data : data?.results || [];
      },
      error: (err) => console.error('Erreur agences:', err),
    });
  }

  chargerGestionnaires(): void {
    this.loadingGestionnaires = true;
    this.http.get<any>(`${this.apiUrl}/users/`).subscribe({
      next: (data) => {
        const users = Array.isArray(data) ? data : data?.results || [];
        this.gestionnaires = users
          .filter((u: any) => u.role === 'GESTIONNAIRE')
          .map((g: any) => ({ ...g, agence_nom: this.getAgenceNom(g.id) }));
        this.loadingGestionnaires = false;
      },
      error: (err) => {
        console.error('Erreur gestionnaires:', err);
        this.gestionnaires = [];
        this.loadingGestionnaires = false;
      },
    });
  }

  // ===== UTILITAIRES =====
  get agencesDisponibles(): Agence[] {
    return this.agences.filter(a => !a.gestionnaire);
  }

  getAgenceNom(gestionnaireId: number): string {
    const agence = this.agences.find(a => a.gestionnaire === gestionnaireId);
    return agence?.nom || 'Aucune agence';
  }

  // ===== AGENCES : TOGGLE & FORM =====
  toggleFormAgence(): void {
    this.showFormAgence = !this.showFormAgence;
    this.erreurFormA = this.succesFormA = '';
    this.agenceForm.reset();
  }

  toggleFormGestionnaire(): void {
    this.showFormGestionnaire = !this.showFormGestionnaire;
    this.erreurFormG = this.succesFormG = '';
    this.gestionnaireForm.reset();
  }

  // ===== AGENCES : CRUD (CORRIGÉ) =====
  creerAgence(): void {
  console.log('🚀 Tentative de création agence...');

  if (this.agenceForm.invalid) {
    this.agenceForm.markAllAsTouched();
    console.error('❌ Formulaire invalide:', this.agenceForm.errors);
    this.erreurFormA = 'Veuillez corriger les champs en rouge.';
    return;
  }

  this.loadingFormA = true;
  this.erreurFormA = '';
  this.succesFormA = '';

  const v = this.agenceForm.getRawValue();

  // ✅ Payload nettoyé et sécurisé
  const payload: any = {
    nom: v.nom?.trim(),
    adresse: v.adresse?.trim(),
    telephone: v.telephone?.trim().replace(/\D/g, '') || '', // ✅ Ne garde que les chiffres
  };

  // ✅ N'envoie email_contact QUE si valide et non vide
  const email = v.email_contact?.trim();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    payload.email_contact = email.toLowerCase();
  }
  // Sinon, on n'envoie PAS le champ (évite l'erreur "email invalide" sur chaîne vide)

  console.log('📦 Payload envoyé :', JSON.stringify(payload, null, 2));

  this.http.post<Agence>(`${this.apiUrl}/agences/`, payload).subscribe({
    next: (response) => {
      console.log('✅ Agence créée:', response);
      this.succesFormA = '✅ Agence créée !';
      this.agenceForm.reset();
      this.chargerAgences();
      setTimeout(() => { this.showFormAgence = false; this.succesFormA = ''; }, 2000);
      this.loadingFormA = false;
    },
    error: (err: HttpErrorResponse) => {
      console.error('❌ Erreur 400 détaillée :', err.error);
      this.loadingFormA = false;

      // ✅ Extraction intelligente de l'erreur Django
      const errors = err.error || {};
      const messages = Object.entries(errors)
        .map(([field, msgs]: any) => `${field}: ${Array.isArray(msgs) ? msgs[0] : msgs}`)
        .join(' | ');
      
      this.erreurFormA = messages || `Erreur ${err.status}`;
      alert(`❌ ${this.erreurFormA}`); // ✅ Force l'affichage pour que tu ne rates pas l'erreur
    },
  });
}
  voirDetailAgence(a: Agence): void {
    this.agenceSelectionnee = a;
    this.showDetailAgence = true;
  }

  fermerDetailAgence(): void {
    this.showDetailAgence = false;
    this.agenceSelectionnee = null;
  }

  modifierAgence(a: Agence): void {
    this.agenceAModifier = a;
    this.showModifierAgence = true;
    this.erreurModif = this.succesModif = '';
    this.modifAgenceForm.patchValue({
      nom: a.nom, adresse: a.adresse, telephone: a.telephone, email_contact: a.email_contact,
    });
  }

  fermerModifierAgence(): void {
    this.showModifierAgence = false;
    this.agenceAModifier = null;
  }

  sauvegarderModificationAgence(): void {
    if (!this.agenceAModifier || this.modifAgenceForm.invalid) return;
    this.loadingModif = true;
    this.http.patch(`${this.apiUrl}/agences/${this.agenceAModifier.id}/`, this.modifAgenceForm.value).subscribe({
      next: () => {
        this.succesModif = '✅ Agence modifiée !';
        this.chargerAgences();
        setTimeout(() => { this.fermerModifierAgence(); this.succesModif = ''; }, 1500);
        this.loadingModif = false;
      },
      error: (err) => {
        this.erreurModif = err.error?.nom?.[0] || 'Erreur modification';
        this.loadingModif = false;
      },
    });
  }

  supprimerAgence(a: Agence): void {
    const msg = a.gestionnaire
      ? `⚠️ Supprimer "${a.nom}" désactivera aussi le gestionnaire "${a.gestionnaire_username}". Confirmer ?`
      : `Supprimer l'agence "${a.nom}" ?`;
    if (!confirm(msg)) return;
    this.http.delete(`${this.apiUrl}/agences/${a.id}/`).subscribe({
      next: () => { this.chargerAgences(); this.chargerGestionnaires(); },
      error: () => alert('❌ Erreur suppression'),
    });
  }

  // ===== GESTIONNAIRES : CRUD =====
  creerGestionnaire(): void {
    console.log('🚀 Tentative de création gestionnaire...');
    
    if (this.gestionnaireForm.invalid) {
      this.gestionnaireForm.markAllAsTouched();
      console.error('❌ Formulaire invalide:', this.gestionnaireForm.errors);
      this.erreurFormG = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    this.loadingFormG = true;
    this.erreurFormG = '';
    this.succesFormG = '';
    
    const v = this.gestionnaireForm.getRawValue();
    const password = `EasyReserve@${v.username}2025`;

    const payload = {
      username: v.username?.trim(),
      email: v.email?.trim()?.toLowerCase(),
      first_name: v.first_name?.trim() || '',
      last_name: v.last_name?.trim() || '',
      telephone: v.telephone?.trim() || '',
      password: password,
      password_confirm: password,
      role: 'GESTIONNAIRE',
      agence_id: Number(v.agence_id)
    };

    console.log(' Payload envoyé:', payload);

    this.http.post<any>(`${this.apiUrl}/users/register/`, payload).subscribe({
      next: (response) => {
        console.log('✅ Gestionnaire créé avec succès:', response);
        this.loadingFormG = false;
        this.succesFormG = `✅ Gestionnaire "${v.username}" créé ! Email envoyé à ${v.email}.`;
        this.gestionnaireForm.reset();
        this.chargerGestionnaires();
        this.chargerAgences();
        setTimeout(() => { this.showFormGestionnaire = false; this.succesFormG = ''; }, 4000);
      },
      error: (err) => {
        console.error('❌ Erreur création:', err);
        this.loadingFormG = false;
        if (err.status === 0) {
          this.erreurFormG = '🔌 Serveur injoignable.';
        } else if (err.error?.username) {
          this.erreurFormG = `Username: ${err.error.username[0]}`;
        } else if (err.error?.email) {
          this.erreurFormG = `Email: ${err.error.email[0]}`;
        } else if (err.error?.first_name) {
          this.erreurFormG = `Prénom: ${err.error.first_name[0]}`;
        } else if (err.error?.agence_id) {
          this.erreurFormG = `Agence: ${err.error.agence_id[0]}`;
        } else {
          this.erreurFormG = err.error?.detail || JSON.stringify(err.error) || 'Erreur inconnue';
        }
      }
    });
  }

  voirDetailGestionnaire(g: Gestionnaire): void {
    this.gestionnaireSelectionne = { ...g, agence_nom: this.getAgenceNom(g.id) };
    this.showDetailGestionnaire = true;
    this.loadingDetail = true;
    this.http.get<any[]>(`${this.apiUrl}/reservations/`).subscribe({
      next: (data) => {
        this.reservationsGestionnaire = Array.isArray(data) ? data.slice(0, 10) : [];
        this.loadingDetail = false;
      },
      error: () => { this.loadingDetail = false; },
    });
  }

  fermerDetailGestionnaire(): void {
    this.showDetailGestionnaire = false;
    this.gestionnaireSelectionne = null;
  }

  modifierGestionnaire(g: Gestionnaire): void {
    this.gestionnaireAModifier = g;
    this.showModifierGestionnaire = true;
    this.erreurModifG = this.succesModifG = '';
    this.modifGestionnaireForm.patchValue({
      first_name: g.first_name, last_name: g.last_name || '', username: g.username,
      email: g.email, telephone: g.telephone || '', is_active: g.is_active,
    });
  }

  fermerModifierGestionnaire(): void {
    this.showModifierGestionnaire = false;
    this.gestionnaireAModifier = null;
  }

  sauvegarderModificationGestionnaire(): void {
    if (!this.gestionnaireAModifier || this.modifGestionnaireForm.invalid) return;
    this.loadingModifG = true;
    this.http.patch(`${this.apiUrl}/users/${this.gestionnaireAModifier.id}/`, this.modifGestionnaireForm.value).subscribe({
      next: () => {
        this.succesModifG = '✅ Gestionnaire mis à jour !';
        this.chargerGestionnaires();
        setTimeout(() => { this.fermerModifierGestionnaire(); this.succesModifG = ''; }, 1500);
        this.loadingModifG = false;
      },
      error: (err) => {
        this.erreurModifG = err.error?.email?.[0] || err.error?.username?.[0] || 'Erreur modification';
        this.loadingModifG = false;
      },
    });
  }

  toggleActivation(g: Gestionnaire): void {
    const action = g.is_active ? 'désactiver' : 'activer';
    if (!confirm(`Voulez-vous ${action} le gestionnaire "${g.username}" ?`)) return;
    this.http.patch(`${this.apiUrl}/users/${g.id}/`, { is_active: !g.is_active }).subscribe({
      next: () => { g.is_active = !g.is_active; },
      error: () => alert('❌ Erreur lors de l\'opération'),
    });
  }

  supprimerGestionnaire(g: Gestionnaire): void {
    if (!confirm(`⚠️ Supprimer DÉFINITIVEMENT le gestionnaire "${g.username}" ?`)) return;
    this.http.delete(`${this.apiUrl}/users/${g.id}/`).subscribe({
      next: () => {
        this.gestionnaires = this.gestionnaires.filter(u => u.id !== g.id);
        this.chargerAgences();
        alert('✅ Gestionnaire supprimé.');
      },
      error: () => alert('❌ Erreur lors de la suppression'),
    });
  }

  // ===== MÉTRIQUES =====
  get totalReservations(): number { return this.reservations.length; }
  get reservationsAnnulees(): number { return this.reservations.filter(r => r.statut === 'annulee').length; }
  get reservationsConfirmees(): number { return this.reservations.filter(r => r.statut === 'confirmee').length; }
  get reservationsEnAttente(): number { return this.reservations.filter(r => r.statut === 'en_attente').length; }

  onLogout(): void { this.authService.logout(); }

  // ===== GETTERS =====
  get a_nom() { return this.agenceForm.get('nom'); }
  get a_adresse() { return this.agenceForm.get('adresse'); }
  get a_telephone() { return this.agenceForm.get('telephone'); }
  get a_email() { return this.agenceForm.get('email_contact'); }
  get g_first_name() { return this.gestionnaireForm.get('first_name'); }
  get g_last_name() { return this.gestionnaireForm.get('last_name'); }
  get g_username() { return this.gestionnaireForm.get('username'); }
  get g_email() { return this.gestionnaireForm.get('email'); }
  get g_telephone() { return this.gestionnaireForm.get('telephone'); }
  get g_agence_id() { return this.gestionnaireForm.get('agence_id'); }
}