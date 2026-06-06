export default function Footer({ brand = false, compact = false, maxWidth }) {
  const innerWidth = maxWidth ? `mx-auto w-full ${maxWidth}` : "w-full";
  const textSize = compact ? "text-[13px]" : "text-[16px]";
  const gap = compact ? "gap-5" : "gap-8";

  return (
    <footer className={`border-t border-[#d7dbe8] bg-[#f8f8fc] ${compact ? "px-6 py-2.5 lg:px-8" : "px-8 py-4"}`}>
      <div className={`${innerWidth} flex flex-wrap items-center justify-between gap-3 text-[#4f556b]`}>
        <p className={textSize}>
          {brand ? <span className="font-semibold text-[#1456c8]">NIPRAS </span> : null}
          © 2024 NIPRAS AI Learning. All rights reserved.
        </p>
        <div className={`flex flex-wrap items-center ${gap} ${textSize}`}>
          <button type="button">About Us</button>
          <button type="button">Privacy Policy</button>
          <button type="button">Terms of Service</button>
          <button type="button">Support</button>
        </div>
      </div>
    </footer>
  );
}
