---
title: Updates & Renewal
description: Keep your on-premise Voquill deployment up to date and renew your license.
---

For as long as your license is valid, you can use and update Voquill to the latest version. Once your license expires, on-premise services will degrade until a new license is applied.

## Server Updates

To update the gateway and admin portal, stop your services, pull the latest images, and start them back up:

```bash
docker compose pull
docker compose up -d
```

Your data in Postgres is persisted via the volume and is not affected by updates.

## Desktop Updates

The desktop app is updated automatically as part of the open-source Voquill client. Updates will be available upon release and can be managed within the app.

## License Renewal

You can visit the settings page on the admin portal to see when your license expires.

![License expiration in admin portal settings](./license-expiration.png)

To renew, contact [enterprise@voquill.com](mailto:enterprise@voquill.com) for a new license key. Once you have it, update the `LICENSE_KEY` environment variable in your `docker-compose.yml` and restart the gateway:

```bash
docker compose up -d gateway
```

No other changes are needed. Your data, users, and configuration are all preserved.
