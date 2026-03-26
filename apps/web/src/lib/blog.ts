import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

export type BlogPost = {
	slug: string;
	title: string;
	description: string;
	date: string;
	author: string;
	tags: string[];
	image?: string;
	content: string;
	readingTimeMinutes: number;
};

marked.use({
	renderer: {
		heading({ tokens, depth }) {
			const text = tokens.map((t) => ('text' in t ? t.text : '')).join('');
			const id = text
				.toLowerCase()
				.replace(/[^\w\s-]/g, '')
				.replace(/\s+/g, '-')
				.replace(/-+/g, '-')
				.trim();
			return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
		},
		link({ href, text }) {
			const isExternal = href.startsWith('http');
			if (isExternal) {
				return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
			}
			return `<a href="${href}">${text}</a>`;
		},
	},
});

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

	const frontmatter: Record<string, string> = {};
	for (const line of match[1].split('\n')) {
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) continue;
		const key = line.slice(0, colonIndex).trim();
		const value = line
			.slice(colonIndex + 1)
			.trim()
			.replace(/^["']|["']$/g, '');
		frontmatter[key] = value;
	}

	return { frontmatter, body: match[2] };
}

function parseTags(raw: string): string[] {
	const match = raw.match(/\[(.*)\]/);
	if (!match || !match[1]) return [];
	return match[1]
		.split(',')
		.map((t) => t.trim().replace(/^["']|["']$/g, ''))
		.filter(Boolean);
}

function toBlogPost(
	raw: Record<string, string>,
	fileSlug: string,
	body: string,
): BlogPost {
	const rendered = marked.parse(body);
	if (typeof rendered !== 'string') {
		throw new Error(`Failed to render blog markdown for ${fileSlug}`);
	}

	return {
		slug: raw.slug || fileSlug,
		title: raw.title || 'Untitled',
		description: raw.description || '',
		date: raw.date || '',
		author: raw.author || 'Voquill Team',
		tags: parseTags(raw.tags || '[]'),
		...(raw.image ? { image: raw.image } : {}),
		content: rendered,
		readingTimeMinutes: estimateReadingTime(body),
	};
}

function loadAllPosts(): BlogPost[] {
	const blogDir = path.resolve('content/blog');
	if (!fs.existsSync(blogDir)) return [];

	const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.md'));

	return files
		.map((file) => {
			const fileSlug = file.replace('.md', '');
			const raw = fs.readFileSync(path.join(blogDir, file), 'utf-8');
			const { frontmatter, body } = parseFrontmatter(raw);
			return toBlogPost(frontmatter, fileSlug, body);
		})
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getAllBlogPosts(): BlogPost[] {
	return loadAllPosts();
}

export function getBlogPost(slug: string): BlogPost | undefined {
	return loadAllPosts().find((p) => p.slug === slug);
}

export function getAllBlogSlugs(): string[] {
	return loadAllPosts().map((p) => p.slug);
}

export function formatBlogDate(dateStr: string): string {
	const date = new Date(dateStr + 'T00:00:00');
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}
