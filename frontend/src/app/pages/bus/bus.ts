import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Navbar } from "../../components/navbar/navbar";

// ✅ Interfaces avec typage strict (pas de undefined non géré)
interface Bus {
  id: number;
  matricule: string;
  capacite: number;
  type_bus: 'standard' | 'vip' | 'minibus';
  agence: number | null;  // ✅ Pas de undefined ici
  agence_nom?: string;
  is_active?: boolean;
}

interface Agence {
  id: number;
  nom: string;
  adresse?: string;
  gestionnaire?: number | null;
}

@Component({
  selector: 'app-buses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Navbar],
  templateUrl: './bus.html',
  styleUrl: './bus.scss'
})
export class GestionnaireBuses implements OnInit {
  private readonly apiUrl = environment.apiUrl;
  
  busForm!: FormGroup;
  modifForm!: FormGroup;
  
  buses: Bus[] = [];
  agences: Agence[] = [];
  
  loading = false;
  successMsg = '';
  errorMsg = '';
  
  showForm = false;
  showModifier = false;
  busAModifier: Bus | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  get user() { return this.authService.getCurrentUser(); }
  get isAdmin() { return this.user?.role === 'ADMIN'; }
  get isGestionnaire() { return this.user?.role === 'GESTIONNAIRE'; }
  // ✅ Gestion sécurisée de userAgenceId (jamais undefined)
  get userAgenceId(): number | null { 
    const id = this.user?.agence_id; 
    return (id !== undefined && id !== null) ? Number(id) : null; 
  }

  ngOnInit(): void {
    this.initForms();
    this.loadBuses();
    if (this.isAdmin) {
      this.loadAgences();
    }
  }

  private initForms(): void {
    // ✅ Valeur par défaut pour agence : null (pas undefined)
    const defaultAgence = this.isGestionnaire ? this.userAgenceId : null;
    
    this.busForm = this.fb.group({
      matricule: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(20)]],
      capacite: [45, [Validators.required, Validators.min(1), Validators.max(100)]],
      type_bus: ['standard', Validators.required],
      agence: [defaultAgence]  // ✅ Initialisé à null ou number, jamais undefined
    });

    this.modifForm = this.fb.group({
      matricule: ['', [Validators.required, Validators.minLength(4)]],
      capacite: [45, [Validators.required, Validators.min(1), Validators.max(100)]],
      type_bus: ['standard', Validators.required],
      agence: [null],  // ✅ Toujours null par défaut
      is_active: [true]
    });
  }

