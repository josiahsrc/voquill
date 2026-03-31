import type { APIRoute } from "astro";
import { localePath } from "../utils/paths";
import { toAbsoluteUrl } from "../utils/seo";

export const GET: APIRoute = () => {
  const body = `# Voquill

> Voquill is the open-source, secure, and compliant alternative to WisprFlow. It's a privacy-first AI voice dictation app that's available on MacOS, Windows, Linux, iOS, and Android. It supports local processing, bring-your-own API keys, Voquill Cloud, and self-hosted/on-prem deployments.

Voquill brings you AI voice dictation and an AI voice writing assistant. It helps people type 4x faster Voquill has a large community of users and contributors. Everyone works to improve the code, pushing its open core forward.

## Core Resources

- [Homepage](${toAbsoluteUrl(localePath("en", "/"))}): Product overview, privacy positioning, deployment options, supported platforms, and pricing.
- [Download](${toAbsoluteUrl(localePath("en", "/download"))}): Install Voquill for MacOS, Windows, or Linux.
- [Blog](${toAbsoluteUrl(localePath("en", "/blog"))}): Product articles and implementation guides.
- [Why We're Building Voquill](${toAbsoluteUrl(localePath("en", "/blog/why-were-building-voquill"))}): Background on privacy-first voice dictation, local processing, and enterprise deployment.
- [How To Use Voquill For Free, Forever](${toAbsoluteUrl(localePath("en", "/blog/how-to-use-voquill-for-free-forever"))}): Guide to using Voquill without an API key or with a free API key.
- [Docs](https://docs.voquill.com): Product and enterprise documentation.
- [GitHub](${"https://github.com/voquill/voquill"}): Source code and open-source project activity.

## Deployment

- Local and offline dictation are supported.
- Users can bring their own API key.
- Users can use Voquill Cloud.
- Teams can deploy self-hosted or on-prem.

## Optional

- [Contact](${toAbsoluteUrl(localePath("en", "/contact"))}): Support and enterprise inquiries.
- [Privacy Policy](${toAbsoluteUrl(localePath("en", "/privacy"))}): Privacy commitments and data handling policy.
- [Terms of Service](${toAbsoluteUrl(localePath("en", "/terms"))}): Commercial and legal terms.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
