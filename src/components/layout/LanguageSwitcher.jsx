import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "ar", label: "العربية" }
];

export default function LanguageSwitcher({ className = "" }) {
  const { t, i18n } = useTranslation("common");
  const current = i18n.language?.startsWith("ar") ? "ar" : "en";

  return (
    <div
      role="group"
      aria-label={t("nav.language")}
      className={`inline-flex items-center rounded-full border border-border bg-surface-raised p-0.5 text-sm ${className}`}
    >
      {LANGUAGES.map((lng) => {
        const active = current === lng.code;
        return (
          <button
            key={lng.code}
            type="button"
            onClick={() => i18n.changeLanguage(lng.code)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors duration-base ${
              active ? "bg-primary text-white" : "text-ink-muted hover:text-ink"
            }`}
          >
            {lng.label}
          </button>
        );
      })}
    </div>
  );
}
