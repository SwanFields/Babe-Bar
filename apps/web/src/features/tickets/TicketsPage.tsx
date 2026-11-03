import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";

type Ticket = {
  id: string;
  ticketCode: string;
  ticketType: "table" | "package";
  status: string;
  validFrom: string;
  validUntil: string;
  payment?: { amountSatang: number; paidAt: string | null; status: string } | null;
  booking?: { guestName: string; partySizeRange: string; arrivalAt: string; table: { tableNo: string; zone: { nameTh: string } } } | null;
  packageOrder?: { package: { name: string } } | null;
};

const formatDate = (value: string) => new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const statusLabel = (status: string) => status === "active" ? "ยังใช้งานได้" : status === "used" ? "ใช้งานแล้ว" : status === "expired" ? "หมดอายุ" : "ยกเลิก";

export function TicketsPage() {
  const { user, loading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get("/tickets").then((response) => setTickets(response.data)).catch(() => setError("ไม่สามารถโหลด Ticket ได้"));
  }, [user]);

  if (loading) return <section className="mx-auto max-w-4xl px-5 py-24 text-center text-slate-400">กำลังตรวจสอบบัญชี...</section>;
  if (!user) return <Navigate to="/login" state={{ from: "/tickets" }} replace />;

  if (selected) return <section className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
    <button className="btn-ghost mb-5" onClick={() => setSelected(null)}>← กลับไป Ticket ของฉัน</button>
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-night-900/90 shadow-2xl">
      <div className="bg-gradient-to-r from-rose-500/20 via-night-900 to-teal-400/20 px-6 py-8 text-center sm:px-10">
        <p className="text-xs font-semibold tracking-[.3em] text-teal-300">BABE BAR TICKET</p>
        <h1 className="mt-4 font-display text-4xl font-bold text-gold sm:text-5xl">{selected.packageOrder?.package.name ?? "Table Booking"}</h1>
        <p className="mt-3 text-sm text-slate-400">{selected.ticketCode}</p>
      </div>
      <div className="space-y-5 px-6 py-8 sm:px-10">
        <div className="flex justify-center"><div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-white text-center text-sm font-semibold text-black shadow-lg">QR CODE<br/>{selected.ticketCode}</div></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><p className="text-xs text-slate-500">เวลาที่จ่ายเงิน</p><p className="mt-1 text-sm text-white">{selected.payment?.paidAt ? formatDate(selected.payment.paidAt) : "ไม่พบข้อมูล"}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><p className="text-xs text-slate-500">สถานะการใช้งาน</p><p className={`mt-1 text-sm font-semibold ${selected.status === "active" ? "text-teal-300" : "text-rose-300"}`}>{statusLabel(selected.status)}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[.03] p-4 sm:col-span-2"><p className="text-xs text-slate-500">วันหมดอายุ Ticket</p><p className="mt-1 text-sm text-white">{formatDate(selected.validUntil)}</p></div>
        </div>
        {selected.booking && <div className="border-t border-white/10 pt-5 text-sm text-slate-300">โต๊ะ {selected.booking.table.tableNo} · {selected.booking.table.zone.nameTh} · {selected.booking.partySizeRange} คน</div>}
      </div>
    </article>
  </section>;

  return <section className="mx-auto max-w-4xl px-5 py-16">
    <p className="text-sm font-semibold tracking-[.25em] text-neon-cyan">MY TICKETS</p>
    <h1 className="mt-3 font-display text-4xl font-bold">Ticket ของฉัน</h1>
    <p className="mt-3 text-slate-400">เปิดหน้านี้เพื่อแสดง Ticket ที่ซื้อแพ็กเกจหรือจองโต๊ะกับพนักงานหน้าร้าน</p>
    {error && <p className="mt-6 rounded-xl bg-danger/10 p-4 text-sm text-danger">{error}</p>}
    <div className="mt-8 space-y-5">
      {tickets.map((ticket) => <button className="card block w-full text-left" key={ticket.id} onClick={() => setSelected(ticket)} aria-label={`เปิด Ticket ${ticket.ticketCode}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3"><span className="rounded-full bg-teal-400/10 px-3 py-1 text-xs font-semibold uppercase text-teal-300">{ticket.status}</span><span className="text-xs text-slate-500">{ticket.ticketType === "package" ? "Package Ticket" : "Table Ticket"}</span></div>
            <h2 className="mt-3 font-display text-2xl text-gold">{ticket.ticketCode}</h2>
            <p className="mt-2 text-sm text-slate-300">{ticket.packageOrder?.package.name ?? `โต๊ะ ${ticket.booking?.table.tableNo} · ${ticket.booking?.table.zone.nameTh}`}</p>
            {ticket.booking && <p className="mt-1 text-sm text-slate-400">ผู้จอง {ticket.booking.guestName} · {ticket.booking.partySizeRange} คน · เข้า {formatDate(ticket.booking.arrivalAt)}</p>}
            <p className="mt-1 text-xs text-slate-500">ใช้ได้ถึง {formatDate(ticket.validUntil)}</p>
          </div>
          <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl bg-white text-center text-xs font-semibold text-black">QR<br/>{ticket.ticketCode}</div>
        </div>
      </button>)}
      {!tickets.length && !error && <div className="card text-center text-slate-400">ยังไม่มี Ticket ในบัญชีนี้</div>}
    </div>
  </section>;
}
