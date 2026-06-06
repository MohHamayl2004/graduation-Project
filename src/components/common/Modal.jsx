export default function Modal({ children, open }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
      {children}
    </div>
  );
}
