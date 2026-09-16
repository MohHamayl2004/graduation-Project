import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import commonEn from "../locales/en/common.json";
import navEn from "../locales/en/nav.json";
import authEn from "../locales/en/auth.json";
import commonAr from "../locales/ar/common.json";
import navAr from "../locales/ar/nav.json";
import authAr from "../locales/ar/auth.json";

export const RTL_LANGUAGES = ["ar"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: commonEn, nav: navEn, auth: authEn },
      ar: { common: commonAr, nav: navAr, auth: authAr }
    },
    fallbackLng: "en",
    supportedLngs: ["en", "ar"],
    ns: ["common", "nav", "auth"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      order: ["querystring", "localStorage", "navigator"],
      lookupQuerystring: "lng",
      caches: ["localStorage"],
      lookupLocalStorage: "nipras_language"
    }
  });

export default i18n;
