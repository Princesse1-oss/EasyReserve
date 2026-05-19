def validate(self, data):
    trajet = data.get('trajet')
    from django.utils import timezone
    # reservations/serializers.py
def validate(self, data):
    trajet = data.get('trajet')
    from django.utils import timezone

    # Règle 1 : voyage déjà passé
    if trajet.date_heure_depart < timezone.now():
        raise serializers.ValidationError("Ce voyage est déjà passé.")

    # Règle 2 : bus complet
    nb_reservations = Reservation.objects.filter(
        trajet=trajet, statut='confirmee'
    ).count()
    if nb_reservations >= trajet.bus.capacite:
        raise serializers.ValidationError("Ce voyage est complet.")

    return data
    if trajet.date_heure_depart < timezone.now():
        raise serializers.ValidationError("Ce voyage est déjà passé.")

    # Règle 2 : bus complet
    nb_reservations = Reservation.objects.filter(
        trajet=trajet, statut='confirmee'
    ).count()
    if nb_reservations >= trajet.bus.capacite:
        raise serializers.ValidationError("Ce voyage est complet.")

    return data