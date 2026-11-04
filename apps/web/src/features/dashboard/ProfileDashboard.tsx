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

// Role badge styling (Minimal & Soft)
export function RoleBadge({ role }: { role: Role }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        Admin (ผู้ดูแล)
      </span>
    );
  }
  if (role === "staff") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/25 bg-teal-500/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-teal-300">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
        Staff (พนักงาน)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Customer (ลูกค้า)
    </span>
  );
}

// Status badge styling
export function StatusBadge({ status }: { status: UserStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-2 py-0.5 text-[11px] font-medium text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Active ปกติ
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/[0.08] px-2 py-0.5 text-[11px] font-medium text-rose-400">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        Suspended ถูกระงับ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-600/30 bg-slate-800/40 px-2 py-0.5 text-[11px] font-medium text-slate-400">
      Deleted ลบแล้ว
    </span>
  );
}

// User initials avatar (Clean & Minimal)
export function UserAvatar({ name, role, size = "md" }: { name: string; role: Role; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .trim()
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "BB";

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-xs font-semibold",
    lg: "h-14 w-14 text-sm font-semibold"
  }[size];

  const ringColor = {
    admin: "border-rose-500/30 text-rose-300 bg-rose-500/[0.08]",
    staff: "border-teal-500/30 text-teal-300 bg-teal-500/[0.08]",
    customer: "border-amber-500/30 text-amber-300 bg-amber-500/[0.08]"
  }[role];

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl border font-display tracking-wider ${sizeClasses} ${ringColor}`}
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
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
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
    setTimeout(() => setActionNotice(null), 3000);
  };

  const toggleUserDetails = (userId: string) => {
    setExpandedUserId((currentId) => (currentId === userId ? null : userId));
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
      showNotice(`สลับการเข้าใช้งานเป็น ${user.fullName} (@${user.username}) เรียบร้อย`);
    } catch (e: any) {
      showNotice(e?.response?.data?.error ?? "เกิดข้อผิดพลาดในการสลับบัญชี");
    }
  };

  // Toggle User Status
  const handleToggleStatus = async (user: UserProfileDto) => {
  const newStatus: UserStatus =
    user.status === "active"
      ? "suspended"
      : "active";

  const confirmed = window.confirm(
    user.status === "active"
      ? `ต้องการระงับบัญชี @${user.username} ใช่หรือไม่?`
      : `ต้องการปลดระงับบัญชี @${user.username} ใช่หรือไม่?`
  );

  if (!confirmed) return;

  try {
    const res = await api.patch(
      `/users/${user.id}`,
      { status: newStatus }
    );

    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? res.data : u
      )
    );

    if (selectedUser?.id === user.id) {
      setSelectedUser(res.data);
    }

    showNotice(
      `ปรับสถานะของ @${user.username} เป็น ${newStatus} แล้ว`
    );

  } catch (e: any) {
    showNotice(
      e?.response?.data?.error ??
      "ไม่สามารถเปลี่ยนสถานะได้"
    );
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Toast Alert Notice */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-night-900/95 px-4 py-3 text-xs text-white shadow-xl backdrop-blur-xl transition-all">
          <span className="h-2 w-2 rounded-full bg-teal-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-300">
              Accounts Directory
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                dataSource === "prisma"
                  ? "border border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-300"
                  : "border border-amber-500/20 bg-amber-500/[0.08] text-amber-300"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dataSource === "prisma" ? "bg-emerald-400" : "bg-amber-400"}`} />
              {dataSource === "prisma" ? "PostgreSQL (Prisma)" : "Local Database"}
            </span>
          </div>

          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-4xl">
            แดชบอร์ดโปรไฟล์บัญชี
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            จัดการและดูรายละเอียดโปรไฟล์ผู้ใช้งานทั้งหมดในระบบ Babe Bar
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="btn-outline !min-h-9 !px-3.5 !py-1.5 text-xs"
            title="รีเฟรชข้อมูลล่าสุด"
          >
            <svg
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="ml-1.5">รีเฟรช</span>
          </button>

          <button
            onClick={handleSeedSamples}
            className="btn-outline !min-h-9 !px-3.5 !py-1.5 text-xs"
            title="เพิ่มบัญชีตัวอย่างเพื่อทดสอบ"
          >
            <span>เติมข้อมูลตัวอย่าง</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary !min-h-9 !px-4 !py-1.5 text-xs"
          >
            <span className="text-base leading-none mr-1">+</span>
            <span>สร้างโปรไฟล์ใหม่</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards (Minimal & Sleek) */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="card !p-4 !rounded-xl">
          <p className="text-[11px] font-medium text-slate-400">บัญชีทั้งหมด</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-white">{stats.total}</p>
          <p className="mt-1 text-[11px] text-emerald-400">ปกติ {stats.active} บัญชี</p>
        </div>

        <div className="card !p-4 !rounded-xl border-rose-500/15 bg-rose-500/[0.03]">
          <p className="text-[11px] font-medium text-rose-300">ผู้ดูแล (Admins)</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-rose-300">{stats.admins}</p>
          <p className="mt-1 text-[11px] text-slate-400">สิทธิ์สูงสุด</p>
        </div>

        <div className="card !p-4 !rounded-xl border-teal-500/15 bg-teal-500/[0.03]">
          <p className="text-[11px] font-medium text-teal-300">พนักงาน (Staff)</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-teal-300">{stats.staff}</p>
          <p className="mt-1 text-[11px] text-slate-400">บริการและโต๊ะ</p>
        </div>

        <div className="card !p-4 !rounded-xl border-amber-500/15 bg-amber-500/[0.03]">
          <p className="text-[11px] font-medium text-amber-300">ลูกค้า (Customers)</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-amber-300">{stats.customers}</p>
          <p className="mt-1 text-[11px] text-slate-400">สมาชิกในร้าน</p>
        </div>

        <div className="card !p-4 !rounded-xl">
          <p className="text-[11px] font-medium text-slate-400">สถานะ Active</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-emerald-400">{stats.active}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% พร้อมใช้งาน` : "0%"}
          </p>
        </div>

        <div className="card !p-4 !rounded-xl">
          <p className="text-[11px] font-medium text-slate-400">อายุเฉลี่ย</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-white">{stats.avgAge} <span className="text-xs font-normal text-slate-400">ปี</span></p>
          <p className="mt-1 text-[11px] text-teal-300">ผ่านเกณฑ์ 20+</p>
        </div>
      </div>

      {/* Search, Filter & Controls Toolbar */}
      <div className="mt-6 rounded-2xl border border-white/[0.08] bg-night-900/40 p-3.5 backdrop-blur-md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, @username, อีเมล, เบอร์โทร..."
              className="w-full rounded-xl border border-white/10 bg-night-950/70 py-2 pl-9 pr-8 text-xs text-white placeholder-slate-500 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white"
              >
                ล้าง
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter Tabs */}
            <div className="flex rounded-xl border border-white/10 bg-night-950/60 p-0.5 text-xs">
              {(["all", "admin", "staff", "customer"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    roleFilter === r
                      ? "bg-white/[0.12] text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {r === "all" ? "ทั้งหมด" : r.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-xl border border-white/10 bg-night-950/60 px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-rose-400"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="active">Active ปกติ</option>
              <option value="suspended">Suspended ระงับ</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-white/10 bg-night-950/60 px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-rose-400"
            >
              <option value="newest">สมัครล่าสุด</option>
              <option value="oldest">สมัครเก่าสุด</option>
              <option value="name">ชื่อ ก-ฮ</option>
              <option value="username">Username</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex rounded-xl border border-white/10 bg-night-950/60 p-0.5 text-xs">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-lg px-2.5 py-1 text-[11px] transition ${
                  viewMode === "grid" ? "bg-white/[0.12] text-white font-medium" : "text-slate-400 hover:text-white"
                }`}
              >
                การ์ด
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded-lg px-2.5 py-1 text-[11px] transition ${
                  viewMode === "table" ? "bg-white/[0.12] text-white font-medium" : "text-slate-400 hover:text-white"
                }`}
              >
                ตาราง
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Pills Indicator */}
        <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[11px] text-slate-400">
          <span>
            แสดงผล <strong className="text-slate-200">{filteredUsers.length}</strong> จาก {users.length} บัญชี
          </span>
          {currentUser && (
            <span className="flex items-center gap-1.5 text-teal-300">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              <span>ล็อกอินอยู่: {currentUser.fullName}</span>
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-4 text-xs text-rose-300">
          <p className="font-semibold">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card h-56 animate-pulse bg-night-900/30" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredUsers.length === 0 && (
        <div className="mt-8 rounded-2xl border border-white/[0.06] bg-night-900/30 p-12 text-center">
          <h3 className="font-display text-lg font-semibold text-white">ไม่พบบัญชีที่ค้นหา</h3>
          <p className="mt-1 text-xs text-slate-400">ลองเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อดูบัญชีทั้งหมด</p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setStatusFilter("all");
              }}
              className="btn-outline !min-h-9 !py-1 text-xs"
            >
              ล้างตัวกรองทั้งหมด
            </button>
            <button onClick={handleSeedSamples} className="btn-primary !min-h-9 !py-1 text-xs">
              เพิ่มบัญชีตัวอย่าง
            </button>
          </div>
        </div>
      )}

      {/* View Mode 1: Grid Cards View */}
      {!loading && viewMode === "grid" && filteredUsers.length > 0 && (
        <div className="mt-5 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => {
            const isCurrent = currentUser?.id === user.id;
            const isExpanded = expandedUserId === user.id;

            return (
              <div
                key={user.id}
                className={`card relative flex h-fit flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 ${
                  isCurrent ? "border-teal-500/30 bg-night-900/80" : ""
                }`}
              >
                {/* Current User Badge */}
                {isCurrent && (
                  <div className="absolute -top-2.5 right-4 rounded-full border border-teal-500/40 bg-night-950 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-teal-300">
                    เซสชันปัจจุบัน
                  </div>
                )}

                <div>
                  {/* Card Header: Avatar & Roles */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.fullName} role={user.role} size="md" />
                      <div>
                        <h3 className="font-display text-base font-semibold text-white leading-tight">
                          {user.fullName}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-400">@{user.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleUserDetails(user.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "ซ่อนรายละเอียด" : "แสดงรายละเอียด"}
                      title={isExpanded ? "ซ่อนรายละเอียด" : "แสดงรายละเอียด"}
                    >
                      <svg className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="dashboard-details-slide mt-4 space-y-3 border-t border-white/[0.06] pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={user.role} />
                        <StatusBadge status={user.status} />
                        <span className="text-[11px] text-slate-400">อายุ <strong className="text-slate-200">{user.age}</strong> ปี</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] text-slate-400">อีเมล</span>
                          <span className="max-w-[180px] truncate font-mono text-[11px] text-slate-200" title={user.email}>{user.email}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">เบอร์โทร</span>
                          <span className="font-mono text-[11px] text-slate-200">{user.phone}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">วันเกิด</span>
                          <span className="text-[11px] text-slate-300">{formatBirthDate(user.birthDate)}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 rounded-xl bg-night-950/60 p-2 text-center text-xs">
                        <div><p className="text-[9px] text-slate-500">จองโต๊ะ</p><p className="font-display text-xs font-medium text-slate-200">{user.activity.bookings}</p></div>
                        <div className="border-x border-white/[0.04]"><p className="text-[9px] text-slate-500">ประมูล</p><p className="font-display text-xs font-medium text-teal-300">{user.activity.bids}</p></div>
                        <div><p className="text-[9px] text-slate-500">E-Tickets</p><p className="font-display text-xs font-medium text-amber-300">{user.activity.tickets}</p></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-4 flex items-center gap-2 border-t border-white/[0.04] pt-3">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    ดูรายละเอียด
                  </button>
                  <button
                    onClick={() => handleSwitchUser(user)}
                    disabled={isCurrent}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                      isCurrent
                        ? "bg-white/[0.02] text-slate-500 cursor-not-allowed"
                        : "border border-teal-500/30 bg-teal-500/[0.08] text-teal-300 hover:bg-teal-500/15"
                    }`}
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
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-night-900/50 backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.06] bg-night-950/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-medium">ผู้ใช้งาน</th>
                  <th className="px-4 py-3.5 font-medium">รายละเอียด</th>
                  <th className="px-5 py-3.5 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredUsers.map((user) => {
                  const isCurrent = currentUser?.id === user.id;
                  const isExpanded = expandedUserId === user.id;

                  return (
                    <React.Fragment key={user.id}>
                    <tr className={`transition-colors hover:bg-white/[0.02] ${isCurrent ? "bg-teal-500/[0.03]" : ""}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={user.fullName} role={user.role} size="sm" />
                          <div>
                            <span className="font-medium text-white">{user.fullName}</span>
                            <span className="ml-1.5 font-mono text-[11px] text-slate-400">@{user.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => toggleUserDetails(user.id)} className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white" aria-expanded={isExpanded}>
                          {isExpanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                          <svg className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
                          >
                            ดู
                          </button>
                          <button
                            onClick={() => handleSwitchUser(user)}
                            disabled={isCurrent}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                              isCurrent
                                ? "bg-white/[0.02] text-slate-500 cursor-not-allowed"
                                : "border border-teal-500/30 bg-teal-500/[0.08] text-teal-300 hover:bg-teal-500/15"
                            }`}
                          >
                            สลับ
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="dashboard-details-slide bg-night-950/30">
                        <td colSpan={3} className="px-5 py-3">
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-300">
                            <RoleBadge role={user.role} />
                            <StatusBadge status={user.status} />
                            <span>อายุ {user.age} ปี</span>
                            <span>{user.email}</span>
                            <span>{user.phone}</span>
                            <span>จอง {user.activity.bookings} · ประมูล {user.activity.bids} · ตั๋ว {user.activity.tickets}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Account Details Modal */}
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

  const confirmed = window.confirm(
    `ต้องการเปลี่ยนสิทธิ์ของ ${selectedUser?.fullName} เป็น ${newRole} ใช่หรือไม่?`
  );

  if (!confirmed) return;

  try {
    const res = await api.patch(
      `/users/${selectedUser.id}`,
      { role: newRole }
    );

    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id ? res.data : u
      )
    );

    setSelectedUser(res.data);

    showNotice(
      `เปลี่ยนบทบาทเป็น ${newRole} สำเร็จ`
    );

  } catch (e: any) {
    showNotice(
      e?.response?.data?.error ??
      "ไม่สามารถเปลี่ยนบทบาทได้"
    );
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
            showNotice(`สร้างโปรไฟล์ @${newUser.username} สำเร็จเรียบร้อย`);
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Component: Full Account Detail Modal (Clean & Minimal)
// -------------------------------------------------------------
export function AccountDetailModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/80 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-night-900/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-slate-400 hover:bg-white/[0.12] hover:text-white"
          aria-label="ปิดหน้าต่าง"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <UserAvatar name={user.fullName} role={user.role} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold text-white">{user.fullName}</h2>
              {isCurrent && (
                <span className="rounded-full bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 text-[10px] font-medium text-teal-300">
                  เซสชันปัจจุบัน
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-slate-400">@{user.username}</span>
              <span className="text-white/20">·</span>
              <RoleBadge role={user.role} />
              <StatusBadge status={user.status} />
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="mt-5 flex border-b border-white/[0.08] text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveTab("profile")}
            className={`border-b-2 px-3.5 py-2.5 transition ${
              activeTab === "profile"
                ? "border-rose-400 text-rose-300"
                : "border-transparent hover:text-white"
            }`}
          >
            ข้อมูลโปรไฟล์
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`border-b-2 px-3.5 py-2.5 transition ${
              activeTab === "system"
                ? "border-teal-400 text-teal-300"
                : "border-transparent hover:text-white"
            }`}
          >
            ระบบและสิทธิ์
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`border-b-2 px-3.5 py-2.5 transition ${
              activeTab === "activity"
                ? "border-amber-400 text-amber-300"
                : "border-transparent hover:text-white"
            }`}
          >
            สถิติกิจกรรม
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`border-b-2 px-3.5 py-2.5 transition ${
              activeTab === "json"
                ? "border-white text-white"
                : "border-transparent hover:text-white"
            }`}
          >
            Raw JSON
          </button>
        </div>

        {/* Tab 1: Profile Details */}
        {activeTab === "profile" && (
          <div className="mt-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.04] bg-night-950/50 p-3">
                <span className="text-[11px] text-slate-400">รหัสประจำตัว (UUID)</span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-200 truncate max-w-[190px]">{user.id}</span>
                  <button
                    onClick={() => copyToClipboard(user.id)}
                    className="text-xs text-teal-300 hover:underline"
                  >
                    {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-night-950/50 p-3">
                <span className="text-[11px] text-slate-400">อีเมล (Email)</span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-200 truncate max-w-[190px]">{user.email}</span>
                  {user.emailVerifiedAt ? (
                    <span className="text-[10px] text-emerald-400 font-medium">[ยืนยันแล้ว]</span>
                  ) : (
                    <span className="text-[10px] text-slate-500">[ยังไม่ยืนยัน]</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-night-950/50 p-3">
                <span className="text-[11px] text-slate-400">เบอร์โทรศัพท์</span>
                <p className="mt-1 font-mono text-xs text-slate-200">{user.phone}</p>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-night-950/50 p-3">
                <span className="text-[11px] text-slate-400">วันเกิด และ อายุ</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-200">{formatBirthDate(user.birthDate)}</span>
                  <span className="rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-300">
                    อายุ {user.age} ปี
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-night-950/50 p-3">
                <span className="text-[11px] text-slate-400">วันที่สร้างบัญชี</span>
                <p className="mt-1 text-xs text-slate-200">{formatThaiDate(user.createdAt)}</p>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-night-950/50 p-3">
                <span className="text-[11px] text-slate-400">อัปเดตล่าสุด</span>
                <p className="mt-1 text-xs text-slate-200">{formatThaiDate(user.updatedAt)}</p>
              </div>
            </div>

            {/* Age Verification notice */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-xs text-emerald-300">
              <span className="font-semibold">ผ่านเกณฑ์พระราชบัญญัติสถานบริการ:</span> ผู้ใช้งานมีอายุ {user.age} ปี (เกินเกณฑ์ขั้นต่ำ 20 ปีบริบูรณ์ สามารถเข้าสถานบริการ Babe Bar ได้ตามกฎหมาย)
            </div>
          </div>
        )}

        {/* Tab 2: System & Permissions */}
        {activeTab === "system" && (
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-white/[0.06] bg-night-950/50 p-3.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">สิทธิ์ในระบบ</span>
              <p className="mt-1 text-xs text-slate-200">
                {user.role === "admin" && "ผู้ดูแลระบบระดับสูงสุด: สิทธิ์จัดการทุกอย่าง ทั้งบัญชี โต๊ะ การประมูล และคอนฟิกระบบ"}
                {user.role === "staff" && "พนักงานบริการ: สิทธิ์ในการเช็กอินลูกค้า ตรวจสอบการจอง และดูแลห้องประมูล"}
                {user.role === "customer" && "สมาชิกและลูกค้าทั่วไป: สิทธิ์จองโต๊ะ สั่งแพ็กเกจ ร่วมประมูลโฮสต์ และถือครอง E-Ticket"}
              </p>

              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-[11px] text-slate-400">เปลี่ยนสิทธิ์เป็น:</span>
                {(["customer", "staff", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => onRoleChange(r)}
                    disabled={user.role === r}
                    className={`rounded-lg px-2 py-0.5 text-xs capitalize transition ${
                      user.role === r
                        ? "bg-white/[0.12] text-white"
                        : "border border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.04] bg-night-950/50 p-3">
                <span className="text-[11px] text-slate-400">Stripe Customer ID</span>
                <p className="mt-1 font-mono text-xs text-slate-300">
                  {user.stripeCustomerId || "ยังไม่มีข้อมูล (ยังไม่ผูกบัตร)"}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-night-950/50 p-3">
                <span className="text-[11px] text-slate-400">สถานะการประมูล</span>
                <p className="mt-1 text-xs">
                  {user.auctionBannedUntil ? (
                    <span className="text-rose-400">ถูกระงับประมูลจนถึง {formatThaiDate(user.auctionBannedUntil)}</span>
                  ) : (
                    <span className="text-emerald-400">ปกติ (มีสิทธิ์ร่วมประมูล)</span>
                  )}
                </p>
              </div>
            </div>

            {/* PDPA Consents */}
            <div className="rounded-xl border border-white/[0.04] bg-night-950/50 p-3 text-xs">
              <span className="font-semibold text-white">การยินยอมข้อกำหนด PDPA:</span>
              <ul className="mt-2 space-y-1 text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">[ผ่าน]</span> ยอมรับเงื่อนไขการใช้บริการ (Terms of Service v1)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">[ผ่าน]</span> ยอมรับนโยบายความเป็นส่วนตัว (Privacy Policy v1)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">[ผ่าน]</span> ยืนยันอายุ 20 ปีบริบูรณ์ขึ้นไป (Age 20+ Compliance)
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: Activity & Orders */}
        {activeTab === "activity" && (
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-white/[0.04] bg-night-950/60 p-3.5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">การจองโต๊ะ</p>
                <p className="mt-1 font-display text-2xl font-bold text-white">{user.activity.bookings}</p>
                <p className="text-[10px] text-slate-500">รายการ</p>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-night-950/60 p-3.5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-teal-400">ครั้งที่เสนอราคา</p>
                <p className="mt-1 font-display text-2xl font-bold text-teal-300">{user.activity.bids}</p>
                <p className="text-[10px] text-slate-500">ครั้ง</p>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-night-950/60 p-3.5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-amber-400">บัตร E-Ticket</p>
                <p className="mt-1 font-display text-2xl font-bold text-amber-300">{user.activity.tickets}</p>
                <p className="text-[10px] text-slate-500">ใบ</p>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-night-950/60 p-3.5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-rose-400">แพ็กเกจที่สั่ง</p>
                <p className="mt-1 font-display text-2xl font-bold text-rose-300">{user.activity.packageOrders}</p>
                <p className="text-[10px] text-slate-500">ออเดอร์</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.04] bg-night-950/50 p-3 text-center text-xs text-slate-400">
              บันทึกกิจกรรมในระบบ Babe Bar ทั้งหมดจะถูกเก็บรักษาอย่างปลอดภัยเพื่อรองรับการตรวจเช็ก E-Ticket และรายงานสถิติของร้าน
            </div>
          </div>
        )}

        {/* Tab 4: Raw JSON */}
        {activeTab === "json" && (
          <div className="mt-5">
            <div className="flex items-center justify-between pb-2 text-xs text-slate-400">
              <span>ข้อมูลบัญชีรูปแบบ JSON ทั้งหมด:</span>
              <button
                onClick={() => copyToClipboard(JSON.stringify(user, null, 2))}
                className="text-teal-300 hover:underline"
              >
                {copied ? "คัดลอก JSON แล้ว" : "คัดลอกทั้งหมด"}
              </button>
            </div>
            <pre className="max-h-64 overflow-auto rounded-xl border border-white/[0.06] bg-night-950 p-3 font-mono text-[11px] text-slate-400">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div>
            <button
  onClick={() => {
    const confirmed = window.confirm(
      user.status === "active"
        ? `⚠️ ต้องการระงับบัญชี @${user.username} ใช่หรือไม่?\n\nผู้ใช้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะปลดระงับ`
        : `✅ ต้องการปลดระงับบัญชี @${user.username} ใช่หรือไม่?`
    );

    if (confirmed) {
      onToggleStatus();
    }
  }}
  className={`rounded-xl border px-3.5 py-1.5 text-xs font-medium transition ${
    user.status === "active"
      ? "border-rose-500/30 bg-rose-500/[0.08] text-rose-300 hover:bg-rose-500/15"
      : "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300 hover:bg-emerald-500/15"
  }`}
>
  {user.status === "active"
    ? "ระงับการใช้งาน"
    : "ปลดระงับการใช้งาน"}
</button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
            >
              ปิด
            </button>
            <button
              onClick={onSwitch}
              disabled={isCurrent}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition ${
                isCurrent
                  ? "bg-white/[0.02] text-slate-500 cursor-not-allowed"
                  : "btn-primary !min-h-8"
              }`}
            >
              {isCurrent ? "ใช้งานบัญชีนี้อยู่แล้ว" : "สลับเข้าสู่ระบบ"}
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
    const confirmed = window.confirm(
    "ต้องการสร้างบัญชีผู้ใช้งานใหม่ใช่หรือไม่?"
    );

    if (!confirmed) return; 
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/80 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-night-900/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-slate-400 hover:bg-white/[0.12] hover:text-white"
          aria-label="ปิดหน้าต่าง"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <span className="text-[10px] font-semibold tracking-widest text-rose-400 uppercase">
          New Account
        </span>
        <h2 className="mt-1 font-display text-xl font-bold text-white">สร้างโปรไฟล์บัญชีใหม่</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          เพิ่มบัญชีผู้ใช้งานใหม่เข้าสู่ระบบ Babe Bar
        </p>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-300">ชื่อ-นามสกุล</label>
            <input
              type="text"
              required
              placeholder="เช่น นายธนากร มั่งมี"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-night-950/70 px-3.5 py-2 text-white outline-none focus:border-rose-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-slate-300">Username</label>
              <input
                type="text"
                required
                placeholder="tanakorn_99"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-night-950/70 px-3.5 py-2 font-mono text-white outline-none focus:border-rose-400"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300">เบอร์โทรศัพท์</label>
              <input
                type="tel"
                required
                placeholder="0891234567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-night-950/70 px-3.5 py-2 font-mono text-white outline-none focus:border-rose-400"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300">อีเมล</label>
            <input
              type="email"
              required
              placeholder="tanakorn@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-night-950/70 px-3.5 py-2 font-mono text-white outline-none focus:border-rose-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-slate-300">วันเกิด (อายุ 20+)</label>
              <input
                type="date"
                required
                value={birthInput}
                onChange={(e) => setBirthInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-night-950/70 px-3.5 py-2 text-white outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300">รหัสผ่านเริ่มต้น</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-night-950/70 px-3.5 py-2 text-white outline-none focus:border-rose-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-slate-300">บทบาท (Role)</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-night-950/70 px-3 py-2 text-white outline-none focus:border-rose-400"
              >
                <option value="customer">Customer (ลูกค้า)</option>
                <option value="staff">Staff (พนักงาน)</option>
                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300">สถานะ</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-night-950/70 px-3 py-2 text-white outline-none focus:border-rose-400"
              >
                <option value="active">Active (ปกติ)</option>
                <option value="suspended">Suspended (ระงับ)</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-3.5 py-1.5 text-slate-400 hover:text-white"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary !min-h-9"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึกและสร้างบัญชี"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
