import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";

export function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("กำลังยืนยันการชำระเงิน...");
  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId) { setMessage("ไม่พบข้อมูล Checkout Session"); return; }
    api.get("/payments/checkout/confirm", { params: { session_id: sessionId } })
      .then(() => setMessage("ยืนยันการชำระเงินและสร้าง Ticket เรียบร้อยแล้ว"))
      .catch(() => setMessage("ชำระเงินแล้ว แต่ระบบกำลังรอ webhook กรุณาลองเปิดหน้า Ticket อีกครั้ง"));
  }, [params]);
  return <section className="mx-auto max-w-2xl px-5 py-20">
    <div className="card text-center">
      <p className="text-sm font-semibold tracking-[.25em] text-teal-300">PAYMENT RECEIVED</p>
      <h1 className="mt-4 font-display text-4xl font-bold">ชำระเงินสำเร็จ</h1>
      <p className="mt-4 text-slate-400">{message}</p>
      <Link to="/tickets" className="btn-primary mt-8">ดู Ticket ของฉัน</Link>
    </div>
  </section>;
}
