import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";

type Package = { id: number; name: string; description?: string; priceSatang: number; includes: unknown };
const errorText = (reason: unknown) => (reason as { response?: { data?: { error?: string } } }).response?.data?.error ?? "เกิดข้อผิดพลาด";

export function PackagesPage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => { api.get("/packages").then((response) => setPackages(response.data)).catch(() => setPackages([])); }, []);
  async function buy(item: Package) {
    if (!user) { setMessage("กรุณาเข้าสู่ระบบก่อนซื้อแพ็กเกจ"); return; }
    try {
      const result = await api.post("/package-orders", { packageId: item.id });
      const checkout = await api.post("/payments/checkout", { kind: "package", id: result.data.created.id });
      if (!checkout.data.url) throw new Error("ไม่พบลิงก์ชำระเงินจาก Stripe");
      window.location.assign(checkout.data.url);
    } catch (reason) { setMessage(errorText(reason)); }
  }
  return <section className="mx-auto max-w-6xl px-5 py-16"><p className="text-sm font-semibold tracking-[.25em] text-neon-cyan">PACKAGE</p><h1 className="mt-3 font-display text-4xl font-bold">แพ็กเกจสำหรับค่ำคืนนี้</h1><p className="mt-3 text-slate-400">ซื้อแล้วรับ E-Ticket ใช้แสดงที่บาร์ได้ครั้งเดียว</p><div className="mt-8 grid gap-5 md:grid-cols-3">{packages.map((item) => <article className="card flex flex-col" key={item.id}><h2 className="font-display text-2xl">{item.name}</h2><p className="mt-3 min-h-12 text-sm text-slate-400">{item.description}</p><p className="mt-5 text-3xl font-bold text-gold">{(item.priceSatang / 100).toLocaleString()} <span className="text-sm">บาท</span></p><div className="mt-5 flex-1 text-sm text-slate-300">{Array.isArray(item.includes) ? item.includes.map((value) => <p key={String(value)} className="mt-2">✓ {String(value)}</p>) : null}</div><button className="btn-primary mt-6 w-full" onClick={() => void buy(item)}>ซื้อแพ็กเกจ</button></article>)}</div>{message && <p className="mt-6 rounded-xl border border-teal-400/20 bg-teal-400/10 p-4 text-sm text-teal-200">{message}</p>}</section>;
}
