"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";
import {
  LayoutDashboard, ClipboardList, ShoppingCart, Heart,
  Package, BarChart3, Settings, LogOut, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/",              label: "Tableau de bord",    icon: LayoutDashboard },
  { href: "/saisie",        label: "Saisie de production", icon: ClipboardList },
  { href: "/ventes",        label: "Saisie des ventes",  icon: ShoppingCart },
  { href: "/sante",         label: "Santé",              icon: Heart },
  { href: "/stocks",        label: "Stocks",             icon: Package },
  { href: "/rapports",      label: "Rapports",           icon: BarChart3 },
  { href: "/administration",label: "Administration",     icon: Settings },
];

interface SidebarProps {
  userRole?: string;
  username?: string;
}

export function Sidebar({ userRole, username }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex-col z-30 shadow-xl hidden md:flex"
      style={{ background: "linear-gradient(180deg, #2e3f1c 0%, #3d5426 60%, #4a6928 100%)" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-center px-6 py-5 border-b border-white/10">
        <Image
          src="/logo.png"
          alt="Ferm'Afrik"
          width={140}
          height={60}
          className="object-contain drop-shadow-md"
          style={{ filter: "brightness(1.15) contrast(1.05)" }}
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          if (item.href === "/administration" && userRole !== "admin") return null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-brand/25 text-brand-300 border border-brand/30"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
              style={active ? { color: "#d4a843" } : {}}
            >
              <Icon
                className="h-5 w-5 flex-shrink-0"
                style={active ? { color: "#d4a843" } : { opacity: 0.6 }}
              />
              <span className="flex-1">{item.label}</span>
              {active && (
                <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: "#d4a843", opacity: 0.7 }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full text-olive-900 font-bold text-sm flex-shrink-0"
            style={{ background: "#d4a843" }}
          >
            {username ? username.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{username}</p>
            <p className="text-white/40 text-xs capitalize">{userRole}</p>
          </div>
        </div>
        {userRole === "demo" && (
          <div className="mx-2 mb-2 px-3 py-2 rounded-lg border"
            style={{ background: "rgba(212,168,67,0.1)", borderColor: "rgba(212,168,67,0.3)" }}>
            <p className="text-xs font-medium" style={{ color: "#d4a843" }}>Mode lecture seule</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all w-full"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
