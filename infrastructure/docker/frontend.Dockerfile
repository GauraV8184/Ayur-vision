FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/

RUN npm install

COPY apps/frontend ./apps/frontend
COPY packages ./packages

ARG VITE_SUPABASE_URL=https://example.supabase.co
ARG VITE_SUPABASE_ANON_KEY=replace-with-real-anon-key-20+
ARG VITE_AI_SERVICE_URL=http://localhost:5000
ARG VITE_API_URL=
ARG VITE_ENABLE_MOCK_MODE=false
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_AI_SERVICE_URL=$VITE_AI_SERVICE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ENABLE_MOCK_MODE=$VITE_ENABLE_MOCK_MODE

RUN npm run build --workspace=frontend

FROM nginx:alpine

COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY infrastructure/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
