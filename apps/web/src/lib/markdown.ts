import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import type { Locale } from '../types/locale';
import { localizeHtmlInternalLinks } from '../utils/internal-links';

marked.setOptions({ gfm: true, breaks: true });

export async function renderLocalizedMarkdownFile(
	relativePath: string,
	locale: Locale,
): Promise<string> {
	const absolutePath = path.resolve(relativePath);
	const markdown = fs.readFileSync(absolutePath, 'utf-8');
	const rendered = await marked.parse(markdown);
	const html = typeof rendered === 'string' ? rendered : String(rendered);

	return localizeHtmlInternalLinks(html, locale);
}
