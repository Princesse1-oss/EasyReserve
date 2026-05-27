from rest_framework import serializers
from .models import Trajet
from buses.serializers import BusSerializer

class TrajetSerializer(serializers.ModelSerializer):
    # Utilisation de BusSerializer pour avoir les détails du bus
    bus_details = BusSerializer(source='bus', read_only=True)
    agence_nom = serializers.CharField(source='bus.agence.nom', read_only=True)
    
    # ✅ Correction : On utilise le champ du modèle directement ou une méthode
    # Si ton modèle a une méthode 'places_restantes', laisse source='places_restantes'
    # Sinon, utilise le champ 'places_disponibles'
    places_disponibles = serializers.IntegerField(read_only=True)

    class Meta:
        model = Trajet
        fields = [
            'id', 'ville_depart', 'ville_arrivee', 'date_depart', 
            'heure_depart', 'prix', 'bus', 'bus_details', 
            'agence_nom', 'places_disponibles', 'statut'
        ]
        read_only_fields = ['id', 'places_disponibles', 'date_creation']

    def validate_date_depart(self, value):
        from django.utils import timezone
        if value < timezone.now().date():
            raise serializers.ValidationError("Date dans le passé.")
        return value

    def validate_prix(self, value):
        if value <= 0:
            raise serializers.ValidationError("Prix invalide.")
        return value