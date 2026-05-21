"use client";

import { useState, type ReactNode } from "react";
import { KpiCard } from "@/components/dashboard/KpiCard";

interface ToggleKpiState {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

interface ToggleKpiCardProps {
  primary: ToggleKpiState;
  secondary: ToggleKpiState;
  icon?: ReactNode;
  primaryColor?: "green" | "blue" | "orange" | "red" | "gray";
  secondaryColor?: "green" | "blue" | "orange" | "red" | "gray";
  className?: string;
}

export function ToggleKpiCard({
  primary,
  secondary,
  icon,
  primaryColor = "green",
  secondaryColor,
  className,
}: ToggleKpiCardProps) {
  const [showSecondary, setShowSecondary] = useState(false);
  const active = showSecondary ? secondary : primary;
  const activeColor = showSecondary ? (secondaryColor ?? primaryColor) : primaryColor;

  return (
    <button
      type="button"
      onClick={() => setShowSecondary((current) => !current)}
      className="w-full text-left"
      aria-pressed={showSecondary}
    >
      <KpiCard
        title={active.title}
        value={active.value}
        subtitle={active.subtitle}
        trend={active.trend}
        trendValue={active.trendValue}
        icon={icon}
        color={activeColor}
        className={className}
      />
      <p className="mt-1 px-1 text-[11px] text-slate-400">
        Touchez pour basculer cycle / mois en cours
      </p>
    </button>
  );
}
