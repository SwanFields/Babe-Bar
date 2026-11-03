import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { loginSchema, registerSchema } from "@babe-bar/shared";
import { useAuth } from "./AuthContext";

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="mx-auto max-w-md px-5 py-16">
    <div className="card">
      <p className="text-sm font-semibold tracking-[.25em] text-neon-cyan">BABE BAR MEMBERS</p>
      <h1 className="mt-3 font-display text-4xl font-bold">{title}</h1>
      <p className="mt-3 text-ink-mute">{subtitle}</p>
      {children}
    </div>
  </section>;
}

function Field({ label, name, type = "text", value, onChange, error, placeholder }: { label: string; name: string; type?: string; value: string; onChange: (value: string) => void; error?: string; placeholder?: string }) {
  return <label className="block">
    <span className="mb-2 block text-sm font-semibold">{label}</span>
    <input className={`min-h-11 w-full rounded-xl border bg-night-900 px-4 outline-none transition focus:border-neon-cyan ${error ? "border-danger" : "border-white/10"}`} name={name} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={name === "password" ? "current-password" : undefined} />
    {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
  </label>;
}

function formError(error: unknown) {
  const response = error as { response?: { data?: { error?: string } }; request?: unknown };
  if (response.response?.data?.error) return response.response.data.error;
  if (response.request) return "ไม่สามารถเชื่อมต่อ API ได้ กรุณาตรวจสอบว่า backend กำลังทำงานอยู่";
  return "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่";
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? "/"} replace />;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = loginSchema.safeParse(values);
    if (!result.success) { setError(result.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง"); return; }
    setError(""); setSubmitting(true);
    try { await login(result.data); navigate("/"); } catch (reason) { setError(formError(reason)); } finally { setSubmitting(false); }
  }
  return <AuthShell title="เข้าสู่ระบบ" subtitle="กลับมาพบกับค่ำคืนที่ใช่ของคุณ">
    <form className="mt-8 space-y-5" onSubmit={submit}>
      <Field label="อีเมล" name="email" type="email" value={values.email} onChange={(email) => setValues({ ...values, email })} />
      <Field label="รหัสผ่าน" name="password" type="password" value={values.password} onChange={(password) => setValues({ ...values, password })} />
      {error && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      <button className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting}>{submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
    </form>
    <p className="mt-6 text-center text-sm text-ink-mute">ยังไม่มีบัญชี? <Link className="font-semibold text-neon-cyan hover:underline" to="/register">สมัครสมาชิก</Link></p>
  </AuthShell>;
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "", fullName: "", phone: "", username: "", birthDate: "", acceptedTerms: false, ageConfirmed: false });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to="/" replace />;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = registerSchema.safeParse({ ...values, birthDate: new Date(`${values.birthDate}T00:00:00`) });
    if (!result.success) { setError(result.error.issues[0]?.message ?? "กรุณากรอกข้อมูลให้ครบถ้วน"); return; }
    setError(""); setSubmitting(true);
    try { await register(result.data); navigate("/"); } catch (reason) { setError(formError(reason)); } finally { setSubmitting(false); }
  }
  return <AuthShell title="สมัครสมาชิก" subtitle="สร้างบัญชีเพื่อจองโต๊ะและร่วมประมูล">
    <form className="mt-8 space-y-4" onSubmit={submit}>
      <Field label="ชื่อ-นามสกุล" name="fullName" value={values.fullName} onChange={(fullName) => setValues({ ...values, fullName })} />
      <Field label="อีเมล" name="email" type="email" value={values.email} onChange={(email) => setValues({ ...values, email })} />
      <Field label="เบอร์โทรศัพท์" name="phone" type="tel" value={values.phone} onChange={(phone) => setValues({ ...values, phone })} />
      <Field label="Username (a-z, 0-9, _)" name="username" value={values.username} onChange={(username) => setValues({ ...values, username })} />
      <Field label="วันเกิด" name="birthDate" type="date" value={values.birthDate} onChange={(birthDate) => setValues({ ...values, birthDate })} />
      <Field label="รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)" name="password" type="password" value={values.password} onChange={(password) => setValues({ ...values, password })} />
      <label className="flex gap-3 text-sm text-ink-mute"><input type="checkbox" checked={values.acceptedTerms} onChange={(event) => setValues({ ...values, acceptedTerms: event.target.checked })} />ยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว</label>
      <label className="flex gap-3 text-sm text-ink-mute"><input type="checkbox" checked={values.ageConfirmed} onChange={(event) => setValues({ ...values, ageConfirmed: event.target.checked })} />ฉันยืนยันว่ามีอายุ 20 ปีบริบูรณ์ขึ้นไป</label>
      {error && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      <button className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting}>{submitting ? "กำลังสร้างบัญชี..." : "สมัครสมาชิก"}</button>
    </form>
    <p className="mt-6 text-center text-sm text-ink-mute">มีบัญชีอยู่แล้ว? <Link className="font-semibold text-neon-cyan hover:underline" to="/login">เข้าสู่ระบบ</Link></p>
  </AuthShell>;
}
