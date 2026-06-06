export default function LanguageSwitcher() {
  return (
    <div className="inline-flex items-center rounded-full border border-[#c9cfde] bg-white px-2 py-1 text-xs text-[#4f566b]">
      <button type="button" className="px-1 font-semibold text-[#1656cb]">EN</button>
      <span className="text-[#a4aabc]">|</span>
      <button type="button" className="px-1">AR</button>
    </div>
  );
}