loadBuses(): void {
  this.loading = true;
  this.errorMsg = '';

  this.http.get<any>(`${this.apiUrl}/bus/`).subscribe({
    next: (response) => {
      // ✅ Extraction sécurisée du format Django REST Framework
      const dataArray = response?.results 
        ? response.results 
        : (Array.isArray(response) ? response : []);
      
      this.buses = dataArray;
      this.loading = false;
      
      console.log('✅ Buses chargés en mémoire :', this.buses.length);
    },
    error: (err) => {
      this.loading = false;
      this.errorMsg = 'Impossible de charger la liste des bus.';
      console.error('Erreur chargement:', err);
    }
  });
}

  loadAgences(): void {
    this.http.get<any>(`${this.apiUrl}/agences/`).subscribe({
      next: (data) => {
        this.agences = Array.isArray(data) ? data : data?.results || [];
      },
      error: (err) => console.error('Erreur agences:', err)
    });
  }

  getAgenceNom(agenceId: number | null | undefined): string {
    // ✅ Gestion de undefined → null
    if (!agenceId) return 'Non assignée';
    const agence = this.agences.find(a => a.id === agenceId);
    return agence?.nom || 'Agence inconnue';
  }

  // ===== TOGGLE =====
  toggleForm(): void {
    this.showForm = !this.showForm;
    this.showModifier = false;
    this.successMsg = '';
    this.errorMsg = '';
    
    const defaultAgence = this.isGestionnaire ? this.userAgenceId : null;
    this.busForm.reset({ 
      capacite: 45, 
      type_bus: 'standard', 
      agence: defaultAgence 
    });
    
    // ✅ Désactiver le champ agence pour les gestionnaires
    if (this.isGestionnaire && this.userAgenceId) {
      this.busForm.get('agence')?.disable();
    } else {
      this.busForm.get('agence')?.enable();
    }
  }

  toggleModifier(bus: Bus): void {
    this.busAModifier = bus;
    this.showModifier = !this.showModifier;
    this.showForm = false;
    this.successMsg = '';
    this.errorMsg = '';
    
    this.modifForm.patchValue({
      matricule: bus.matricule,
      capacite: bus.capacite,
      type_bus: bus.type_bus,
      agence: bus.agence ?? null,  // ✅ Convertir undefined en null
      is_active: bus.is_active ?? true
    });
    
    if (this.isGestionnaire) {
      this.modifForm.get('agence')?.disable();
    }
  }

  // ===== CRÉATION — CORRECTION PRINCIPALE =====
  onSubmit(): void {
    if (this.busForm.invalid) {
      this.busForm.markAllAsTouched();
      this.errorMsg = 'Veuillez corriger les erreurs dans le formulaire.';
      return;
    }

    this.loading = true;
    this.successMsg = '';
    this.errorMsg = '';

    const rawValue = this.busForm.getRawValue();
    
    // ✅ Construction sécurisée du payload
    const payload: any = {
      matricule: String(rawValue.matricule || '').trim(),
      capacite: Number(rawValue.capacite),
      type_bus: String(rawValue.type_bus || 'standard')
    };

    // ✅ Gestion de l'agence : seulement si valeur valide (number), sinon on omet le champ
    const agenceValue = rawValue.agence;
    if (agenceValue !== null && agenceValue !== undefined && agenceValue !== '') {
      payload.agence = Number(agenceValue);  // ✅ Force le type number
    }
    // Si agence est null/undefined/'' → on ne l'envoie PAS (Django gère le null par défaut)

    console.log('📤 Payload envoyé:', JSON.stringify(payload));

    this.http.post<Bus>(`${this.apiUrl}/bus/`, payload).subscribe({
      next: (response) => {
        this.loading = false;
        this.successMsg = `✅ Bus "${response.matricule}" créé avec succès !`;
        this.busForm.reset({ 
          capacite: 45, 
          type_bus: 'standard', 
          agence: this.isGestionnaire ? this.userAgenceId : null 
        });
        this.showForm = false;
        this.loadBuses();
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        console.error('❌ Erreur création bus:', err);
        console.error('🔍 Réponse backend:', err.error);  // ✅ Voir les détails de l'erreur 400
        
        // ✅ Extraction précise des erreurs Django
        if (err.status === 0) {
          this.errorMsg = '🔌 Serveur injoignable. Django tourne-t-il sur http://localhost:8000 ?';
        } else if (err.error?.matricule) {
          this.errorMsg = `❌ Matricule : ${err.error.matricule[0]}`;
        } else if (err.error?.agence) {
          this.errorMsg = `❌ Agence : ${err.error.agence[0]}`;
        } else if (err.error?.capacite) {
          this.errorMsg = `❌ Capacité : ${err.error.capacite[0]}`;
        } else if (err.error?.type_bus) {
          this.errorMsg = `❌ Type : ${err.error.type_bus[0]}`;
        } else if (err.error?.non_field_errors) {
          this.errorMsg = `❌ ${err.error.non_field_errors[0]}`;
        } else {
          // ✅ Afficher l'erreur brute pour debug
          this.errorMsg = `Erreur ${err.status}: ${JSON.stringify(err.error)}`;
        }
      }
    });
  }

  // ===== MODIFICATION =====
  sauvegarderModification(): void {
    if (!this.busAModifier || this.modifForm.invalid) {
      this.modifForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const rawValue = this.modifForm.getRawValue();
    
    const payload: any = {
      matricule: String(rawValue.matricule || '').trim(),
      capacite: Number(rawValue.capacite),
      type_bus: String(rawValue.type_bus || 'standard'),
      is_active: rawValue.is_active ?? true
    };

    // ✅ Même logique pour l'agence en modification
    const agenceValue = rawValue.agence;
    if (agenceValue !== null && agenceValue !== undefined && agenceValue !== '') {
      payload.agence = Number(agenceValue);
    }

    this.http.patch<Bus>(`${this.apiUrl}/bus/${this.busAModifier.id}/`, payload).subscribe({
      next: (response) => {
        this.loading = false;
        this.successMsg = `✅ Bus "${response.matricule}" mis à jour !`;
        this.showModifier = false;
        this.busAModifier = null;
        this.loadBuses();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        console.error('Erreur modification:', err.error);
        this.errorMsg = err.error?.matricule?.[0] || err.error?.detail || JSON.stringify(err.error) || 'Erreur modification.';
      }
    });
  }

  // ===== SUPPRESSION =====
  supprimerBus(bus: Bus): void {
    if (!confirm(`⚠️ Supprimer le bus "${bus.matricule}" ?`)) return;
    
    this.http.delete(`${this.apiUrl}/bus/${bus.id}/`).subscribe({
      next: () => {
        this.successMsg = `🗑 Bus "${bus.matricule}" supprimé.`;
        this.loadBuses();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err) => {
        if (err.error?.detail?.includes('related')) {
          this.errorMsg = '❌ Ce bus est lié à des trajets existants.';
        } else {
          this.errorMsg = 'Erreur suppression.';
        }
        console.error('Erreur suppression:', err);
      }
    });
  }

  // ===== UTILITAIRES =====
  getTypeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      'standard': 'badge-blue',
      'vip': 'badge-gold', 
      'minibus': 'badge-green'
    };
    return map[type] || 'badge-gray';
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      'standard': '🚌 Standard',
      'vip': '✨ VIP',
      'minibus': '🚐 Minibus'
    };
    return map[type] || type;
  }

  // ===== GETTERS POUR VALIDATION =====
  get f() { return this.busForm.controls; }
  get m() { return this.modifForm.controls; }
}