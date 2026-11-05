import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { UpdateProfileInput } from "@babe-bar/shared";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { RoleBadge, StatusBadge } from "./ProfileDashboard";

const fieldLabels = { fullName: "ชื่อ-นามสกุล", phone: "เบอร์โทรศัพท์", username: "Username", email: "อีเมล" } as const;
type EditableField = keyof typeof fieldLabels;
const editableFields = Object.keys(fieldLabels) as EditableField[];

const errorText = (reason: unknown, fallback: string) =>
  (reason as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

/** แดชบอร์ดของลูกค้า/พนักงาน: เห็นและแก้ไขได้เฉพาะบัญชีของตัวเอง */
export function MyAccountDashboard() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<EditableField, string>>({ fullName: "", phone: "", username: "", email: "" });
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (user && !editing) setForm({ fullName: user.fullName, phone: user.phone, username: user.username, email: user.email });
  }, [user, editing]);

  if (!user) return null;

  const changes = editableFields.filter((field) => form[field].trim() !== user[field]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!changes.length) { setError("ยังไม่มีข้อมูลที่เปลี่ยนแปลง"); return; }
    setConfirmSave(true); // ถามย้ำก่อนบันทึกทุกครั้ง
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const payload: UpdateProfileInput = {};
      for (const field of changes) payload[field] = form[field].trim();
      await api.patch("/me", payload);
      await refreshUser();
      setEditing(false);
      setNotice("บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว");
    } catch (reason) {
      setError(errorText(reason, "บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง"));
    } finally {
      setBusy(false);
      setConfirmSave(false);
    }
  }

  async function closeAccount() {
    setBusy(true);
    setError("");
    try {
      await api.delete("/me");
      await logout();
      navigate("/");
    } catch (reason) {
      setError(errorText(reason, "ปิดบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง"));
      setConfirmClose(false);
    } finally {
      setBusy(false);
    }
  }

  const memberNo = `BB-${user.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const initials = user.fullName.trim().split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "BB";

  const icons: Record<string, string> = {
    fullName: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    username: "M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-3.5 7.1",
    email: "M3 8l7.9 5.3a2 2 0 002.2 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    phone: "M3 5a2 2 0 012-2h3.3a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.2l-2.26 1.13a11 11 0 005.52 5.52l1.13-2.26a1 1 0 011.2-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z",
    birth: "M12 8c1.1 0 2-.9 2-2 0-.8-2-3-2-3s-2 2.2-2 3c0 1.1.9 2 2 2zM4 21v-6a2 2 0 012-2h12a2 2 0 012 2v6M4 17c2 0 2-1.5 4-1.5S10 17 12 17s2-1.5 4-1.5S18 17 20 17M4 21h16M12 8v5"
  };
  const Icon = ({ name }: { name: string }) => (
    <span className="db-row-icon" aria-hidden="true">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d={icons[name]} /></svg>
    </span>
  );
  const infoRow = (field: EditableField, value: string) => (
    <div className="db-row">
      <Icon name={field} />
      <div className="min-w-0 flex-1">
        <label htmlFor={`f-${field}`} className="text-xs text-slate-500">{fieldLabels[field]}</label>
        {editing ? (
          <input
            id={`f-${field}`}
            className="db-line"
            type={field === "email" ? "email" : "text"}
            value={form[field]}
            onChange={(event) => setForm({ ...form, [field]: event.target.value })}
            required
          />
        ) : (
          <p className="break-all text-base text-slate-100">{value}</p>
        )}
      </div>
    </div>
  );

  const activity = [
    { label: "จองโต๊ะ", to: "/booking", count: user.activity.bookings, color: "text-slate-100" },
    { label: "เข้าร่วมประมูล", to: "/auction", count: user.activity.bids, color: "text-teal-300" },
    { label: "E-Ticket ของฉัน", to: "/tickets", count: user.activity.tickets, color: "text-amber-300" }
  ];

  return (
    <div className="relative isolate mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <div className="db-aurora" aria-hidden="true"><span /><span /><span /></div>

      {notice && (
        <p role="status" className="au-alert au-alert-ok">{notice}</p>
      )}

      <section className={`db-pass db-role-${user.role} au-reveal`} aria-label="บัตรสมาชิก">
        <div className="db-pass-main">
          <div className="flex items-center gap-5">
            <div className="db-monogram" aria-hidden="true">{initials}</div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">{user.fullName}</h1>
              <p className="mt-1 font-mono text-sm text-slate-400">@{user.username}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <RoleBadge role={user.role} />
            <StatusBadge status={user.status} />
          </div>
        </div>
        <div className="db-pass-stub">
          <div>
            <p className="text-xs text-slate-400">สมาชิกตั้งแต่</p>
            <p className="font-display text-lg font-semibold text-white">{formatDate(user.createdAt)}</p>
          </div>
          <div className="md:mt-4">
            <p className="text-xs text-slate-400">เลขสมาชิก</p>
            <p className="font-mono text-sm tracking-wider text-[rgb(var(--accent))]">{memberNo}</p>
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-10 md:grid-cols-5">
        <section className="md:col-span-3" aria-labelledby="profile-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="profile-title" className="font-display text-xl font-semibold text-white">ข้อมูลส่วนตัว</h2>
            {!editing && (
              <button type="button" className="btn-ghost !text-sm !text-rose-300" onClick={() => { setNotice(""); setEditing(true); }}>
                แก้ไขข้อมูล
              </button>
            )}
          </div>

          <form className="mt-2" onSubmit={submit}>
            {infoRow("fullName", user.fullName)}
            {infoRow("username", `@${user.username}`)}
            {infoRow("email", user.email)}
            {infoRow("phone", user.phone)}
            <div className="db-row">
              <Icon name="birth" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">วันเกิด</p>
                <p className="text-base text-slate-100">{formatDate(user.birthDate)} <span className="text-sm text-slate-500">อายุ {user.age} ปี</span></p>
              </div>
            </div>

            {editing && (
              <div className="mt-4">
                <p className="text-xs text-slate-500">วันเกิดและสิทธิ์การใช้งานแก้ไขเองไม่ได้ หากต้องการเปลี่ยนโปรดติดต่อเจ้าหน้าที่</p>
                {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
                <div className="mt-4 flex gap-2.5">
                  <button type="submit" className="btn-primary">บันทึกการแก้ไข</button>
                  <button type="button" className="btn-outline" onClick={() => { setEditing(false); setError(""); }}>ยกเลิก</button>
                </div>
              </div>
            )}
          </form>
        </section>

        <section className="md:col-span-2" aria-labelledby="activity-title">
          <h2 id="activity-title" className="font-display text-xl font-semibold text-white">กิจกรรมของฉัน</h2>
          <nav className="mt-2" aria-label="ทางลัดไปยังกิจกรรม">
            {activity.map((item) => (
              <Link key={item.to} to={item.to} className="db-link">
                <span>{item.label}</span>
                <b className={item.color}>{item.count}</b>
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
            ))}
          </nav>
        </section>
      </div>

      {user.role !== "admin" && (
        <section className="mt-14 flex flex-col gap-4 border-t border-dashed border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="close-title">
          <div>
            <h2 id="close-title" className="font-display text-base font-semibold text-slate-200">ปิดบัญชี</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">เมื่อปิดแล้วจะเข้าสู่ระบบด้วยบัญชีนี้ไม่ได้อีก และกู้คืนเองไม่ได้</p>
            {!editing && error && <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
            onClick={() => { setError(""); setConfirmClose(true); }}
          >
            ปิดบัญชีของฉัน
          </button>
        </section>
      )}

      <ConfirmDialog
        open={confirmSave}
        title="ยืนยันการแก้ไขข้อมูลหรือไม่?"
        confirmLabel="ยืนยันการแก้ไข"
        busy={busy}
        onCancel={() => setConfirmSave(false)}
        onConfirm={() => void save()}
      >
        <p>ข้อมูลต่อไปนี้จะถูกเปลี่ยน:</p>
        <ul className="space-y-1.5 rounded-xl bg-night-950/60 p-3 text-xs">
          {changes.map((field) => (
            <li key={field}>
              <span className="text-slate-500">{fieldLabels[field]}: </span>
              <span className="text-slate-400 line-through">{user[field]}</span>
              <span className="text-slate-500"> → </span>
              <span className="font-medium text-white">{form[field].trim()}</span>
            </li>
          ))}
        </ul>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmClose}
        tone="danger"
        title="ยืนยันที่จะปิดบัญชีหรือไม่?"
        confirmLabel="ยืนยัน ปิดบัญชี"
        busy={busy}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => void closeAccount()}
      >
        <p>คุณกำลังจะปิดบัญชี <span className="font-semibold text-white">@{user.username}</span></p>
        <p className="text-rose-300">หลังปิดบัญชีแล้ว คุณจะถูกออกจากระบบทันทีและเข้าสู่ระบบด้วยบัญชีนี้ไม่ได้อีก</p>
      </ConfirmDialog>
    </div>
  );
}
