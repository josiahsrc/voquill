import { locales } from '../types/locale';

const localePattern = new RegExp(`^/(${locales.join('|')})`);

export function stripLocalePrefix(pathname: string): string {
	return pathname.replace(localePattern, '');
}
