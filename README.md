# REBUS - Système de Réservation de Bus

Une plateforme complète de réservation de billets de bus en ligne, développée avec **Django REST Framework** (backend) et **Angular 17+** (frontend).

## Table des matières
- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Lancement du projet](#lancement-du-projet)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Déploiement](#déploiement)

---

## Fonctionnalités

### Utilisateurs (Client)
- Inscription sécurisée
- Recherche de trajets (ville de départ, destination, date)
- Consultation des horaires et places disponibles
- Réservation de sièges
- Paiement en ligne
- Téléchargement du billet électronique (PDF)
- Historique des réservations
- Annulation de réservation

### Administrateur
- Gestion des utilisateurs
- Gestion des agences
- Ajout/modification/suppression des trajets
- Gestion des horaires et tarifs
- Visualisation des statistiques (réservations, revenus)
- Validation des paiements

### Gestionnaire d'Agence
- Gestion des bus
- Gestion des chauffeurs
- Gestion des places
- Consultation des réservations
- Confirmation des départs

---

## Prérequis

- **Backend** :
  - Python 3.8+
  - pip
- **Frontend** :
  - Node.js 18+
  - npm ou yarn
- **Base de données** : SQLite (développement)

---

## Installation

### 1. Cloner le dépôt
```bash
git clone <URL_DU_DEPOT_GITHUB>
cd EasyReserve
```

### 2. Backend
```bash
cd backend
# Créer un environnement virtuel (optionnel mais recommandé)
python -m venv venv
# Activer l'environnement virtuel
# Sur Windows :
venv\Scripts\activate
# Sur macOS/Linux :
source venv/bin/activate
# Installer les dépendances
pip install -r requirements.txt
# Appliquer les migrations
python manage.py migrate
# Créer des comptes de test (optionnel)
python create_users.py
```

### 3. Frontend
```bash
cd ../frontend
npm install
```

---

## Lancement du projet

### Backend
```bash
cd backend
python manage.py runserver
```
Le backend est accessible à http://localhost:8000/

### Frontend
```bash
cd frontend
npm start
```
Le frontend est accessible à http://localhost:4200/

---

## Comptes de démonstration

| Rôle          | Nom d'utilisateur | Mot de passe |
|---------------|-------------------|--------------|
| Administrateur| admin             | admin123     |
| Gestionnaire  | gestionnaire      | pass1234     |
| Client        | client            | client123    |

---

## Déploiement

### Backend sur Render
1. Créez un compte sur [Render](https://render.com)
2. Créez un nouveau Web Service
3. Connectez votre dépôt GitHub
4. Configurez :
   - **Build Command** : `pip install -r requirements.txt && python manage.py migrate`
   - **Start Command** : `gunicorn EasyReserve.wsgi`
5. Ajoutez les variables d'environnement (SECRET_KEY, DATABASE_URL, etc.)

### Frontend sur Vercel
1. Créez un compte sur [Vercel](https://vercel.com)
2. Importez votre dépôt GitHub
3. Configurez :
   - **Framework Preset** : Angular
   - **Root Directory** : `frontend`
4. Déployez !

---

## URLs de Production (à remplir)
- **Backend Render** : `https://<VOTRE_APP>.onrender.com`
- **Frontend Vercel** : `https://<VOTRE_APP>.vercel.app`

---

## Auteur
Projet réalisé dans le cadre du cours de Développement Web (Licence 2) à l'Institut Universitaire Saint Jean (Saint Jean Ingenieur), année académique 2025-2026.
