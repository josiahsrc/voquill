FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY packages/typescript-config ./packages/typescript-config
COPY packages/types ./packages/types
COPY packages/functions ./packages/functions
COPY enterprise/admin ./enterprise/admin
COPY enterprise/LICENCE ./enterprise/LICENCE

RUN npm ci
RUN npm run build --workspace=@repo/types
RUN npm run build --workspace=@repo/functions

FROM node:20-alpine AS dev

WORKDIR /app

COPY --from=builder /app ./
COPY enterprise/admin/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh", "/app/enterprise/admin/public/env.js"]
CMD ["npm", "run", "dev", "--workspace=enterprise/admin", "--", "--host"]

FROM node:20-alpine AS production

ARG VITE_VERSION=0.0.1
ENV VITE_VERSION=${VITE_VERSION}

RUN npm install -g serve

WORKDIR /app

COPY --from=builder /app ./
RUN npm run build --workspace=enterprise/admin

COPY --from=builder /app/enterprise/LICENCE ./LICENCE
COPY enterprise/admin/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh", "/app/enterprise/admin/dist/env.js"]
CMD ["serve", "-s", "enterprise/admin/dist", "-l", "5173"]
