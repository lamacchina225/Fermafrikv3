"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, Egg, Package, TrendingUp, Wallet } from "lucide-react";
import { calculateTauxPonte, formatNumber, formatXOF } from "@/lib/utils";

interface DailySummaryProps {
  recordDate?: string;
  eggsCollected?: number;
  eggsBroken?: number;
  eggsSold?: number;
  mortalityCount?: number;
  feedQuantityKg?: number;
  feedCost?: number;
  revenue?: number;
  effectifVivant?: number;
  hasRecord?: boolean;
  titre?: string;
}

export function DailySummary({
  recordDate,
  eggsCollected = 0,
  eggsBroken = 0,
  mortalityCount = 0,
  feedQuantityKg = 0,
  feedCost = 0,
  revenue = 0,
  effectifVivant = 0,
  hasRecord = false,
  titre = "Resume de la veille",
}: DailySummaryProps) {
  const dateAffichee = recordDate
    ? format(new Date(`${recordDate}T00:00:00`), "EEEE d MMMM yyyy", { locale: fr })
    : format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  const tauxPonte = calculateTauxPonte(eggsCollected, effectifVivant);

  if (!hasRecord) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-slate-900">{titre}</h2>
          <span className="text-xs text-slate-400 capitalize">{dateAffichee}</span>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-6 text-center text-sm text-slate-400">
          Aucune saisie pour cette date.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-slate-900">{titre}</h2>
          <p className="text-xs text-slate-400 capitalize">{dateAffichee}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <SmallStat
          icon={<Egg className="h-4 w-4 text-amber-600" />}
          label="Oeufs"
          value={formatNumber(eggsCollected)}
          tone="amber"
        />
        <SmallStat
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          label="Ponte"
          value={`${tauxPonte}%`}
          tone="emerald"
        />
        <SmallStat
          icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
          label="Mortalite"
          value={formatNumber(mortalityCount)}
          tone="rose"
        />
        <SmallStat
          icon={<Package className="h-4 w-4 text-blue-600" />}
          label="Aliment"
          value={`${formatNumber(feedQuantityKg)} kg`}
          tone="blue"
        />
        <SmallStat
          icon={<Wallet className="h-4 w-4 text-slate-700" />}
          label="Cout aliment"
          value={formatXOF(feedCost)}
          tone="slate"
        />
        <SmallStat
          icon={<Wallet className="h-4 w-4 text-violet-600" />}
          label="Revenus"
          value={formatXOF(revenue)}
          tone="violet"
        />
      </div>

      <div className="mt-3 text-xs text-slate-400">
        Casses: {formatNumber(eggsBroken)}
      </div>
    </div>
  );
}

function SmallStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "amber" | "emerald" | "rose" | "blue" | "slate" | "violet";
}) {
  const toneMap = {
    amber: "bg-amber-50 border-amber-100",
    emerald: "bg-emerald-50 border-emerald-100",
    rose: "bg-rose-50 border-rose-100",
    blue: "bg-blue-50 border-blue-100",
    slate: "bg-slate-50 border-slate-100",
    violet: "bg-violet-50 border-violet-100",
  };

  return (
    <div className={`rounded-xl border p-3 ${toneMap[tone]}`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
