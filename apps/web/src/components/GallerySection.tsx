import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * วิธีใส่รูปจริงของร้าน: วางไฟล์ไว้ที่ apps/web/public/gallery/ แล้วเพิ่มชื่อไฟล์ใน local ด้านล่าง
 * ถ้ารูป local โหลดไม่ได้ จะ fallback ไปใช้รูป remote อัตโนมัติ และถ้าพังหมดจะแสดงกรอบสีแทน
 */
const galleryImages = [
  { local: "/gallery/1.jpg", remote: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=85", alt: "บรรยากาศภายในบาร์ยามค่ำคืน" },
  { local: "/gallery/2.jpg", remote: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1000&q=85", alt: "เครื่องดื่มสีสันสดใสบนเคาน์เตอร์บาร์" },
  { local: "/gallery/3.jpg", remote: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1000&q=85", alt: "ค็อกเทลหลากสีในบรรยากาศแสงนุ่ม" },
  { local: "/gallery/4.jpg", remote: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=85", alt: "มุมโต๊ะนั่งและแสงไฟอบอุ่นในร้าน" },
  { local: "/gallery/5.jpg", remote: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1000&q=85", alt: "ผู้คนกำลังสนุกกับบรรยากาศยามค่ำคืน" },
  { local: "/gallery/6.jpg", remote: "https://images.unsplash.com/photo-1515003197210-e0cd7184f8b5?auto=format&fit=crop&w=1000&q=85", alt: "อาหารและเครื่องดื่มสำหรับค่ำคืนที่ Babe Bar" }
];

function GalleryImage({ local, remote, alt }: { local: string; remote: string; alt: string }) {
  const [src, setSrc] = useState(local);
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-night-800 to-night-900 text-xs text-slate-500">BABE BAR</div>;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={() => (src === local ? setSrc(remote) : setFailed(true))}
      className="h-full w-full select-none object-cover transition duration-500 ease-out group-hover:scale-105 group-hover:brightness-110"
    />
  );
}

export function GallerySection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, startX: 0, startLeft: 0 });
  const [dragging, setDragging] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    const slides = Array.from(el.children) as HTMLElement[];
    let nearest = 0;
    let best = Infinity;
    slides.forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft - el.offsetLeft - el.scrollLeft);
      if (distance < best) { best = distance; nearest = index; }
    });
    setActive(atEndOf(el) ? slides.length - 1 : nearest);
  }, []);

  function atEndOf(el: HTMLElement) {
    return el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
  }

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  const goTo = useCallback((index: number) => {
    const el = trackRef.current;
    const slide = el?.children[index] as HTMLElement | undefined;
    if (el && slide) el.scrollTo({ left: slide.offsetLeft - el.offsetLeft, behavior: "smooth" });
  }, []);

  const step = useCallback((direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    if (direction === 1 && atEndOf(el)) { goTo(0); return; }
    goTo(Math.max(0, Math.min(galleryImages.length - 1, active + direction)));
  }, [active, goTo]);

  // เลื่อนอัตโนมัติทุก 4 วินาที หยุดเมื่อเอาเมาส์ชี้/โฟกัส/กำลังลาก และเคารพ prefers-reduced-motion
  useEffect(() => {
    if (paused || dragging || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => step(1), 4000);
    return () => window.clearInterval(timer);
  }, [paused, dragging, step]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return; // สัมผัสบนมือถือใช้การเลื่อนแบบ native
    const el = trackRef.current;
    if (!el) return;
    drag.current = { active: true, moved: false, startX: event.clientX, startLeft: el.scrollLeft };
    setDragging(true);
    el.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const el = trackRef.current;
    if (!drag.current.active || !el) return;
    const delta = event.clientX - drag.current.startX;
    if (Math.abs(delta) > 3) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - delta;
  }
  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
    trackRef.current?.releasePointerCapture(event.pointerId);
    window.setTimeout(update, 0);
  }

  const arrow = "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-night-950/80 text-lg text-white shadow-soft backdrop-blur transition hover:bg-rose-500/80 disabled:pointer-events-none disabled:opacity-0 sm:flex";

  return (
    <section aria-labelledby="gallery-title" className="mt-10" aria-roledescription="carousel">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-300">Babe Bar Moments</p>
          <h2 id="gallery-title" className="mt-1.5 font-display text-xl font-semibold text-white sm:text-2xl">บรรยากาศร้าน</h2>
        </div>
        <p className="hidden pb-1 text-xs text-slate-400 sm:block">ลากหรือกดลูกศรเพื่อชมภาพเพิ่มเติม</p>
      </div>

      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <button type="button" aria-label="ภาพก่อนหน้า" className={`${arrow} left-2`} disabled={atStart} onClick={() => step(-1)}>‹</button>
        <button type="button" aria-label="ภาพถัดไป" className={`${arrow} right-2`} disabled={atEnd} onClick={() => step(1)}>›</button>

        <div
          ref={trackRef}
          role="list"
          tabIndex={0}
          aria-label="แกลเลอรีภาพบรรยากาศร้าน"
          onScroll={update}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
            if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
          }}
          className={`flex gap-3 overflow-x-auto scroll-smooth pb-2 outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${dragging ? "cursor-grabbing snap-none !scroll-auto" : "cursor-grab snap-x snap-mandatory"}`}
        >
          {galleryImages.map((image, index) => (
            <figure
              key={image.local}
              role="listitem"
              aria-label={`ภาพที่ ${index + 1} จาก ${galleryImages.length}`}
              className="group relative h-52 w-[78vw] max-w-[340px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-night-850 sm:h-60 sm:w-[48%] lg:h-64 lg:w-[32%]"
            >
              <GalleryImage local={image.local} remote={image.remote} alt={image.alt} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night-950/35 via-transparent to-white/[0.03]" />
            </figure>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-2" role="tablist" aria-label="เลือกภาพ">
        {galleryImages.map((image, index) => (
          <button
            key={image.local}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-label={`ไปที่ภาพที่ ${index + 1}`}
            onClick={() => goTo(index)}
            className={`h-1.5 rounded-full transition-all ${active === index ? "w-6 bg-rose-400" : "w-1.5 bg-white/25 hover:bg-white/50"}`}
          />
        ))}
      </div>
    </section>
  );
}
