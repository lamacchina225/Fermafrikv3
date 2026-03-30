"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarRange, Egg, Receipt, ShoppingCart, TrendingUp } from "lucide-react";
import { eggsToTrays, formatNumber, formatXOF } from "@/lib/utils";

interface WeeklyActivityItem {
  date: string;
  eggsCollected: number;
  eggsBroken: number;
  mortalityCount: number;
  salesTrays: number;
  salesAmount: number;
  expensesAmount: number;
}

interface WeeklyActivityProps {
  items: WeeklyActivityItem[];
}

export function WeeklyActivity({ items }: WeeklyActivityProps) {
  const totalEggs = items.reduce((sum, item) => sum + item.eggsCollected, 0);
  const totalSales = items.reduce((sum, item) => sum + item.salesAmount, 0);
  const totalExpenses = items.reduce((sum, item) => sum + item.expensesAmount, 0);
  const totalBroken = items.reduce((sum, item) => sum + item.eggsBroken, 0);
  const totalMortality = items.reduce((sum, item) => sum + item.mortalityCount, 0);
  const totalTrays = items.reduce((sum, item) => sum + item.salesTrays, 0);
  const totalProductionTrays = eggsToTrays(Math.max(0, totalEggs - totalBroken));
  const bestDay = [...items].sort((a, b) => b.eggsCollected - a.eggsCollected)[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-amber-500" />
          <div>
            <h2 className="font-semibold text-slate-900">Resume de la semaine</h2>
            <p className="text-xs text-slate-400">
              Les 7 derniers jours en un coup d&apos;oeil
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Net semaine</p>
          <p className={`text-sm font-semibold ${totalSales - totalExpenses >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {formatXOF(totalSales - totalExpenses)}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-5 text-sm text-slate-400">Aucune saisie sur les 7 derniers jours.</div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <SummaryCard
              icon={<Egg className="h-4 w-4 text-amber-600" />}
              label="Production"
              value={`${formatNumber(totalProductionTrays)} plq`}
              hint={`${formatNumber(totalEggs)} oeufs | ${formatNumber(totalBroken)} casses`}
              tone="amber"
            />
            <SummaryCard
              icon={<ShoppingCart className="h-4 w-4 text-emerald-600" />}
              label="Ventes"
              value={`${formatNumber(totalTrays)} plq`}
              hint={formatXOF(totalSales)}
              tone="emerald"
            />
            <SummaryCard
              icon={<Receipt className="h-4 w-4 text-rose-600" />}
              label="Depenses"
              value={formatXOF(totalExpenses)}
              hint={`${formatNumber(totalMortality)} mortalite`}
              tone="rose"
            />
            <SummaryCard
              icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
              label="Meilleure journee"
              value={
                bestDay
                  ? `${formatNumber(
                      eggsToTrays(Math.max(0, bestDay.eggsCollected - bestDay.eggsBroken))
                    )} plq`
                  : "0 plq"
              }
              hint={
                bestDay
                  ? `${format(
                      new Date(`${bestDay.date}T00:00:00`),
                      "EEE d MMM",
                      { locale: fr }
                    )} | ${formatNumber(bestDay.eggsCollected)} oeufs`
                  : "-"
              }
              tone="blue"
            />
          </div>

          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-[110px_1fr_88px_96px_96px] gap-3 px-4 py-3 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <span>Jour</span>
              <span>Production</span>
              <span className="text-right">Ventes</span>
              <span className="text-right">Depenses</span>
              <span className="text-right">Alertes</span>
            </div>

            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const usableEggs = Math.max(0, item.eggsCollected - item.eggsBroken);
                const productionTrays = eggsToTrays(usableEggs);
                const barWidth =
                  totalEggs > 0 ? Math.max(8, Math.round((item.eggsCollected / totalEggs) * 100)) : 0;

                return (
                  <div
                    key={item.date}
                    className="grid grid-cols-[110px_1fr_88px_96px_96px] gap-3 px-4 py-3 items-center"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 capitalize">
                        {format(new Date(`${item.date}T00:00:00`), "EEE d MMM", { locale: fr })}
                      </p>
                      <p className="text-[11px] text-slate-400">{item.date}</p>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                          {formatNumber(productionTrays)} plq
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {formatNumber(item.eggsCollected)} oeufs | {formatNumber(item.eggsBroken)} casses
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatNumber(item.salesTrays)}
                      </p>
                      <p className="text-[11px] text-slate-400">plq</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatXOF(item.expensesAmount)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatXOF(item.salesAmount)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          item.mortalityCount > 0 ? "text-rose-600" : "text-slate-900"
                        }`}
                      >
                        {formatNumber(item.mortalityCount)}
                      </p>
                      <p className="text-[11px] text-slate-400">mort.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "amber" | "emerald" | "rose" | "blue";
}) {
  const toneMap = {
    amber: "bg-amber-50 border-amber-100",
    emerald: "bg-emerald-50 border-emerald-100",
    rose: "bg-rose-50 border-rose-100",
    blue: "bg-blue-50 border-blue-100",
  };

  return (
    <div className={`rounded-xl border p-3 ${toneMap[tone]}`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-400 mt-1">{hint}</p>
    </div>
  );
}
