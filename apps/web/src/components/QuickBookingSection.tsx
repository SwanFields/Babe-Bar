import { Link } from "react-router-dom";

const bookingOptions = [
  {
    to: "/booking",
    eyebrow: "Reserve Your Night",
    title: "จองโต๊ะโซนโปรด",
    description: "เลือกโซนและช่วงเวลาที่ใช่ แล้วเตรียมตัวมาสนุกกับค่ำคืนของคุณ",
    image:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1400&q=85",
    accent: "text-amber-200",
    border: "hover:border-amber-300/50",
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M4 20h16M6 20v-7h12v7M8 13V7h8v6M10 7V4h4v3m-7 6h12" />
        <path strokeLinecap="round" strokeWidth="1.6" d="M17 4.5c1.7 1 2.5 2.3 2.5 4" />
      </svg>
    )
  },
  {
    to: "/hosts",
    eyebrow: "Meet Your Favorite Host",
    title: "เลือกจองโฮสต์ทัชใจ",
    description: "ค้นพบโฮสต์ที่ใช่ เติมสีสันให้ค่ำคืนพิเศษของคุณ",
    image:
      "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1400&q=85",
    accent: "text-rose-200",
    border: "hover:border-rose-300/50",
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
        <circle cx="12" cy="11" r="2" strokeWidth="1.4" />
        <path strokeLinecap="round" strokeWidth="1.4" d="M8.5 17c.7-1.6 1.8-2.4 3.5-2.4s2.8.8 3.5 2.4" />
      </svg>
    )
  }
];

export function QuickBookingSection() {
  return (
    <section aria-label="ทางด่วนสำหรับจองโต๊ะและโฮสต์" className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
      {bookingOptions.map((option) => (
        <Link
          key={option.to}
          to={option.to}
          className={`group relative flex min-h-56 h-full overflow-hidden rounded-2xl border border-white/10 bg-night-900 p-6 transition duration-300 hover:-translate-y-0.5 sm:min-h-64 sm:p-8 ${option.border}`}
        >
          <div className="absolute inset-0 scale-100 bg-cover bg-center transition duration-700 ease-out group-hover:scale-105" style={{ backgroundImage: `url("${option.image}")` }} />
          <div className="absolute inset-0 bg-black/65 transition duration-300 group-hover:bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-br from-rose-950/25 via-transparent to-night-950/70" />

          <div className="relative z-10 flex w-full flex-col items-start">
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-black/30 backdrop-blur-sm ${option.accent}`}>
              {option.icon}
            </span>
            <p className={`mt-5 text-[10px] font-semibold uppercase tracking-[0.24em] ${option.accent}`}>
              {option.eyebrow}
            </p>
            <h2 className="mt-1.5 font-display text-xl font-semibold text-white sm:text-2xl">
              {option.title}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-200">
              {option.description}
            </p>
            <span className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white transition group-hover:gap-3 ${option.accent}`}>
              จองเลย
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}