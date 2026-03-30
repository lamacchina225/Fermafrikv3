import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "green" | "blue" | "orange" | "red" | "gray";
  className?: string;
}

const colorMap = {
  green: {
    bg: "bg-green-50",
    icon: "bg-green-100 text-green-600",
    border: "border-l-4 border-l-green-500",
  },
  blue: {
    bg: "bg-blue-50",
    icon: "bg-blue-100 text-blue-600",
    border: "border-l-4 border-l-blue-500",
  },
  orange: {
    bg: "bg-orange-50",
    icon: "bg-orange-100 text-orange-600",
    border: "border-l-4 border-l-orange-500",
  },
  red: {
    bg: "bg-red-50",
    icon: "bg-red-100 text-red-600",
    border: "border-l-4 border-l-red-500",
  },
  gray: {
    bg: "bg-gray-50",
    icon: "bg-gray-100 text-gray-600",
    border: "border-l-4 border-l-gray-400",
  },
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = "green",
  className,
}: KpiCardProps) {
  const colors = colorMap[color];

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-gray-400";

  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-sm border border-gray-100",
        colors.border,
        "p-5 hover:shadow-md transition-shadow",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 leading-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={cn("flex items-center gap-1 mt-2", trendColor)}>
              <TrendIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 ml-3",
              colors.icon
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
