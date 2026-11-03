import React, { useEffect, useMemo, useState } from "react";
import type { CreateAccountInput, Role, UserProfileDto, UserStatus } from "@babe-bar/shared";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";

// Helper for formatting Thai dates
function formatThaiDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return dateString;
  }
}

function formatBirthDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch {
    return dateString;
  }
}

// Role badge styling
function RoleBadge({ role }: { role: Role }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-pink/40 bg-neon-pink/15 px-3 py-1 text-xs font-semibold text-neon-pink shadow-[0_0_10px_rgba(255,46,147,0.3)]">
        <span className="h-1.5 w-1.5 rounded-full bg-neon-pink animate-pulse" />
        Admin (ผู้ดูแลระบบ)
      </span>
    );
  }
  if (role === "staff") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-cyan/40 bg-neon-cyan/15 px-3 py-1 text-xs font-semibold text-neon-cyan shadow-[0_0_10px_rgba(0,229,212,0.3)]">
        <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan" />
        Staff (พนักงาน)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
      <span className="h-1.5 w-1.5 rounded-full bg-gold" />
      Customer (ลูกค้า)
    </span>
  );
}

// Status badge styling
function StatusBadge({ status }: { status: UserStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Active ปกติ
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-xs font-medium text-rose-400">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        Suspended ถูกระงับ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-500/40 bg-zinc-500/15 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
      Deleted ลบแล้ว
    </span>
  );
}

