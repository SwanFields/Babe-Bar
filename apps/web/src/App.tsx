import { MenuSection, type MenuCategory, type MenuImages } from "../../api/src/components/MenuSection";
import { ReviewSection, type Review } from "../../api/src/components/ReviewSection";
import { LocationSection } from "../../api/src/components/LocationSection";
import { GallerySection } from "../../api/src/components/GallerySection";
import { QuickBookingSection } from "../../api/src/components/QuickBookingSection";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { api, assetUrl } from "./lib/api";
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
import { AdminHostsPage } from "./features/hosts/AdminHostsPage";
import { AdminModeProvider } from "./features/admin/AdminModeContext";
import { useAdminMode } from "./features/admin/AdminModeContext";

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

function apiErrorMessage(reason: unknown, fallback: string) {
  if (typeof reason === "object" && reason !== null && "response" in reason) {
    const response = (reason as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) return response.data.error;
  }
  return fallback;
}

function MenuFeature({ isAdmin }: { isAdmin: boolean }) {
  const [images, setImages] = useState<MenuImages>({ food: "", drinks: "" });
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    api.get<MenuImages>("/menu/images")
      .then(({ data }) => {
        if (!active) return;
        setImages({
          food: assetUrl(data.food) ?? "",
          drinks: assetUrl(data.drinks) ?? ""
        });
        setLoadError("");
      })
      .catch((error: unknown) => {
        console.error("MENU IMAGE LOAD ERROR", error);
        if (active) setLoadError("โหลดรูปเมนูไม่สำเร็จ");
      });

    return () => {
      active = false;
    };
  }, []);

  async function uploadMenuImage(category: MenuCategory, file: File) {
    const form = new FormData();
    form.append("photo", file);

    try {
      const { data } = await api.post<{ imageUrl: string }>(`/admin/menu/${category}/image`, form);
      setImages((current) => ({ ...current, [category]: assetUrl(data.imageUrl) ?? "" }));
    } catch (error) {
      console.error("MENU IMAGE UPLOAD ERROR", error);
      throw new Error(apiErrorMessage(error, "อัปโหลดรูปไม่สำเร็จ กรุณาลองอีกครั้ง"));
    }
  }

  async function deleteMenuImage(category: MenuCategory) {
    try {
      await api.delete(`/admin/menu/${category}/image`);
      setImages((current) => ({ ...current, [category]: "" }));
    } catch (error) {
      console.error("MENU IMAGE DELETE ERROR", error);
      throw new Error(apiErrorMessage(error, "ลบรูปไม่สำเร็จ กรุณาลองอีกครั้ง"));
    }
  }

  return (
    <MenuSection
      images={images}
      isAdmin={isAdmin}
      onUpload={uploadMenuImage}
      onDelete={deleteMenuImage}
      loadError={loadError}
    />
  );
}

type ReviewSummary = {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
};

