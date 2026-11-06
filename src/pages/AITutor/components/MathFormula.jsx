import { memo, useLayoutEffect, useRef, useState } from "react";

// KaTeX creates only MathML with untrusted commands disabled. Native MathML
// dir=rtl lays out Arabic maths from the right without reversing source data.
export default memo(function MathFormula({ latex, label = "معادلة رياضية", pending = false }) {
  const node = useRef(null);
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(true);
  useLayoutEffect(() => {
    let cancelled = false;
    setLoading(true);
    import("katex").then(({ default: katex }) => {
      if (cancelled) return;
      try {
        katex.render(latex, node.current, { output: "mathml", throwOnError: true, strict: "ignore", trust: false, maxExpand: 100, maxSize: 20 });
        node.current.querySelector("math")?.setAttribute("dir", "rtl");
        setInvalid(false);
      } catch { node.current.replaceChildren(); setInvalid(true); }
      setLoading(false);
    }).catch(() => { if (!cancelled) { setInvalid(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [latex]);
  return <span className="math-formula" dir="rtl" aria-label={label}>
    <span ref={node} />
    {loading && <span className="math-render-note">جارٍ تنسيق المعادلة…</span>}
    {!loading && invalid && <span className="math-render-note">{pending ? "جارٍ إكمال المعادلة…" : "تعذّر تنسيق المعادلة. راجع الصيغة."}</span>}
  </span>;
});
