import { useLanguage } from '../contexts/LanguageContext';
import { translations, type TranslationKey } from '../constants/translations';

export function useTranslation() {
  const { lang, toggleLang } = useLanguage();
  const t = (key: TranslationKey) => translations[key][lang];
  return { t, lang, toggleLang };
}
