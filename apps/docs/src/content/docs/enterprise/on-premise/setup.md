---
title: On-Premise Setup
description: Set up Voquill Enterprise on your own infrastructure using Docker.
---

This guide walks you through deploying Voquill Enterprise on-premise using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on a host machine accessible to your network.
- A Voquill Enterprise license. Contact [enterprise@voquill.com](mailto:enterprise@voquill.com) if you don't have one yet.

## 1. Create a Docker Compose File

Create a `docker-compose.yml` on your host machine. Make sure to set `JWT_SECRET` and `ENCRYPTION_SECRET` to strong, unique values in production. Set `LICENSE_KEY` to the license key provided to you during onboarding.

```yaml
services:
  admin:
    image: ghcr.io/josiahsrc/voquill/enterprise-admin:latest
    ports:
      - "5100:5173"
    networks:
      - voquill

  gateway:
    image: ghcr.io/josiahsrc/voquill/enterprise-gateway:latest
    ports:
      - "4630:4630"
    environment:
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/voquill
      - JWT_SECRET=fill-me-in
      - ENCRYPTION_SECRET=fill-me-in
      - LICENSE_KEY=your-license-key # email enterprise@voquill.com
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - voquill

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=voquill
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - voquill

networks:
  voquill:
    driver: bridge

volumes:
  postgres_data:
```

## 2. Pull the Images

This downloads the latest versions of all images defined in your compose file.

```bash
docker compose pull
```

## 3. Start the Services

Start the admin portal, gateway, and Postgres database.

```bash
docker compose up -d
```

## 5. Configure the Desktop App

Each Voquill desktop client needs an `enterprise.json` file placed in the app config directory. If you're distributing Voquill with a tool like Microsoft Intune, this file can be placed automatically as part of the deployment.

If you're doing this manually, place the file at the following path for each platform:

| Platform | Path |
| --- | --- |
| macOS | `~/Library/Application Support/com.voquill.desktop/enterprise.json` |
| Linux | `~/.config/com.voquill.desktop/enterprise.json` |
| Windows | `C:\Users\<User>\AppData\Roaming\com.voquill.desktop\enterprise.json` |

The file should contain:

```json
{
  "gatewayUrl": "http://your-host:4630"
}
```

Replace `your-host` with the hostname or IP of the machine running your Docker services.

## 6. Create the First Admin

Once your services are running, open `http://your-host:5100` in your browser. This is the Voquill admin portal.

The first person to sign up becomes the organization admin. Use a strong password and save it somewhere safe -- there is no password recovery for the initial admin account.

From here you can manage users, configure settings, and control how Voquill operates across your organization. See the Admin Portal guide for more details.
