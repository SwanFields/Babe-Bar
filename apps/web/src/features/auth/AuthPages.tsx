import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { loginSchema, registerSchema } from "@babe-bar/shared";
import { useAuth } from "./AuthContext";

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-md px-5 py-16">
      <div className="card">
        <span className="inline-block rounded-full bg-rose-500/10 px-3 py-1 text-[11px] font-semibold tracking-widest text-rose-300 uppercase">
          Babe Bar Members
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold text-white">{title}</h1>
        <p className="mt-1.5 text-xs text-slate-400">{subtitle}</p>
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  placeholder
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-300">{label}</span>
      <input
        className={`min-h-10 w-full rounded-xl border bg-night-950/70 px-3.5 text-xs text-white outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-400 placeholder:text-slate-500 ${
          error ? "border-rose-500/50" : "border-white/10"
        }`}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={name === "password" ? "current-password" : undefined}
      />
      {error && <span className="mt-1 block text-[11px] text-rose-400">{error}</span>}
    </label>
  );
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
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await login(result.data);
      navigate("/");
    } catch (reason) {
      setError(formError(reason));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="เข้าสู่ระบบ" subtitle="ยินดีต้อนรับกลับสู่ค่ำคืนที่เป็นคุณ">
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <Field label="อีเมล" name="email" type="email" value={values.email} onChange={(email) => setValues({ ...values, email })} />
        <Field label="รหัสผ่าน" name="password" type="password" value={values.password} onChange={(password) => setValues({ ...values, password })} />
        {error && (
          <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/[0.08] p-3 text-xs text-rose-300">
            {error}
          </p>
        )}
        <button className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting}>
          {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-slate-400">
        ยังไม่มีบัญชี?{" "}
        <Link className="font-medium text-rose-400 hover:underline" to="/register">
          สมัครสมาชิก
        </Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    username: "",
    birthDate: "",
    acceptedTerms: false,
    ageConfirmed: false
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = registerSchema.safeParse({ ...values, birthDate: new Date(`${values.birthDate}T00:00:00`) });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await register(result.data);
      navigate("/");
    } catch (reason) {
      setError(formError(reason));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="สมัครสมาชิก" subtitle="สร้างบัญชีเพื่อเริ่มจองโต๊ะและร่วมประมูล">
      <form className="mt-6 space-y-3.5" onSubmit={submit}>
        <Field label="ชื่อ-นามสกุล" name="fullName" value={values.fullName} onChange={(fullName) => setValues({ ...values, fullName })} />
        <Field label="อีเมล" name="email" type="email" value={values.email} onChange={(email) => setValues({ ...values, email })} />
        <Field label="เบอร์โทรศัพท์" name="phone" type="tel" value={values.phone} onChange={(phone) => setValues({ ...values, phone })} />
        <Field label="Username (a-z, 0-9, _)" name="username" value={values.username} onChange={(username) => setValues({ ...values, username })} />
        <Field label="วันเกิด" name="birthDate" type="date" value={values.birthDate} onChange={(birthDate) => setValues({ ...values, birthDate })} />
        <Field label="รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)" name="password" type="password" value={values.password} onChange={(password) => setValues({ ...values, password })} />

        <label className="flex items-center gap-2.5 text-xs text-slate-400 pt-1">
          <input
            type="checkbox"
            checked={values.acceptedTerms}
            onChange={(event) => setValues({ ...values, acceptedTerms: event.target.checked })}
            className="rounded border-white/20 bg-night-950 text-rose-500 focus:ring-0"
          />
          <span>ยอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว</span>
        </label>

        <label className="flex items-center gap-2.5 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={values.ageConfirmed}
            onChange={(event) => setValues({ ...values, ageConfirmed: event.target.checked })}
            className="rounded border-white/20 bg-night-950 text-rose-500 focus:ring-0"
          />
          <span>ยืนยันว่ามีอายุ 20 ปีบริบูรณ์ขึ้นไป</span>
        </label>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/[0.08] p-3 text-xs text-rose-300">
            {error}
          </p>
        )}
        <button className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting}>
          {submitting ? "กำลังสร้างบัญชี..." : "สมัครสมาชิก"}
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-slate-400">
        มีบัญชีอยู่แล้ว?{" "}
        <Link className="font-medium text-rose-400 hover:underline" to="/login">
          เข้าสู่ระบบ
        </Link>
      </p>
    </AuthShell>
  );
}
