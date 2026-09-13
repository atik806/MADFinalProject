import { translations, type TranslationKey } from '../constants/translations';

export function useTranslation() {
  const t = (key: TranslationKey) => translations[key];
  return { t };
}
