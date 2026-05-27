import os
from django.conf import settings

def generate_ticket(reservation):
    """Génère un reçu de réservation au format texte/PDF de base."""
    directory = os.path.join(settings.BASE_DIR, 'tickets')
    if not os.path.exists(directory):
        os.makedirs(directory)
        
    filename = os.path.join(directory, f"ticket_{reservation.id}.pdf")
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(f"===== EASYRESERVE - BILLET DE VOYAGE =====\n")
        f.write(f"Ticket ID: {reservation.id}\n")
        f.write(f"Client: {reservation.client.username}\n")
        f.write(f"Trajet: {reservation.trajet.ville_depart} -> {reservation.trajet.ville_arrivee}\n")
        f.write(f"Date: {reservation.trajet.date_depart} à {reservation.trajet.heure_depart}\n")
        if reservation.place:
            f.write(f"Siege N: {reservation.place.numero_siege}\n")
        f.write(f"Prix: {reservation.trajet.prix} XAF\n")
        f.write(f"Statut: {reservation.statut}\n")
        f.write(f"==========================================\n")
        
    return filename
