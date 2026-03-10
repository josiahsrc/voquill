export const translations = {
	en: {
		title: 'Welcome to Voquill',
		subtitle: 'The fastest way to create voice-powered content.',
		cta: 'Get Started',
	},
	es: {
		title: 'Bienvenido a Voquill',
		subtitle: 'La forma más rápida de crear contenido con voz.',
		cta: 'Comenzar',
	},
} as const;

export type Locale = keyof typeof translations;

export function t(locale: Locale) {
	return translations[locale];
}
