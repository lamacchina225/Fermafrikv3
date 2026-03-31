"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Egg, TrendingUp, AlertTriangle, CalendarDays } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface MonthlyProductionProps {
  cycleStartDate: string;
}

interface RecordPoint {
  date: string;
  oeufs: number;
  tauxPonte: number;
}

interface MonthData {
  records: RecordPoint[];
  totalEggs: number;
  totalBroken: number;
  avgTauxPonte: number;
  joursSaisis: number;
}

interface BusinessPeriod {
  value: string;
  start: string;
  end: string;
  label: string;
}

/**
 * Génère les périodes métier (du 18 au 17) depuis le début du cycle.
 */
function getBusinessPeriodsSince(cycleStartDate: string): BusinessPeriod[] {
  const periods: BusinessPeriod[] = [];
  const cycleStart = new Date(cycleStartDate + "T00:00:00");
  const today = new Date();

  // Premier 18 sur ou avant la date de début du cycle
  let cur = new Date(cycleStart.getFullYear(), cycleStart.getMonth(), 18);
  if (cycleStart.getDate() < 18) {
    cur = new Date(cycleStart.getFullYear(), cycleStart.getMonth() - 1, 18);
  }
  // Ne pas démarrer avant le début du cycle
  while (cur < cycleStart) {
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 18);
  }

  while (cur <= today) {
    const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 17);
    const startStr = format(cur, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    const label = `18 ${format(cur, "MMM", { locale: fr })} – 17 ${format(end, "MMM yyyy", { locale: fr })}`;
    periods.push({ value: startStr, start: startStr, end: endStr, label });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 18);
  }

  return periods.reverse();
}

/**
 * Retourne le début de la période métier en cours (18 du mois courant ou précédent).
 */
function getCurrentPeriodStart(): string {
  const today = new Date();
  if (today.getDate() >= 18) {
    return format(new Date(today.getFullYear(), today.getMonth(), 18), "yyyy-MM-dd");
  }
  return format(new Date(today.getFullYear(), today.getMonth() - 1, 18), "yyyy-MM-dd");
}

function getPeriodDays(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function MonthlyProduction({ cycleStartDate }: MonthlyProductionProps) {
  const periods = useMemo(() => getBusinessPeriodsSince(cycleStartDate), [cycleStartDate]);
  const [selectedPeriodStart, setSelectedPeriodStart] = useState<string>(
    getCurrentPeriodStart()
  );
  const [data, setData] = useState<MonthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.value === selectedPeriodStart) ?? periods[0],
    [periods, selectedPeriodStart]
  );

  useEffect(() => {
    if (!selectedPeriod) return;
    setIsLoading(true);
    fetch(`/api/daily-records?startDate=${selectedPeriod.start}&endDate=${selectedPeriod.end}`)
      .then((r) => r.json())
      .then((json) => {
        if (json && json.records !== undefined) {
          setData(json as MonthData);
        } else {
          setData(null);
        }
      })
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, [selectedPeriod]);

  const totalDaysInPeriod = selectedPeriod
    ? getPeriodDays(selectedPeriod.start, selectedPeriod.end)
    : 30;
  const joursSaisis = data?.joursSaisis ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* En-tête */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-amber-500" />
          <h2 className="font-semibold text-slate-900">Production mensuelle</h2>
        </div>
        <select
          value={selectedPeriodStart}
          onChange={(e) => setSelectedPeriodStart(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
        >
          {periods.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="p-5 space-y-5">
        {/* 4 KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Egg className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Œufs récoltés</p>
              <p className="text-xl font-bold text-slate-900">
                {isLoading ? "…" : formatNumber(data?.totalEggs ?? 0)}
              </p>
            </div>
          </div>

          <div className="bg-orange-50 rounded-xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Œufs cassés</p>
              <p className="text-xl font-bold text-slate-900">
                {isLoading ? "…" : formatNumber(data?.totalBroken ?? 0)}
              </p>
            </div>
          </div>

          <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Taux ponte moy.</p>
              <p className="text-xl font-bold text-slate-900">
                {isLoading ? "…" : `${data?.avgTauxPonte ?? 0}%`}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Jours saisis</p>
              <p className="text-xl font-bold text-slate-900">
                {isLoading ? "…" : joursSaisis}
              </p>
            </div>
          </div>
        </div>

        {/* Graphique en barres */}
        {isLoading ? (
          <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
            Chargement…
          </div>
        ) : !data || data.records.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Egg className="h-8 w-8 text-slate-200" />
            <p className="text-sm">Aucune donnée pour cette période</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.records}
                margin={{ top: 5, right: 8, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  allowDecimals={false}
                  width={38}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm min-w-32">
                          <p className="font-semibold text-slate-700 mb-1 pb-1 border-b border-slate-100">
                            {label}
                          </p>
                          <p className="text-amber-600 font-semibold">
                            {formatNumber(Number(payload[0].value))} œufs
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="oeufs"
                  name="Œufs récoltés"
                  fill="#d4a843"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 text-center">
              {joursSaisis} jour{joursSaisis > 1 ? "s" : ""} saisi
              {joursSaisis > 1 ? "s" : ""} sur {totalDaysInPeriod} jours dans la
              période
            </p>
          </>
        )}
      </div>
    </div>
  );
}
