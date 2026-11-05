import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type MenuCategory = "food" | "drinks";
export type MenuImages = Record<MenuCategory, string>;

const categories: { id: MenuCategory; label: string }[] = [
  { id: "food", label: "อาหาร" },
  { id: "drinks", label: "เครื่องดื่ม" },
];

type MenuSectionProps = {
  images: MenuImages;
  isAdmin: boolean;
  onUpload: (category: MenuCategory, file: File) => Promise<void>;
  onDelete: (category: MenuCategory) => Promise<void>;
  loadError?: string;
};

export function MenuSection({ images, isAdmin, onUpload, onDelete, loadError }: MenuSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [uploadingCategory, setUploadingCategory] = useState<MenuCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<MenuCategory | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (!selectedCategory) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedCategory(null);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedCategory]);

  async function handleUpload(category: MenuCategory, file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("รองรับไฟล์ JPG, PNG หรือ WEBP เท่านั้น");
      setUploadMessage("");
      return;
    }

    setUploadingCategory(category);
    setUploadError("");
    setUploadMessage("");
    try {
      await onUpload(category, file);
      setUploadMessage(`อัปโหลดรูปเมนู${categories.find((item) => item.id === category)?.label}เรียบร้อย`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setUploadingCategory(null);
    }
  }

  async function handleDelete(category: MenuCategory) {
    setDeletingCategory(category);
    setUploadError("");
    setUploadMessage("");
    try {
      await onDelete(category);
      setUploadMessage(`ลบรูปเมนู${categories.find((item) => item.id === category)?.label}เรียบร้อย`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "ลบรูปไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setDeletingCategory(null);
    }
  }

  const selectedLabel = categories.find((category) => category.id === selectedCategory)?.label;
  const selectedImage = selectedCategory ? images[selectedCategory] : "";

  return (
    <section
      id="menu"
      className="card group relative overflow-hidden border-rose-400/20 bg-gradient-to-br from-rose-500/[0.1] via-night-900/70 to-night-900/60 transition-all hover:border-rose-300/40 hover:shadow-[0_10px_35px_rgba(244,63,94,0.14)]"
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-rose-400/10 blur-2xl transition group-hover:bg-rose-400/20" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-200">Explore Menu</p>
            <h2 className="mt-1.5 font-display text-lg font-semibold text-slate-100">เมนูแนะนำ</h2>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-300/20 bg-rose-400/10 text-rose-200 shadow-[0_0_24px_rgba(244,63,94,0.12)]">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M3 11h18M5 11a7 7 0 0 0 14 0M12 4v2m-5-1 1.4 1.4M17 5l-1.4 1.4M4 20h16" />
            </svg>
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          เลือกชมเมนูอาหารและเครื่องดื่มของ Babe-Bar
        </p>
        {loadError && <p role="alert" className="mt-2 text-xs text-rose-300">{loadError}</p>}

        <div className="mt-5 grid grid-cols-2 gap-2">
          {categories.map((category) => (
            <div key={category.id} className="flex min-w-0 flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-slate-100 transition hover:border-rose-300/40 hover:bg-rose-400/10 hover:text-rose-100"
              >
                {category.id === "food" ? (
                  <svg className="h-4 w-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <circle cx="12" cy="12" r="8" strokeWidth="1.6" />
                    <circle cx="12" cy="12" r="5" strokeWidth="1.2" />
                    <path strokeLinecap="round" strokeWidth="1.6" d="M3 4v6m-2-6v3m4-3v3m-2 3v10m18-16c-2 2-3 5-3 8h3m-1-8v16" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-teal-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M7 3h10l-1 7a4 4 0 0 1-8 0L7 3Zm4 11v7m-3 0h6M17 5h2a2 2 0 0 1 0 4h-3" />
                  </svg>
                )}
                {category.label}
                <span className="text-rose-300" aria-hidden="true">→</span>
              </button>
              {isAdmin && (
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-rose-300/20 bg-rose-400/[0.08] px-2 py-1.5 text-[11px] font-medium text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-400/15">
                    {uploadingCategory === category.id
                      ? "กำลังอัปโหลด..."
                      : images[category.id]
                        ? "เปลี่ยนรูป"
                        : "เพิ่มรูป"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      disabled={uploadingCategory !== null || deletingCategory !== null}
                      onChange={(event) => {
                        void handleUpload(category.id, event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {images[category.id] && (
                    <button
                      type="button"
                      disabled={uploadingCategory !== null || deletingCategory !== null}
                      onClick={() => {
                        if (window.confirm(`ยืนยันลบรูปเมนู${category.label}?`)) {
                          void handleDelete(category.id);
                        }
                      }}
                      className="rounded-lg border border-rose-400/20 bg-rose-500/[0.08] px-2 py-1.5 text-[11px] font-medium text-rose-200 transition hover:border-rose-400/40 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingCategory === category.id ? "กำลังลบ..." : "ลบรูป"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {uploadMessage && <p role="status" className="mt-3 text-xs text-teal-200">{uploadMessage}</p>}
        {uploadError && <p role="alert" className="mt-3 text-xs text-rose-300">{uploadError}</p>}
      </div>

      {selectedCategory
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] h-[100dvh] w-screen bg-black"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setSelectedCategory(null);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="menu-category-title"
                className="relative h-full w-full overflow-hidden bg-black"
              >
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt={`เมนู${selectedLabel}`}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-slate-400">
                    ยังไม่มีรูปเมนู
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/75 to-transparent" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-4 p-4 sm:p-6">
                  <h2 id="menu-category-title" className="rounded-full bg-black/45 px-4 py-2 font-display text-lg font-semibold text-white backdrop-blur-md">
                    เมนู{selectedLabel}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    aria-label="ปิดรูปเมนู"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/45 text-2xl text-white backdrop-blur-md transition hover:bg-white/15"
                  >
                    ×
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
