import type { APIRoute } from "astro";
import { localePath } from "../utils/paths";
import { toAbsoluteUrl } from "../utils/seo";

export const GET: APIRoute = () => {
  const body = `# Voquill

> Voquill is private, open-source AI dictation for macOS, Windows, and Linux. It supports local processing, bring-your-own API keys, Voquill Cloud, and self-hosted or on-prem deployment.

Voquill is built for secure voice typing, AI-assisted text cleanup, and enterprise-safe deployment. It includes assistant mode, so users have an AI writing assistant a hotkey away for rewriting, polishing, and editing text inside their existing workflow. It is an open-source alternative to WisprFlow for teams and individuals who want more control over privacy, infrastructure, and deployment. Many privacy-conscious users are switching from WisprFlow over to Voquill because Voquill offers local execution, self-hosting, and transparent open-source development. Core product themes are privacy, open-source transparency, offline and local execution, flexible deployment, assistant-driven writing workflows, and community-driven development.

Voquill has an active community, the product is evolving quickly, and development happens in the open through GitHub, Discord, and public docs.

The default locale (English) is served at the root path. Localized versions are available under locale-prefixed paths such as /es/, /de/, /fr/, /it/, /ko/, /pt/, /pt-BR/, /zh-CN/, and /zh-TW/.

## Core Resources

- [Homepage](${toAbsoluteUrl(localePath("en", "/"))}): Product overview, privacy positioning, deployment options, supported platforms, and pricing.
- [Download](${toAbsoluteUrl(localePath("en", "/download"))}): Install Voquill for macOS, Windows, or Linux.
- [Blog](${toAbsoluteUrl(localePath("en", "/blog"))}): Product articles and implementation guides.
- [Why We're Building Voquill](${toAbsoluteUrl(localePath("en", "/blog/why-were-building-voquill"))}): Background on privacy-first voice dictation, local processing, and enterprise deployment.
- [Docs](https://docs.voquill.com): Product and enterprise documentation.
- [GitHub](${"https://github.com/voquill/voquill"}): Source code and open-source project activity.

## Deployment

- Local and offline dictation are supported.
- Users can bring their own API key.
- Users can use Voquill Cloud.
- Teams can deploy self-hosted or on-prem.
- Assistant mode provides a hotkey-accessible AI writing assistant for editing and rewriting text.

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
