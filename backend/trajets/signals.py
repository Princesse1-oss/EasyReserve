from django.db.models.signals import post_save

from django.dispatch import receiver

from .models import Trajet

from places.models import Place


@receiver(post_save, sender=Trajet)

def create_places(sender, instance, created, **kwargs):

    if created:

        capacite = instance.bus.capacite

        for i in range(1, capacite + 1):

            Place.objects.create(

                numero=i,

                trajet=instance
            )