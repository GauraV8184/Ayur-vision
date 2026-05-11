FROM node:20-alpine AS builder

WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/

RUN npm install

COPY apps/backend ./apps/backend
COPY packages ./packages

RUN npm run build --workspace=backend

FROM node:20-alpine

WORKDIR /workspace

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/

RUN npm install --omit=dev

COPY --from=builder /workspace/apps/backend/dist ./apps/backend/dist

WORKDIR /workspace/apps/backend

EXPOSE 3001

CMD ["node", "dist/server.js"]
