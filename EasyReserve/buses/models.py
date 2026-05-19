from django.db import models

from django.contrib.auth.models import AbstractUser
from django.db import models

# buses/models.py
class Bus(models.Model):
    matricule = models.CharField(max_length=20, unique=True)
    capacite = models.IntegerField()
    type_bus = models.CharField(max_length=50)


