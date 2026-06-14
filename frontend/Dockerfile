# Dockerfile pour le frontend Angular (build + serve avec nginx)
FROM node:22-alpine as build

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le reste du code
COPY . .

# Construire l'application
RUN npm run build -- --configuration=production

# Étape 2 : Servir avec Nginx
FROM nginx:alpine

# Copier les fichiers buildés depuis l'étape précédente
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Configurer Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Exposer le port 80
EXPOSE 80

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]
