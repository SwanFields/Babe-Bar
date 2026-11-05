import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { api, assetUrl } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useAdminMode } from "../admin/AdminModeContext";

type Method = { id: string; brand: string; last4: string; expMonth: number; expYear: number; isDefault: boolean };
type AdminHost = { id: number; stageName: string; photoUrl: string | null };
type HostCustomerRank = { rank: number; userId: string; username: string; drinks: number; amountSatang: number; isMe: boolean };
type HostDripRankings = { hostId: number; rankings: HostCustomerRank[] };
type MyHostDrips = { hostId: number; stageName: string; drinks: number; amountSatang: number };
type CustomerDrips = { mine: { totalDrinks: number; totalSatang: number; hosts: MyHostDrips[] }; hosts: HostDripRankings[] };
const EMPTY_DRIPS: CustomerDrips = { mine: { totalDrinks: 0, totalSatang: 0, hosts: [] }, hosts: [] };
const baht = (satang: number) => (satang / 100).toLocaleString("th-TH");
type Item = { id: number; hostId: number; startPriceSatang: number; minIncrementSatang: number; currentPriceSatang: number; currentDrinks: number; status: string; leadingUserId: string | null; host: { stageName: string; bio: string | null; photoUrl: string | null } };
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

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), intervalMs); return () => window.clearInterval(timer); }, [intervalMs]);
  return now;
}
function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { fromRef.current = target; setValue(target); return; }
    const from = fromRef.current; const start = performance.now(); let frame = 0;
    const tick = (time: number) => {
      const t = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (target - from) * eased);
      fromRef.current = next; setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}
