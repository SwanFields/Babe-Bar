import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { api, assetUrl } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useAdminMode } from "../admin/AdminModeContext";

type Method = { id: string; brand: string; last4: string; expMonth: number; expYear: number; isDefault: boolean };
type AdminHost = { id: number; stageName: string; photoUrl: string | null };
type Item = { id: number; startPriceSatang: number; minIncrementSatang: number; currentPriceSatang: number; currentDrinks: number; status: string; leadingUserId: string | null; host: { stageName: string; bio: string | null; photoUrl: string | null } };
type Auction = { opensAt: string; closesAt: string; status: string; items: Item[] };
const errorText = (reason: unknown) => (reason as { response?: { data?: { error?: string } } }).response?.data?.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่";
const DRINK_PRICE_SATANG = 25000;
const drinks = (satang: number) => Math.floor(satang / DRINK_PRICE_SATANG);
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) : null;
const localDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(date);
const localTime = (date: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);

function CardBindingForm({ onSaved, onError, onMessage }: { onSaved: (method: Method) => void; onError: (message: string) => void; onMessage: (message: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) { onError("ยังโหลด Stripe ไม่เสร็จ กรุณาลองใหม่"); return; }
    const card = elements.getElement(CardElement);
    if (!card) { onError("ไม่พบช่องกรอกบัตร"); return; }
    setSubmitting(true); onError("");
    try {
      const setup = await api.post("/auction/payment-methods/setup-intent");
      const result = await stripe.confirmCardSetup(setup.data.clientSecret, { payment_method: { card } });
      if (result.error || !result.setupIntent?.payment_method) throw new Error(result.error?.message ?? "ยืนยันบัตรไม่สำเร็จ");
      const saved = await api.post("/auction/payment-methods", { paymentMethodId: result.setupIntent.payment_method });
      onSaved(saved.data); onMessage("ผูกบัตร Stripe Test Mode สำเร็จแล้ว");
      elements.getElement(CardElement)?.clear();
    } catch (reason) { onError(errorText(reason)); } finally { setSubmitting(false); }
  }

  return <form className="mt-4" onSubmit={(event) => void submit(event)}>
    <div className="rounded-xl border border-white/10 bg-night-950/60 p-4"><CardElement options={{ style: { base: { color: "#f8fafc", fontSize: "16px", "::placeholder": { color: "#64748b" } } } }} /></div>
    <p className="mt-2 text-xs text-slate-500">ใช้บัตรทดสอบ เช่น 4242 4242 4242 4242 · ระบบไม่รับเลขบัตรจริงในโหมดนี้</p>
    <button className="btn-primary mt-4" type="submit" disabled={submitting || !stripe}>{submitting ? "กำลังยืนยันบัตร..." : "ผูกบัตรผ่าน Stripe"}</button>
  </form>;
}

