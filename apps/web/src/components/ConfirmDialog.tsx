import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** กล่องข้อความถามย้ำก่อนทำรายการสำคัญ (แทน window.confirm) — กด Esc หรือคลิกพื้นหลังเพื่อยกเลิก */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus(); // โฟกัสที่ "ยกเลิก" เป็นค่าเริ่มต้น กันกด Enter พลาด
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-rose-500 text-white hover:bg-rose-400"
      : "bg-gradient-to-r from-rose-500 to-rose-400 text-white hover:brightness-110";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-night-900 p-6 shadow-soft"
      >
        <h2 id="confirm-title" className="font-display text-lg font-semibold text-white">
          {title}
        </h2>
        {children && <div className="mt-3 space-y-2 text-sm text-slate-300">{children}</div>}
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${confirmClass}`}
          >
            {busy ? "กำลังดำเนินการ..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
