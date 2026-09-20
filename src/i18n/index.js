import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import commonAr from "../locales/ar/common.json";
import navAr from "../locales/ar/nav.json";
import authAr from "../locales/ar/auth.json";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { common: commonAr, nav: navAr, auth: authAr }
    },
    lng: "ar",
    fallbackLng: "ar",
    supportedLngs: ["ar"],
    ns: ["common", "nav", "auth"],
    defaultNS: "common",
    interpolation: { escapeValue: false }
  });

export default i18n;
