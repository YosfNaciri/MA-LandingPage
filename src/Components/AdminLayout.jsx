import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { getSupabaseClient } from "../lib/supabaseClient";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: DashboardIcon },
  { to: "/admin/submissions", label: "Soumissions", icon: FilesIcon },
  { to: "/admin/confirmations", label: "Confirmations", icon: FilesIcon },
  { to: "/admin/logs", label: "Logs d’activité", icon: ActivityIcon },
];

export default function AdminLayout({ subtitle, children }) {
  const navigate = useNavigate();
  const supabase = getSupabaseClient();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      alert(error.message);
      return;
    }

    navigate("/admin/login", { replace: true });
  }

  const showLabels = !collapsed;

  return (
    <div
      className={[
        "ma-form-theme min-h-screen bg-linear-to-b from-white to-blue-50 text-ma-text transition-[padding] duration-200",
        collapsed ? "pl-20" : "pl-72",
      ].join(" ")}
    >
      <aside
        className={[
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-ma-separator/60 bg-white/95 px-3 py-5 shadow-[8px_0_30px_rgba(36,71,139,0.06)] backdrop-blur transition-[width,padding] duration-200",
          collapsed ? "w-20" : "w-72",
        ].join(" ")}
      >
        <div className="flex items-center gap-3">
          <Link
            to="/admin/dashboard"
            className={[
              "min-w-0 rounded-[10px] font-extrabold text-ma-primary hover:bg-ma-bg",
              collapsed
                ? "grid h-12 flex-1 place-items-center text-lg"
                : "flex-1 px-2 py-1 text-xl",
            ].join(" ")}
            title="Martine Adam CPA"
          >
            {showLabels ? "Martine Adam CPA" : "MA"}
          </Link>

          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-ma-separator text-ma-primary hover:border-ma-primary hover:bg-ma-bg"
              aria-label="Réduire le menu admin"
              title="Réduire le menu"
            >
              <MenuIcon />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="mt-3 grid h-11 w-full place-items-center rounded-[10px] border border-ma-separator text-ma-primary hover:border-ma-primary hover:bg-ma-bg"
            aria-label="Afficher le menu complet"
            title="Afficher le menu complet"
          >
            <MenuIcon />
          </button>
        )}

        {showLabels && (
          <p className="mt-1 px-2 text-sm text-ma-muted">{subtitle}</p>
        )}

        <nav className="mt-7 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  [
                    "flex h-12 items-center gap-3 rounded-[10px] text-sm font-extrabold transition",
                    collapsed ? "justify-center" : "justify-start px-4",
                    isActive
                      ? "bg-ma-primary text-white"
                      : "text-ma-muted hover:bg-ma-bg hover:text-ma-primary",
                  ].join(" ")
                }
              >
                <Icon />
                {showLabels && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 border-t border-ma-separator/60 pt-4">
          <Link
            to="/"
            title="Retour au site"
            className={[
              "flex h-12 items-center gap-3 rounded-[10px] border border-ma-separator text-sm font-bold text-ma-muted hover:border-ma-primary hover:text-ma-primary",
              collapsed ? "justify-center" : "justify-start px-4",
            ].join(" ")}
          >
            <HomeIcon />
            {showLabels && <span>Retour au site</span>}
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            title="Déconnexion"
            className={[
              "flex h-12 w-full items-center gap-3 rounded-[10px] bg-ma-primary text-sm font-extrabold text-white hover:bg-ma-primary-dark",
              collapsed ? "justify-center" : "justify-start px-4",
            ].join(" ")}
          >
            <LogoutIcon />
            {showLabels && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

function IconShell({ children }) {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        {children}
      </svg>
    </span>
  );
}

function MenuIcon() {
  return (
    <IconShell>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </IconShell>
  );
}

function DashboardIcon() {
  return (
    <IconShell>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
    </IconShell>
  );
}

function FilesIcon() {
  return (
    <IconShell>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h5" />
      <path d="M5 7H4v14h10v-1" />
    </IconShell>
  );
}

function ActivityIcon() {
  return (
    <IconShell>
      <path d="M4 12h4l2-6 4 12 2-6h4" />
    </IconShell>
  );
}

function HomeIcon() {
  return (
    <IconShell>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v11h14V10" />
      <path d="M9 21v-7h6v7" />
    </IconShell>
  );
}

function LogoutIcon() {
  return (
    <IconShell>
      <path d="M10 17 15 12 10 7" />
      <path d="M15 12H3" />
      <path d="M14 4h5v16h-5" />
    </IconShell>
  );
}
