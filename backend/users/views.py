from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .serializers import UserSerializer, RegisterSerializer, AdminGestionnaireSerializer
from .permissions import IsAdminUserCustom
from reservations.models import Reservation
from trajets.models import Trajet
from buses.models import Bus
from reservations.serializers import ReservationSerializer
from trajets.serializers import TrajetSerializer
from buses.serializers import BusSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        print(' DATA REÇUE:', request.data)
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            print('ERREURS VALIDATION:', serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.save()
        
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'message': 'Gestionnaire créé. Email envoyé si adresse valide.'
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user 


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUserCustom]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'username']

    # ✅ CORRECTION : Indentation alignée à 4 espaces (plus d'espace fantôme)
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # 🔒 Interdire la suppression des admins (sécurité)
        if instance.role == 'ADMIN':
            return Response(
                {"detail": "Les comptes administrateurs ne peuvent pas être supprimés."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # ✅ Suppression standard DRF
        return super().destroy(request, *args, **kwargs)


class GestionnaireAdminViewSet(viewsets.ModelViewSet):
    serializer_class = AdminGestionnaireSerializer
    permission_classes = [IsAdminUserCustom]
    
    def get_queryset(self):
        return User.objects.filter(
            role='GESTIONNAIRE'
        ).select_related('agence').order_by('-date_joined')
    
    @action(detail=False, methods=['get'])
    def count(self, request):
        count = User.objects.filter(role='GESTIONNAIRE').count()
        active = User.objects.filter(role='GESTIONNAIRE', is_active=True).count()
        return Response({
            'total': count, 
            'actifs': active, 
            'inactifs': count - active
        })
    
    @action(detail=True, methods=['post'])
    def activer(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'detail': f'{user.username} est maintenant actif.'})
    
    @action(detail=True, methods=['post'])
    def desactiver(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({'detail': f'{user.username} est maintenant inactif.'})
    
    # ✅ Action personnalisée pour afficher les activités d'un gestionnaire
    @action(detail=True, methods=['get'])
    def activites(self, request, pk=None):
        """
        ✅ RETOURNE UNIQUEMENT les activités de l'agence DU GESTIONNAIRE CIBLÉ (pk)
        """
        # 1. Récupérer le gestionnaire ciblé par l'ID dans l'URL
        gestionnaire = get_object_or_404(User, id=pk, role='GESTIONNAIRE')
        
        # 2. Vérifier qu'il a une agence assignée
        if not hasattr(gestionnaire, 'agence') or not gestionnaire.agence:
            return Response(
                {'detail': 'Ce gestionnaire n\'a pas d\'agence associée.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 3. Récupérer SON agence (celle du gestionnaire ciblé, pas celle de l'admin)
        agence_cible = gestionnaire.agence
        
        # 4. Filtrer TOUTES les requêtes PAR CETTE AGENCE UNIQUE
        reservations = Reservation.objects.filter(
            trajet__bus__agence=agence_cible  # ✅ Filtrage CRITIQUE ici
        ).select_related('trajet', 'client').order_by('-date_reservation')
        
        trajets = Trajet.objects.filter(
            bus__agence=agence_cible  # ✅ Filtrage CRITIQUE ici
        ).select_related('bus').order_by('-date_depart')
        
        buses = Bus.objects.filter(
            agence=agence_cible  # ✅ Filtrage CRITIQUE ici
        ).order_by('-date_creation')
        
        # 5. Retourner les données UNIQUES à ce gestionnaire
        return Response({
            'agence': {
                'id': agence_cible.id,
                'nom': agence_cible.nom,
                'ville': getattr(agence_cible, 'ville', ''),
                'contact': getattr(agence_cible, 'contact', '')
            },
            'stats': {
                'total_reservations': reservations.count(),
                'reservations_confirmees': reservations.filter(statut='confirmee').count(),
                'total_trajets': trajets.count(),
                'total_bus': buses.count()
            },
            'reservations': ReservationSerializer(reservations[:10], many=True).data,
            'trajets': TrajetSerializer(trajets[:10], many=True).data,
            'buses': BusSerializer(buses[:10], many=True).data
        })