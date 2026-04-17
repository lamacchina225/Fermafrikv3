"use client";

import { Bell } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  title: string;
  username?: string;
  userRole?: string;
}

export function Header({ title, username, userRole }: HeaderProps) {
  const today = format(new Date(), "EEE d MMM", { locale: fr });

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "admin":        return "Admin";
      case "gestionnaire": return "Gestionnaire";
      case "demo":         return "Démo";
      default:             return role || "";
    }
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case "admin": return "default" as const;
      case "demo":  return "outline" as const;
      default:      return "secondary" as const;
    }
  };

  return (
    <header
      className="bg-white border-b flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 shadow-sm"
      style={{
        borderColor: "#e8ede0",
        paddingTop: "max(12px, env(safe-area-inset-top))",
        paddingBottom: "12px",
        minHeight: "64px",
      }}
    >
      {/* Logo mobile + titre */}
      <div className="flex items-center gap-2">
        <div className="md:hidden">
          <Image
            src="/logo.png"
            alt="Ferm'Afrik"
            width={48}
            height={48}
            className="navbar-mobile-logo-img object-contain w-auto"
            style={{ height: "44px", width: "auto" }}
            priority
          />
        </div>
        <div className="hidden md:block">
          <h1 className="text-base font-bold text-olive-800" style={{ color: "#3d5426" }}>{title}</h1>
          <p className="text-xs capitalize" style={{ color: "#8a9a7a" }}>{today}</p>
        </div>
      </div>

      {/* Droite */}
      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-xl hover:bg-olive-50 transition-colors active:scale-95"
          style={{ color: "#6a7a5a" }}>
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium" style={{ color: "#2e3f1c" }}>{username}</p>
            <Badge variant={getRoleBadgeVariant(userRole)} className="text-xs mt-0.5">
              {getRoleLabel(userRole)}
            </Badge>
          </div>
          <div
            className="flex items-center justify-center w-9 h-9 rounded-full text-white font-bold text-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #3d5426, #4a6928)" }}
          >
            {username ? username.charAt(0).toUpperCase() : "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
