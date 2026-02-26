import { marked } from "marked";

marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = tokens.map((t) => ("text" in t ? t.text : "")).join("");
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    },
  },
});

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  content: string;
  readingTimeMinutes: number;
};

type BlogFrontmatter = Omit<BlogPost, "content" | "readingTimeMinutes">;

function estimateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 238));
}

function parseFrontmatter(raw: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match || !match[1] || !match[2]) {
    return { frontmatter: {}, body: raw };
  }

  const frontmatterBlock = match[1];
  const body = match[2];
  const frontmatter: Record<string, string> = {};

  for (const line of frontmatterBlock.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, "");
    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

function parseTags(raw: string): string[] {
  const match = raw.match(/\[(.*)\]/);
  if (!match || !match[1]) return [];
  return match[1]
    .split(",")
    .map((t) => t.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function toFrontmatter(raw: Record<string, string>, slug: string): BlogFrontmatter {
  return {
    slug: raw.slug || slug,
    title: raw.title || "Untitled",
    description: raw.description || "",
    date: raw.date || "",
    author: raw.author || "Voquill Team",
    tags: parseTags(raw.tags || "[]"),
  };
}

const blogCache = new Map<string, BlogPost>();
let allPosts: BlogPost[] | null = null;

const rawBlogFiles = import.meta.glob<string>("../../content/blog/*.md", {
  import: "default",
  query: "?raw",
  eager: true,
});

for (const [path, raw] of Object.entries(rawBlogFiles)) {
  const fileName = path.split("/").pop();
  if (!fileName) continue;

  const fileSlug = fileName.replace(".md", "");
  const { frontmatter, body } = parseFrontmatter(raw);
  const meta = toFrontmatter(frontmatter, fileSlug);

  const rendered = marked.parse(body);
  if (typeof rendered !== "string") {
    throw new Error(`Failed to render blog markdown for ${fileSlug}`);
  }

  blogCache.set(meta.slug, { ...meta, content: rendered, readingTimeMinutes: estimateReadingTime(body) });
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogCache.get(slug);
}

export function getAllBlogPosts(): BlogPost[] {
  if (allPosts) return allPosts;

  allPosts = Array.from(blogCache.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return allPosts;
}

export function formatBlogDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
