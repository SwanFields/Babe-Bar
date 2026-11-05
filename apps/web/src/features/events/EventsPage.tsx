export function EventsPage() {
  const events = [
  {
    id: 1,
    date: "31 OCT 2026",
    title: "Halloween Night",
    image: "/images/halloween.jpg",
    detail:
      "แต่งชุดธีมฮาโลวีนแบบจัดเต็ม รับส่วนลดค่าใช้จ่ายภายในร้าน 10%",
    type: "SPECIAL",
  },
  {
    id: 2,
    date: "25 DEC 2026",
    title: "Christmas Party",
    image: "/images/christmas.jpg",
    detail:
      "แต่งตัวธีม Christmas รับฟรีเหล้าช็อต 25 Shot สำหรับโต๊ะที่เข้าร่วมกิจกรรม",
    type: "SPECIAL",
  },
  {
    id: 3,
    date: "DAILY",
    title: "Birthday Shot",
    image: "/images/birthday.jpg",
    detail:
      "โต๊ะเจ้าของวันเกิดรับฟรีเหล้าช็อต 20 Shot และเค้กวันเกิด",
    type: "PROMOTION",
  },
];


  return (
    <section className="mx-auto max-w-6xl px-5 py-16">

      <p className="text-sm font-semibold tracking-[.3em] text-yellow-400">
        EVENTS
      </p>

      <h1 className="mt-4 text-5xl font-bold text-white">
        อีเวนต์และโปรโมชั่น
      </h1>
    
      <div className="mt-10 border-t border-pink-500/20">

        {events.map((event) => (
          <div
            key={event.id}
            className="
              relative
              overflow-hidden
              rounded-3xl
              border border-white/10
              mb-6
             min-h-[220px]
             transition-all duration-300
              hover:scale-[1.01]
              hover:-translate-y-1
            "
          >
            <img
  src={event.image}
  alt={event.title}
  className="
    absolute
    inset-0
    h-full
    w-full
    object-cover
  "
/>

<div
  className="
    absolute
    inset-0
    bg-gradient-to-r
    from-black/90
    via-black/70
    to-black/40
  "
/>
          

            <div className="relative z-10 p-10">

  <p className="font-semibold text-yellow-400">
    {event.date}
  </p>

  <h2 className="mt-4 text-4xl font-bold text-white">
    {event.title}
  </h2>

  <p className="mt-3 max-w-2xl text-slate-200">
    {event.detail}
  </p>

  <span
    className="
      mt-6 inline-block
      rounded-full
      border border-yellow-500/30
      bg-yellow-500/10
      px-4 py-2
      text-xs
      tracking-[.25em]
      text-yellow-300
    "
  >
    {event.type}
  </span>
            </div>

          </div>
        ))}

      </div>

    </section>
  );
}