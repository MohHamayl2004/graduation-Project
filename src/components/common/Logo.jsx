import { useState } from "react";
import { Link } from "react-router-dom";

// Public files live under the site's base path (/graduation-Project/
// on GitHub Pages), so an absolute "/nipras-logo.png" would 404 there.
const BASE = import.meta.env?.BASE_URL ?? "/";

const SOURCES = {
  color: `${BASE}nipras-logo.png`,
  white: `${BASE}nipras-logo-white.png`
};

export default function Logo({ variant = "color", height = 36, showWordmark = true, className = "" }) {
  const [failed, setFailed] = useState(false);
  const isWhite = variant === "white";

  return (
    <Link
      to="/"
      aria-label="الانتقال إلى الصفحة الرئيسية"
      className={`flex cursor-pointer items-center gap-2.5 ${className}`}
    >
      {failed ? (
        <span
          className={`grid shrink-0 place-items-center rounded-md font-display text-lg font-semibold ${
            isWhite ? "bg-white/15 text-white" : "bg-primary text-white"
          }`}
          style={{ height, width: height }}
        >
          ن
        </span>
      ) : (
        <img
          src={SOURCES[variant]}
          alt="شعار نبراس"
          style={{ height }}
          className="w-auto shrink-0"
          onError={() => setFailed(true)}
        />
      )}
      {showWordmark ? (
        <span className={`font-display text-2xl font-semibold tracking-tight ${isWhite ? "text-white" : "text-primary"}`}>
          نبراس
        </span>
      ) : null}
    </Link>
  );
}
