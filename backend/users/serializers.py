from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.core.mail import send_mail
from django.conf import settings
import secrets

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = str(getattr(user, 'role', 'CLIENT')).upper()
        if hasattr(user, 'agence_id') and user.agence_id:
            token['agence_id'] = user.agence_id
        return token

# ✅ CE CLASSIQUE ÉTAIT MANQUANT (requis par views.py)
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    telephone = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'telephone', 'role', 'password', 'date_joined', 'agence_id']
        read_only_fields = ['id', 'date_joined']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        role = str(validated_data.get('role', 'CLIENT')).upper()
        validated_data['role'] = role
        
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def validate_role(self, value):
        choices = ['ADMIN', 'GESTIONNAIRE', 'CLIENT']
        value_upper = str(value).upper()
        if value_upper not in choices:
            raise serializers.ValidationError(f"Le rôle doit être l'un des suivants : {choices}")
        return value_upper

# ✅ NOUVEAU : Inscription sans password_confirm + email auto
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    role = serializers.CharField(required=False, default='CLIENT')
    telephone = serializers.CharField(required=False, allow_blank=True, default='')
    agence_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'password', 'first_name', 'last_name', 'telephone', 'role', 'agence_id']
        read_only_fields = ['id']

    def create(self, validated_data):
        agence_id = validated_data.pop('agence_id', None)
        role = str(validated_data.get('role', 'CLIENT')).upper()
        validated_data['role'] = role

        # Génération auto du mot de passe si non fourni
        raw_password = validated_data.pop('password', None)
        if not raw_password:
            raw_password = secrets.token_urlsafe(12)

        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=raw_password,
            first_name=validated_data.get('first_name', ''),
            telephone=validated_data.get('telephone', ''),
            role=role
        )

        # Liaison agence
        if agence_id and role == 'GESTIONNAIRE':
            try:
                from agences.models import Agence
                agence = Agence.objects.get(id=agence_id)
                agence.gestionnaire = user
                agence.save()
                print(f"✅ Agence '{agence.nom}' liée au gestionnaire '{user.username}'")
            except Exception as e:
                print(f"⚠️ Erreur liaison agence: {e}")

        # Envoi email
        if role == 'GESTIONNAIRE' and user.email:
            self._send_welcome_email(user, raw_password, agence_id)

        return user

    def _send_welcome_email(self, user, password, agence_id=None):
        agence_nom = "Non assignée"
        if agence_id:
            try:
                from agences.models import Agence
                agence_nom = Agence.objects.get(id=agence_id).nom
            except:
                pass

        subject = '[EasyReserve] Vos identifiants de connexion'
        message = f"""Bonjour {user.first_name or user.username},

✅ Votre compte gestionnaire EasyReserve a été créé avec succès.

🔐 Vos identifiants de connexion :
   • Username : {user.username}
   • Mot de passe : {password}

🏢 Agence rattachée : {agence_nom}

🔗 Accédez à votre espace : {getattr(settings, 'FRONTEND_URL', 'http://localhost:4200')}/login

⚠️ Pour votre sécurité, changez votre mot de passe après votre première connexion.

Cordialement,
L'équipe EasyReserve
"""
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            print(f"✅ Email envoyé à {user.email}")
        except Exception as e:
            print(f"⚠️ Échec envoi email: {e}")