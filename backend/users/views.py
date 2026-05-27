from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .serializers import UserSerializer, RegisterSerializer
from .permissions import IsAdminUserCustom

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """
    Vue pour l'inscription d'un nouvel utilisateur.
    L'email de bienvenue est envoyé automatiquement par le serializer.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        # Log pour debug
        print('🔍 DATA REÇUE:', request.data)
        
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            print('❌ ERREURS VALIDATION:', serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # ✅ serializer.save() crée l'utilisateur ET envoie l'email (via le serializer)
        user = serializer.save()
        
        # ✅ Réponse simple et propre
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'message': 'Gestionnaire créé. Email envoyé si adresse valide.'
        }, status=status.HTTP_201_CREATED)
        if user.role == 'GESTIONNAIRE' and user.email:
            try:
                send_mail(
                    subject='Bienvenue sur EASYRESERVE — Vos identifiants',
                    message=f"""
Bonjour {user.first_name} ,

Votre compte gestionnaire EASYRESERVE a été créé.

Vos identifiants :
- Nom d'utilisateur : {user.username}
- Mot de passe : {request.data.get('password')}

Connectez-vous sur : http://localhost:4200/login

Cordialement,
L'équipe EASYRESERVE
                    """,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception:
                pass

        return Response(
            self.get_serializer(user).data,
            status=status.HTTP_201_CREATED
        )


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
    
    # ✅ AJOUTE 'role' ICI pour que ?role=GESTIONNAIRE fonctionne
    filterset_fields = ['role', 'is_active']  # ← MODIFIER CETTE LIGNE
    
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'username']