from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.http import FileResponse
from django.db.models import Sum
import os

from .models import Reservation
from .serializers import ReservationSerializer
# Assure-toi que ces permissions existent bien dans users.permissions
from users.permissions import IsAdminUserCustom, IsGestionnaire, IsClient

class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer

    def get_permissions(self):
        """Permissions selon l'action."""
        if self.action == 'confirmer' or self.action == 'statistiques':
            return [IsAdminUserCustom() | IsGestionnaire()]
        # Lecture publique pour la recherche, écriture nécessite auth
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        # Optimisation : select_related pour éviter les requêtes N+1
        base_query = Reservation.objects.all().select_related('client', 'trajet', 'place', 'trajet__bus__agence')

        if user.is_authenticated:
            if getattr(user, 'role', None) == 'ADMIN':
                return base_query
            
            if getattr(user, 'role', None) == 'GESTIONNAIRE' and hasattr(user, 'agence'):
                return base_query.filter(trajet__bus__agence=user.agence)
            
            # Client voit ses réservations
            return base_query.filter(client=user)
        
        # Utilisateur non connecté (pour recherche publique si besoin)
        return base_query.none()

    def perform_create(self, serializer):
        # Force le client à être l'utilisateur connecté
        serializer.save(client=self.request.user)

    @action(detail=True, methods=['post'])
    def annuler(self, request, pk=None):
        reservation = self.get_object()

        # Vérifications de sécurité
        if reservation.statut == 'annulee':
            return Response({'detail': 'Déjà annulée.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if reservation.trajet.date_depart < timezone.now().date():
            return Response({'detail': 'Voyage passé.'}, status=status.HTTP_400_BAD_REQUEST)

        # Libération de la place (sécurisé)
        if hasattr(reservation, 'place') and reservation.place:
            reservation.place.disponible = True
            reservation.place.save()

        reservation.statut = 'annulee'
        reservation.save()
        
        # Remettre les places disponibles au trajet
        reservation.trajet.places_disponibles += reservation.nombre_places
        reservation.trajet.save()

        return Response({'detail': 'Réservation annulée.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def confirmer(self, request, pk=None):
        reservation = self.get_object()
        if reservation.statut != 'en_attente':
            return Response({'detail': 'Statut invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        reservation.statut = 'confirmee'
        reservation.save()
        return Response({'detail': 'Réservation confirmée.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def ticket(self, request, pk=None):
        reservation = self.get_object()
        
        # Permission d'accès au billet
        if request.user.role == 'CLIENT' and reservation.client != request.user:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            from .utils import generate_ticket
            filename = generate_ticket(reservation)
            return FileResponse(
                open(filename, 'rb'),
                as_attachment=True,
                content_type='application/pdf'
            )
        except ImportError:
            return Response({'detail': 'Génération PDF non configurée (utils manquant).'}, status=status.HTTP_501_NOT_IMPLEMENTED)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        user = self.request.user
        queryset = Reservation.objects.filter(statut='confirmee')

        if user.role == 'GESTIONNAIRE' and hasattr(user, 'agence'):
            queryset = queryset.filter(trajet__bus__agence=user.agence)

        total = queryset.count()
        revenus = queryset.aggregate(total_rev=Sum('trajet__prix'))['total_rev'] or 0

        return Response({
            'total_confirmations': total,
            'revenus_generes': revenus
        })