import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function LocationSection() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const modal = isOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-title"
            className="card w-full max-w-lg border-teal-300/20 bg-night-900 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-teal-300">
                  Find & Contact Us
                </p>
                <h2 id="location-title" className="mt-2 font-display text-2xl font-semibold text-white">
                  โลเคชัน & ติดต่อเรา
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="ปิดหน้าต่าง"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-night-950">
              <div className="relative flex h-40 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.18),transparent_65%),linear-gradient(135deg,#10141e,#151b28)]">
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="relative flex flex-col items-center text-rose-300">
                  <svg
                    className="h-10 w-10 drop-shadow-[0_0_16px_rgba(244,63,94,.55)]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2.5a7 7 0 0 0-7 7c0 5.1 7 12 7 12s7-6.9 7-12a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
                  </svg>
                  <span className="mt-1 rounded-full border border-rose-300/20 bg-night-950/80 px-3 py-1 text-xs font-semibold text-white">
                    BABE BAR
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div>
                  <p className="text-sm font-semibold text-white">Babe Bar</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    123/45 ถนนสุขุมวิท กรุงเทพฯ
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <svg className="h-4 w-4 text-teal-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" strokeWidth="1.7" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M12 7v5l3 2" />
                  </svg>
                  เปิดทุกวัน 20:00 – 02:00 น.
                </div>
                <a
                  href="https://maps.google.com/?q=Babe+Bar+Bangkok"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary w-full gap-2"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="2.5" strokeWidth="1.7" />
                  </svg>
                  เปิด Google Maps ปักหมุดนำทาง
                </a>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Contact</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M19.2 4.8A10 10 0 0 0 3.5 16.9L2.4 21l4.2-1.1A10 10 0 0 0 19.2 4.8ZM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-2.5.7.7-2.4-.2-.3A8 8 0 1 1 12 20Zm4.4-6c-.2-.1-1.4-.7-1.6-.7s-.4-.1-.5.1-.6.7-.7.8-.3.1-.5 0a6.6 6.6 0 0 1-1.9-1.2 7.1 7.1 0 0 1-1.3-1.6c-.1-.2 0-.3.1-.4l.4-.5.2-.4v-.4c0-.1-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3s-.8.8-.8 2 .8 2.2.9 2.4a9 9 0 0 0 3.5 3.1c.5.2.8.4 1.1.4.5.2.9.2 1.3.1.4-.1 1.4-.6 1.6-1.1.2-.5.2-.9.1-1s-.1-.1-.3-.2Z" />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-xs text-slate-400">LINE</span>
                    <span className="text-sm font-medium text-white">@babebarofficial</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fuchsia-400/10 text-fuchsia-300">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="5" strokeWidth="1.7" />
                      <circle cx="12" cy="12" r="4" strokeWidth="1.7" />
                      <circle cx="17.5" cy="6.8" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-xs text-slate-400">Instagram</span>
                    <span className="text-sm font-medium text-white">@babebarofficial</span>
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <section
      id="location"
      className="card group relative overflow-hidden border-teal-300/20 bg-gradient-to-br from-teal-400/[0.08] via-night-900/70 to-night-900/60 transition-all hover:border-teal-200/40 hover:shadow-[0_10px_35px_rgba(45,212,191,0.12)]"
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-teal-300/10 blur-2xl transition group-hover:bg-teal-300/20" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-200">Visit & Contact</p>
            <h2 className="mt-1.5 font-display text-lg font-semibold text-slate-100">
              โลเคชัน & ติดต่อเรา
            </h2>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-300/10 text-teal-200 shadow-[0_0_24px_rgba(45,212,191,0.12)]">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="2.5" strokeWidth="1.7" />
            </svg>
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          ดูเส้นทางและช่องทางติดต่อ Babe-Bar
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-teal-300/20 bg-teal-300/[0.08] px-3 py-2.5 text-sm font-medium text-teal-100 transition hover:border-teal-200/40 hover:bg-teal-300/15"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" strokeWidth="1.7" />
          </svg>
          โลเคชัน & ติดต่อเรา
        </button>
      </div>
      {modal}
    </section>
  );
}
