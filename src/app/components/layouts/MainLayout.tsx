import { Outlet, Link, useLocation } from "react-router";
import {
  Megaphone,
  BarChart3,
  Building2,
  Briefcase,
  Receipt,
  TrendingUp,
  Users,
  Film,
  Package,
  Tag,
  Bell,
  User,
  Save,
} from "lucide-react";

export function MainLayout() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Kampanjer", icon: Megaphone },
    { path: "/reports", label: "Rapporter", icon: BarChart3 },
    { path: "/orders", label: "Annonsører", icon: Building2 },
    { path: "/templates", label: "Mediebyrå", icon: Briefcase },
    { path: "/faktura", label: "Faktura", icon: Receipt },
    { path: "/inntekt", label: "Inntektsrapport", icon: TrendingUp },
    { path: "/admin", label: "Brukere", icon: Users },
    { path: "/creatives", label: "Kreativer", icon: Film },
    { path: "/inventory", label: "Varelager", icon: Package },
    { path: "/priser", label: "Priser", icon: Tag },
  ];

  const onPlanner = location.pathname === "/" || location.pathname.startsWith("/campaign/");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-[220px] bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        <div className="h-[56px] px-4 flex items-center border-b border-sidebar-border">
          <div
            className="text-sidebar-foreground"
            style={{
              fontSize: "17px",
              fontWeight: "var(--font-weight-semibold)",
              fontFamily: "var(--font-family-display)",
            }}
          >
            AdWeb 2.0
          </div>
        </div>

        <nav className="flex-1 py-2 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path !== "/"
                ? location.pathname === item.path || location.pathname.startsWith(item.path + "/")
                : location.pathname === "/" || location.pathname.startsWith("/campaign/");

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] mb-0.5
                  transition-colors
                  ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-border/40"
                  }
                `}
                style={{
                  fontSize: "13px",
                  fontFamily: "var(--font-family-text)",
                  fontWeight: "var(--font-weight-light)",
                }}
              >
                <Icon size={17} strokeWidth={1.75} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <User size={16} className="text-sidebar-accent-foreground" />
            </div>
            <div style={{ fontFamily: "var(--font-family-text)" }}>
              <div
                style={{ fontSize: "12px", fontWeight: "var(--font-weight-semibold)" }}
                className="text-sidebar-foreground"
              >
                Kim Skjold
              </div>
              <div
                style={{ fontSize: "11px", fontWeight: "var(--font-weight-light)" }}
                className="text-muted-foreground"
              >
                TV2
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {!onPlanner && (
          <header className="h-[56px] bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
            <div className="flex-1 max-w-[400px]" />
            <div className="flex items-center gap-4">
              <div
                className="flex items-center gap-2 text-muted-foreground"
                style={{ fontSize: "12px" }}
              >
                <Save size={14} />
                <span>Alle endringer lagret</span>
              </div>
              <button className="relative p-2 text-card-foreground hover:bg-secondary rounded-[var(--radius-md)] transition-colors">
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </button>
              <button className="flex items-center gap-2 p-2 text-card-foreground hover:bg-secondary rounded-[var(--radius-md)] transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <User size={14} className="text-primary-foreground" />
                </div>
              </button>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-hidden min-h-0 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
