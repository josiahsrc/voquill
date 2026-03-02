import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const CONTENT_DIR = path.resolve(__dirname, "..", "content", "blog");
const BASE_URL = "https://voquill.com";
const DEFAULT_IMAGE = `${BASE_URL}/social.jpg`;

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match || !match[1]) return {};
  const fm = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return fm;
}

const routes = [
  {
    path: "/",
    title: "Voquill | Your keyboard is holding you back",
    description:
      "Type four times faster with your voice. Open-source alternative to Wispr Flow.",
    ogType: "website",
  },
  {
    path: "/download",
    title: "Download Voquill",
    description:
      "Install Voquill on macOS, Windows, or Linux and start dictating with AI today.",
    ogType: "website",
  },
  {
    path: "/blog",
    title: "Blog | Voquill",
    description:
      "Tips, guides, and insights on voice typing, speech-to-text technology, and productivity from the Voquill team.",
    ogType: "website",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Voquill",
    description: "How Voquill handles your data and protects your privacy.",
    ogType: "website",
  },
  {
    path: "/terms",
    title: "Terms of Service | Voquill",
    description: "Terms governing the use of the Voquill application and services.",
    ogType: "website",
  },
];

if (fs.existsSync(CONTENT_DIR)) {
  for (const file of fs.readdirSync(CONTENT_DIR)) {
    if (!file.endsWith(".md")) continue;
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    const fm = parseFrontmatter(raw);
    const slug = fm.slug || file.replace(".md", "");
    routes.push({
      path: `/blog/${slug}`,
      title: `${fm.title || slug} | Voquill Blog`,
      description: fm.description || "",
      ogType: "article",
      articleDate: fm.date || "",
      articleAuthor: fm.author || "Voquill Team",
      image: fm.image || "",
    });
  }
}

function injectMeta(html, route) {
  const url = `${BASE_URL}${route.path}`;

  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${route.title}</title>`,
  );

  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${route.description}" />`,
  );

  html = html.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:type" content="${route.ogType}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${route.title}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${route.description}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${url}" />`,
  );

  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${route.title}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:description"[\s\S]*?\/>/,
    `<meta name="twitter:description" content="${route.description}" />`,
  );

  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${url}" />`,
  );

  if (route.image) {
    const imageUrl = route.image.startsWith("http")
      ? route.image
      : `${BASE_URL}${route.image}`;
    html = html.replace(
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:image" content="${imageUrl}" />`,
    );
  }

  if (route.ogType === "article" && route.articleDate) {
    const articleTags = [
      `<meta property="article:published_time" content="${route.articleDate}" />`,
      `<meta property="article:modified_time" content="${route.articleDate}" />`,
      route.articleAuthor
        ? `<meta property="article:author" content="${route.articleAuthor}" />`
        : "",
    ]
      .filter(Boolean)
      .join("\n    ");
    html = html.replace("</head>", `    ${articleTags}\n  </head>`);
  }

  return html;
}

const indexHtml = fs.readFileSync(path.join(DIST, "index.html"), "utf-8");
let created = 0;

for (const route of routes) {
  if (route.path === "/") continue;

  const dir = path.join(DIST, route.path);
  fs.mkdirSync(dir, { recursive: true });

  const html = injectMeta(indexHtml, route);
  fs.writeFileSync(path.join(dir, "index.html"), html);
  created++;
}

const rootHtml = injectMeta(indexHtml, routes[0]);
fs.writeFileSync(path.join(DIST, "index.html"), rootHtml);
created++;

console.log(`Prerendered meta tags for ${created} routes.`);
