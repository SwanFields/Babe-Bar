import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";

export type Review = {
  id: number;
  username: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type ReviewSectionProps = {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  loading: boolean;
  loadError?: string;
  canReview: boolean;
  onSubmitReview: (rating: number, comment: string) => Promise<void>;
  onRefreshReviews: () => Promise<void>;
};

function StarIcon({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    </svg>
  );
}

function ReviewStars({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} จาก 5 ดาว`}>
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon
          key={index}
          filled={index < rating}
          className={`${size} ${index < rating ? "text-amber-300" : "text-slate-600"}`}
        />
      ))}
    </span>
  );
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ReviewSection({
  reviews,
  averageRating,
  totalReviews,
  loading,
  loadError,
  canReview,
  onSubmitReview,
  onRefreshReviews,
}: ReviewSectionProps) {
  const [activeModal, setActiveModal] = useState<"write" | "read" | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activeModal) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveModal(null);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeModal]);

  function openWriteModal() {
    setRating(0);
    setHoveredRating(0);
    setComment("");
    setFormError("");
    setActiveModal("write");
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedComment = comment.trim();
    if (!canReview) {
      setFormError("กรุณาเข้าสู่ระบบด้วยบัญชีลูกค้าก่อนเขียนรีวิว");
      return;
    }
    if (!rating) {
      setFormError("กรุณาเลือกคะแนนดาว");
      return;
    }
    if (!trimmedComment) {
      setFormError("กรุณาเขียนความคิดเห็นก่อนส่งรีวิว");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      await onSubmitReview(rating, trimmedComment);
      setActiveModal("read");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "ส่งรีวิวไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  const modal = activeModal
    ? createPortal(
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveModal(null);
          }}
        >
          {activeModal === "write" ? (
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="write-review-title"
              className="card w-full max-w-md border-rose-400/20 bg-night-900 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-300">Share your experience</p>
                  <h2 id="write-review-title" className="mt-2 font-display text-2xl font-semibold text-white">
                    เขียนรีวิวร้าน
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  aria-label="ปิดหน้าต่าง"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  ×
                </button>
              </div>

              <form className="mt-6 space-y-5" onSubmit={submitReview}>
                <fieldset>
                  <legend className="text-sm font-medium text-slate-200">ให้คะแนนประสบการณ์ของคุณ</legend>
                  <div className="mt-3 flex gap-2" role="group" aria-label="เลือกคะแนน 1 ถึง 5 ดาว">
                    {Array.from({ length: 5 }, (_, index) => {
                      const value = index + 1;
                      const selected = value <= (hoveredRating || rating);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setRating(value);
                            setFormError("");
                          }}
                          onMouseEnter={() => setHoveredRating(value)}
                          onMouseLeave={() => setHoveredRating(0)}
                          onFocus={() => setHoveredRating(value)}
                          onBlur={() => setHoveredRating(0)}
                          aria-label={`${value} ดาว`}
                          aria-pressed={rating === value}
                          className="rounded-lg p-1 text-amber-300 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300"
                        >
                          <StarIcon
                            filled={selected}
                            className={`h-9 w-9 ${selected ? "text-amber-300" : "text-slate-600"}`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{rating ? `${rating} / 5 ดาว` : "แตะดาวเพื่อให้คะแนน"}</p>
                </fieldset>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">ความคิดเห็น</span>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    maxLength={1000}
                    rows={5}
                    required
                    placeholder="เล่าประสบการณ์ของคุณให้เราฟัง..."
                    className="w-full resize-y rounded-xl border border-white/10 bg-night-950/70 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-rose-400"
                  />
                  <span className="mt-1 block text-right text-xs text-slate-500">{comment.length}/1000</span>
                </label>

                {formError && <p role="alert" className="text-sm text-rose-300">{formError}</p>}
                {!canReview && (
                  <p className="text-sm text-amber-200">
                    กรุณาเข้าสู่ระบบด้วยบัญชีลูกค้าก่อนเขียนรีวิว
                  </p>
                )}
                <button type="submit" disabled={submitting || !canReview} className="btn-primary w-full">
                  {submitting ? "กำลังส่งรีวิว..." : "ส่งรีวิว"}
                </button>
              </form>
            </section>
          ) : (
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="read-reviews-title"
              className="card flex max-h-[85vh] w-full max-w-xl flex-col border-rose-400/20 bg-night-900 shadow-2xl"
            >
              <div className="flex shrink-0 items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-300">Guest reviews</p>
                  <h2 id="read-reviews-title" className="mt-2 font-display text-2xl font-semibold text-white">
                    รีวิวจากลูกค้า
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  aria-label="ปิดหน้าต่าง"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 flex shrink-0 items-center gap-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4">
                <span className="font-display text-4xl font-semibold text-amber-200">
                  {totalReviews ? averageRating.toFixed(1) : "—"}
                </span>
                <div>
                  <ReviewStars rating={Math.round(averageRating)} />
                  <p className="mt-1 text-xs text-slate-400">จาก {totalReviews} รีวิว</p>
                </div>
              </div>

              <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" aria-label="รายการรีวิว">
                {loading ? (
                  <div className="p-8 text-center text-sm text-slate-400">กำลังโหลดรีวิว...</div>
                ) : loadError ? (
                  <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">
                    {loadError}
                  </div>
                ) : reviews.length ? reviews.map((review) => (
                  <article key={review.id} className="rounded-xl border border-white/[0.08] bg-night-950/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">@{review.username}</h3>
                        <div className="mt-1">
                          <ReviewStars rating={review.rating} />
                        </div>
                      </div>
                      <time dateTime={review.createdAt} className="text-xs text-slate-500">
                        {formatReviewDate(review.createdAt)}
                      </time>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                      {review.comment}
                    </p>
                  </article>
                )) : (
                  <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
                    ยังไม่มีรีวิว เป็นคนแรกที่แบ่งปันประสบการณ์ได้เลย
                  </div>
                )}
              </div>
            </section>
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <section
      id="reviews"
      className="card group relative overflow-hidden border-amber-300/20 bg-gradient-to-br from-amber-400/[0.08] via-night-900/70 to-night-900/60 transition-all hover:border-amber-200/40 hover:shadow-[0_10px_35px_rgba(251,191,36,0.12)]"
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-amber-300/10 blur-2xl transition group-hover:bg-amber-300/20" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200">Guest voices</p>
            <h2 className="mt-1.5 font-display text-lg font-semibold text-slate-100">รีวิวร้าน</h2>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.12)]">
            <StarIcon filled className="h-6 w-6" />
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <ReviewStars rating={Math.round(averageRating)} />
          <span className="text-xs text-slate-400">
            {totalReviews ? averageRating.toFixed(1) : "—"} · {totalReviews} รีวิว
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={openWriteModal}
            disabled={!canReview}
            title={!canReview ? "เข้าสู่ระบบด้วยบัญชีลูกค้าเพื่อเขียนรีวิว" : undefined}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.08] px-3 py-2.5 text-sm font-medium text-amber-100 transition hover:border-amber-200/40 hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true">✎</span>
            เขียนรีวิว
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveModal("read");
              void onRefreshReviews();
            }}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-slate-100 transition hover:border-amber-200/40 hover:bg-amber-300/10 hover:text-amber-100"
          >
            <svg className="h-4 w-4 text-amber-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
              <circle cx="12" cy="12" r="2.5" strokeWidth="1.7" />
            </svg>
            อ่านรีวิว
          </button>
        </div>
      </div>
      {modal}
    </section>
  );
}
