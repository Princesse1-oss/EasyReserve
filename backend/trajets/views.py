from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django_filters import rest_framework as filters
from rest_framework.filters import OrderingFilter
from django.utils import timezone

from .models import Trajet
from .serializers import TrajetSerializer
from users.permissions import IsAdminUserCustom, IsGestionnaire


class TrajetFilter(filters.FilterSet):
    prix_min = filters.NumberFilter(field_name="prix", lookup_expr='gte')
    prix_max = filters.NumberFilter(field_name="prix", lookup_expr='lte')
    date_exacte = filters.DateFilter(field_name="date_depart")
    
    class Meta:
        model = Trajet
        fields = {
            'ville_depart': ['iexact', 'icontains'],
            'ville_arrivee': ['iexact', 'icontains'],
            'date_depart': ['gte', 'lte'],
        }


class TrajetViewSet(viewsets.ModelViewSet):
    """
    Gestion et Recherche des Trajets :
    - Public / Clients : Lecture + Filtrage multicritères.
    - Admin : Contrôle total sur la planification globale.
    - Gestionnaire : CRUD restreint aux trajets liés aux bus de son agence.
    """
    serializer_class = TrajetSerializer
    filter_backends = [filters.DjangoFilterBackend, OrderingFilter]
    filterset_class = TrajetFilter
    ordering_fields = ['date_depart', 'heure_depart', 'prix']
    ordering = ['date_depart', 'heure_depart', 'id']  # ✅ Ordre pour pagination

    def get_permissions(self):
        # ✅ CRUCIAL : Les clients doivent pouvoir voir la liste sans être connectés
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        
        # Pour créer/modifier/supprimer : Admin ou Gestionnaire
        if self.request.user.is_authenticated:
            if self.request.user.role in ['ADMIN', 'GESTIONNAIRE']:
                return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    # ✅ get_queryset DOIT ÊTRE À L'INTÉRIEUR DE LA CLASSE (indentation correcte)
    def get_queryset(self):
        user = self.request.user
        today = timezone.now().date()
        
        # ✅ Base : trajets futurs avec bus actif
        base_queryset = Trajet.objects.all().select_related('bus', 'bus__agence').filter(
            date_depart__gte=today,
            bus__is_active=True  # ✅ Filtre sur le champ réel du modèle Bus
        ).order_by('date_depart', 'heure_depart', 'id')

        if user.is_authenticated and getattr(user, 'role', None) == 'ADMIN':
            return base_queryset
        
        if user.is_authenticated and getattr(user, 'role', None) == 'GESTIONNAIRE' and hasattr(user, 'agence'):
            return base_queryset.filter(bus__agence=user.agence)
        
        # ✅ Client/Public : pas de filtre sur places_disponibles (champ calculé)
        return base_queryset

    # ✅ perform_create DOIT ÊTRE À L'INTÉRIEUR DE LA CLASSE (indentation correcte)
    def perform_create(self, serializer):
        user = self.request.user
        bus_propose = serializer.validated_data.get('bus')

        # Vérification de propriété du bus pour le gestionnaire
        if getattr(user, 'role', None) == 'GESTIONNAIRE' and hasattr(user, 'agence'):
            if bus_propose and bus_propose.agence != user.agence:
                raise permissions.PermissionDenied("Bus non valide pour votre agence.")
        
        serializer.save()