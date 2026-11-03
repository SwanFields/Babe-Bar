import { useEffect, useState } from "react";
import { api } from "../../lib/api";
type EventItem = { id: number; name: string; description?: string; startsAt: string; endsAt: string };
export function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  useEffect(() => { api.get("/events").then((response) => setEvents(response.data)).catch(() => setEvents([])); }, []);
  return <section className="mx-auto max-w-6xl px-5 py-16"><p className="text-sm font-semibold tracking-[.25em] text-neon-pink">SPECIAL EVENTS</p><h1 className="mt-3 font-display text-4xl font-bold">อีเวนต์ของร้าน</h1><div className="mt-8 grid gap-5 md:grid-cols-2">{events.length ? events.map((event) => <article className="card" key={event.id}><h2 className="font-display text-2xl text-gold">{event.name}</h2><p className="mt-3 text-slate-400">{event.description}</p></article>) : <div className="card text-slate-400">ยังไม่มีอีเวนต์ที่เปิดอยู่</div>}</div><div className="mt-8 grid gap-5 md:grid-cols-2"><div className="card"><h2 className="font-display text-xl">Halloween Night</h2><p className="mt-2 text-sm text-slate-400">แต่งธีมฮาโลวีนแบบสับ รับส่วนลด 10%</p></div><div className="card"><h2 className="font-display text-xl">Birthday Shot</h2><p className="mt-2 text-sm text-slate-400">โต๊ะเจ้าของวันเกิดรับช็อตฟรี 20 shot</p></div></div></section>;
}
