import { useTranslation } from "react-i18next";

export default function Footer({ brand = false, compact = false, maxWidth }) {
  const { t } = useTranslation("common");
  const innerWidth = maxWidth ? `mx-auto w-full ${maxWidth}` : "w-full";
  const textSize = compact ? "text-xs" : "text-sm";
  const gap = compact ? "gap-5" : "gap-6";

  return (
    <footer className={`border-t border-border bg-surface-raised ${compact ? "px-6 py-2.5 lg:px-8" : "px-8 py-4"}`}>
      <div className={`${innerWidth} flex flex-wrap items-center justify-between gap-3 text-ink-muted`}>
        <p className={textSize}>
          {brand ? <span className="font-semibold text-primary">{t("brand.name")} </span> : null}
          {t("footer.copyright")}
        </p>
        <div className={`flex flex-wrap items-center ${gap} ${textSize}`}>
          <button type="button" className="hover:text-ink">{t("footer.aboutUs")}</button>
          <button type="button" className="hover:text-ink">{t("footer.privacyPolicy")}</button>
          <button type="button" className="hover:text-ink">{t("footer.termsOfService")}</button>
          <button type="button" className="hover:text-ink">{t("footer.support")}</button>
        </div>
      </div>
    </footer>
  );
}