const clock = (ms: number) => { const total = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(total / 3600); const m = Math.floor((total % 3600) / 60); const sec = total % 60; return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":"); };
const statusText = (status: string) => status === "open" ? "กำลังเปิดประมูล" : status === "closed" || status === "settled" ? "ปิดประมูลแล้ว" : "ยังไม่เปิด";

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
  const [drips, setDrips] = useState<CustomerDrips>(EMPTY_DRIPS);
  const [expandedHostId, setExpandedHostId] = useState<number | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const now = useNow();
  const potDrinks = auction ? auction.items.filter((item) => item.status === "open").reduce((total, item) => total + item.currentDrinks, 0) : 0;
  const shownPot = useCountUp(potDrinks);
  const shownMine = useCountUp(drips.mine.totalDrinks);
  const shownMineSatang = useCountUp(drips.mine.totalSatang);

  async function loadDrips() {
    try { setDrips((await api.get("/auction/customer-drips")).data); } catch { /* ไม่ให้การโหลดสรุปดริ้งกระทบหน้าประมูล */ }
  }
  async function load() {
    try {
      const [auctionResponse, methodsResponse] = await Promise.all([api.get("/auction/today"), api.get("/auction/payment-methods")]);
      setAuction(auctionResponse.data);
      setMethods(methodsResponse.data);
    } catch (reason) { setError(errorText(reason)); }
    await loadDrips();
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
    const timer = window.setInterval(() => { void api.get("/auction/today").then((response) => setAuction(response.data)).catch(() => undefined); void loadDrips(); }, 2000);
    return () => window.clearInterval(timer);
  }, [user]);

  if (loading) return <section className="mx-auto max-w-3xl px-5 py-24 text-center text-slate-400">กำลังตรวจสอบบัญชี...</section>;
  if (!user) return <Navigate to="/login" state={{ from: "/auction" }} replace />;

  const hostRankings = (hostId: number): HostCustomerRank[] => drips.hosts.find((entry) => entry.hostId === hostId)?.rankings ?? [];

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

  const target = auction ? (auction.status === "open" ? new Date(auction.closesAt).getTime() : auction.status === "scheduled" ? new Date(auction.opensAt).getTime() : null) : null;
  const remaining = target === null ? null : target - now;
  const progress = auction && auction.status === "open" ? Math.min(100, Math.max(0, ((now - new Date(auction.opensAt).getTime()) / (new Date(auction.closesAt).getTime() - new Date(auction.opensAt).getTime())) * 100)) : auction && (auction.status === "closed" || auction.status === "settled") ? 100 : 0;
  const mineMax = Math.max(1, ...drips.mine.hosts.map((row) => row.amountSatang));

  return <section className="au-page mx-auto max-w-5xl px-5 py-14">
    <header className="au-hero au-reveal">
      <div className="au-aurora" aria-hidden="true"><span /><span /><span /></div>
      <div className="relative">
        <div className="flex flex-wrap items-center gap-3">
          <span className="au-eyebrow">DAILY HOST AUCTION</span>
          {auction && <span className={`au-status au-status-${auction.status === "settled" ? "closed" : auction.status}`}><i />{statusText(auction.status)}</span>}
        </div>
        <h1 className="au-title">ห้องประมูล<span>โฮสต์</span></h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-400">ประมูลทุกวัน 19:00-20:00 · 1 ดริ้ง = 250 บาท · ราคาอัปเดตอัตโนมัติทุก 2 วินาที</p>
        {remaining !== null && <div className="au-countdown" aria-live="off"><span>{auction?.status === "open" ? "ปิดประมูลใน" : "เปิดประมูลใน"}</span><b>{clock(remaining)}</b></div>}
      </div>
    </header>
    <p className="au-notice au-reveal" style={{ animationDelay: "80ms" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg><span>เมื่อกดประมูลแล้วไม่สามารถยกเลิกได้ ผู้ชนะจะถูกเรียกเก็บเงินอัตโนมัติเมื่อหมดเวลา</span></p>
    <section className="au-mine au-reveal" style={{ animationDelay: "140ms" }}>
      <div className="au-mine-head">
        <p className="au-label">ดริ้งที่คุณบิดในรอบนี้</p>
        <div className="au-mine-stats">
          <p className="au-stat"><b>{shownMine.toLocaleString("th-TH")}</b><span>ดริ้ง</span></p>
          <i aria-hidden="true" />
          <p className="au-stat au-stat-gold"><b>{baht(shownMineSatang)}</b><span>บาท</span></p>
        </div>
      </div>
      {drips.mine.hosts.length ? <ul className="au-mine-list">
        {drips.mine.hosts.map((row, index) => <li key={row.hostId} style={{ animationDelay: `${index * 70}ms` }}>
          <div className="flex items-baseline justify-between gap-3"><span className="truncate text-sm font-medium text-white">{row.stageName}</span><span className="shrink-0 text-xs text-slate-400">{row.drinks.toLocaleString("th-TH")} ดริ้ง · {baht(row.amountSatang)} บาท</span></div>
          <div className="au-bar"><div style={{ width: `${Math.max(6, (row.amountSatang / mineMax) * 100)}%` }} /></div>
        </li>)}
      </ul> : <p className="au-empty">ยังไม่ได้บิดให้โฮสต์คนไหนในรอบนี้ — เลือกโฮสต์ที่ใช่แล้วกดบิดได้เลย</p>}
    </section>
    {user.role === "admin" && adminMode && <details className="au-admin au-reveal" open><summary className="au-admin-summary"><span>เครื่องมือแอดมิน</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></summary><div className="au-admin-body"><h2 className="font-display text-lg font-semibold text-white">จัดวางโฮสต์และควบคุมประมูล</h2><p className="mt-2 text-sm text-slate-400">เลือกโฮสต์และใช้ปุ่มลูกศรเพื่อกำหนดลำดับที่จะแสดงในการประมูล</p><div className="mt-4 space-y-2">    {selectedHostIds.map((id, index) => { const host = adminHosts.find((entry) => entry.id === id); if (!host) return null; return <div className={`flex cursor-grab items-center gap-3 rounded-xl border bg-night-950/50 p-2 transition ${draggedHostId === id ? "border-teal-300/60 opacity-50" : "border-white/10"}`} draggable onDragStart={() => setDraggedHostId(id)} onDragEnd={() => setDraggedHostId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveHost(id)} key={id}><span className="text-slate-500" aria-hidden="true">⋮⋮</span><span className="w-6 text-center text-xs text-slate-500">{index + 1}</span><span className="flex-1 text-sm text-white">{host.stageName}</span><button type="button" className="rounded-lg border border-rose-400/30 px-2 py-1 text-xs text-rose-300" onClick={() => setSelectedHostIds((ids) => ids.filter((entry) => entry !== id))}>เอาออก</button></div>; })}</div><div className="mt-3 flex flex-wrap gap-2">{adminHosts.filter((host) => !selectedHostIds.includes(host.id)).map((host) => <button type="button" className="rounded-lg border border-teal-400/30 px-3 py-1.5 text-xs text-teal-300" key={host.id} onClick={() => setSelectedHostIds((ids) => [...ids, host.id])}>+ {host.stageName}</button>)}</div><form className="mt-5 grid gap-3 sm:grid-cols-3" onSubmit={(event) => void scheduleAuction(event)}><label className="text-sm text-slate-400">วันที่<input className="field mt-1" type="date" value={schedule.date} onChange={(event) => setSchedule({ ...schedule, date: event.target.value })} /></label><label className="text-sm text-slate-400">เวลาเปิด<input className="field mt-1" type="time" value={schedule.opensAt} onChange={(event) => setSchedule({ ...schedule, opensAt: event.target.value })} /></label><label className="text-sm text-slate-400">เวลาปิด<input className="field mt-1" type="time" value={schedule.closesAt} onChange={(event) => setSchedule({ ...schedule, closesAt: event.target.value })} /></label>    <button className="btn-primary sm:col-span-3" type="submit" disabled={!selectedHostIds.length}>บันทึกลำดับและแสดงรายการวันนี้</button></form><div className="mt-3 flex flex-wrap gap-3"><button className="rounded-xl border border-teal-400/40 px-4 py-2 text-sm text-teal-200 hover:bg-teal-400/10" type="button" onClick={() => void adminAction("open-now")}>เปิดประมูลทันที</button><button className="rounded-xl border border-rose-400/40 px-4 py-2 text-sm text-rose-200 hover:bg-rose-400/10" type="button" onClick={() => void adminAction("close-now")}>ปิดประมูลทันที</button></div><p className="mt-3 text-xs text-slate-500">เครื่องมือนี้แสดงเฉพาะ Admin ที่เปิดโหมด Admin และเวลาที่ระบบใช้คือ Asia/Bangkok</p></div></details>}
    <div className="au-pay au-reveal" style={{ animationDelay: "200ms" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="au-pay-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20M6 15h4" /></svg></span>
          <div>
            <p className="text-sm font-semibold text-white">บัตรสำหรับประมูล</p>
            <p className="text-xs text-slate-400">{methods.length ? `${methods[0].brand} •••• ${methods[0].last4}` : "ต้องผูกบัตร Stripe Test Mode ก่อนจึงจะประมูลได้"}</p>
          </div>
        </div>
        {methods.length > 0 && <button type="button" className="au-link" onClick={() => setShowCardForm((value) => !value)}>{showCardForm ? "ซ่อนฟอร์ม" : "เปลี่ยนบัตร"}</button>}
      </div>
      {(!methods.length || showCardForm) && <div className="au-pay-form">{stripePromise ? <CardBindingForm onSaved={(method) => { setMethods([method, ...methods]); setShowCardForm(false); }} onError={setError} onMessage={setMessage} /> : <p className="mt-2 text-sm text-amber-300">ยังไม่ได้ตั้งค่า VITE_STRIPE_PUBLISHABLE_KEY ใน apps/web/.env</p>}</div>}
      {!methods.length && <p className="mt-3 text-[11px] text-slate-500">ต้องผูกบัตรก่อนเท่านั้น จึงจะสามารถทำการประมูลได้</p>}
    </div>
    {message && <p className="au-alert au-alert-ok" role="status">{message}</p>}{error && <p className="au-alert au-alert-err" role="alert">{error}</p>}
    {!auction ? <div className="au-skeleton" aria-busy="true"><span /><span /></div> : (() => { const activeItems = auction.items.filter((item) => item.status === "open"); return <><section className="au-pot au-reveal" style={{ animationDelay: "260ms" }}><div className="au-pot-glow" aria-hidden="true" /><p className="au-label text-center">ยอดประมูลรวมปัจจุบัน</p><p className="au-pot-number au-bump" key={potDrinks}>{shownPot.toLocaleString("th-TH")}<span>ดริ้ง</span></p><p className="au-pot-baht">{(shownPot * 250).toLocaleString("th-TH")} บาท</p><div className="au-time" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><div style={{ width: `${progress}%` }} /></div><p className="mt-3 text-center text-xs text-slate-500">เปิด {localDate(new Date(auction.opensAt))} {localTime(new Date(auction.opensAt))} · ปิด {localTime(new Date(auction.closesAt))} · รวมยอดของโฮสต์ทุกคน</p></section>{activeItems.length ? <div className="grid gap-4 md:grid-cols-2">        {[...activeItems].sort((a, b) => b.currentDrinks - a.currentDrinks || a.id - b.id).map((item) => { const currentDrinks = item.currentDrinks; return <div className="card relative isolate overflow-hidden" key={item.id}><div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-full"><div className="absolute inset-y-0 right-0 w-3/4" style={{ maskImage: "linear-gradient(to right, transparent 0%, transparent 12%, black 55%, black 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, transparent 12%, black 55%, black 100%)" }}>{item.host.photoUrl && <img src={assetUrl(item.host.photoUrl) ?? undefined} alt="" className="h-full w-full object-cover object-center opacity-55" />}</div><div className="absolute inset-0 bg-gradient-to-r from-night-900 via-night-900/80 to-night-900/10" /><div className="absolute inset-0 bg-gradient-to-t from-night-900/85 via-transparent to-night-900/20" /></div><div className="relative"><div className="flex items-start justify-between"><div><h2 className="font-display text-2xl font-bold">{item.host.stageName}</h2><p className="mt-1 text-sm text-slate-300">{item.host.bio}</p></div><span className="rounded-full bg-rose-400/10 px-3 py-1 text-xs text-rose-300">{item.status}</span></div><p className="mt-6 text-xs uppercase tracking-widest text-slate-500">ยอดดริ้งปัจจุบัน</p><p className="mt-1 font-display text-3xl font-bold text-gold">{currentDrinks} ดริ้ง</p><p className="mt-1 text-sm text-slate-400">คิดเป็น {(currentDrinks * 250).toLocaleString("th-TH")} บาท</p>    <div className="mt-5"><button type="button" aria-expanded={expandedHostId === item.id} onClick={() => setExpandedHostId(expandedHostId === item.id ? null : item.id)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-night-950/50 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5"><span>Top 3 ลูกค้าที่บิดโฮสต์คนนี้</span><svg className={`h-4 w-4 transition-transform ${expandedHostId === item.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>{expandedHostId === item.id && <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-night-900/90 p-3">{hostRankings(item.hostId).length ? hostRankings(item.hostId).map((row) => <div key={row.userId} className={`flex items-center justify-between rounded-lg px-3 py-2 ${row.rank === 1 ? "bg-gold/10" : ""}`}><div className="flex min-w-0 items-center gap-2"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${row.rank === 1 ? "bg-gold text-black" : "bg-slate-700 text-white"}`}>{row.rank}</span><span className="truncate text-sm text-white">{row.username}{row.isMe && <span className="ml-1 text-xs text-teal-300">(คุณ)</span>}</span></div><span className="shrink-0 text-xs text-slate-300">{row.drinks.toLocaleString("th-TH")} ดริ้ง · {baht(row.amountSatang)} บาท</span></div>) : <p className="px-1 py-2 text-center text-xs text-slate-500">ยังไม่มีลูกค้าบิดโฮสต์คนนี้</p>}</div>}</div>{auction.status === "open" ? <><label className="mt-5 block text-sm text-slate-400">จำนวนดริ้งที่จะเพิ่มในการบิด<input className="field mt-1" type="number" min={1} step={1} value={bidDrinks[item.id] ?? 1} onChange={(event) => setBidDrinks({ ...bidDrinks, [item.id]: event.target.value })} /></label><p className="mt-2 text-xs text-slate-500">บิดครั้งนี้เพิ่ม {bidDrinks[item.id] ?? 1} ดริ้ง · 1 ดริ้ง = 250 บาท</p><button className="btn-primary mt-5 w-full" disabled={bidItem === item.id} onClick={() => void placeBid(item)}>{bidItem === item.id ? "กำลังเสนอราคา..." : `เพิ่ม ${bidDrinks[item.id] ?? 1} ดริ้ง`}</button></> :     <p className="auction-preview-label mt-5 text-center text-sm font-semibold">รายการ Host วันนี้ <span className="block text-[11px] font-normal text-amber-200/70">รอเวลาเปิดประมูล</span></p>}</div></div>; })}</div> : <div className="card text-center text-slate-400">ไม่มี Host ที่เปิดประมูลอยู่ในขณะนี้</div>}</> })()}
  </section>;
}

export function AuctionPage() {
  const content = <AuctionContent />;
  return stripePromise ? <Elements stripe={stripePromise}>{content}</Elements> : content;
}
