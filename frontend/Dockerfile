# ============================================
# Étape 1 : Build de l'application React
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --silent || npm install

COPY . .

# Arguments pour les variables d'environnement Vite
ARG VITE_API_URL=http://localhost:8000
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# ============================================
# Étape 2 : Servir avec Nginx
# ============================================
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]