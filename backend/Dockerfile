# Dockerfile pour le backend Django
FROM python:3.14-slim

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le reste du code
COPY . .

# Exposer le port 8000
EXPOSE 8000

# Commande pour exécuter l'application
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
