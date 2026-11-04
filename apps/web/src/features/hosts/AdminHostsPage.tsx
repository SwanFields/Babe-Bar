import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAdminMode } from "../admin/AdminModeContext";
import { Link } from "react-router-dom";

type Host = { id: number; stageName: string; firstName: string | null; lastName: string | null; nickname: string | null; age: number | null; heightCm: number | null; caption: string | null; bio: string | null; photoUrl: string | null; isActive: boolean };
const apiOrigin = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api").replace(/\/api\/?$/, "");
const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) return response.data.error;
  }

  return fallback;
};

export function AdminHostsPage() {
  const { adminMode, setAdminMode } = useAdminMode();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [stageName, setStageName] = useState("");
  const [bio, setBio] = useState("");
  const [profile, setProfile] = useState({ firstName: "", lastName: "", nickname: "", age: "", heightCm: "", caption: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const profileInput = (key: keyof typeof profile, placeholder: string, type = "text") => (
    <input className="field" required maxLength={type === "text" ? 100 : undefined} type={type} placeholder={placeholder} value={profile[key]} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} />
  );

  async function load() {
    try { setHosts((await api.get("/admin/hosts")).data); }
    catch (error) { setMessage(errorMessage(error, "โหลดข้อมูลโฮสต์ไม่สำเร็จ")); }
  }
  useEffect(() => { void load(); }, []);

  async function add(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/admin/hosts", { stageName, ...profile, age: Number(profile.age), heightCm: Number(profile.heightCm), bio: bio || null });
      setStageName(""); setBio(""); setProfile({ firstName: "", lastName: "", nickname: "", age: "", heightCm: "", caption: "" }); setMessage("เพิ่มโฮสต์เรียบร้อย"); await load();
    } catch (error) { setMessage(errorMessage(error, "เพิ่มโฮสต์ไม่สำเร็จ")); }
  }

  function startEditing(host: Host) {
    setEditingId(host.id);
    setStageName(host.stageName);
    setBio(host.bio ?? "");
    setProfile({ firstName: host.firstName ?? "", lastName: host.lastName ?? "", nickname: host.nickname ?? "", age: host.age ? String(host.age) : "", heightCm: host.heightCm ? String(host.heightCm) : "", caption: host.caption ?? "" });
    setMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setStageName("");
    setBio("");
    setProfile({ firstName: "", lastName: "", nickname: "", age: "", heightCm: "", caption: "" });
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (editingId === null) return;
    try {
      await api.patch(`/admin/hosts/${editingId}`, { stageName, ...profile, age: Number(profile.age), heightCm: Number(profile.heightCm), bio: bio || null });
      cancelEditing();
      setMessage("แก้ไขข้อมูลโฮสต์เรียบร้อย");
      await load();
    } catch (error) { setMessage(errorMessage(error, "แก้ไขโฮสต์ไม่สำเร็จ")); }
  }

  async function upload(id: number, file?: File) {
    if (!file) return;
    const form = new FormData();
    form.append("photo", file);
    try { await api.post(`/admin/hosts/${id}/photo`, form); setMessage("อัปโหลดรูปเรียบร้อย"); await load(); }
    catch (error) { setMessage(errorMessage(error, "อัปโหลดรูปไม่สำเร็จ")); }
  }

  async function toggle(host: Host) {
    try { await api.patch(`/admin/hosts/${host.id}`, { isActive: !host.isActive }); await load(); }
    catch (error) { setMessage(errorMessage(error, "เปลี่ยนสถานะไม่สำเร็จ")); }
  }

  return <section className="mx-auto max-w-5xl px-5 py-12">
    <p className="text-xs font-semibold tracking-[.25em] text-rose-400">ADMIN CATALOG</p>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-4xl font-bold">จัดการโฮสต์</h1>
      <button className={adminMode ? "btn-primary" : "btn-outline"} type="button" onClick={() => setAdminMode(!adminMode)}>
        {adminMode ? "กลับโหมดปกติ" : "เปิดโหมดแอดมิน"}
      </button>
    </div>
    {adminMode ? <>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link className="btn-ghost border border-white/10" to="/admin/hosts">จัดการโฮสต์</Link>
        <Link className="btn-ghost border border-white/10" to="/admin/auction">ควบคุมประมูล</Link>
      </div>
      {message && <p className="mt-4 rounded-xl border border-teal-400/20 bg-teal-400/10 p-3 text-sm text-teal-200">{message}</p>}
      <form onSubmit={editingId === null ? add : saveEdit} className="card mt-8 grid gap-3 md:grid-cols-2">
        <input className="field" required maxLength={60} placeholder="ชื่อ Stage name" value={stageName} onChange={(e) => setStageName(e.target.value)} />
        {profileInput("firstName", "ชื่อจริง")}
        {profileInput("lastName", "นามสกุล")}
        {profileInput("nickname", "ชื่อเล่น")}
        {profileInput("age", "อายุ", "number")}
        {profileInput("heightCm", "ส่วนสูง (ซม.)", "number")}
        {profileInput("caption", "แคปชั่นประจำตัว")}
        <input className="field md:col-span-2" maxLength={1000} placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" value={bio} onChange={(e) => setBio(e.target.value)} />
        <div className="flex gap-2">
          <button className="btn-primary flex-1" type="submit">{editingId === null ? "เพิ่มโฮสต์" : "บันทึกการแก้ไข"}</button>
          {editingId !== null && <button className="btn-outline" type="button" onClick={cancelEditing}>ยกเลิก</button>}
        </div>
      </form>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {hosts.map((host) => <article className="card flex gap-4" key={host.id}>
          <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-night-950">
            {host.photoUrl ? <img src={`${apiOrigin}${host.photoUrl}`} alt={host.stageName} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-slate-500">NO PHOTO</div>}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold">{host.stageName}</h2>
            {!host.isActive && <span className="text-xs text-amber-300">โฮสต์ถูกซ่อน</span>}
            <p className="mt-1 text-sm text-slate-400">{host.nickname} · {host.age ?? "-"} ปี · {host.heightCm ?? "-"} ซม.</p>
            <p className="mt-1 text-sm text-rose-200">{host.caption}</p>
            <p className="mt-1 text-sm text-slate-400">{host.bio || "ยังไม่มีรายละเอียดเพิ่มเติม"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-outline text-xs" type="button" onClick={() => startEditing(host)}>แก้ไขชื่อ</button>
              <label className="btn-outline cursor-pointer text-xs">เปลี่ยนรูป<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void upload(host.id, e.target.files?.[0])} /></label>
              <button className="btn-ghost border border-white/10" type="button" onClick={() => void toggle(host)}>{host.isActive ? "เคลียร์โฮสต์เก่า" : "นำกลับมาแสดง"}</button>
            </div>
          </div>
        </article>)}
      </div>
    </> : <div className="card mt-8 max-w-xl">
      <p className="text-sm text-slate-400">ขณะนี้อยู่ในโหมดปกติ จึงซ่อนเครื่องมือควบคุมทั้งหมดไว้</p>
      <p className="mt-2 text-xs text-slate-500">กด “เปิดโหมดแอดมิน” เพื่อจัดการ Host และควบคุมระบบ</p>
    </div>}
  </section>;
}
