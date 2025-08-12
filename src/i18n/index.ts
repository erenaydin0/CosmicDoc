import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Dil dosyalarını import et
import tr from './locales/tr.json';
import en from './locales/en.json';

const resources = {
  tr: {
    translation: tr
  },
  en: {
    translation: en
  }
};

i18n
  // Tarayıcı dil algılayıcısını kullan
  .use(LanguageDetector)
  // React i18next'i kullan
  .use(initReactI18next)
  // i18n'i başlat
  .init({
    resources,
    fallbackLng: 'tr', // Varsayılan dil Türkçe
    debug: false,

    // Tarayıcı dil algılama ayarları
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'synchdoc-language'
    },

    interpolation: {
      escapeValue: false // React zaten XSS koruması sağlıyor
    },

    // Namespace ayarları
    defaultNS: 'translation',
    ns: ['translation']
  });

export default i18n;
