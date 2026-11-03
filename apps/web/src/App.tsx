import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { api } from "./lib/api";
import { LoginPage, RegisterPage } from "./features/auth/AuthPages";
import { useAuth } from "./features/auth/AuthContext";
import { ProfileDashboard } from "./features/dashboard/ProfileDashboard";
import { ProfileDropdown } from "./features/auth/ProfileDropdown";
import { BookingPage } from "./features/booking/BookingPage";
import { PackagesPage } from "./features/packages/PackagesPage";
import { EventsPage } from "./features/events/EventsPage";
import { TicketsPage } from "./features/tickets/TicketsPage";
import { PaymentSuccessPage } from "./features/payments/PaymentSuccessPage";
import { AuctionPage } from "./features/auction/AuctionPage";

const links = [
  ["/", "หน้าแรก"],
  ["/dashboard", "แดชบอร์ดโปรไฟล์"],
  ["/hosts", "โฮสต์"],
  ["/auction", "ประมูล"],
  ["/packages", "แพ็กเกจ"],
  ["/events", "อีเวนต์"],
  ["/tickets", "Ticket ของฉัน"],
  ["/booking", "จองโต๊ะ"]
];

function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-hero bg-no-repeat bg-fixed">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="group flex items-center gap-1.5 font-display text-2xl tracking-wide">
          <span className="font-bold text-rose-400 transition-colors group-hover:text-rose-300">BABE</span>
          <span className="font-light tracking-widest text-slate-200">BAR</span>
        </Link>

        <button
          className="rounded-xl border border-white/10 p-2 text-slate-300 md:hidden hover:border-white/20 hover:text-white"
          onClick={() => setOpen(!open)}
          aria-label="เปิดเมนู"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div
          className={`${
            open ? "flex" : "hidden"
          } absolute left-0 top-20 z-20 w-full flex-col gap-4 border-b border-white/10 bg-night-900/95 p-5 shadow-2xl backdrop-blur-xl md:static md:flex md:w-auto md:flex-row md:items-center md:gap-1 md:border-none md:bg-transparent md:p-0 md:shadow-none`}
        >
          {links.map(([href, label]) => {
            const isActive = location.pathname === href;
            return (
              <Link
                key={href}
                to={href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-white/[0.08] text-white shadow-sm"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                }`}
              >
                {label}
              </Link>
            );
          })}

          {!loading && (
            <div className="flex items-center gap-2 pt-2 md:ml-3 md:pt-0">
              {user ? (
                <ProfileDropdown user={user} />
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    className="btn-primary !min-h-9 text-xs !px-4 !py-2"
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

      <footer className="mx-auto mt-24 max-w-6xl border-t border-white/[0.06] px-5 py-8 text-center text-xs text-slate-500 sm:flex sm:items-center sm:justify-between sm:text-left">
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400/60" />
          <span>Babe Bar · Open Nightly 20:00 – 02:00</span>
        </div>
        <div className="mt-2 sm:mt-0">
          <Link to="/dashboard" className="text-slate-400 transition hover:text-rose-300">
            แดชบอร์ดโปรไฟล์ระบบ
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Home() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 pt-16">
      {/* Pill Badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/[0.06] px-3.5 py-1 text-[11px] font-medium tracking-wider text-teal-300">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
        <span>OPEN NIGHTLY 20:00 – 02:00</span>
      </div>

      <h1 className="mt-6 max-w-3xl font-display text-5xl font-bold leading-tight text-white md:text-7xl">
        ค่ำคืนที่ <span className="font-normal italic text-amber-300">ใช่</span>
        <br />
        เริ่มต้นที่นี่
      </h1>

      <p className="mt-6 max-w-xl text-base text-slate-400 sm:text-lg">
        สัมผัสบรรยากาศความสนุกยามค่ำคืน จองโต๊ะคนโปรด เลือกแพ็กเกจ และพบกับโฮสต์ที่คุณชื่นชอบในสไตล์ที่เป็นคุณ
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link to="/dashboard" className="btn-primary">
          เปิดแดชบอร์ดโปรไฟล์
        </Link>
        <Link to="/booking" className="btn-outline">
          จองโต๊ะตอนนี้
        </Link>
        <Link to="/hosts" className="btn-ghost">
          ดูรายชื่อโฮสต์
        </Link>
      </div>

      {/* Feature banner for Dashboard */}
      <div className="mt-16 rounded-2xl border border-white/[0.08] bg-night-900/50 p-6 backdrop-blur-md transition-all hover:border-white/15">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300">
              New Feature
            </div>
            <h3 className="mt-2 font-display text-lg font-bold text-white">
              แดชบอร์ดโปรไฟล์บัญชีทั้งหมด
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              เข้าถึงข้อมูลโปรไฟล์ผู้ใช้ทุกบัญชีอย่างเป็นระเบียบ พร้อมดูสถิติการใช้งานและการสลับบัญชีทดสอบในที่เดียว
            </p>
          </div>
          <Link to="/dashboard" className="btn-outline shrink-0 self-start text-xs sm:self-auto !min-h-9 !py-2 !px-4">
            ดูรายละเอียดบัญชี
          </Link>
        </div>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <Feature
          tag="Booking"
          title="จองง่าย คล่องตัว"
          text="เลือกโต๊ะ โซน และเวลาที่ต้องการในไม่กี่คลิก พร้อมระบบยืนยันทันใจ"
        />
        <Feature
          tag="Auction"
          title="ประมูลโฮสต์สด"
          text="ร่วมสนุกกับห้องประมูลรายวัน พบกับโฮสต์ดาวเด่นที่คุณถูกใจ"
        />
        <Feature
          tag="Digital Ticket"
          title="E-Ticket อัจฉริยะ"
          text="รับบัตรเข้างานดิจิทัลผ่าน QR Code พร้อมเช็กอินหน้าบาร์ได้ทันที"
        />
      </div>
    </section>
  );
}

function Feature({ tag, title, text }: { tag: string; title: string; text: string }) {
  return (
    <div className="card group">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 group-hover:text-rose-400 transition-colors">
        {tag}
      </span>
      <h2 className="mt-1.5 font-display text-lg font-semibold text-slate-100">{title}</h2>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{text}</p>
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
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Host Selection</span>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">โฮสต์ของเรา</h1>
        <p className="text-sm text-slate-400">โฮสต์ดาวเด่นประจำค่ำคืนนี้ พร้อมสร้างความสนุกและรอยยิ้มให้กับคุณ</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {hosts.length ? (
          hosts.map((h) => (
            <div className="card group" key={h.id}>
              <div className="mb-4 flex h-36 items-center justify-center rounded-xl bg-night-950/70 border border-white/[0.04] font-display text-xs font-bold tracking-widest text-slate-400 group-hover:text-rose-300 group-hover:border-rose-500/20 transition-all">
                BABE BAR HOST
              </div>
              <h2 className="font-display text-xl font-semibold text-white">{h.stageName}</h2>
              <p className="mt-1.5 text-xs text-slate-400">{h.bio}</p>
            </div>
          ))
        ) : (
          <div className="card text-center text-xs text-slate-500">กำลังเตรียมรายชื่อโฮสต์</div>
        )}
      </div>
    </section>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <div className="card max-w-xl">
        <p className="text-xs font-semibold tracking-wider text-teal-400">COMING SOON</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">{title}</h1>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          หน้านี้เตรียมโครงสร้างระบบไว้แล้ว และจะพร้อมเปิดบริการให้ร่วมสนุกในเฟสถัดไป
        </p>
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
        <Route path="/auction" element={<AuctionPage />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Placeholder title="ไม่พบหน้านี้" />} />
      </Routes>
    </Layout>
  );
}
