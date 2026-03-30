"use client";

import { useState, useEffect } from "react";
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

function getMonthsSince(startDate: string): string[] {
  const months: string[] = [];
  const cur = new Date(startDate);
  cur.setDate(1);
  const now = new Date();
  while (cur <= now) {
    months.push(format(cur, "yyyy-MM"));
    cur.setMonth(cur.getMonth() + 1);
  }
  return months.reverse();
}

function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

export function MonthlyProduction({ cycleStartDate }: MonthlyProductionProps) {
  const months = getMonthsSince(cycleStartDate);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  const [data, setData] = useState<MonthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/daily-records?month=${selectedMonth}`)
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
  }, [selectedMonth]);

  const totalDaysInMonth = getDaysInMonth(selectedMonth);
  const joursSaisis = data?.joursSaisis ?? 0;

  const monthLabel = (yearMonth: string) => {
    const [year, month] = yearMonth.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    return format(d, "MMMM yyyy", { locale: fr });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* En-tête */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-amber-500" />
          <h2 className="font-semibold text-slate-900">Production mensuelle</h2>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
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
            <p className="text-sm">Aucune donnée pour ce mois</p>
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
              {joursSaisis > 1 ? "s" : ""} sur {totalDaysInMonth} jours dans le
              mois
            </p>
          </>
        )}
      </div>
    </div>
  );
}
