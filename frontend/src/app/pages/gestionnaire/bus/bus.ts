import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { Navbar } from "../../../components/navbar/navbar";

// ✅ Interfaces avec typage strict
interface Bus {
  id: number;
  matricule: string;
  capacite: number;
  type_bus: 'standard' | 'vip' | 'minibus';
  agence: number | null;
  agence_nom?: string;
  is_active?: boolean;
}

interface Agence {
  id: number;
  nom: string;
  adresse?: string;
  gestionnaire?: number | null;
}

interface BusCreateRequest {
  matricule: string;
  capacite: number;
  type_bus: 'standard' | 'vip' | 'minibus';
  agence?: number; // Optionnel : si omis, Django utilise null
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
  
  // ✅ Gestion sécurisée de userAgenceId
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
    const defaultAgence = this.isGestionnaire ? this.userAgenceId : null;
    
    this.busForm = this.fb.group({
      matricule: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(20)]],
      capacite: [45, [Validators.required, Validators.min(1), Validators.max(100)]],
      type_bus: ['standard', Validators.required],
      agence: [defaultAgence]
    });

    this.modifForm = this.fb.group({
      matricule: ['', [Validators.required, Validators.minLength(4)]],
      capacite: [45, [Validators.required, Validators.min(1), Validators.max(100)]],
      type_bus: ['standard', Validators.required],
      agence: [null],
      is_active: [true]
    });

    // ✅ Désactiver le champ agence pour les gestionnaires (dès l'init)
    if (this.isGestionnaire && this.userAgenceId) {
      this.busForm.get('agence')?.disable();
      this.modifForm.get('agence')?.disable();
    }
  }

  loadBuses(): void {
    this.loading = true;
    this.errorMsg = '';

    this.http.get<Bus[] | { results: Bus[] }>(`${this.apiUrl}/bus/`).subscribe({
      next: (response) => {
        const dataArray = Array.isArray(response) 
          ? response 
          : (response as { results?: Bus[] })?.results || [];
        
        this.buses = dataArray;
        this.loading = false;
        console.log('✅ Buses chargés :', this.buses.length);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = 'Impossible de charger la liste des bus.';
        console.error('❌ Erreur chargement buses:', err);
      }
    });
  }

  loadAgences(): void {
    this.http.get<Agence[] | { results: Agence[] }>(`${this.apiUrl}/agences/`).subscribe({
      next: (data) => {
        this.agences = Array.isArray(data) ? data : (data as { results?: Agence[] })?.results || [];
      },
      error: (err) => console.error('❌ Erreur chargement agences:', err)
    });
  }

  getAgenceNom(agenceId: number | null | undefined): string {
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
    
    // ✅ Ré-appliquer l'état disabled après reset
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
      agence: bus.agence ?? null,
      is_active: bus.is_active ?? true
    });
    
    // ✅ Ré-appliquer l'état disabled après patch
    if (this.isGestionnaire) {
      this.modifForm.get('agence')?.disable();
    } else {
      this.modifForm.get('agence')?.enable();
    }
  }

  // ===== CRÉATION — PAYLOAD SÉCURISÉ =====
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
    
    // ✅ Construction typée du payload
    const payload: BusCreateRequest = {
      matricule: String(rawValue.matricule || '').trim(),
      capacite: Number(rawValue.capacite),
      type_bus: rawValue.type_bus as 'standard' | 'vip' | 'minibus'
    };

    // ✅ Ajouter agence seulement si valeur valide (number)
    const agenceValue = rawValue.agence;
    if (typeof agenceValue === 'number' && agenceValue > 0) {
      payload.agence = agenceValue;
    }
    // Si agence est null/undefined/'' → on omet le champ (Django utilisera null)

    console.log('📤 Payload création bus:', JSON.stringify(payload));

    this.http.post<Bus>(`${this.apiUrl}/bus/`, payload).subscribe({
      next: (response) => {
        this.loading = false;
        this.successMsg = `✅ Bus "${response.matricule}" créé avec succès !`;
        
        this.busForm.reset({ 
          capacite: 45, 
          type_bus: 'standard', 
          agence: this.isGestionnaire ? this.userAgenceId : null 
        });
        if (this.isGestionnaire && this.userAgenceId) {
          this.busForm.get('agence')?.disable();
        }
        
        this.showForm = false;
        this.loadBuses();
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        console.error('❌ Erreur création bus:', err);
        console.error('🔍 Réponse backend:', err.error);
        
        if (err.status === 0) {
          this.errorMsg = '🔌 Serveur injoignable. Django tourne-t-il ?';
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
    
    const payload: Partial<Bus> = {
      matricule: String(rawValue.matricule || '').trim(),
      capacite: Number(rawValue.capacite),
      type_bus: rawValue.type_bus as 'standard' | 'vip' | 'minibus',
      is_active: rawValue.is_active ?? true
    };

    // ✅ Même logique pour l'agence en modification
    const agenceValue = rawValue.agence;
    if (typeof agenceValue === 'number' && agenceValue > 0) {
      payload.agence = agenceValue;
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
        console.error('❌ Erreur modification:', err.error);
        this.errorMsg = err.error?.matricule?.[0] 
          || err.error?.detail 
          || JSON.stringify(err.error) 
          || 'Erreur modification.';
      }
    });
  }

  // ===== SUPPRESSION =====
  supprimerBus(bus: Bus): void {
    if (!confirm(`⚠️ Supprimer le bus "${bus.matricule}" ? Cette action est irréversible.`)) return;
    
    this.http.delete(`${this.apiUrl}/bus/${bus.id}/`).subscribe({
      next: () => {
        this.successMsg = `🗑 Bus "${bus.matricule}" supprimé.`;
        this.loadBuses();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err) => {
        console.error('❌ Erreur suppression:', err);
        if (err.error?.detail?.includes('related') || err.error?.detail?.includes('foreign key')) {
          this.errorMsg = '❌ Ce bus est lié à des trajets existants. Impossible de le supprimer.';
        } else {
          this.errorMsg = 'Erreur lors de la suppression.';
        }
      }
    });
  }

  // ===== UTILITAIRES D'AFFICHAGE =====
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

  // ✅ GETTERS POUR VALIDATION TEMPLATE
  get f() { return this.busForm.controls; }
  get m() { return this.modifForm.controls; }
}