function AuctionContent() {
  const { user, loading } = useAuth();
  const { adminMode } = useAdminMode();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [methods, setMethods] = useState<Method[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [bidItem, setBidItem] = useState<number | null>(null);
  const [bidDrinks, setBidDrinks] = useState<Record<number, string>>({});
  const [schedule, setSchedule] = useState({ date: localDate(new Date()), opensAt: "19:00", closesAt: "20:00" });
  const [adminHosts, setAdminHosts] = useState<AdminHost[]>([]);
  const [selectedHostIds, setSelectedHostIds] = useState<number[]>([]);
  const [draggedHostId, setDraggedHostId] = useState<number | null>(null);

  async function load() {
    try {
      const [auctionResponse, methodsResponse] = await Promise.all([api.get("/auction/today"), api.get("/auction/payment-methods")]);
      setAuction(auctionResponse.data);
      setMethods(methodsResponse.data);
    } catch (reason) { setError(errorText(reason)); }
  }
  useEffect(() => { if (user) void load(); }, [user]);
  useEffect(() => {
    if (user?.role === "admin" && adminMode) {
      void api.get("/auction/admin/hosts").then((response) => {
        const hosts = response.data as AdminHost[];
        setAdminHosts(hosts);
        setSelectedHostIds((current) => current.length ? current.filter((id) => hosts.some((host) => host.id === id)) : hosts.slice(0, 5).map((host) => host.id));
      }).catch((reason) => setError(errorText(reason)));
    }
  }, [adminMode, user]);
  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => { void api.get("/auction/today").then((response) => setAuction(response.data)).catch(() => undefined); }, 2000);
    return () => window.clearInterval(timer);
  }, [user]);

  if (loading) return <section className="mx-auto max-w-3xl px-5 py-24 text-center text-slate-400">กำลังตรวจสอบบัญชี...</section>;
  if (!user) return <Navigate to="/login" state={{ from: "/auction" }} replace />;

  async function placeBid(item: Item) {
    const method = methods.find((entry) => entry.isDefault) ?? methods[0];
    if (!method) { setError("กรุณาผูกบัตรก่อนเข้าประมูล"); return; }
    const amountDrinks = Number(bidDrinks[item.id] ?? drinks(item.currentPriceSatang) + 1);
    if (!Number.isInteger(amountDrinks) || amountDrinks < 1) { setError("จำนวนดริ้งต้องเป็นเลขจำนวนเต็มอย่างน้อย 1"); return; }
    setBidItem(item.id); setError(""); setMessage("");
    try {
      await api.post(`/auction/items/${item.id}/bids`, { amountDrinks, paymentMethodId: method.id });
      setMessage(`เพิ่ม ${amountDrinks} ดริ้ง รวมเป็นยอดใหม่แล้ว`);
      await load();
    } catch (reason) { setError(errorText(reason)); } finally { setBidItem(null); }
  }
  async function scheduleAuction(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      await api.post("/auction/admin/schedule", {
        opensAt: new Date(`${schedule.date}T${schedule.opensAt}:00+07:00`).toISOString(),
        closesAt: new Date(`${schedule.date}T${schedule.closesAt}:00+07:00`).toISOString(),
        hostIds: selectedHostIds
      });
      setMessage("ตั้งเวลาประมูลเรียบร้อยแล้ว"); await load();
    } catch (reason) { setError(errorText(reason)); }
  }
  function moveHost(droppedHostId: number) {
    if (draggedHostId === null || draggedHostId === droppedHostId) return;
    setSelectedHostIds((ids) => {
      const next = [...ids];
      const from = next.indexOf(draggedHostId);
      const to = next.indexOf(droppedHostId);
      if (from < 0 || to < 0) return ids;
      next.splice(from, 1);
      next.splice(to, 0, draggedHostId);
      return next;
    });
    setDraggedHostId(null);
  }
  async function adminAction(action: "open-now" | "close-now") {
    setError(""); setMessage("");
    try {
      const response = await api.post(`/auction/admin/${action}`);
      if (action === "close-now" && response.data.warning) {
        const failures = response.data.settlement.filter((result: { status: string }) => result.status === "payment_failed").length;
        setError(`ปิดประมูลแล้ว แต่ Stripe ตัดเงินไม่สำเร็จ ${failures} รายการ กรุณาตรวจสอบบัตรและลองปิดอีกครั้ง`);
      } else {
        setMessage(action === "open-now" ? "เปิดประมูลทันทีแล้ว" : "ปิดประมูลและตัดเงินผ่าน Stripe เรียบร้อยแล้ว");
      }
      await load();
    }
    catch (reason) { setError(errorText(reason)); }
  }

  return <section className="mx-auto max-w-5xl px-5 py-16">
    <div className="auction-page-intro relative mb-8 overflow-hidden rounded-3xl border border-white/[0.06] px-6 py-8 sm:px-8">
      <div className="auction-intro-orb auction-intro-orb-left" />
      <div className="auction-intro-orb auction-intro-orb-right" />
      <div className="relative">
        <p className="text-sm font-semibold tracking-[.25em] text-neon-cyan">DAILY HOST AUCTION</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white sm:text-5xl">ห้องประมูลโฮสต์</h1>
        <p className="mt-3 max-w-2xl text-slate-400">ประมูลทุกวัน 19:00-20:00 · 1 ดริ้ง = 250 บาท · ราคาจะอัปเดตทุก 2 วินาที</p>
      </div>
    </div>
    <div className="card mb-6 border-amber-400/20 bg-amber-400/[0.05] text-sm text-amber-100">คำเตือน: เมื่อกดประมูลแล้วไม่สามารถยกเลิกได้ ผู้ชนะจะถูกเรียกเก็บเงินอัตโนมัติเมื่อหมดเวลา</div>
    {user.role === "admin" && adminMode && <div className="card mb-6 border-rose-400/20"><h2 className="font-display text-xl font-bold">จัดวางโฮสต์และควบคุมประมูล</h2><p className="mt-2 text-sm text-slate-400">เลือกโฮสต์และใช้ปุ่มลูกศรเพื่อกำหนดลำดับที่จะแสดงในการประมูล</p><div className="mt-4 space-y-2">    {selectedHostIds.map((id, index) => { const host = adminHosts.find((entry) => entry.id === id); if (!host) return null; return <div className={`flex cursor-grab items-center gap-3 rounded-xl border bg-night-950/50 p-2 transition ${draggedHostId === id ? "border-teal-300/60 opacity-50" : "border-white/10"}`} draggable onDragStart={() => setDraggedHostId(id)} onDragEnd={() => setDraggedHostId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveHost(id)} key={id}><span className="text-slate-500" aria-hidden="true">⋮⋮</span><span className="w-6 text-center text-xs text-slate-500">{index + 1}</span><span className="flex-1 text-sm text-white">{host.stageName}</span><button type="button" className="rounded-lg border border-rose-400/30 px-2 py-1 text-xs text-rose-300" onClick={() => setSelectedHostIds((ids) => ids.filter((entry) => entry !== id))}>เอาออก</button></div>; })}</div><div className="mt-3 flex flex-wrap gap-2">{adminHosts.filter((host) => !selectedHostIds.includes(host.id)).map((host) => <button type="button" className="rounded-lg border border-teal-400/30 px-3 py-1.5 text-xs text-teal-300" key={host.id} onClick={() => setSelectedHostIds((ids) => [...ids, host.id])}>+ {host.stageName}</button>)}</div><form className="mt-5 grid gap-3 sm:grid-cols-3" onSubmit={(event) => void scheduleAuction(event)}><label className="text-sm text-slate-400">วันที่<input className="field mt-1" type="date" value={schedule.date} onChange={(event) => setSchedule({ ...schedule, date: event.target.value })} /></label><label className="text-sm text-slate-400">เวลาเปิด<input className="field mt-1" type="time" value={schedule.opensAt} onChange={(event) => setSchedule({ ...schedule, opensAt: event.target.value })} /></label><label className="text-sm text-slate-400">เวลาปิด<input className="field mt-1" type="time" value={schedule.closesAt} onChange={(event) => setSchedule({ ...schedule, closesAt: event.target.value })} /></label>    <button className="btn-primary sm:col-span-3" type="submit" disabled={!selectedHostIds.length}>บันทึกลำดับและแสดงรายการวันนี้</button></form><div className="mt-3 flex flex-wrap gap-3"><button className="rounded-xl border border-teal-400/40 px-4 py-2 text-sm text-teal-200 hover:bg-teal-400/10" type="button" onClick={() => void adminAction("open-now")}>เปิดประมูลทันที</button><button className="rounded-xl border border-rose-400/40 px-4 py-2 text-sm text-rose-200 hover:bg-rose-400/10" type="button" onClick={() => void adminAction("close-now")}>ปิดประมูลทันที</button></div><p className="mt-3 text-xs text-slate-500">เครื่องมือนี้แสดงเฉพาะ Admin ที่เปิดโหมด Admin และเวลาที่ระบบใช้คือ Asia/Bangkok</p></div>}
    <div className="auction-payment-panel card mb-6"><h2 className="font-display text-xl font-bold">บัตรสำหรับประมูล</h2><p className="mt-2 text-sm text-slate-400">{methods.length ? `บัตรที่ผูกไว้: ${methods[0].brand} •••• ${methods[0].last4}` : "ต้องผูกบัตร Stripe Test Mode ก่อนจึงจะประมูลได้"}</p><p className="mt-2 text-[11px] text-slate-500">ต้องผูกบัตรก่อนเท่านั้น จึงจะสามารถทำการประมูลได้</p>{stripePromise ? <CardBindingForm onSaved={(method) => setMethods([method, ...methods])} onError={setError} onMessage={setMessage} /> : <p className="mt-4 text-sm text-amber-300">ยังไม่ได้ตั้งค่า VITE_STRIPE_PUBLISHABLE_KEY ใน apps/web/.env</p>}</div>
    {message && <p className="mb-4 rounded-xl border border-teal-400/30 bg-teal-400/10 p-3 text-sm text-teal-200">{message}</p>}{error && <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    {!auction ? <div className="card text-center text-slate-400">กำลังโหลดรายการประมูล...</div> : (() => { const activeItems = auction.items.filter((item) => item.status === "open"); return <><div className="mb-5 text-sm text-slate-400">สถานะ: <span className="font-semibold text-white">{auction.status === "open" ? "กำลังเปิดประมูล" : auction.status === "closed" ? "ปิดประมูลแล้ว" : "ยังไม่เปิด"}</span> · เปิด {localDate(new Date(auction.opensAt))} {localTime(new Date(auction.opensAt))} · ปิด {localTime(new Date(auction.closesAt))}</div><div className="mb-6 px-6 py-6 text-center"><p className="text-xs font-semibold tracking-[.25em] text-slate-400">ยอดประมูลรวมปัจจุบัน</p><p className="mt-2 font-display text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.28)]">{activeItems.reduce((total, item) => total + item.currentDrinks, 0).toLocaleString("th-TH")} ดริ้ง</p><p className="mt-1 text-xl font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.22)]">{(activeItems.reduce((total, item) => total + item.currentDrinks, 0) * 250).toLocaleString("th-TH")} บาท</p><p className="mt-2 text-xs text-slate-500">รวมยอดดริ้งปัจจุบันของโฮสต์ทุกคน · 1 ดริ้ง = 250 บาท</p></div>{activeItems.length ? <div className="grid gap-4 md:grid-cols-2">        {[...activeItems].sort((a, b) => b.currentDrinks - a.currentDrinks || a.id - b.id).map((item) => { const currentDrinks = item.currentDrinks; return <div className="card relative isolate overflow-hidden" key={item.id}><div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-full"><div className="absolute inset-y-0 right-0 w-3/4" style={{ maskImage: "linear-gradient(to right, transparent 0%, transparent 12%, black 55%, black 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, transparent 12%, black 55%, black 100%)" }}>{item.host.photoUrl && <img src={assetUrl(item.host.photoUrl) ?? undefined} alt="" className="h-full w-full object-cover object-center opacity-55" />}</div><div className="absolute inset-0 bg-gradient-to-r from-night-900 via-night-900/80 to-night-900/10" /><div className="absolute inset-0 bg-gradient-to-t from-night-900/85 via-transparent to-night-900/20" /></div><div className="relative"><div className="flex items-start justify-between"><div><h2 className="font-display text-2xl font-bold">{item.host.stageName}</h2><p className="mt-1 text-sm text-slate-300">{item.host.bio}</p></div><span className="rounded-full bg-rose-400/10 px-3 py-1 text-xs text-rose-300">{item.status}</span></div><p className="mt-6 text-xs uppercase tracking-widest text-slate-500">ยอดดริ้งปัจจุบัน</p><p className="mt-1 font-display text-3xl font-bold text-gold">{currentDrinks} ดริ้ง</p><p className="mt-1 text-sm text-slate-400">คิดเป็น {(currentDrinks * 250).toLocaleString("th-TH")} บาท</p>    {auction.status === "open" ? <><label className="mt-5 block text-sm text-slate-400">จำนวนดริ้งที่จะเพิ่มในการบิด<input className="field mt-1" type="number" min={1} step={1} value={bidDrinks[item.id] ?? 1} onChange={(event) => setBidDrinks({ ...bidDrinks, [item.id]: event.target.value })} /></label><p className="mt-2 text-xs text-slate-500">บิดครั้งนี้เพิ่ม {bidDrinks[item.id] ?? 1} ดริ้ง · 1 ดริ้ง = 250 บาท</p><button className="btn-primary mt-5 w-full" disabled={bidItem === item.id} onClick={() => void placeBid(item)}>{bidItem === item.id ? "กำลังเสนอราคา..." : `เพิ่ม ${bidDrinks[item.id] ?? 1} ดริ้ง`}</button></> :     <p className="auction-preview-label mt-5 text-center text-sm font-semibold">รายการ Host วันนี้ <span className="block text-[11px] font-normal text-amber-200/70">รอเวลาเปิดประมูล</span></p>}</div></div>; })}</div> : <div className="card text-center text-slate-400">ไม่มี Host ที่เปิดประมูลอยู่ในขณะนี้</div>}</> })()}
  </section>;
}

export function AuctionPage() {
  const content = <AuctionContent />;
  return stripePromise ? <Elements stripe={stripePromise}>{content}</Elements> : content;
}
