import {
  BarChart3,
  Bell,
  BookOpen,
  Camera,
  FileText,
  Grid3x3,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Search,
  Settings,
  UserCircle2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { OcularLogo } from "./OcularLogo.jsx";

const ICONS = {
  dashboard: LayoutDashboard,
  live: Camera,
  records: Users,
  class: Grid3x3,
  analytics: BarChart3,
  ai: Settings,
  logs: FileText,
  alerts: Bell,
};

export const NAV_DEF = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "live", label: "Live attendance", icon: "live" },
  { id: "records", label: "Accounts & records", icon: "records" },
  { id: "class", label: "Class management", icon: "class" },
  { id: "analytics", label: "Analytics reports", icon: "analytics" },
  { id: "ai", label: "AI model settings", icon: "ai" },
  { id: "logs", label: "System logs", icon: "logs" },
];

export function filterNavForRole(role) {
  if (role === "institution" || role === "staff") return NAV_DEF;
  if (role === "student")
    return [
      { id: "dashboard", label: "Dashboard", icon: "dashboard" },
      { id: "records", label: "My attendance", icon: "records" },
    ];
  if (role === "parent")
    return [
      { id: "dashboard", label: "Dashboard", icon: "dashboard" },
      { id: "alerts", label: "Parent alerts", icon: "alerts" },
    ];
  return NAV_DEF.slice(0, 1);
}

export function OcularLayout({
  user,
  logout,
  activeId,
  onNavigate,
  title,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const items = filterNavForRole(user?.role);

  const goToSmartSearch = () => {
    if (activeId !== "dashboard") onNavigate("dashboard");
    setAppsOpen(false);
    setProfileOpen(false);
    setTimeout(() => {
      const el = document.getElementById("ocular-smart-search");
      if (el) el.focus();
    }, 120);
  };

  const goToLogs = () => {
    if (items.some((x) => x.id === "logs")) onNavigate("logs");
    setAppsOpen(false);
    setProfileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-800 bg-slate-900 transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col px-4 pb-6 pt-6">
          <OcularLogo className="px-2" />
          <nav className="mt-10 flex flex-1 flex-col gap-1">
            {items.map((item) => {
              const Icon = ICONS[item.icon] || BookOpen;
              const active = activeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    active
                      ? "bg-slate-800 text-white shadow-inner"
                      : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-500">
            <p>
              Signed in as <span className="text-slate-300">{user?.email}</span>
            </p>
            <button
              type="button"
              onClick={logout}
              className="w-full rounded-lg border border-slate-700 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 lg:hidden"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold tracking-tight text-white">{title}</h1>
          </div>
          <div className="relative flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={goToSmartSearch}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Search"
              title="Open smart search"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setAppsOpen((v) => !v);
                setProfileOpen(false);
              }}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Apps"
              title="Quick navigation"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goToLogs}
              className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Notifications"
              title="Open system logs"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
            </button>
            {appsOpen && (
              <div className="absolute right-20 top-14 z-40 w-56 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-xl">
                {items.map((item) => {
                  const Icon = ICONS[item.icon] || BookOpen;
                  return (
                    <button
                      key={`quick-${item.id}`}
                      type="button"
                      onClick={() => {
                        onNavigate(item.id);
                        setAppsOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setProfileOpen((v) => !v);
                setAppsOpen(false);
              }}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-xs font-bold text-white ring-2 ring-slate-800"
              title={user?.full_name || user?.email}
            >
              {(user?.full_name || user?.email || "?")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </button>
            {profileOpen && (
              <div className="absolute right-4 top-14 z-40 w-60 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-xl sm:right-6">
                <div className="mb-2 rounded-lg border border-slate-700 bg-slate-950/70 p-3">
                  <p className="text-xs text-slate-400">Signed in</p>
                  <p className="text-sm font-semibold text-white">{user?.full_name || "User"}</p>
                  <p className="text-xs text-slate-300">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(items.some((x) => x.id === "records") ? "records" : "dashboard");
                    setProfileOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                  <UserCircle2 className="h-4 w-4" />
                  Open Profile Area
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-950/40"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              className="ml-2 hidden rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 sm:inline"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-950 to-slate-900 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
