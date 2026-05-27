import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './accueil.html',
  styleUrl: './accueil.scss',
})
export class Accueil {
  fonctionnalites = [
    { icon: '🔍', titre: 'Rechercher', description: 'Trouvez le trajet idéal selon votre ville de départ et destination.' },
    { icon: '🎫', titre: 'Réserver', description: 'Choisissez votre siège et confirmez votre billet en ligne.' },
    { icon: '💳', titre: 'Payer', description: 'Payez via Mobile Money ou carte bancaire en toute sécurité.' },
    { icon: '📧', titre: 'Recevoir', description: 'Recevez votre billet électronique instantanément par email.' },
  ];

  stats = [
    { nombre: '500+', label: 'Trajets disponibles' },
    { nombre: '50+', label: 'Bus en service' },
    { nombre: '10K+', label: 'Clients satisfaits' },
    { nombre: '20+', label: 'Villes desservies' },
  ];
}