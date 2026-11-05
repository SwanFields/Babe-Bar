import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { bookingSchema } from "@babe-bar/shared";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";

type Table = { id: number; tableNo: string; capacityMin: number; capacityMax: number; isVip: boolean; zone: string; available: boolean };
type BookingResult = { booking: { id: string; bookingCode: string; depositSatang: number }; payment: { paymentId: string; amountSatang: number } };
type Ticket = { ticketCode: string; validFrom: string; validUntil: string };

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
const getError = (reason: unknown) => (reason as { response?: { data?: { error?: string } } }).response?.data?.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่";
const bangkokHour = () => Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", hour: "2-digit", hour12: false }).formatToParts(new Date()).find((part) => part.type === "hour")?.value);

export function BookingPage() {
  const { user, loading } = useAuth();
  const [businessDate, setBusinessDate] = useState(today);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedZone, setSelectedZone] = useState("ทั้งหมด");
  const [values, setValues] = useState({ tableId: "", partySizeRange: "1-3", guestName: "", arrivalAt: "20:00", specialRequest: "" });
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const bookingTestMode = import.meta.env.VITE_BOOKING_TEST_MODE === "true";
  const bookingOpen = bookingTestMode || (bangkokHour() >= 6 && bangkokHour() < 20);

  useEffect(() => {
    api.get("/booking/availability", { params: { businessDate } }).then((response) => setTables(response.data)).catch((reason) => setError(getError(reason)));
  }, [businessDate]);

  const zones = useMemo(() => [...new Set(tables.map((table) => table.zone))], [tables]);
  const visibleTables = useMemo(
    () => tables.filter((table) => table.available && (selectedZone === "ทั้งหมด" || table.zone === selectedZone)),
    [selectedZone, tables]
  );
  if (loading) return <section className="mx-auto max-w-2xl px-5 py-24 text-center text-slate-400">กำลังตรวจสอบบัญชี...</section>;
  if (!user) return <Navigate to="/login" state={{ from: "/booking" }} replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const arrivalAt = new Date(`${businessDate}T${values.arrivalAt}:00+07:00`);
    const result = bookingSchema.safeParse({ ...values, tableId: Number(values.tableId), businessDate, arrivalAt });
    if (!result.success) { setError(result.error.issues[0]?.message ?? "กรุณากรอกข้อมูลให้ครบ"); return; }
    setError(""); setSubmitting(true);
    try { setBooking((await api.post("/bookings", result.data)).data); } catch (reason) { setError(getError(reason)); } finally { setSubmitting(false); }
  }

  async function pay() {
    if (!booking) return;
    setSubmitting(true); setError("");
    try {
      const payment = await api.post(`/bookings/${booking.booking.bookingCode}/pay`);
      const checkout = await api.post("/payments/checkout", { kind: "booking", id: booking.booking.id });
      if (!checkout.data.url) throw new Error("ไม่พบลิงก์ชำระเงินจาก Stripe");
      window.location.assign(checkout.data.url);
      void payment;
    } catch (reason) { setError(getError(reason)); setSubmitting(false); }
  }

  if (ticket) return <section className="mx-auto max-w-2xl px-5 py-16"><div className="card text-center"><p className="text-sm font-semibold tracking-[.25em] text-neon-cyan">BOOKING CONFIRMED</p><h1 className="mt-3 font-display text-4xl font-bold">จองโต๊ะสำเร็จ</h1><div className="mx-auto mt-8 flex h-40 w-40 items-center justify-center rounded-xl bg-white text-4xl text-black">▦</div><p className="mt-5 text-2xl font-semibold text-gold">{ticket.ticketCode}</p><p className="mt-3 text-sm text-slate-400">Ticket ใช้ได้ถึง 30 นาทีหลังเวลาเข้าร้าน · เลทเกิน 15 นาทีอาจถูกยึดมัดจำ</p></div></section>;
  if (booking) return <section className="mx-auto max-w-2xl px-5 py-16"><div className="card"><p className="text-sm font-semibold tracking-[.25em] text-neon-cyan">STRIPE TEST PAYMENT</p><h1 className="mt-3 font-display text-4xl font-bold">ชำระมัดจำโต๊ะ</h1><p className="mt-4 text-slate-400">ระบบจะพาไปยัง Stripe Checkout สำหรับการชำระเงินจำลอง 350 บาท</p><button className="btn-primary mt-8 w-full" disabled={submitting} onClick={() => void pay()}>{submitting ? "กำลังเปิด Stripe..." : "ไปชำระเงินด้วย Stripe"}</button>{error && <p className="mt-4 text-sm text-danger">{error}</p>}</div></section>;

  return <section className="mx-auto max-w-3xl px-5 py-16"><div className="mb-8"><p className="text-sm font-semibold tracking-[.25em] text-neon-cyan">TABLE BOOKING</p><h1 className="mt-3 font-display text-4xl font-bold">จองโต๊ะ</h1><p className="mt-3 text-slate-400">เปิดจอง 06:00-20:00 · ร้านเปิด 20:00-02:00 · มัดจำ 350 บาทต่อโต๊ะ</p></div><form className="card space-y-5" onSubmit={submit}>
    <label className="block"><span className="mb-2 block text-sm font-semibold">วันที่เข้าใช้บริการ</span><input className="field" type="date" value={businessDate} min={today()} onChange={(event) => { setBusinessDate(event.target.value); setValues({ ...values, tableId: "" }); }} /></label>
    <div><span className="mb-2 block text-sm font-semibold">เลือกโต๊ะและบริเวณ</span><div className="flex flex-wrap gap-2"><button type="button" className={`rounded-full px-3 py-1 text-xs transition ${selectedZone === "ทั้งหมด" ? "bg-teal-400 text-slate-950" : "bg-white/10 text-slate-300 hover:bg-white/20"}`} onClick={() => { setSelectedZone("ทั้งหมด"); setValues({ ...values, tableId: "" }); }}>ทุกโซน</button>{zones.map((zone) => <button type="button" key={zone} className={`rounded-full px-3 py-1 text-xs transition ${selectedZone === zone ? "bg-teal-400 text-slate-950" : "bg-white/10 text-slate-300 hover:bg-white/20"}`} onClick={() => { setSelectedZone(zone); setValues({ ...values, tableId: "" }); }}>{zone}</button>)}</div><select className="field mt-3" required value={values.tableId} onChange={(event) => setValues({ ...values, tableId: event.target.value })}><option value="">{selectedZone === "ทั้งหมด" ? "เลือกโต๊ะที่ว่าง" : `เลือกโต๊ะที่ว่างใน${selectedZone}`}</option>{visibleTables.map((table) => <option key={table.id} value={table.id}>{table.tableNo} · {table.capacityMin}-{table.capacityMax} คน{table.isVip ? " · VIP" : ""}</option>)}</select>{tables.length > 0 && tables.every((table) => !table.available) && <p className="mt-2 text-sm text-amber-300">วันนี้โต๊ะถูกจองครบแล้ว กรุณาเลือกวันอื่น</p>}{tables.length > 0 && visibleTables.length === 0 && tables.some((table) => table.available) && <p className="mt-2 text-sm text-amber-300">โซนนี้ไม่มีโต๊ะว่าง กรุณาเลือกโซนอื่น</p>}</div>
    <div className="grid gap-5 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-semibold">จำนวนลูกค้า</span><select className="field" value={values.partySizeRange} onChange={(event) => setValues({ ...values, partySizeRange: event.target.value })}><option>1-3</option><option>4-6</option><option>7-10</option><option>10+</option></select></label><label><span className="mb-2 block text-sm font-semibold">เวลาเข้าร้าน (20:00-02:00)</span><input className="field" type="time" required value={values.arrivalAt} onChange={(event) => setValues({ ...values, arrivalAt: event.target.value })} /></label></div>
    <label className="block"><span className="mb-2 block text-sm font-semibold">ชื่อผู้จอง</span><input className="field" required value={values.guestName} onChange={(event) => setValues({ ...values, guestName: event.target.value })} placeholder="ชื่อเล่นหรือชื่อจริง" /></label>
    <label className="block"><span className="mb-2 block text-sm font-semibold">คำขอเพิ่มเติม</span><textarea className="field min-h-24" value={values.specialRequest} onChange={(event) => setValues({ ...values, specialRequest: event.target.value })} placeholder="เช่น ขอใกล้เวที / วันเกิด / ต้องการพื้นที่ด้านหลัง" /></label>
    {bookingTestMode && <p role="status" className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3 text-sm text-cyan-200">โหมดทดสอบ: เปิดให้จองได้ตลอดเวลา</p>}
    {!bookingOpen && <p role="status" className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-gold">ระบบจองเปิดทุกวัน 06:00-20:00 ขณะนี้อยู่นอกเวลาจอง กรุณากลับมาใหม่ในช่วงเวลาที่กำหนด</p>}
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    <button className="btn-primary w-full" disabled={submitting || !bookingOpen}>{submitting ? "กำลังสร้างรายการจอง..." : bookingOpen ? "ดำเนินการชำระมัดจำ 350 บาท" : "ปิดรับจองชั่วคราว"}</button>
  </form></section>;
}