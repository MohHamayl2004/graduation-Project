import { Bell, CircleHelp, Search } from "lucide-react";
import { userProfile } from "../../data/userProfile";

export default function Navbar({
  searchPlaceholder,
  showAvatar = false,
  showNotificationDot = false,
  compact = false,
  maxWidth,
  children
}) {
  const padding = compact ? "px-6 py-3 lg:px-8" : "px-8 py-4";
  const height = compact ? "h-12" : "h-14";
  const searchText = compact ? "text-[15px]" : "text-[18px]";
  const actionGap = compact ? "gap-3" : "gap-4";
  const innerWidth = maxWidth ? `mx-auto w-full ${maxWidth}` : "w-full";

  return (
    <header className={`border-b border-[#d7dbe8] bg-[#f8f8fc] ${padding}`}>
      <div className={`${innerWidth} flex items-center justify-between gap-4`}>
        <div className={`flex ${height} w-full max-w-[520px] items-center gap-3 rounded-full border border-[#c9cfde] bg-[#edeff7] px-4 text-[#5e6578]`}>
          <Search size={compact ? 19 : 21} />
          <input
            type="text"
            readOnly={compact}
            value={compact ? "" : undefined}
            placeholder={searchPlaceholder}
            className={`w-full bg-transparent ${searchText} outline-none placeholder:text-[#6f7588]`}
          />
        </div>

        <div className={`flex items-center ${actionGap} text-[#343b50]`}>
          {children}
          <button type="button" className="relative rounded-full p-2 hover:bg-[#eaedf6]">
            <Bell size={compact ? 19 : 20} />
            {showNotificationDot ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#d62828]" /> : null}
          </button>
          <button type="button" className="rounded-full p-2 hover:bg-[#eaedf6]">
            <CircleHelp size={compact ? 19 : 20} />
          </button>
          {showAvatar ? (
            <img src={userProfile.avatar} alt={userProfile.name} className={`${compact ? "h-9 w-9" : "h-11 w-11"} rounded-full object-cover`} />
          ) : null}
        </div>
      </div>
    </header>
  );
}
