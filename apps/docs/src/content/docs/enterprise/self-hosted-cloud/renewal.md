---
title: Updates & Renewal
description: Keep your self-hosted Voquill Enterprise deployment up to date and renew your license.
---

For as long as your license is valid, you can use and update Voquill to the latest version. Once your license expires, services will degrade until a new license is applied.

## Server Updates

To update the gateway and admin portal, redeploy your services with the latest container images. The specific steps depend on your cloud provider — see the updating section in the [AWS](/enterprise/self-hosted-cloud/aws/#updating), [GCP](/enterprise/self-hosted-cloud/gcp/#updating), or [Azure](/enterprise/self-hosted-cloud/azure/#updating) guide for details. Your database is not affected by service redeployments.

## Desktop Updates

The desktop app is updated automatically as part of the open-source Voquill client. Updates will be available upon release and can be managed within the app.

## License Renewal

You can visit the settings page on the admin portal to see when your license expires.

![License expiration in admin portal settings](../on-premise/license-expiration.png)

To renew, contact [enterprise@voquill.com](mailto:enterprise@voquill.com) for a new license key. Once you have it, update the `LICENSE_KEY` environment variable in your deployment and redeploy the gateway service. No other changes are needed — your data, users, and configuration are all preserved.
