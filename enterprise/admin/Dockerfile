FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY enterprise/admin ./enterprise/admin
COPY enterprise/LICENCE ./enterprise/LICENCE

RUN npm ci --workspace=enterprise/admin

FROM node:20-alpine AS dev

WORKDIR /app

COPY --from=builder /app ./

CMD ["npm", "run", "dev", "--workspace=enterprise/admin", "--", "--host"]

FROM node:20-alpine AS production

RUN npm install -g serve

WORKDIR /app

COPY --from=builder /app ./
RUN npm run build --workspace=enterprise/admin

COPY --from=builder /app/enterprise/LICENCE ./LICENCE

CMD ["serve", "-s", "enterprise/admin/dist", "-l", "5173"]
