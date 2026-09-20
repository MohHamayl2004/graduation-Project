import { useState } from "react";

const SOURCES = {
  color: "/nipras-logo.png",
  white: "/nipras-logo-white.png"
};

export default function Logo({ variant = "color", height = 36, showWordmark = true, className = "" }) {
  const [failed, setFailed] = useState(false);
  const isWhite = variant === "white";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
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
    </div>
  );
}
