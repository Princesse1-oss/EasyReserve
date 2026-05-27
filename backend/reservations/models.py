from django.db import models
from django.conf import settings
from trajets.models import Trajet
from places.models import Place

class Reservation(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('confirmee', 'Confirmée'),
        ('annulee', 'Annulée'),
    ]

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reservations'
    )
    trajet = models.ForeignKey(
        Trajet,
        on_delete=models.CASCADE,
        related_name='reservations'
    )
    place = models.ForeignKey(
        Place,
        on_delete=models.CASCADE,
        related_name='reservations',
        null=True,
        blank=True
    )
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='en_attente'
    )
    date_reservation = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Empêche la réservation du même siège sur un même trajet spécifique
        unique_together = ['trajet', 'place']
        ordering = ['-date_reservation']

    def __str__(self):
        return f"Réservation {self.id} - {self.client.username} ({self.statut})"
