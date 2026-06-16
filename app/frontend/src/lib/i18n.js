import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

// Static imports — Vite bundles these at build time
import enPlatform from '../locales/en/platform.json';
import amPlatform from '../locales/am/platform.json';
import enCommon from '../locales/en/common.json';
import amCommon from '../locales/am/common.json';

// Detect persisted language from localStorage, fall back to 'en'
const savedLanguage = localStorage.getItem('dentflow-lang') || 'en';

i18next
  .use(initReactI18next)
  .init({
    lng: savedLanguage,
    fallbackLng: 'en',
    supportedLngs: ['en', 'am'],

    ns: ['common', 'platform', 'subscriptions', 'clinics'],
    defaultNS: 'common',

    resources: {
      en: {
        platform: enPlatform,
        common: enCommon,
        subscriptions: {},
        clinics: {},
      },
      am: {
        platform: amPlatform,
        common: amCommon,
        subscriptions: {},
        clinics: {},
      },
    },

    interpolation: {
      // React already escapes values — no need to double-escape
      escapeValue: false,
    },
  });

export default i18next;
