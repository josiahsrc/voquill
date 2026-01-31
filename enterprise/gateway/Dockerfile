FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY packages/typescript-config ./packages/typescript-config
COPY packages/types ./packages/types
COPY packages/functions ./packages/functions
COPY packages/utilities ./packages/utilities
COPY enterprise/gateway ./enterprise/gateway
COPY enterprise/LICENCE ./enterprise/LICENCE

RUN npm ci
RUN npm run build --workspace=@repo/types
RUN npm run build --workspace=@repo/functions
RUN npm run build --workspace=@repo/enterprise-gateway

FROM node:20-alpine AS dev

WORKDIR /app

COPY --from=builder /app ./

CMD ["npm", "run", "dev", "--workspace=@repo/enterprise-gateway"]

FROM node:20-alpine AS production

ARG GATEWAY_VERSION=0.0.1
ENV GATEWAY_VERSION=${GATEWAY_VERSION}

WORKDIR /app

COPY --from=builder /app/enterprise/gateway/dist ./dist
COPY --from=builder /app/enterprise/gateway/src/db/migrations ./dist/db/migrations
COPY --from=builder /app/enterprise/gateway/package.json ./
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/enterprise/LICENCE ./LICENCE

CMD ["node", "dist/index.js"]
