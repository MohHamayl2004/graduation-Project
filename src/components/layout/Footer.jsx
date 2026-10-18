import { useTranslation } from "react-i18next";
export default function Footer({ brand = false, compact = false, maxWidth }) {
  const { t } = useTranslation("common");
  const links = <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">{["aboutUs", "privacyPolicy", "termsOfService", "support"].map((key) => <button key={key} type="button" className="min-h-11 hover:text-ink">{t(`footer.${key}`)}</button>)}</div>;
  const copyright = <p className="text-xs leading-6 text-ink-muted">{brand && <strong className="text-primary">{t("brand.name")} </strong>}{t("footer.copyright")}</p>;
  return <footer className="shrink-0 border-t border-border bg-surface-raised px-4 sm:px-8">
    <details className="lg:hidden"><summary className="min-h-11 cursor-pointer py-2 text-sm text-ink-muted">روابط الموقع والدعم</summary><div className="max-h-[25dvh] overflow-y-auto pb-3">{copyright}{links}</div></details>
    <div className={`${maxWidth ? `mx-auto ${maxWidth}` : ""} hidden flex-wrap items-center justify-between gap-3 ${compact ? "py-2" : "py-3"} lg:flex`}>{copyright}{links}</div>
  </footer>;
}
