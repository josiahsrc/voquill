import fs from "fs";
import path from "path";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

export type LegalSlug = "terms" | "privacy" | "contact" | "delete-account";

export function renderMarkdown(slug: LegalSlug): string {
  const filePath = path.join(process.cwd(), "content", `${slug}.md`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const rendered = marked.parse(raw);

  if (typeof rendered !== "string") {
    throw new Error(`Failed to render markdown for ${slug}`);
  }

  return rendered;
}
