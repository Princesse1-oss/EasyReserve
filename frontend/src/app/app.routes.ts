import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './guards/auth-guard'; 

export const routes: Routes = [
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
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard],
  },
  {
    path: 'trajets',
    loadComponent: () => import('./pages/trajets/trajets').then((m) => m.GestionnaireTrajets), 
    canActivate: [authGuard],
  },
  {
    path: 'reservations',
    loadComponent: () => import('./pages/reservations/reservations').then((m) => m.GestionnaireReservations), 
    canActivate: [authGuard],
  },
  
  {
    path: 'paiement',
    loadComponent: () => import('./pages/paiement/paiement').then((m) => m.Paiement),
    canActivate: [authGuard],
  },
  
  // 💡 CENTRALISATION DE L'ESPACE GESTIONNAIRE :
  // Toutes les routes du gérant pointent vers votre composant unique de barre latérale (Sidebar Hub)
  {
    path: 'gestionnaire',
    loadComponent: () => import('./pages/gestionnaire/gestionnaire').then((m) => m.Gestionnaire),
    canActivate: [authGuard],
  },
  {
    path: 'gestionnaire/dashboard',
    loadComponent: () => import('./pages/gestionnaire/gestionnaire').then((m) => m.Gestionnaire),
    canActivate: [authGuard],
  },
  {
    path: 'gestionnaire/trajets',
    loadComponent: () => import('./pages/gestionnaire/gestionnaire').then((m) => m.Gestionnaire),
    canActivate: [authGuard],
  },
  {
    path: 'gestionnaire/reservations',
    loadComponent: () => import('./pages/gestionnaire/gestionnaire').then((m) => m.Gestionnaire),
    canActivate: [authGuard],
  },
  {
    path: 'gestionnaire/buses',
    loadComponent: () => import('./pages/gestionnaire/gestionnaire').then((m) => m.Gestionnaire),
    canActivate: [authGuard],
  },
// ✅ Client
{
  path: 'client/trajets',  
  loadComponent: () => import('./pages/client/client-trajets/client-trajets').then(m => m.ClientTrajets),
  canActivate: [authGuard],
},
{
  path: 'client/reservation/:id',  // 🎫 Réserver un trajet SPÉCIFIQUE
  loadComponent: () => import('./pages/client/client-reservation/client-reservation').then(m => m.ClientReservation),
  canActivate: [authGuard],
},
{
  path: 'client/paiement',
  loadComponent: () => import('./pages/client/client-paiement/client-paiement').then(m => m.ClientPaiement),
  canActivate: [authGuard],
},
// ✅ AJOUT EXACT SELON TA STRUCTURE

{
  path: 'client/reservations',  // 📋 Historique des réservations
  loadComponent: () => import('./pages/client/client-reservation/client-reservation').then(m => m.ClientReservation),
  canActivate: [authGuard],
},

{
  path: 'bus',
  loadComponent: () => import('./pages/bus/bus').then((m) => m.GestionnaireBuses),
  canActivate: [authGuard],
},

  {
    path: '**',
    redirectTo: 'login',
  },
];
