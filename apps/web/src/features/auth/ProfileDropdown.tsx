import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { UserProfileDto } from "@babe-bar/shared";
import { useAuth } from "./AuthContext";
import { AccountDetailModal, RoleBadge, StatusBadge, UserAvatar } from "../dashboard/ProfileDashboard";
import { api } from "../../lib/api";
import { useAdminMode } from "../admin/AdminModeContext";

export function ProfileDropdown({ user }: { user: UserProfileDto }) {
  const { logout, refreshUser } = useAuth();
  const { adminMode, setAdminMode } = useAdminMode();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout helper
  const clearCloseTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Mouse hover handlers
  const handleMouseEnter = () => {
    clearCloseTimeout();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    clearCloseTimeout();
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearCloseTimeout();
    };
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <>
      <div
        ref={dropdownRef}
        className="relative inline-block text-left"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className={`group flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-all duration-150 outline-none ${
            isOpen
              ? "border-white/30 bg-night-800 shadow-sm"
              : "border-white/10 bg-night-900/60 hover:border-white/25 hover:bg-night-850"
          }`}
        >
          {/* Avatar Dot */}
          <div className="relative">
            <UserAvatar name={user.fullName} role={user.role} size="sm" />
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-night-950 ${
                user.status === "active" ? "bg-emerald-400" : "bg-rose-500"
              }`}
            />
          </div>

          {/* Name & Role */}
          <div className="hidden text-left sm:block">
            <p className="max-w-[120px] truncate font-display text-xs font-medium text-white group-hover:text-rose-300 transition-colors">
              {user.fullName}
            </p>
            <p className="text-[10px] font-mono text-slate-400">@{user.username}</p>
          </div>

          {/* Role Pill */}
          <span
            className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
              user.role === "admin"
                ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                : user.role === "staff"
                ? "bg-teal-500/10 text-teal-300 border border-teal-500/20"
                : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
            }`}
          >
            {user.role}
          </span>

          {/* Chevron Icon */}
          <svg
            className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${
              isOpen ? "rotate-180 text-white" : "group-hover:text-white"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        <div
          className={`absolute right-0 top-full mt-2 w-72 origin-top-right rounded-2xl border border-white/10 bg-night-900/95 p-3.5 shadow-xl backdrop-blur-xl transition-all duration-150 z-50 ${
            isOpen
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto visible"
              : "opacity-0 scale-95 -translate-y-1 pointer-events-none invisible"
          }`}
        >
          {/* Section 1: User Profile Header */}
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3">
            <UserAvatar name={user.fullName} role={user.role} size="md" />
            <div className="min-w-0 flex-1">
              <h4 className="font-display text-xs font-semibold text-white truncate">{user.fullName}</h4>
              <p className="font-mono text-[11px] text-slate-400 truncate">@{user.username}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* Section 2: Account Status & Details Strip */}
          <div className="my-2.5 space-y-1.5 rounded-xl bg-night-950/60 p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">สถานะ:</span>
              <StatusBadge status={user.status} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">บทบาท:</span>
              <RoleBadge role={user.role} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">อายุ:</span>
              <span className="font-medium text-slate-200 text-[11px]">
                {user.age} ปี <span className="text-[10px] text-teal-300 font-normal">(ผ่านเกณฑ์ 20+)</span>
              </span>
            </div>

            {/* Activity Counters Mini Bar */}
            <div className="mt-1.5 grid grid-cols-3 gap-1 border-t border-white/[0.04] pt-1.5 text-center">
              <div className="py-0.5">
                <span className="block text-[9px] text-slate-500">จองโต๊ะ</span>
                <span className="font-display font-medium text-slate-200 text-xs">{user.activity?.bookings ?? 0}</span>
              </div>
              <div className="py-0.5 border-x border-white/[0.04]">
                <span className="block text-[9px] text-slate-500">ประมูล</span>
                <span className="font-display font-medium text-teal-300 text-xs">{user.activity?.bids ?? 0}</span>
              </div>
              <div className="py-0.5">
                <span className="block text-[9px] text-slate-500">ตั๋ว</span>
                <span className="font-display font-medium text-amber-300 text-xs">{user.activity?.tickets ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Navigation & Action Links */}
          <div className="space-y-0.5 text-xs">
            {/* View Full Profile Details Modal */}
            <button
              onClick={() => {
                setIsOpen(false);
                if (user.role === "admin") setIsDetailOpen(true);
                else navigate("/dashboard");
              }}
              className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 font-medium text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
            >
              <div className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>ดูรายละเอียดบัญชี</span>
              </div>
              <span className="text-[10px] text-slate-500">เปิดดู</span>
            </button>

            {/* Dashboard Link */}
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-xl px-2.5 py-2 font-medium text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
            >
              <div className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>{user.role === "admin" ? "แดชบอร์ดโปรไฟล์ทั้งหมด" : "แดชบอร์ดบัญชีของฉัน"}</span>
              </div>
              <span className="text-[10px] text-slate-500">จัดการ</span>
            </Link>

            {/* Bookings Link */}
            <Link
              to="/booking"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-xl px-2.5 py-2 font-medium text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
            >
              <div className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>จองโต๊ะของฉัน</span>
              </div>
              <span className="text-[10px] text-slate-500">จอง</span>
            </Link>
            <Link
              to="/tickets"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 font-medium text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
            >
              <span>Ticket ของฉัน</span>
              <span className="text-[10px] text-slate-500">เปิดดู</span>
            </Link>

            {/* Host Auction Link */}
            <Link
              to="/auction"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-xl px-2.5 py-2 font-medium text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
            >
              <div className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>ห้องประมูลโฮสต์</span>
              </div>
              <span className="text-[10px] text-slate-500">ประมูล</span>
            </Link>

            {user.role === "admin" && (
              <Link
                to="/admin/hosts"
                onClick={() => {
                  setAdminMode(true);
                  setIsOpen(false);
                }}
                className="mt-1 flex w-full items-center justify-between rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-2.5 py-2 font-semibold text-rose-200 transition hover:bg-rose-400/[0.12]"
              >
                <span>{adminMode ? "จัดการโหมดแอดมิน" : "เปิดโหมดแอดมิน"}</span>
                <span className="text-[10px] text-rose-300">Admin</span>
              </Link>
            )}
          </div>

          {/* Section 4: Logout */}
          <div className="mt-2.5 border-t border-white/[0.06] pt-2">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account Details Popup Modal */}
      {isDetailOpen && user.role === "admin" && (
        <AccountDetailModal
          user={user}
          isCurrent={true}
          onClose={() => setIsDetailOpen(false)}
          onSwitch={() => setIsDetailOpen(false)}
          onToggleStatus={async () => {
            const nextStatus = user.status === "active" ? "suspended" : "active";
            try {
              await api.patch(`/users/${user.id}`, { status: nextStatus });
              await refreshUser();
            } catch {
              // ignore
            }
          }}
          onRoleChange={async (newRole) => {
            try {
              await api.patch(`/users/${user.id}`, { role: newRole });
              await refreshUser();
            } catch {
              // ignore
            }
          }}
        />
      )}
    </>
  );
}
