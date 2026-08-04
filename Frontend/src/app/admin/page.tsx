"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, LayoutDashboard, Sparkles } from "lucide-react";
import { AdminGuard } from "../../components/AdminGuard";

// Admin entry: choose which dashboard to open — the existing "Classic" one (tournaments, users,
// transactions, models…) or the "New" dashboard (empty for now, built out later).
export default function AdminHomePage() {
  const router = useRouter();
  return (
    <AdminGuard>
      <main className="admin-choose">
        <div className="admin-choose-head">
          <p className="eyebrow">ADMIN</p>
          <h1>Choose a dashboard</h1>
          <p>Open the classic control center, or the new dashboard we&apos;re building.</p>
        </div>
        <div className="admin-choose-grid">
          <button className="admin-choose-card" onClick={() => router.push("/admin/classic")}>
            <span className="admin-choose-ico classic">
              <LayoutDashboard size={30} />
            </span>
            <h2>Classic Dashboard</h2>
            <p>Tournaments, users, transactions, math models, settings — everything you have today.</p>
            <span className="admin-choose-go">
              Open <ChevronRight size={18} />
            </span>
          </button>
          <button className="admin-choose-card" onClick={() => router.push("/admin/new")}>
            <span className="admin-choose-ico new">
              <Sparkles size={30} />
            </span>
            <h2>New Dashboard</h2>
            <p>The next-generation admin experience. Coming soon — we&apos;ll add features step by step.</p>
            <span className="admin-choose-go">
              Open <ChevronRight size={18} />
            </span>
          </button>
        </div>
      </main>
    </AdminGuard>
  );
}
