export function EventsPage() {
  const events = [
    {
      id: 1,
      date: "31 OCT 2026",
      title: "Halloween Night",
      detail:
        "แต่งชุดธีมฮาโลวีนแบบจัดเต็ม รับส่วนลดค่าใช้จ่ายภายในร้าน 10%",
      type: "SPECIAL",
    },
    {
      id: 2,
      date: "DAILY",
      title: "Birthday Shot",
      detail:
        "โต๊ะเจ้าของวันเกิดรับฟรีเหล้าช็อต 20 Shot และเค้กวันเกิด (Tequila, Vodka และเครื่องดื่มที่ร่วมรายการ)",
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
              grid grid-cols-12
              border-b border-pink-500/20
              py-8
              transition-all
              duration-300
              hover:bg-white/5
              hover:pl-4
              "
          >
            {event.title === "Halloween Night" && (
  <>
    <img
      src="/images/halloween-bg.jpg"
      alt="Halloween Night"
      className="absolute inset-0 h-full w-full object-cover opacity-20"
    />
    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black" />
  </>
)}
            <div className="relative z-10 col-span-2">
              <p className="font-semibold text-yellow-400">
                {event.date}
              </p>
            </div>

            <div className="relative z-10 col-span-8">
              <h3 className="text-2xl font-bold text-white">
                {event.title}
              </h3>

              <p className="mt-2 text-slate-400">
                {event.detail}
              </p>
            </div>

            <div className="relative z-10 col-span-2 text-right">
              <p className="text-xs tracking-[.3em] text-yellow-400">
                {event.type}
              </p>
            </div>

          </div>
        ))}

      </div>

    </section>
  );
}