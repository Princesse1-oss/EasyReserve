from rest_framework import serializers
from django.utils import timezone
from .models import Reservation
from trajets.serializers import TrajetSerializer
from places.serializers import PlaceSerializer

class ReservationSerializer(serializers.ModelSerializer):
    trajet_detail = TrajetSerializer(source='trajet', read_only=True)
    client_username = serializers.CharField(source='client.username', read_only=True)
    place_detail = PlaceSerializer(source='place', read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id', 'client', 'client_username', 'trajet',
            'trajet_detail', 'place', 'place_detail', 'statut', 'date_reservation'
        ]
        read_only_fields = ['client', 'date_reservation']

    def validate(self, data):
        place = data.get('place')
        trajet = data.get('trajet')

        # 1. Vérification de la disponibilité physique du siège
        if place and not place.disponible:
            raise serializers.ValidationError(
                {"place": "Ce siège est déjà occupé ou réservé dans ce véhicule."}
            )

        # 2. Sécurité temporelle : Empêcher de réserver un trajet expiré
        if trajet and trajet.date_depart < timezone.now().date():
            raise serializers.ValidationError(
                {"trajet": "Impossible de réserver un trajet dont la date de départ est dépassée."}
            )

        return data
