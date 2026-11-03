import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";

type Package = { id: number; name: string; description?: string; priceSatang: number; includes: unknown };
const errorText = (reason: unknown) => (reason as { response?: { data?: { error?: string } } }).response?.data?.error ?? "เกิดข้อผิดพลาด";

export function PackagesPage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [message, setMessage] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  useEffect(() => {
  api.get("/packages")
    .then((response) => {
      console.log("PACKAGES =", response.data);
      setPackages(response.data);
    })
    .catch((error) => {
      console.error("PACKAGE ERROR =", error);
      setPackages([]);
    });
}, []);
  async function buy(item: Package) {
    if (!user) { alert("กรุณาเข้าสู่ระบบก่อนซื้อแพ็กเกจ");return;}
    try {
      const result = await api.post("/package-orders", { packageId: item.id });
      const checkout = await api.post("/payments/checkout", { kind: "package", id: result.data.created.id });
      if (!checkout.data.url) throw new Error("ไม่พบลิงก์ชำระเงินจาก Stripe");
      window.location.assign(checkout.data.url);
    } catch (reason) { setMessage(errorText(reason)); }
  }
  return <section className="mx-auto max-w-6xl px-5 py-16"><p className="text-sm font-semibold tracking-[.25em] text-neon-cyan">PACKAGE</p><h1 className="mt-3 font-display text-4xl font-bold">แพ็กเกจสำหรับค่ำคืนนี้</h1><p className="mt-3 text-slate-400">ซื้อแล้วรับ E-Ticket ใช้แสดงที่บาร์ได้ครั้งเดียว</p><div className="mt-8 grid gap-5 md:grid-cols-3">{packages.map((item) => <article
  className={`card flex flex-col transition-all duration-300
hover:-translate-y-4
hover:scale-105
cursor-pointer
${
  item.name === "ONE & ONLY"
    ? "border border-pink-500 shadow-[0_0_35px_rgba(255,0,128,.45)] hover:shadow-[0_0_60px_rgba(255,0,128,.75)]"
    : "hover:border-cyan-400/50 hover:shadow-[0_10px_35px_rgba(0,255,255,.15)]"
}`}
  key={item.id}
>{item.name === "ONE & ONLY" && (
  <p className="mb-4 text-xs font-semibold tracking-[.3em] text-pink-400">
    MOST POPULAR
  </p>
)}<h2 className="font-display text-2xl">{item.name}</h2><p className="mt-3 min-h-12 text-sm text-slate-400">{item.description}</p><p className="mt-5 text-5xl font-bold text-cyan-400">{(item.priceSatang / 100).toLocaleString()} <span className="text-sm">บาท</span></p><div className="mt-5 flex-1 text-sm text-slate-300">{Array.isArray(item.includes) ? item.includes.map((value) => <p key={String(value)} className="mt-2">✓ {String(value)}</p>) : null}</div><button
  className={
    item.name === "ONE & ONLY"
      ? "mt-6 w-full rounded-full bg-pink-500 py-3 font-semibold text-white shadow-lg shadow-pink-500/40"
      : "mt-6 w-full rounded-full border border-yellow-400 py-3 font-semibold text-yellow-400"
  }
  onClick={() => setSelectedPackage(item)}
>ซื้อแพ็กเกจ</button></article>)}</div>{message && <p className="mt-6 rounded-xl border border-teal-400/20 bg-teal-400/10 p-4 text-sm text-teal-200">
{message}</p>} {selectedPackage && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">

    <div className="w-full max-w-md rounded-2xl border border-pink-500 bg-slate-900 p-6">

      <h2 className="text-2xl font-bold text-white">
        ยืนยันการซื้อแพ็กเกจ
      </h2>

      <p className="mt-4 text-slate-300">
        คุณกำลังจะซื้อ
      </p>

      <p className="mt-2 text-xl font-bold text-pink-400">
        {selectedPackage.name}
      </p>

      <p className="mt-2 text-cyan-400 text-2xl font-bold">
        {(selectedPackage.priceSatang / 100).toLocaleString()} บาท
      </p>

      <p className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-slate-300">
        🎫 หลังชำระเงินสำเร็จ ระบบจะสร้าง E‑Ticket อัตโนมัติ
        สำหรับใช้แสดงที่บาร์ และสามารถใช้งานได้เพียง 1 ครั้งเท่านั้น
      </p>
      <div className="mt-4 rounded-xl bg-slate-800 p-4">

      <p className="mb-2 text-sm font-semibold text-cyan-400">
       สิทธิ์ที่ได้รับ
       </p>

      {Array.isArray(selectedPackage.includes) &&
      selectedPackage.includes.map((item) => (
      <p
        key={String(item)}
        className="mt-2 text-sm text-slate-300"
      >
        ✓ {String(item)}
      </p>
    ))}
</div>
      <div className="mt-6 flex gap-3">

        <button
          className="flex-1 rounded-xl border border-slate-600 py-3"
          onClick={() => setSelectedPackage(null)}
        >
          ยกเลิก
        </button>

        <button
          className="
                    flex-1 rounded-xl
                    bg-pink-500
                    py-3
                    font-semibold
                    text-white
                    transition-all duration-300
                    hover:bg-pink-400
                    hover:scale-105
                    hover:shadow-lg
                    hover:shadow-pink-500/50
                    " 
          onClick={async () => {
            await buy(selectedPackage);
            setSelectedPackage(null);
          }}
        >
          ยืนยัน
        </button>

      </div>

    </div>
  </div>
)}</section>;}
