import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import AppRoutes from "./routes/AppRoutes";
import { RTL_LANGUAGES } from "./i18n";

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const applyDirection = (lng) => {
      const dir = RTL_LANGUAGES.includes(lng) ? "rtl" : "ltr";
      document.documentElement.dir = dir;
      document.documentElement.lang = lng;
    };

    applyDirection(i18n.language);
    i18n.on("languageChanged", applyDirection);
    return () => i18n.off("languageChanged", applyDirection);
  }, [i18n]);

  return <AppRoutes />;
}