function ReviewFeature({ canReview }: { canReview: boolean }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const refreshReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ReviewSummary>("/reviews");
      setReviews(data.reviews);
      setAverageRating(data.averageRating);
      setTotalReviews(data.totalReviews);
      setLoadError("");
    } catch (error) {
      console.error("REVIEW LOAD ERROR", error);
      setLoadError("โหลดรีวิวไม่สำเร็จ กรุณาลองใหม่ภายหลัง");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshReviews();
  }, [refreshReviews]);

  async function submitReview(rating: number, comment: string) {
    try {
      const { data } = await api.post<{
        review: Review;
        averageRating: number;
        totalReviews: number;
      }>("/reviews", { rating, comment });
      setReviews((current) => [data.review, ...current.filter((review) => review.id !== data.review.id)]);
      setAverageRating(data.averageRating);
      setTotalReviews(data.totalReviews);
    } catch (error) {
      console.error("REVIEW SUBMIT ERROR", error);
      throw new Error(apiErrorMessage(error, "ส่งรีวิวไม่สำเร็จ กรุณาลองอีกครั้ง"));
    }
  }

  return (
    <ReviewSection
      reviews={reviews}
      averageRating={averageRating}
      totalReviews={totalReviews}
      loading={loading}
      loadError={loadError}
      canReview={canReview}
      onSubmitReview={submitReview}
      onRefreshReviews={refreshReviews}
    />
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();
  const { adminMode, setAdminMode } = useAdminMode();
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
      {user?.role === "admin" && adminMode && (
        <div className="border-y border-rose-400/20 bg-rose-400/[0.06]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-2">
            <span className="text-xs font-semibold tracking-wide text-rose-200">โหมดแอดมินเปิดอยู่</span>
            <div className="flex items-center gap-2">
              <Link className="btn-ghost border border-rose-400/20 text-rose-200" to="/admin/hosts">จัดการ Host</Link>
              <Link className="btn-ghost border border-rose-400/20 text-rose-200" to="/admin/auction">ควบคุมระบบ</Link>
              <button className="btn-ghost border border-white/10" type="button" onClick={() => setAdminMode(false)}>กลับโหมดปกติ</button>
            </div>
          </div>
        </div>
      )}
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

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <section className="mx-auto max-w-3xl px-5 py-24 text-center text-slate-400">กำลังตรวจสอบสิทธิ์...</section>;
  if (!user || user.role !== "admin") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Home() {
  const { user } = useAuth();

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

      <GallerySection />

      <QuickBookingSection />

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <MenuFeature isAdmin={user?.role === "admin"} />
        <ReviewFeature canReview={user?.role === "customer" || user?.role === "admin"} />
        <LocationSection />
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
  const [selectedHost, setSelectedHost] = useState<any | null>(null);

  useEffect(() => {
    api
      .get("/hosts")
      .then((r) => setHosts(r.data))
      .catch(() => setHosts([]));
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="relative overflow-hidden rounded-[2rem] border border-rose-400/15 bg-gradient-to-br from-rose-500/[0.12] via-night-900/80 to-night-900/60 px-6 py-10 shadow-[0_20px_70px_rgba(244,63,94,0.12)] sm:px-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-rose-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.28em] text-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-300 shadow-[0_0_10px_rgba(251,113,133,.9)]" />
            Host Selection
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-white sm:text-6xl">
            Host <span className="text-rose-300 drop-shadow-[0_0_8px_rgba(251,113,133,.9)]">ดาวเด่น</span>
            <br /><span className="text-yellow-400 drop-shadow-[0_0_8px_rgba(800,180,30,.9)]">BARHOST</span> Daily Lineup
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
            เลือกทำความรู้จัก Host ที่ทัชใจ! กดที่การ์ดเพื่อดูโปรไฟล์แบบเต็มและแคปชั่นสุดพิเศษ
          </p>
        </div>
        <div className="relative mt-8 flex flex-wrap gap-3 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2">Host คุณภาพ</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2">โปรไฟล์จริง</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2">กดการ์ดเพื่อดูรายละเอียด</span>
        </div>
      </div>

      <div className="mb-5 mt-12 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.3em] text-teal-300">Tonight's lineup</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white">เลือก Host ที่ทัชใจ</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">{hosts.length} คน</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
        {hosts.length ? (
          hosts.map((h) => (
            <button type="button" className="group relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-night-900/70 text-left shadow-[0_12px_35px_rgba(0,0,0,.2)] transition duration-300 hover:-translate-y-2 hover:border-rose-300/40 hover:shadow-[0_20px_45px_rgba(244,63,94,.18)]" key={h.id} onClick={() => setSelectedHost(h)}>
              <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden bg-night-950/70 font-display text-xs font-bold tracking-widest text-slate-400">
                {h.photoUrl ? <img src={assetUrl(h.photoUrl) ?? undefined} alt={h.stageName} className="h-full w-full object-cover" /> : "BABE BAR HOST"}
                <div className="absolute inset-0 bg-gradient-to-t from-night-950 via-night-950/15 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-rose-200">Babe Bar Host</p>
                  <h3 className="mt-1 font-display text-3xl font-bold text-white drop-shadow-lg">{h.stageName}</h3>
                  <p className="mt-1 text-xs text-slate-300">{h.nickname} · {h.age ?? "-"} ปี · {h.heightCm ?? "-"} ซม.</p>
                </div>
                <span className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[10px] text-white backdrop-blur-md">ดูโปรไฟล์</span>
              </div>
              <div className="border-t border-white/[0.06] px-5 py-4">
                <p className="line-clamp-2 min-h-10 text-sm italic leading-5 text-rose-200">“{h.caption || "พร้อมสร้างความสนุกให้ค่ำคืนนี้"}”</p>
              </div>
            </button>
          ))
        ) : (
          <div className="card text-center text-xs text-slate-500">กำลังเตรียมรายชื่อโฮสต์</div>
        )}
      </div>
      {selectedHost && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-5 backdrop-blur-md" onClick={() => setSelectedHost(null)}>
        <article className="w-full max-w-lg overflow-hidden rounded-[1.7rem] border border-rose-300/20 bg-night-900 shadow-[0_25px_100px_rgba(244,63,94,.2)]" onClick={(event) => event.stopPropagation()}>
          <div className="relative overflow-hidden bg-night-950">
            {selectedHost.photoUrl ? <img src={assetUrl(selectedHost.photoUrl) ?? undefined} alt={selectedHost.stageName} className="max-h-[65vh] w-full object-contain" /> : <div className="flex h-64 items-center justify-center text-slate-500">BABE BAR HOST</div>}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-night-900 to-transparent" />
            <button type="button" aria-label="ปิด" className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-md transition hover:bg-rose-500/70" onClick={() => setSelectedHost(null)}>ปิด</button>
          </div>
          <div className="-mt-10 relative px-6 pb-7">
            <p className="text-[10px] font-semibold uppercase tracking-[.3em] text-teal-300">Host Profile</p>
            <h2 className="mt-2 font-display text-4xl font-bold text-white">{selectedHost.stageName}</h2>
            <p className="mt-2 text-slate-300">{selectedHost.firstName} {selectedHost.lastName} <span className="text-rose-300">({selectedHost.nickname})</span></p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"><span className="block text-xs text-slate-500">อายุ</span><strong className="mt-1 block text-white">{selectedHost.age ?? "-"} ปี</strong></div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"><span className="block text-xs text-slate-500">ส่วนสูง</span><strong className="mt-1 block text-white">{selectedHost.heightCm ?? "-"} ซม.</strong></div>
            </div>
            <p className="mt-5 text-lg italic text-rose-200">“{selectedHost.caption}”</p>
            {selectedHost.bio && <p className="mt-3 text-sm leading-6 text-slate-400">{selectedHost.bio}</p>}
          </div>
        </article>
      </div>}
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
    <AdminModeProvider>
      <Layout>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<ProfileDashboard />} />
        <Route path="/hosts" element={<Hosts />} />
          <Route path="/admin/hosts" element={<AdminRoute><AdminHostsPage /></AdminRoute>} />
          <Route path="/admin/auction" element={<AdminRoute><AuctionPage /></AdminRoute>} />
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
    </AdminModeProvider>
  );
}
