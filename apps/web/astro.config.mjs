// @ts-check
import { defineConfig } from 'astro/config';
import { locales, defaultLocale } from './src/types/locale';

export default defineConfig({
	i18n: {
		defaultLocale,
		locales: [...locales],
		routing: {
			prefixDefaultLocale: true,
		},
	},
});
