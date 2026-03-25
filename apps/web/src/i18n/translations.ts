import { type Locale, type TranslationMessages, type TranslationsByLocale } from '../types/locale';
import { enTranslations } from './translations/en';
import { esTranslations } from './translations/es';
import { deTranslations } from './translations/de';
import { frTranslations } from './translations/fr';
import { itTranslations } from './translations/it';
import { koTranslations } from './translations/ko';
import { ptTranslations } from './translations/pt';
import { ptBRTranslations } from './translations/pt-BR';
import { zhCNTranslations } from './translations/zh-CN';
import { zhTWTranslations } from './translations/zh-TW';

export const translations: TranslationsByLocale = {
  'en': enTranslations,
  'es': esTranslations,
  'de': deTranslations,
  'fr': frTranslations,
  'it': itTranslations,
  'ko': koTranslations,
  'pt': ptTranslations,
  'pt-BR': ptBRTranslations,
  'zh-CN': zhCNTranslations,
  'zh-TW': zhTWTranslations,
};

export function t(locale: Locale): TranslationMessages {
  return translations[locale];
}
