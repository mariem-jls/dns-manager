FROM node:20-alpine as build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --silent || npm install
COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
