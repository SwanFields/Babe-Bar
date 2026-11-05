const galleryImages = [
  {
    src: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=85",
    alt: "บรรยากาศภายในบาร์ยามค่ำคืน"
  },
  {
    src: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1000&q=85",
    alt: "เครื่องดื่มสีสันสดใสบนเคาน์เตอร์บาร์"
  },
  {
    src: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1000&q=85",
    alt: "ค็อกเทลหลากสีในบรรยากาศแสงนุ่ม"
  },
  {
    src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=85",
    alt: "มุมโต๊ะนั่งและแสงไฟอบอุ่นในร้าน"
  },
  {
    src: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1000&q=85",
    alt: "ผู้คนกำลังสนุกกับบรรยากาศยามค่ำคืน"
  },
  {
    src: "https://images.unsplash.com/photo-1515003197210-e0cd7184f8b5?auto=format&fit=crop&w=1000&q=85",
    alt: "อาหารและเครื่องดื่มสำหรับค่ำคืนที่ Babe Bar"
  }
];

export function GallerySection() {
  return (
    <section aria-labelledby="gallery-title" className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-300">
            Babe Bar Moments
          </p>
          <h2 id="gallery-title" className="mt-1.5 font-display text-xl font-semibold text-white sm:text-2xl">
            บรรยากาศร้าน
          </h2>
        </div>
        <p className="hidden pb-1 text-xs text-slate-400 sm:block">เลื่อนเพื่อชมภาพเพิ่มเติม</p>
      </div>

      <div
        role="list"
        aria-label="แกลเลอรีภาพบรรยากาศร้าน"
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {galleryImages.map((image) => (
          <figure
            key={image.src}
            role="listitem"
            className="group relative h-52 w-[78vw] max-w-[340px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-night-850 sm:h-60 sm:w-[48%] lg:h-64 lg:w-[32%]"
          >
            <img
              src={image.src}
              alt={image.alt}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105 group-hover:brightness-110"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night-950/35 via-transparent to-white/[0.03]" />
          </figure>
        ))}
      </div>
    </section>
  );
}