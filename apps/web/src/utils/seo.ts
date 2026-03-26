import type { Locale } from '../types/locale';
import { localePath } from './paths';

export const SITE_URL = 'https://voquill.com';
export const SITE_NAME = 'Voquill';
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const SOFTWARE_ID = `${SITE_URL}/#software`;
export const DEFAULT_SOCIAL_IMAGE = '/social.jpg';
export const DEFAULT_SOCIAL_IMAGE_ALT =
	'Voquill private AI dictation for macOS, Windows, and Linux';

type JsonLd = Record<string, unknown>;

const OG_LOCALE_BY_LOCALE: Record<Locale, string> = {
	en: 'en_US',
	es: 'es_ES',
	de: 'de_DE',
	fr: 'fr_FR',
	it: 'it_IT',
	ko: 'ko_KR',
	pt: 'pt_PT',
	'pt-BR': 'pt_BR',
	'zh-CN': 'zh_CN',
	'zh-TW': 'zh_TW',
};

export function toAbsoluteUrl(pathname: string): string {
	const [pathWithQuery, hash = ''] = pathname.split('#');
	const [rawPath = '/', query = ''] = pathWithQuery.split('?');
	const normalizedPath =
		rawPath !== '/' &&
		!rawPath.endsWith('/') &&
		!/\/[^/]+\.[a-z0-9]+$/i.test(rawPath)
			? `${rawPath}/`
			: rawPath;
	const suffix = `${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;

	return new URL(`${normalizedPath}${suffix}`, SITE_URL).href;
}

export function toAbsoluteImageUrl(imagePath: string): string {
	return new URL(imagePath, SITE_URL).href;
}

export function toIsoDate(value: Date | string): string {
	return new Date(value).toISOString();
}

export function toIsoDateFromDateOnly(date: string): string {
	return new Date(`${date}T00:00:00Z`).toISOString();
}

export function getOgLocale(locale: Locale): string {
	return OG_LOCALE_BY_LOCALE[locale];
}

export function buildOrganizationStructuredData(): JsonLd {
	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		'@id': ORGANIZATION_ID,
		name: SITE_NAME,
		url: SITE_URL,
		description:
			'Open-source private AI dictation for local, cloud, or self-hosted deployment.',
		logo: {
			'@type': 'ImageObject',
			url: toAbsoluteImageUrl('/app-icon.svg'),
		},
		sameAs: [
			'https://github.com/josiahsrc/voquill',
			'https://docs.voquill.com',
			'https://discord.gg/5jXkDvdVdt',
		],
	};
}

export function buildWebsiteStructuredData(): JsonLd {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		'@id': WEBSITE_ID,
		name: SITE_NAME,
		url: SITE_URL,
		publisher: {
			'@id': ORGANIZATION_ID,
		},
	};
}

export function buildSoftwareApplicationStructuredData(
	locale: Locale,
): JsonLd {
	const downloadUrl = toAbsoluteUrl(localePath(locale, '/download'));

	return {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		'@id': SOFTWARE_ID,
		name: SITE_NAME,
		url: toAbsoluteUrl(localePath(locale, '/')),
		downloadUrl,
		applicationCategory: 'BusinessApplication',
		operatingSystem: 'macOS, Windows, Linux',
		description:
			'Private, open-source AI dictation and voice typing for desktop. Run locally, use your own API key, connect to Voquill Cloud, or deploy on-prem.',
		image: toAbsoluteImageUrl(DEFAULT_SOCIAL_IMAGE),
		offers: {
			'@type': 'Offer',
			price: 0,
			priceCurrency: 'USD',
			availability: 'https://schema.org/InStock',
			url: downloadUrl,
		},
		publisher: {
			'@id': ORGANIZATION_ID,
		},
		featureList: [
			'Private voice dictation',
			'Open-source desktop app',
			'Local and offline dictation',
			'Bring your own API key',
			'Voquill Cloud',
			'Self-hosted and on-prem deployment',
		],
	};
}

export function buildBreadcrumbStructuredData(
	items: Array<{ name: string; item: string }>,
): JsonLd {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map(({ name, item }, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name,
			item,
		})),
	};
}

export function buildBlogPostingStructuredData(input: {
	locale: Locale;
	slug: string;
	title: string;
	description: string;
	datePublished: string;
	dateModified?: string;
	image?: string;
	author: string;
	tags: string[];
}): JsonLd {
	const pageUrl = toAbsoluteUrl(
		localePath(input.locale, `/blog/${input.slug}`),
	);
	const dateModified = input.dateModified ?? input.datePublished;
	const author =
		input.author === 'Voquill Team'
			? {
					'@type': 'Organization',
					name: input.author,
				}
			: {
					'@type': 'Person',
					name: input.author,
				};

	return {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: input.title,
		description: input.description,
		url: pageUrl,
		mainEntityOfPage: pageUrl,
		datePublished: toIsoDateFromDateOnly(input.datePublished),
		dateModified: toIsoDateFromDateOnly(dateModified),
		inLanguage: input.locale,
		author,
		image: input.image ? [toAbsoluteImageUrl(input.image)] : undefined,
		keywords: input.tags.join(', '),
		isAccessibleForFree: true,
		publisher: {
			'@id': ORGANIZATION_ID,
		},
	};
}
