from django.db import models

from django.contrib.auth.models import AbstractUser
from django.db import models

STATUT_CHOICES = [('en_attente','En attente'),('confirmee','Confirmée'),('annulee','Annulée')]

class Reservation(models.Model):
    client = models.ForeignKey(User, on_delete=models.CASCADE)
    trajet = models.ForeignKey(Trajet, on_delete=models.CASCADE)
    numero_siege = models.IntegerField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    date_reservation = models.DateTimeField(auto_now_add=True)
