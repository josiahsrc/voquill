FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY packages/typescript-config ./packages/typescript-config
COPY packages/types ./packages/types
COPY packages/functions ./packages/functions
COPY enterprise/admin ./enterprise/admin
COPY enterprise/LICENCE ./enterprise/LICENCE

RUN pnpm install
RUN pnpm --filter @voquill/types run build
RUN pnpm --filter @voquill/functions run build

FROM node:20-alpine AS dev

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=builder /app ./
COPY enterprise/admin/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh", "/app/enterprise/admin/public/env.js"]
CMD ["pnpm", "--filter", "./enterprise/admin", "run", "dev", "--host"]

FROM node:20-alpine AS production

ARG VITE_VERSION=0.0.1
ENV VITE_VERSION=${VITE_VERSION}

RUN npm install -g serve

WORKDIR /app

COPY --from=builder /app ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm --filter ./enterprise/admin run build

COPY --from=builder /app/enterprise/LICENCE ./LICENCE
COPY enterprise/admin/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh", "/app/enterprise/admin/dist/env.js"]
CMD ["serve", "-s", "enterprise/admin/dist", "-l", "5173"]
