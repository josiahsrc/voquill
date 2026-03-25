import { locales, type Locale } from '../types/locale';
import { localePath } from './paths';

const LOCALIZED_PAGE_PATHS = new Set([
	'/',
	'/blog',
	'/download',
	'/privacy',
	'/terms',
	'/contact',
	'/delete-account',
]);

function isAlreadyLocalizedPath(pathname: string): boolean {
	return locales.some(
		(locale) =>
			pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
	);
}

function hasFileExtension(pathname: string): boolean {
	return /\/[^/]+\.[a-z0-9]+$/i.test(pathname);
}

export function toLocalizedContentPath(href: string, locale: Locale): string {
	if (!href.startsWith('/') || href.startsWith('//')) {
		return href;
	}

	const url = new URL(href, 'https://voquill.com');
	const { pathname, search, hash } = url;

	if (isAlreadyLocalizedPath(pathname) || hasFileExtension(pathname)) {
		return href;
	}

	const shouldLocalize =
		LOCALIZED_PAGE_PATHS.has(pathname) || pathname.startsWith('/blog/');

	if (!shouldLocalize) {
		return href;
	}

	const localizedPath =
		pathname === '/' ? localePath(locale, '/') : localePath(locale, pathname);

	return `${localizedPath}${search}${hash}`;
}

export function localizeHtmlInternalLinks(
	html: string,
	locale: Locale,
): string {
	return html.replace(/href="([^"]+)"/g, (_match, href: string) => {
		return `href="${toLocalizedContentPath(href, locale)}"`;
	});
}
