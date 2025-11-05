import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

type LegalSlug = "terms" | "privacy";

const markdownCache = new Map<LegalSlug, string>();
const rawMarkdownFiles = import.meta.glob<string>("../../content/*.md", {
  import: "default",
  query: "?raw",
  eager: true,
});

const legalSlugs: LegalSlug[] = ["terms", "privacy"];

const isLegalSlug = (value: string): value is LegalSlug => {
  return legalSlugs.includes(value as LegalSlug);
};

for (const [path, raw] of Object.entries(rawMarkdownFiles)) {
  const fileName = path.split("/").pop();

  if (!fileName) {
    continue;
  }

  const slug = fileName.replace(".md", "");

  if (!isLegalSlug(slug)) {
    continue;
  }

  const rendered = marked.parse(raw);

  if (typeof rendered !== "string") {
    throw new Error(`Failed to render markdown for ${slug}`);
  }

  markdownCache.set(slug, rendered);
}

export async function getMarkdownContent(slug: LegalSlug) {
  if (markdownCache.has(slug)) {
    return markdownCache.get(slug)!;
  }

  throw new Error(`Missing markdown content for ${slug}`);
}
