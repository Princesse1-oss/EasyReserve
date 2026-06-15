
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Crée un super utilisateur par défaut si il n'existe pas"

    def handle(self, *args, **options):
        User = get_user_model()

        # Récupère les infos depuis les variables d'environnement, ou utilise des valeurs par défaut
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "Merveille")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "merveille@example.com")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "Password2026")

        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                role="ADMIN",
            )
            self.stdout.write(self.style.SUCCESS(f"Super utilisateur {username} créé avec succès !"))
        else:
            self.stdout.write(self.style.WARNING(f"Le super utilisateur {username} existe déjà !"))
