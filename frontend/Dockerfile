FROM node:24-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$SITE_URL NEXT_PUBLIC_API_URL=/ NEXT_PUBLIC_DEMO_MODE=false NEXT_PUBLIC_WHATSAPP=51934631664 NEXT_TELEMETRY_DISABLED=1
RUN npm run build:release
FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/out /srv
EXPOSE 80 443
