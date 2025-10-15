import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

const contentDirectory = path.join(process.cwd(), "content");

type LegalSlug = "terms" | "privacy";

export const getMarkdownContent = cache(async (slug: LegalSlug) => {
  const filePath = path.join(contentDirectory, `${slug}.md`);
  const file = await readFile(filePath, "utf-8");
  const rendered = marked.parse(file);

  if (typeof rendered !== "string") {
    throw new Error(`Failed to render markdown for ${slug}`);
  }

  return rendered;
});
