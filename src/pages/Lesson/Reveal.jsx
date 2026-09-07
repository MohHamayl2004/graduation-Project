// Staggers a slide's lines in, in reading order.
//
// The delay is small and the whole build finishes well under a
// second, so a student who is reading rather than listening is never
// left waiting for text. Animation is dropped entirely when the
// viewer asks for reduced motion — the content is then simply there.
export default function Reveal({ step = 0, gap = 90, as: Tag = "div", className = "", children, ...rest }) {
  return (
    <Tag
      className={`animate-rise-in motion-reduce:animate-none ${className}`}
      style={{ animationDelay: `${step * gap}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