// User initials avatar
function UserAvatar({ name, role, size = "md" }: { name: string; role: Role; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .trim()
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "BB";

  const sizeClasses = {
    sm: "h-9 w-9 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-lg"
  }[size];

  const ringColor = {
    admin: "border-neon-pink text-neon-pink bg-neon-pink/10 shadow-[0_0_12px_rgba(255,46,147,0.3)]",
    staff: "border-neon-cyan text-neon-cyan bg-neon-cyan/10 shadow-[0_0_12px_rgba(0,229,212,0.3)]",
    customer: "border-gold text-gold bg-gold/10 shadow-[0_0_12px_rgba(255,200,61,0.2)]"
  }[role];

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl border font-display font-bold tracking-wider ${sizeClasses} ${ringColor}`}
    >
      {initials}
    </div>
  );
}

export function ProfileDashboard() {
  const { user: currentUser, switchAccount } = useAuth();
  const [users, setUsers] = useState<UserProfileDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>("local");

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "username">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal states
  const [selectedUser, setSelectedUser] = useState<UserProfileDto | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/users");
      setUsers(res.data.users ?? []);
      setDataSource(res.data.source ?? "local");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "ไม่สามารถดึงข้อมูลโปรไฟล์ผู้ใช้ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Quick Seed Sample Data
  const handleSeedSamples = async () => {
    try {
      const res = await api.post("/users/seed-sample");
      showNotice(res.data.message ?? "เพิ่มบัญชีตัวอย่างสำเร็จ");
      await fetchUsers();
    } catch (e: any) {
      showNotice(e?.response?.data?.error ?? "ไม่สามารถสร้างข้อมูลตัวอย่างได้");
    }
  };

  // Switch session account
  const handleSwitchUser = async (user: UserProfileDto) => {
    try {
      await switchAccount(user.id);
      showNotice(`สลับการเข้าใช้งานเป็น ${user.fullName} (@${user.username}) เรียบร้อย!`);
    } catch (e: any) {
      showNotice(e?.response?.data?.error ?? "เกิดข้อผิดพลาดในการสลับบัญชี");
    }
  };

  // Toggle User Status
  const handleToggleStatus = async (user: UserProfileDto) => {
    const newStatus: UserStatus = user.status === "active" ? "suspended" : "active";
    try {
      const res = await api.patch(`/users/${user.id}`, { status: newStatus });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
      if (selectedUser?.id === user.id) setSelectedUser(res.data);
      showNotice(`ปรับสถานะของ @${user.username} เป็น ${newStatus} แล้ว`);
    } catch (e: any) {
      showNotice(e?.response?.data?.error ?? "ไม่สามารถเปลี่ยนสถานะได้");
    }
  };

  // Filtered & Sorted list
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const matchesRole = roleFilter === "all" || u.role === roleFilter;
        const matchesStatus = statusFilter === "all" || u.status === statusFilter;
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          u.fullName.toLowerCase().includes(query) ||
          u.username.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.phone.includes(query) ||
          u.id.toLowerCase().includes(query);

        return matchesRole && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === "name") return a.fullName.localeCompare(b.fullName, "th");
        if (sortBy === "username") return a.username.localeCompare(b.username);
        return 0;
      });
  }, [users, search, roleFilter, statusFilter, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === "admin").length;
    const staff = users.filter((u) => u.role === "staff").length;
    const customers = users.filter((u) => u.role === "customer").length;
    const active = users.filter((u) => u.status === "active").length;
    const avgAge = total > 0 ? (users.reduce((acc, u) => acc + u.age, 0) / total).toFixed(1) : "0";

    return { total, admins, staff, customers, active, avgAge };
  }, [users]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Toast Alert Notice */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-neon-cyan/60 bg-night-900/95 px-5 py-3.5 text-neon-cyan shadow-[0_0_25px_rgba(0,229,212,0.35)] backdrop-blur transition-all">
          <span className="text-lg">✦</span>
          <span className="text-sm font-medium text-white">{actionNotice}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-neon-pink/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-neon-pink">
              Babe Bar System
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                dataSource === "prisma"
                  ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border border-gold/40 bg-gold/10 text-gold"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dataSource === "prisma" ? "bg-emerald-400" : "bg-gold"}`} />
              {dataSource === "prisma" ? "PostgreSQL (Prisma)" : "Local Database (พร้อมใช้งาน)"}
            </span>
          </div>
          <h1 className="mt-2.5 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-gold to-neon-cyan">โปรไฟล์บัญชี</span>
          </h1>
          <p className="mt-2 max-w-2xl text-ink-mute">
            ศูนย์ข้อมูลและรายละเอียดของบัญชีทั้งหมดในระบบ Babe Bar ทั้งข้อมูลส่วนตัว, บทบาท, สถานะ, และประวัติกิจกรรม
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-night-900 px-4 py-2.5 text-sm font-medium text-ink-mute transition hover:border-white/20 hover:text-white"
            title="รีเฟรชข้อมูลล่าสุด"
          >
            <span className={loading ? "animate-spin" : ""}>🔄</span>
            รีเฟรช
          </button>
          <button
            onClick={handleSeedSamples}
            className="flex items-center gap-2 rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2.5 text-sm font-medium text-neon-cyan transition hover:bg-neon-cyan/20"
            title="เพิ่มบัญชีตัวอย่างเพื่อทดสอบ"
          >
            <span>⚡</span>
            เพิ่มข้อมูลตัวอย่าง
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <span className="text-lg leading-none">+</span>
            สร้างโปรไฟล์ใหม่
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="card !p-4 border-white/10 bg-night-900/80">
          <p className="text-xs font-medium text-ink-mute">บัญชีทั้งหมด</p>
          <p className="mt-2 font-display text-3xl font-bold text-white">{stats.total}</p>
          <p className="mt-1 text-xs text-emerald-400">ใช้งานอยู่ {stats.active} บัญชี</p>
        </div>

        <div className="card !p-4 border-neon-pink/30 bg-neon-pink/5">
          <p className="text-xs font-medium text-neon-pink">Admins (ผู้ดูแล)</p>
          <p className="mt-2 font-display text-3xl font-bold text-neon-pink">{stats.admins}</p>
          <p className="mt-1 text-xs text-ink-mute">สิทธิ์ควบคุมสูงสุด</p>
        </div>

        <div className="card !p-4 border-neon-cyan/30 bg-neon-cyan/5">
          <p className="text-xs font-medium text-neon-cyan">Staff (พนักงาน)</p>
          <p className="mt-2 font-display text-3xl font-bold text-neon-cyan">{stats.staff}</p>
          <p className="mt-1 text-xs text-ink-mute">จัดการโต๊ะและบาร์</p>
        </div>

        <div className="card !p-4 border-gold/30 bg-gold/5">
          <p className="text-xs font-medium text-gold">Customers (ลูกค้า)</p>
          <p className="mt-2 font-display text-3xl font-bold text-gold">{stats.customers}</p>
          <p className="mt-1 text-xs text-ink-mute">สมาชิกในระบบ</p>
        </div>

        <div className="card !p-4 border-emerald-500/30 bg-emerald-500/5">
          <p className="text-xs font-medium text-emerald-400">สถานะ Active</p>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-400">{stats.active}</p>
          <p className="mt-1 text-xs text-ink-mute">
            {stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% ของทั้งหมด` : "0%"}
          </p>
        </div>

        <div className="card !p-4 border-white/10 bg-night-900/80">
          <p className="text-xs font-medium text-ink-mute">อายุเฉลี่ย</p>
          <p className="mt-2 font-display text-3xl font-bold text-white">{stats.avgAge} <span className="text-sm font-normal text-ink-mute">ปี</span></p>
          <p className="mt-1 text-xs text-neon-cyan">✓ ผ่านเกณฑ์ 20+ ทุกคน</p>
        </div>
      </div>

      {/* Search, Filter & Controls Toolbar */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-night-900/90 p-4 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, @username, อีเมล, เบอร์โทรศัพท์, หรือ UUID..."
              className="w-full rounded-xl border border-white/10 bg-night-950 py-2.5 pl-10 pr-4 text-sm text-white placeholder-ink-mute/60 outline-none transition focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-mute hover:text-white"
              >
                ✕ ล้าง
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Role Filter Tabs */}
            <div className="flex rounded-xl border border-white/10 bg-night-950 p-1 text-xs">
              {(["all", "admin", "staff", "customer"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-lg px-3 py-1.5 font-medium transition ${
                    roleFilter === r
                      ? "bg-neon-pink text-white shadow-sm"
                      : "text-ink-mute hover:text-white"
                  }`}
                >
                  {r === "all" ? "ทุกบทบาท" : r.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-xl border border-white/10 bg-night-950 px-3 py-2 text-xs text-white outline-none focus:border-neon-cyan"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="active">Active ปกติ</option>
              <option value="suspended">Suspended ระงับ</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-white/10 bg-night-950 px-3 py-2 text-xs text-white outline-none focus:border-neon-cyan"
            >
              <option value="newest">สมัครล่าสุด</option>
              <option value="oldest">สมัครเก่าสุด</option>
              <option value="name">ชื่อ ก-ฮ</option>
              <option value="username">Username</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex rounded-xl border border-white/10 bg-night-950 p-1 text-xs">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-lg px-2.5 py-1.5 transition ${
                  viewMode === "grid" ? "bg-white/20 text-white" : "text-ink-mute hover:text-white"
                }`}
                title="มุมมองการ์ด"
              >
                🔲 การ์ด
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded-lg px-2.5 py-1.5 transition ${
                  viewMode === "table" ? "bg-white/20 text-white" : "text-ink-mute hover:text-white"
                }`}
                title="มุมมองตาราง"
              >
                📑 ตาราง
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Pills Indicator */}
        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-ink-mute">
          <span>
            แสดงผล <strong className="text-white">{filteredUsers.length}</strong> จาก {users.length} บัญชี
            {search && <span> · ค้นหา &ldquo;{search}&rdquo;</span>}
          </span>
          {currentUser && (
            <span className="flex items-center gap-1.5 text-neon-cyan">
              <span className="h-2 w-2 rounded-full bg-neon-cyan animate-pulse" />
              เซสชันปัจจุบัน: <strong className="text-white">{currentUser.fullName}</strong> (@{currentUser.username ?? "user"})
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-sm text-rose-300">
          <p className="font-semibold">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
          <p className="mt-1">{error}</p>
          <button onClick={fetchUsers} className="mt-3 underline text-white hover:text-rose-200">
            ลองใหม่อีกครั้ง
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card h-64 animate-pulse bg-night-900/50" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredUsers.length === 0 && (
        <div className="mt-12 rounded-2xl border border-white/10 bg-night-900/60 p-12 text-center">
          <p className="text-4xl">🔍</p>
          <h3 className="mt-3 font-display text-xl font-semibold text-white">ไม่พบบัญชีที่ตรงกับเงื่อนไข</h3>
          <p className="mt-2 text-sm text-ink-mute">ลองเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อดูบัญชีทั้งหมด</p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setStatusFilter("all");
              }}
              className="btn-outline text-xs"
            >
              ล้างตัวกรองทั้งหมด
            </button>
            <button onClick={handleSeedSamples} className="btn-primary text-xs">
              เพิ่มบัญชีตัวอย่าง
            </button>
          </div>
        </div>
      )}

      {/* View Mode 1: Grid Cards View */}
      {!loading && viewMode === "grid" && filteredUsers.length > 0 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => {
            const isCurrent = currentUser?.id === user.id;

            return (
              <div
                key={user.id}
                className={`card relative flex flex-col justify-between transition hover:-translate-y-1 hover:border-white/30 ${
                  isCurrent ? "border-neon-cyan/50 bg-night-900/90 shadow-[0_0_20px_rgba(0,229,212,0.15)]" : ""
                }`}
              >
                {/* Current User Badge */}
                {isCurrent && (
                  <div className="absolute -top-3 right-5 rounded-full border border-neon-cyan bg-night-950 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neon-cyan shadow-[0_0_10px_rgba(0,229,212,0.4)]">
                    ⭐ เซสชันปัจจุบัน
                  </div>
                )}

                <div>
                  {/* Card Header: Avatar & Roles */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.fullName} role={user.role} size="md" />
                      <div>
                        <h3 className="font-display text-lg font-bold text-white leading-tight">
                          {user.fullName}
                        </h3>
                        <p className="text-xs font-mono text-neon-cyan/90">@{user.username}</p>
                      </div>
                    </div>
                    <StatusBadge status={user.status} />
                  </div>

                  {/* Role Badge */}
                  <div className="mt-4 flex items-center gap-2">
                    <RoleBadge role={user.role} />
                    <span className="text-xs text-ink-mute">
                      อายุ <strong className="text-white">{user.age}</strong> ปี
                    </span>
                  </div>

                  {/* Account Details Specs */}
                  <div className="mt-4 space-y-2 border-t border-white/5 pt-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-mute">อีเมล:</span>
                      <span className="font-mono text-white truncate max-w-[190px]" title={user.email}>
                        {user.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-ink-mute">เบอร์โทร:</span>
                      <span className="font-mono text-white">{user.phone}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-ink-mute">วันเกิด:</span>
                      <span className="text-ink-mute">{formatBirthDate(user.birthDate)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-ink-mute">วันที่สร้างบัญชี:</span>
                      <span className="text-ink-mute">{formatThaiDate(user.createdAt)}</span>
                    </div>
                  </div>

                  {/* Activity Stats Counters */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-night-950/60 p-2.5 text-center text-xs">
                    <div>
                      <p className="text-ink-mute text-[10px]">จองโต๊ะ</p>
                      <p className="font-display font-semibold text-white">{user.activity.bookings}</p>
                    </div>
                    <div className="border-x border-white/5">
                      <p className="text-ink-mute text-[10px]">ประมูล</p>
                      <p className="font-display font-semibold text-neon-cyan">{user.activity.bids}</p>
                    </div>
                    <div>
                      <p className="text-ink-mute text-[10px]">E-Tickets</p>
                      <p className="font-display font-semibold text-gold">{user.activity.tickets}</p>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 flex items-center gap-2 border-t border-white/5 pt-3">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="flex-1 rounded-xl border border-white/10 bg-night-950/80 py-2 text-xs font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
                  >
                    ดูรายละเอียด
                  </button>
                  <button
                    onClick={() => handleSwitchUser(user)}
                    disabled={isCurrent}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      isCurrent
                        ? "bg-white/5 text-ink-mute cursor-not-allowed"
                        : "border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
                    }`}
                    title="สลับการเข้าใช้งานสู่บัญชีนี้"
                  >
                    {isCurrent ? "ใช้งานอยู่" : "สลับล็อกอิน"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Mode 2: Table View */}
      {!loading && viewMode === "table" && filteredUsers.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-night-900/80 backdrop-blur">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-night-950/80 text-ink-mute">
                <tr>
                  <th className="px-5 py-4 font-semibold">ผู้ใช้งาน</th>
                  <th className="px-4 py-4 font-semibold">อีเมล / เบอร์โทร</th>
                  <th className="px-4 py-4 font-semibold">บทบาท</th>
                  <th className="px-4 py-4 font-semibold">สถานะ</th>
                  <th className="px-4 py-4 font-semibold">อายุ / วันเกิด</th>
                  <th className="px-4 py-4 font-semibold">สถิติกิจกรรม</th>
                  <th className="px-4 py-4 font-semibold">วันที่สร้าง</th>
                  <th className="px-5 py-4 text-right font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => {
                  const isCurrent = currentUser?.id === user.id;

                  return (
                    <tr
                      key={user.id}
                      className={`transition hover:bg-white/[0.02] ${
                        isCurrent ? "bg-neon-cyan/[0.03]" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={user.fullName} role={user.role} size="sm" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{user.fullName}</span>
                              {isCurrent && (
                                <span className="rounded bg-neon-cyan/20 px-1.5 py-0.5 text-[9px] font-bold text-neon-cyan">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-ink-mute">@{user.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-mono text-white">{user.email}</div>
                        <div className="font-mono text-ink-mute">{user.phone}</div>
                      </td>
                      <td className="px-4 py-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-white">อายุ {user.age} ปี</div>
                        <div className="text-[11px] text-ink-mute">{formatBirthDate(user.birthDate)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-ink-mute">
                          <span title="จองโต๊ะ">🍸 {user.activity.bookings}</span>
                          <span title="ประมูลโฮสต์">⚡ {user.activity.bids}</span>
                          <span title="ตั๋ว E-Ticket">🎫 {user.activity.tickets}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-ink-mute">
                        {formatThaiDate(user.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-ink-mute hover:border-white/30 hover:text-white"
                          >
                            ดูรายละเอียด
                          </button>
                          <button
                            onClick={() => handleSwitchUser(user)}
                            disabled={isCurrent}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                              isCurrent
                                ? "bg-white/5 text-ink-mute cursor-not-allowed"
                                : "border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
                            }`}
                          >
                            สลับ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Account Details Modal (รายละเอียดของบัญชีทั้งหมด) */}
      {selectedUser && (
        <AccountDetailModal
          user={selectedUser}
          isCurrent={currentUser?.id === selectedUser.id}
          onClose={() => setSelectedUser(null)}
          onSwitch={() => {
            handleSwitchUser(selectedUser);
            setSelectedUser(null);
          }}
          onToggleStatus={() => handleToggleStatus(selectedUser)}
          onRoleChange={async (newRole) => {
            try {
              const res = await api.patch(`/users/${selectedUser.id}`, { role: newRole });
              setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? res.data : u)));
              setSelectedUser(res.data);
              showNotice(`เปลี่ยนบทบาทเป็น ${newRole} สำเร็จ`);
            } catch (e: any) {
              showNotice(e?.response?.data?.error ?? "ไม่สามารถเปลี่ยนบทบาทได้");
            }
          }}
        />
      )}

      {/* Modal 2: Create New Profile Modal */}
      {isCreateOpen && (
        <CreateAccountModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={(newUser) => {
            setUsers((prev) => [newUser, ...prev]);
            setIsCreateOpen(false);
            showNotice(`สร้างโปรไฟล์ @${newUser.username} สำเร็จเรียบร้อย!`);
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Component: Full Account Detail Modal
// -------------------------------------------------------------
function AccountDetailModal({
  user,
  isCurrent,
  onClose,
  onSwitch,
  onToggleStatus,
  onRoleChange
}: {
  user: UserProfileDto;
  isCurrent: boolean;
  onClose: () => void;
  onSwitch: () => void;
  onToggleStatus: () => void;
  onRoleChange: (role: Role) => void;
}) {
  const [activeTab, setActiveTab] = useState<"profile" | "system" | "activity" | "json">("profile");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/80 p-4 backdrop-blur-md">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/20 bg-night-900 p-6 shadow-2xl sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-ink-mute hover:bg-white/20 hover:text-white"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <UserAvatar name={user.fullName} role={user.role} size="lg" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-white">{user.fullName}</h2>
              {isCurrent && (
                <span className="rounded-full bg-neon-cyan/20 border border-neon-cyan/50 px-2.5 py-0.5 text-xs font-semibold text-neon-cyan">
                  เซสชันปัจจุบัน
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-neon-cyan">@{user.username}</span>
              <span className="text-white/20">·</span>
              <RoleBadge role={user.role} />
              <StatusBadge status={user.status} />
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="mt-6 flex border-b border-white/10 text-xs font-semibold text-ink-mute">
          <button
            onClick={() => setActiveTab("profile")}
            className={`border-b-2 px-4 py-3 transition ${
              activeTab === "profile"
                ? "border-neon-pink text-neon-pink"
                : "border-transparent hover:text-white"
            }`}
          >
            👤 ข้อมูลโปรไฟล์
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`border-b-2 px-4 py-3 transition ${
              activeTab === "system"
                ? "border-neon-cyan text-neon-cyan"
                : "border-transparent hover:text-white"
            }`}
          >
            🔒 ระบบ & สิทธิ์
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`border-b-2 px-4 py-3 transition ${
              activeTab === "activity"
                ? "border-gold text-gold"
                : "border-transparent hover:text-white"
            }`}
          >
            📊 สถิติกิจกรรม
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`border-b-2 px-4 py-3 transition ${
              activeTab === "json"
                ? "border-white text-white"
                : "border-transparent hover:text-white"
            }`}
          >
            {`{ }`} Raw JSON
          </button>
        </div>

        {/* Tab 1: Profile Details */}
        {activeTab === "profile" && (
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-night-950/60 p-3.5">
                <span className="text-xs text-ink-mute">รหัสประจำตัว (User UUID)</span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-xs text-white truncate max-w-[200px]">{user.id}</span>
                  <button
                    onClick={() => copyToClipboard(user.id)}
                    className="text-xs text-neon-cyan hover:underline"
                  >
                    {copied ? "คัดลอกแล้ว!" : "คัดลอก"}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-night-950/60 p-3.5">
                <span className="text-xs text-ink-mute">อีเมล (Email)</span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-xs text-white truncate max-w-[200px]">{user.email}</span>
                  {user.emailVerifiedAt ? (
                    <span className="text-[10px] text-emerald-400">✓ ยืนยันแล้ว</span>
                  ) : (
                    <span className="text-[10px] text-zinc-500">ยังไม่ยืนยัน</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-night-950/60 p-3.5">
                <span className="text-xs text-ink-mute">เบอร์โทรศัพท์ (Phone)</span>
                <p className="mt-1 font-mono text-sm text-white">{user.phone}</p>
              </div>

              <div className="rounded-xl border border-white/5 bg-night-950/60 p-3.5">
                <span className="text-xs text-ink-mute">วันเกิด และ อายุ</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{formatBirthDate(user.birthDate)}</span>
                  <span className="rounded bg-neon-cyan/20 px-2 py-0.5 text-xs text-neon-cyan">
                    อายุ {user.age} ปี
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-night-950/60 p-3.5">
                <span className="text-xs text-ink-mute">วันที่สร้างบัญชี (Registered Date)</span>
                <p className="mt-1 text-sm text-white">{formatThaiDate(user.createdAt)}</p>
              </div>

              <div className="rounded-xl border border-white/5 bg-night-950/60 p-3.5">
                <span className="text-xs text-ink-mute">อัปเดตข้อมูลล่าสุด (Last Updated)</span>
                <p className="mt-1 text-sm text-white">{formatThaiDate(user.updatedAt)}</p>
              </div>
            </div>

            {/* Age Verification notice */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
              <span className="font-semibold">✓ ผ่านเกณฑ์พระราชบัญญัติสถานบริการ:</span> ผู้ใช้งานมีอายุ {user.age} ปี (เกินเกณฑ์ขั้นต่ำ 20 ปีบริบูรณ์ สามารถเข้าสถานบริการ Babe Bar ได้ตามกฎหมาย)
            </div>
          </div>
        )}

        {/* Tab 2: System & Permissions */}
        {activeTab === "system" && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-white/10 bg-night-950/60 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-mute">สิทธิ์ในระบบ (System Role)</span>
              <p className="mt-1 text-sm text-white">
                {user.role === "admin" && "👑 ผู้ดูแลระบบระดับสูงสุด: สิทธิ์จัดการทุกอย่าง ทั้งบัญชี โต๊ะ การประมูล และคอนฟิกระบบ"}
                {user.role === "staff" && "🍸 พนักงานบริการ: สิทธิ์ในการเช็กอินลูกค้า ตรวจสอบการจอง และดูแลห้องประมูล"}
                {user.role === "customer" && "🥂 สมาชิก/ลูกค้าทั่วไป: สิทธิ์จองโต๊ะ สั่งแพ็กเกจ ร่วมประมูลโฮสต์ และถือครอง E-Ticket"}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-ink-mute">เปลี่ยนสิทธิ์เป็น:</span>
                {(["customer", "staff", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => onRoleChange(r)}
                    disabled={user.role === r}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${
                      user.role === r
                        ? "bg-white/20 text-white cursor-default"
                        : "border border-white/10 text-ink-mute hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-night-950/60 p-3.5">
                <span className="text-xs text-ink-mute">Stripe Customer ID</span>
                <p className="mt-1 font-mono text-xs text-white">
                  {user.stripeCustomerId || "ยังไม่มีข้อมูล (ยังไม่ผูกบัตร)"}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-night-950/60 p-3.5">
                <span className="text-xs text-ink-mute">สถานะการประมูล (Auction Status)</span>
                <p className="mt-1 text-xs">
                  {user.auctionBannedUntil ? (
                    <span className="text-rose-400">ถูกระงับประมูลจนถึง {formatThaiDate(user.auctionBannedUntil)}</span>
                  ) : (
                    <span className="text-emerald-400">ปกติ (มีสิทธิ์ร่วมประมูลได้)</span>
                  )}
                </p>
              </div>
            </div>

            {/* PDPA Consents */}
            <div className="rounded-xl border border-white/5 bg-night-950/60 p-3.5 text-xs">
              <span className="font-semibold text-white">การยินยอมข้อกำหนด PDPA:</span>
              <ul className="mt-2 space-y-1.5 text-ink-mute">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> ยอมรับเงื่อนไขการใช้บริการ (Terms of Service v1)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> ยอมรับนโยบายความเป็นส่วนตัว (Privacy Policy v1)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> ยืนยันอายุ 20 ปีบริบูรณ์ขึ้นไป (Age 20+ Compliance)
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: Activity & Orders */}
        {activeTab === "activity" && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/5 bg-night-950/80 p-4 text-center">
                <span className="text-2xl">🍸</span>
                <p className="mt-2 font-display text-2xl font-bold text-white">{user.activity.bookings}</p>
                <p className="text-xs text-ink-mute">การจองโต๊ะ</p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-night-950/80 p-4 text-center">
                <span className="text-2xl">⚡</span>
                <p className="mt-2 font-display text-2xl font-bold text-neon-cyan">{user.activity.bids}</p>
                <p className="text-xs text-ink-mute">ครั้งที่เสนอราคา</p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-night-950/80 p-4 text-center">
                <span className="text-2xl">🎫</span>
                <p className="mt-2 font-display text-2xl font-bold text-gold">{user.activity.tickets}</p>
                <p className="text-xs text-ink-mute">บัตร E-Ticket</p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-night-950/80 p-4 text-center">
                <span className="text-2xl">📦</span>
                <p className="mt-2 font-display text-2xl font-bold text-neon-pink">{user.activity.packageOrders}</p>
                <p className="text-xs text-ink-mute">แพ็กเกจที่สั่ง</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-night-950/60 p-4 text-center text-xs text-ink-mute">
              บันทึกกิจกรรมในระบบ Babe Bar ทั้งหมดจะถูกเก็บรักษาอย่างปลอดภัยเพื่อรองรับการตรวจเช็ก E-Ticket และรายงานสถิติของร้าน
            </div>
          </div>
        )}

        {/* Tab 4: Raw JSON */}
        {activeTab === "json" && (
          <div className="mt-6">
            <div className="flex items-center justify-between pb-2 text-xs text-ink-mute">
              <span>ข้อมูลบัญชีรูปแบบ JSON ทั้งหมด:</span>
              <button
                onClick={() => copyToClipboard(JSON.stringify(user, null, 2))}
                className="text-neon-cyan hover:underline"
              >
                {copied ? "คัดลอก JSON แล้ว!" : "คัดลอกทั้งหมด"}
              </button>
            </div>
            <pre className="max-h-72 overflow-auto rounded-xl border border-white/10 bg-night-950 p-4 font-mono text-xs text-ink-mute">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleStatus}
              className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                user.status === "active"
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              }`}
            >
              {user.status === "active" ? "ระงับการใช้งาน (Suspend)" : "ปลดระงับ (Activate)"}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-ink-mute hover:text-white"
            >
              ปิดหน้าต่าง
            </button>
            <button
              onClick={onSwitch}
              disabled={isCurrent}
              className={`rounded-xl px-5 py-2.5 text-xs font-semibold transition ${
                isCurrent
                  ? "bg-white/5 text-ink-mute cursor-not-allowed"
                  : "btn-primary"
              }`}
            >
              {isCurrent ? "ใช้งานบัญชีนี้อยู่แล้ว" : "สลับเข้าสู่ระบบด้วยบัญชีนี้"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Component: Create Account Modal
// -------------------------------------------------------------
function CreateAccountModal({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: (user: UserProfileDto) => void;
}) {
  const [form, setForm] = useState<CreateAccountInput>({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: "Password1234!",
    birthDate: new Date("1998-05-15"),
    role: "customer",
    status: "active"
  });
  const [birthInput, setBirthInput] = useState("1998-05-15");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        ...form,
        birthDate: new Date(`${birthInput}T00:00:00Z`)
      };
      const res = await api.post("/users", payload);
      onCreated(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "ไม่สามารถสร้างบัญชีได้ กรุณาตรวจสอบข้อมูล");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/80 p-4 backdrop-blur-md">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/20 bg-night-900 p-6 shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-ink-mute hover:bg-white/20 hover:text-white"
        >
          ✕
        </button>

        <span className="text-xs font-semibold tracking-widest text-neon-pink uppercase">
          Babe Bar Accounts
        </span>
        <h2 className="mt-1 font-display text-2xl font-bold text-white">สร้างโปรไฟล์บัญชีใหม่</h2>
        <p className="mt-1 text-xs text-ink-mute">
          เพิ่มบัญชีผู้ใช้ใหม่เข้าสู่ฐานข้อมูลระบบ พร้อมกำหนดบทบาทและสิทธิ์
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-white">ชื่อ-นามสกุล</label>
            <input
              type="text"
              required
              placeholder="เช่น นายธนากร มั่งมี"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-night-950 px-3.5 py-2.5 text-white outline-none focus:border-neon-cyan"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-white">Username</label>
              <input
                type="text"
                required
                placeholder="เช่น tanakorn_99"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-night-950 px-3.5 py-2.5 font-mono text-white outline-none focus:border-neon-cyan"
              />
            </div>
            <div>
              <label className="block font-semibold text-white">เบอร์โทรศัพท์</label>
              <input
                type="tel"
                required
                placeholder="เช่น 0891234567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-night-950 px-3.5 py-2.5 font-mono text-white outline-none focus:border-neon-cyan"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-white">อีเมล</label>
            <input
              type="email"
              required
              placeholder="tanakorn@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-night-950 px-3.5 py-2.5 font-mono text-white outline-none focus:border-neon-cyan"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-white">วันเกิด (ต้องอายุ &gt;= 20 ปี)</label>
              <input
                type="date"
                required
                value={birthInput}
                onChange={(e) => setBirthInput(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-night-950 px-3.5 py-2.5 text-white outline-none focus:border-neon-cyan"
              />
            </div>

            <div>
              <label className="block font-semibold text-white">รหัสผ่านเริ่มต้น</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-night-950 px-3.5 py-2.5 text-white outline-none focus:border-neon-cyan"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-white">บทบาท (Role)</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-night-950 px-3.5 py-2.5 text-white outline-none focus:border-neon-cyan"
              >
                <option value="customer">Customer (ลูกค้า)</option>
                <option value="staff">Staff (พนักงาน)</option>
                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-white">สถานะ (Status)</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-night-950 px-3.5 py-2.5 text-white outline-none focus:border-neon-cyan"
              >
                <option value="active">Active (ปกติ)</option>
                <option value="suspended">Suspended (ระงับ)</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-ink-mute hover:text-white"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึกและสร้างบัญชี"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

