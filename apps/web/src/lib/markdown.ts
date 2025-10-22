import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

const contentDirectory = join(
  fileURLToPath(new URL("../../content", import.meta.url)),
);

type LegalSlug = "terms" | "privacy";

const markdownCache = new Map<LegalSlug, string>();

export async function getMarkdownContent(slug: LegalSlug) {
  if (markdownCache.has(slug)) {
    return markdownCache.get(slug)!;
  }

  const filePath = join(contentDirectory, `${slug}.md`);
  const file = await readFile(filePath, "utf-8");
  const rendered = marked.parse(file);

  if (typeof rendered !== "string") {
    throw new Error(`Failed to render markdown for ${slug}`);
  }

  markdownCache.set(slug, rendered);
  return rendered;
}

