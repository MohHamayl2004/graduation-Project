import { useTranslation } from "react-i18next";
import { Bell, CircleHelp, Search } from "lucide-react";
import StudentBadge from "../common/StudentBadge";

export default function Navbar({
  searchPlaceholder,
  showAvatar = false,
  showNotificationDot = false,
  compact = false,
  maxWidth,
  mobileCompact = false,
  children
}) {
  const { t } = useTranslation("common");
  const padding = compact ? "py-3 ps-20 pe-6 lg:px-8" : "py-4 ps-20 pe-8 lg:px-8";
  const height = compact ? "h-11" : "h-12";
  const searchText = compact ? "text-sm" : "text-base";
  const actionGap = compact ? "gap-2" : "gap-3";
  const innerWidth = maxWidth ? `mx-auto w-full ${maxWidth}` : "w-full";

  return (
    <header className={`border-b border-border bg-surface-raised ${padding}`}>
      <div className={`${innerWidth} flex items-center justify-between gap-3`}>
        <div className={`flex ${height} w-full min-w-0 max-w-[520px] items-center gap-3 rounded-full border border-border bg-surface-alt px-4 text-ink-muted`}>
          <Search size={compact ? 18 : 19} className="shrink-0" />
          <input
            type="text"
            readOnly={compact}
            value={compact ? "" : undefined}
            placeholder={searchPlaceholder}
            className={`w-full min-w-0 bg-transparent ${searchText} text-ink outline-none placeholder:text-ink-faint`}
          />
        </div>

        <div className={`flex shrink-0 items-center ${actionGap} text-ink-muted`}>
          {children}
          <button
            type="button"
            aria-label={t("nav.notifications")}
            className="relative grid h-11 w-11 place-items-center rounded-full transition-colors duration-base hover:bg-surface-alt"
          >
            <Bell size={compact ? 18 : 19} />
            {showNotificationDot ? <span className="absolute end-2.5 top-2.5 h-2 w-2 rounded-full bg-error" /> : null}
          </button>
          <button
            type="button"
            aria-label={t("nav.help")}
            className="grid h-11 w-11 place-items-center rounded-full transition-colors duration-base hover:bg-surface-alt"
          >
            <CircleHelp size={compact ? 18 : 19} />
          </button>
          <StudentBadge compactOnMobile={mobileCompact} />
        </div>
      </div>
    </header>
  );
}
