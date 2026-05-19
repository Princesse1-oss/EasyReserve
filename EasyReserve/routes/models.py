from django.db import models

from django.contrib.auth.models import AbstractUser
from django.db import models

class Trajet(models.Model):
    ville_depart = models.CharField(max_length=100)
    ville_arrivee = models.CharField(max_length=100)
    date_heure_depart = models.DateTimeField()
    tarif = models.DecimalField(max_digits=10, decimal_places=2)
    bus = models.ForeignKey(Bus, on_delete=models.SET_NULL, null=True)
