import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { api } from "./lib/api";
import { LoginPage, RegisterPage } from "./features/auth/AuthPages";
import { useAuth } from "./features/auth/AuthContext";
import { ProfileDashboard } from "./features/dashboard/ProfileDashboard";

const links = [
  ["/", "หน้าแรก"],
  ["/dashboard", "แดชบอร์ดโปรไฟล์"],
  ["/hosts", "โฮสต์"],
  ["/auction", "ประมูล"],
  ["/packages", "แพ็กเกจ"],
  ["/booking", "จองโต๊ะ"]
];

function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-hero bg-no-repeat bg-fixed">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="font-display text-2xl font-bold tracking-wide">
          <span className="text-neon-pink">BABE</span> BAR
        </Link>

        <button
          className="text-2xl md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="เปิดเมนู"
        >
          ☰
        </button>

        <div
          className={`${
            open ? "flex" : "hidden"
          } absolute left-0 top-20 z-20 w-full flex-col gap-5 bg-night-900 p-5 shadow-2xl md:static md:flex md:w-auto md:flex-row md:items-center md:bg-transparent md:p-0 md:shadow-none`}
        >
          {links.map(([href, label]) => {
            const isActive = location.pathname === href;
            return (
              <Link
                key={href}
                to={href}
                onClick={() => setOpen(false)}
                className={`text-sm transition ${
                  isActive
                    ? "font-semibold text-neon-cyan drop-shadow-[0_0_8px_rgba(0,229,212,0.6)]"
                    : "text-ink-mute hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}

          {!loading && (
            <div className="flex items-center gap-3 pt-2 md:pt-0">
              {user ? (
                <div className="flex items-center gap-3">
                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-night-800/80 px-3 py-1.5 text-xs text-white transition hover:border-neon-cyan/50"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="font-medium">{user.fullName.split(" ")[0]}</span>
                    <span className="rounded bg-neon-pink/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-neon-pink">
                      {user.role}
                    </span>
                  </Link>
                  <button
                    className="btn-outline text-xs !py-2 !px-3"
                    onClick={() => void logout()}
                  >
                    ออกจากระบบ
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-white/10 bg-night-800/60 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/30"
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    className="btn-primary text-xs !py-2 !px-4"
                  >
                    สมัครสมาชิก
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <main>{children}</main>

      <footer className="mx-auto mt-20 max-w-6xl border-t border-white/10 px-5 py-8 text-center text-xs text-ink-mute sm:flex sm:items-center sm:justify-between sm:text-left">
        <div>Babe Bar · OPEN NIGHTLY 20:00 – 02:00</div>
        <div className="mt-2 sm:mt-0">
          <Link to="/dashboard" className="text-neon-cyan hover:underline">
            ไปที่แดชบอร์ดโปรไฟล์
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Home() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 pt-20">
      <p className="mb-5 text-sm font-semibold tracking-[.3em] text-neon-cyan">
        OPEN NIGHTLY 20:00 – 02:00
      </p>
      <h1 className="max-w-3xl font-display text-5xl font-bold leading-tight md:text-7xl">
        ค่ำคืนที่ <span className="text-gold">ใช่</span>
        <br />
        เริ่มต้นที่นี่
      </h1>
      <p className="mt-6 max-w-xl text-lg text-ink-mute">
        จองโต๊ะ เลือกแพ็กเกจ และพบกับโฮสต์ที่คุณชื่นชอบในค่ำคืนสุดพิเศษ
      </p>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link to="/dashboard" className="btn-primary flex items-center gap-2">
          <span>👥</span>
          <span>เปิดแดชบอร์ดโปรไฟล์</span>
        </Link>
        <Link to="/booking" className="btn-outline">
          จองโต๊ะตอนนี้
        </Link>
        <Link to="/hosts" className="rounded-xl border border-white/10 bg-night-900/60 px-5 py-3 text-sm font-semibold text-ink-mute transition hover:border-white/30 hover:text-white">
          ดูโฮสต์
        </Link>
      </div>

      {/* Feature banner for Dashboard */}
      <div className="mt-14 rounded-2xl border border-neon-cyan/30 bg-gradient-to-r from-neon-cyan/10 via-night-900/90 to-neon-pink/10 p-6 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="rounded-lg bg-neon-cyan/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-neon-cyan">
              New Feature
            </span>
            <h3 className="mt-2 font-display text-xl font-bold text-white">
              แดชบอร์ดโปรไฟล์บัญชีทั้งหมด (User Profiles Dashboard)
            </h3>
            <p className="mt-1 text-sm text-ink-mute">
              ดูรายละเอียดบัญชีผู้ใช้ทั้งหมดที่มีในระบบ พร้อมสถิติกิจกรรมการจอง การประมูลโฮสต์ และการสลับบัญชีทดสอบ
            </p>
          </div>
          <Link to="/dashboard" className="btn-primary shrink-0 self-start text-xs sm:self-auto">
            ดูรายละเอียดบัญชี →
          </Link>
        </div>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        <Feature title="จองง่าย" text="เลือกโต๊ะและวันได้ในไม่กี่ขั้นตอน" />
        <Feature title="ประมูลโฮสต์" text="ร่วมสนุกกับห้องประมูลรายวัน" />
        <Feature title="E-Ticket" text="รับบัตรดิจิทัลพร้อม QR Code" />
      </div>
    </section>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="card">
      <h2 className="font-display text-xl font-semibold text-gold">{title}</h2>
      <p className="mt-2 text-ink-mute">{text}</p>
    </div>
  );
}

function Hosts() {
  const [hosts, setHosts] = useState<any[]>([]);

  useEffect(() => {
    api
      .get("/hosts")
      .then((r) => setHosts(r.data))
      .catch(() => setHosts([]));
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <h1 className="font-display text-4xl font-bold">โฮสต์ของเรา</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
        {hosts.length ? (
          hosts.map((h) => (
            <div className="card" key={h.id}>
              <div className="mb-4 flex h-36 items-center justify-center rounded-xl bg-gradient-to-br from-neon-pink/40 to-neon-cyan/20 text-5xl">
                ✦
              </div>
              <h2 className="font-display text-2xl">{h.stageName}</h2>
              <p className="mt-2 text-ink-mute">{h.bio}</p>
            </div>
          ))
        ) : (
          <div className="card text-ink-mute">กำลังเตรียมรายชื่อโฮสต์</div>
        )}
      </div>
    </section>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <div className="card max-w-2xl">
        <p className="text-sm text-neon-cyan">COMING SOON</p>
        <h1 className="mt-3 font-display text-4xl font-bold">{title}</h1>
        <p className="mt-4 text-ink-mute">หน้านี้เตรียมโครงสร้างไว้แล้ว และจะเปิดใช้งานในเฟสถัดไป</p>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<ProfileDashboard />} />
        <Route path="/hosts" element={<Hosts />} />
        <Route path="/auction" element={<Placeholder title="ห้องประมูล" />} />
        <Route path="/packages" element={<Placeholder title="แพ็กเกจ" />} />
        <Route path="/booking" element={<Placeholder title="จองโต๊ะ" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Placeholder title="ไม่พบหน้านี้" />} />
      </Routes>
    </Layout>
  );
}
