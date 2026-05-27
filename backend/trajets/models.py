from django.db import models
from django.utils import timezone
from buses.models import Bus

class Trajet(models.Model):
    ville_depart = models.CharField(max_length=100)
    ville_arrivee = models.CharField(max_length=100)
    date_depart = models.DateField()
    heure_depart = models.TimeField()
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Clé étrangère vers le Bus avec le related_name validé précédemment
    bus = models.ForeignKey(
        Bus,
        on_delete=models.CASCADE,
        related_name='trajets_app'
    )
    
    # 💡 Ligne corrigée : Alignée parfaitement sur 4 espaces
    date_creation = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.ville_depart} → {self.ville_arrivee} ({self.date_depart})"

    @property
    def places_restantes(self):
        """Calcule dynamiquement le nombre de sièges encore invendus."""
        from reservations.models import Reservation
        total_places = self.bus.capacite
        places_occupees = Reservation.objects.filter(
            trajet=self,
            statut='confirmee'
        ).count()
        return max(0, total_places - places_occupees)
