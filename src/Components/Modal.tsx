import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function Modal({ open, onClose, title, children }: ModalProps) {
  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Prevent background scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Modal"}
    >
      {/* Backdrop */}
      <button
        aria-label="Close modal"
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-[1px] transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full h-full max-h-8/12 max-w-6/12 rounded-2xl bg-white shadow-xl ring-1 ring-black/5 transition-all duration-200 animate-in fade-in zoom-in-95 slide-in-from-bottom-2">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-4">
          <div>
            {title ? (
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            ) : null}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}