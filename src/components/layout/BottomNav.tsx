"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingCart,
  Users,
  MoreHorizontal,
  Heart,
  BarChart3,
  Settings,
  LogOut,
  X,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const mainNav = [
  { href: "/", label: "Accueil", icon: LayoutDashboard },
  { href: "/saisie", label: "Production", icon: ClipboardList },
  { href: "/ventes", label: "Ventes", icon: ShoppingCart },
  { href: "/stocks", label: "Clients", icon: Users },
];

const moreNav = [
  { href: "/sante", label: "Santé", icon: Heart },
  { href: "/rapports", label: "Rapports", icon: BarChart3 },
  { href: "/administration", label: "Administration", icon: Settings },
  { href: "/compte", label: "Mon compte", icon: UserCircle },
];

interface BottomNavProps {
  userRole?: string;
}

export function BottomNav({ userRole }: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isMoreActive = moreNav.some((item) => isActive(item.href));

  return (
    <>
      {/* Overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* Drawer "Plus" */}
      {moreOpen && (
        <div className="fixed bottom-[72px] left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 md:hidden border-t border-gray-100">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-sm font-semibold text-gray-700">Plus</span>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              aria-label="Fermer le menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-3 pb-4 space-y-1">
            {moreNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              if (item.href === "/administration" && userRole !== "admin") return null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    active
                      ? "bg-brand/10 text-brand-700"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="border-t border-gray-100 mt-2 pt-2">
              {userRole === "demo" && (
                <div className="mx-1 mb-2 px-3 py-2 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-orange-600 text-xs font-medium">Mode lecture seule</p>
                </div>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all w-full"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre de navigation inférieure */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigation mobile"
      >
        <div className="flex items-center justify-around h-[60px]">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all active:scale-95"
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-6 rounded-full transition-all",
                    active ? "bg-brand/15" : ""
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      active ? "text-brand-600" : "text-gray-400"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none transition-colors",
                    active ? "text-brand-600" : "text-gray-400"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Bouton Plus */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all active:scale-95"
            aria-label="Afficher plus d'options"
            aria-expanded={moreOpen}
          >
            <div
              className={cn(
                "flex items-center justify-center w-10 h-6 rounded-full transition-all",
                isMoreActive || moreOpen ? "bg-amber-500/15" : ""
              )}
            >
              <MoreHorizontal
                className={cn(
                  "h-5 w-5 transition-colors",
                  isMoreActive || moreOpen ? "text-brand-600" : "text-gray-400"
                )}
              />
            </div>
            <span
              className={cn(
                "text-[10px] font-medium leading-none transition-colors",
                isMoreActive || moreOpen ? "text-brand-600" : "text-gray-400"
              )}
            >
              Plus
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
