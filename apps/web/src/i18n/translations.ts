export const translations = {
	en: {
		siteTitle: 'Voquill | Your keyboard is holding you back',
		siteDescription:
			'Type four times faster with your voice. Open-source alternative to Wispr Flow.',
		navDemo: 'Demo',
		navSecurity: 'Security',
		navPricing: 'Pricing',
		navBlog: 'Blog',
		navDocs: 'Docs',
		navEnterprise: 'Enterprise',
		github: 'GitHub',
		download: 'Download',
		heroHeading: 'Your keyboard is holding you back.',
		heroSubtitle:
			'Make voice your new keyboard. Type four times faster by using your voice. Voquill is the open-source alternative to WisprFlow.',
		downloadForFree: 'Download for free',
		openSource: 'Open source',
		freeToUse: 'Free to use. No credit card required.',
		moreDownloads: 'More download options',
		productHuntAlt:
			'Voquill - The open source WisprFlow alternative | Product Hunt',
		whatIsVoquill: 'What is Voquill?',
		voquillDemo: 'Voquill Demo',
		universalCompatibility: 'Universal compatibility',
		oneVoiceEveryApp: 'One voice. Every app.',
		appsDescription:
			'Voquill works system-wide across macOS, Windows, and Linux. Any text field, any application—your voice just works.',
		installLinuxTitle: 'Install Voquill on Linux',
		installLinuxDescription:
			'Run this command in your terminal to install Voquill via APT:',
		copy: 'Copy',
		copied: 'Copied!',
		installLinuxHint:
			'Supports Debian, Ubuntu, and other APT-based distributions. After installing, upgrade anytime with:',
		installLinuxOther:
			'Looking for other options? Visit the {link} for AppImage and other downloads.',
		downloadsPage: 'downloads page',
		close: 'Close',
		comingSoon: 'iOS/Android coming soon',
	},
	es: {
		siteTitle: 'Voquill | Tu teclado te está frenando',
		siteDescription:
			'Escribe cuatro veces más rápido con tu voz. Alternativa de código abierto a Wispr Flow.',
		navDemo: 'Demo',
		navSecurity: 'Seguridad',
		navPricing: 'Precios',
		navBlog: 'Blog',
		navDocs: 'Documentación',
		navEnterprise: 'Empresas',
		github: 'GitHub',
		download: 'Descargar',
		heroHeading: 'Tu teclado te está frenando.',
		heroSubtitle:
			'Haz de tu voz tu nuevo teclado. Escribe cuatro veces más rápido usando tu voz. Voquill es la alternativa de código abierto a WisprFlow.',
		downloadForFree: 'Descargar gratis',
		openSource: 'Código abierto',
		freeToUse: 'Gratis. No se requiere tarjeta de crédito.',
		moreDownloads: 'Más opciones de descarga',
		productHuntAlt:
			'Voquill - La alternativa de código abierto a WisprFlow | Product Hunt',
		whatIsVoquill: '¿Qué es Voquill?',
		voquillDemo: 'Demo de Voquill',
		universalCompatibility: 'Compatibilidad universal',
		oneVoiceEveryApp: 'Una voz. Cada aplicación.',
		appsDescription:
			'Voquill funciona en todo el sistema en macOS, Windows y Linux. Cualquier campo de texto, cualquier aplicación: tu voz simplemente funciona.',
		installLinuxTitle: 'Instalar Voquill en Linux',
		installLinuxDescription:
			'Ejecuta este comando en tu terminal para instalar Voquill mediante APT:',
		copy: 'Copiar',
		copied: '¡Copiado!',
		installLinuxHint:
			'Compatible con Debian, Ubuntu y otras distribuciones basadas en APT. Después de instalar, actualiza en cualquier momento con:',
		installLinuxOther:
			'¿Buscas otras opciones? Visita la {link} para AppImage y otras descargas.',
		downloadsPage: 'página de descargas',
		close: 'Cerrar',
		comingSoon: 'iOS/Android próximamente',
	},
} as const;

export type Locale = keyof typeof translations;

export function t(locale: Locale) {
	return translations[locale];
}
