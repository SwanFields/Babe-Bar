import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ProfileDashboard } from "./ProfileDashboard";
import { MyAccountDashboard } from "./MyAccountDashboard";

/** แอดมิน = ไดเรกทอรีบัญชีทั้งหมด, ผู้ใช้อื่น = บัญชีของตัวเองเท่านั้น */
export function DashboardPage() {
  const { user, loading } = useAuth();
  if (loading) return <p className="px-5 py-16 text-center text-slate-400">กำลังโหลด...</p>;
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="text-slate-300">กรุณาเข้าสู่ระบบเพื่อดูบัญชีของคุณ</p>
        <Link to="/login" className="btn-primary mt-5 inline-flex">เข้าสู่ระบบ</Link>
      </div>
    );
  }
  return user.role === "admin" ? <ProfileDashboard /> : <MyAccountDashboard />;
}
