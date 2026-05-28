import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './guards/auth-guard'; 

export const routes: Routes = [
  // === PUBLIC ===
  {
    path: '',
    loadComponent: () => import('./pages/accueil/accueil').then((m) => m.Accueil),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    canActivate: [publicGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
    canActivate: [publicGuard],
  },

  // === GESTIONNAIRE / ADMIN ===
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard],
  },
  {
    path: 'trajets',
    loadComponent: () => import('./pages/gestionnaire/trajets/trajets').then((m) => m.GestionnaireTrajets), 
    canActivate: [authGuard],
  },
  {
    path: 'reservations',  // 📋 Gestionnaire: liste globale des réservations
    loadComponent: () => import('./pages/gestionnaire/reservations/reservations').then((m) => m.GestionnaireReservations), 
    canActivate: [authGuard],
  },
  {
    path: 'paiement',  // 💳 Gestionnaire: gestion des paiements
    loadComponent: () => import('./pages/gestionnaire/paiement/paiement').then((m) => m.Paiement),
    canActivate: [authGuard],
  },
  {
    path: 'bus/gestionnaire',
    loadComponent: () => import('./pages/gestionnaire/bus/bus').then((m) => m.GestionnaireBuses),
    canActivate: [authGuard],
  },
  
  // === ESPACE GESTIONNAIRE (Sidebar Hub) ===
  {
    path: 'gestionnaire',
    loadComponent: () => import('./pages/gestionnaire/pageAG/gestionnaire').then((m) => m.Gestionnaire),
    canActivate: [authGuard],
  },
  {
    path: 'gestionnaire/dashboard',
    loadComponent: () => import('./pages/gestionnaire/pageAG/gestionnaire').then((m) => m.Gestionnaire),
    canActivate: [authGuard],
  },
  {
    path: 'gestionnaire/trajets',
    loadComponent: () => import('./pages/gestionnaire/pageAG/gestionnaire').then((m) => m.Gestionnaire),
    canActivate: [authGuard],
  },
  {
    path: 'gestionnaire/reservations',
    loadComponent: () => import('./pages/gestionnaire/pageAG/gestionnaire').then((m) => m.Gestionnaire),
    canActivate: [authGuard],
  },
  {
    path: 'gestionnaire/buses',
    loadComponent: () => import('./pages/gestionnaire/pageAG/gestionnaire').then((m) => m.Gestionnaire),
    canActivate: [authGuard],
  },
  
  // === ✅ ESPACE CLIENT ===
  {
    path: 'client/trajets',  // 🔍 Recherche de trajets
    loadComponent: () => import('./pages/client/client-trajets/client-trajets').then(m => m.ClientTrajets),
    canActivate: [authGuard],
  },
  {
    path: 'client/reservation/:id',  // ✅ Avec ':id' pour l'ID dynamique
    loadComponent: () => import('./pages/client/client-reservation/client-reservation')
      .then(m => m.ClientReservation),
    canActivate: [authGuard],
  },
  {
    path: 'client/reservations',  // 📋 HISTORIQUE des réservations du client (SANS :id)
    loadComponent: () => import('./pages/client/client-reservation/client-reservation').then(m => m.ClientReservation),
    canActivate: [authGuard],
  },

  {
    path: 'client/paiement',
    loadComponent: () => import('./pages/client/client-paiement/client-paiement').then(m => m.ClientPaiement),
    canActivate: [authGuard],
  },
  {
    path: 'client/profil',  // 👤 Profil client
    loadComponent: () => import('./pages/client/client-profile/client-profile').then(m => m.ClientProfile),
    canActivate: [authGuard],
  },

  // === REDIRECTION 404 ===
  {
    path: '**',
    redirectTo: 'login',
  },
];