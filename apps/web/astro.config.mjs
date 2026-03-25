// @ts-check
import { defineConfig } from 'astro/config';
import { locales, defaultLocale } from './src/types/locale';

export default defineConfig({
	site: 'https://voquill.com',
	trailingSlash: 'always',
	i18n: {
		defaultLocale,
		locales: [...locales],
		routing: {
			prefixDefaultLocale: true,
		},
	},
});
