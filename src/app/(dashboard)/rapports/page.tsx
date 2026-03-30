"use client";

import type { ElementType } from "react";
import { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth, subDays } from "date-fns";
import { useSession } from "next-auth/react";
import {
  CalendarRange,
  Download,
  Egg,
  FileText,
  Filter,
  Receipt,
  ShoppingCart,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { formatNumber, formatXOF, getCategoryLabel } from "@/lib/utils";

type EntryType = "all" | "production" | "sale" | "expense";

interface ReportEntry {
  id: string;
  entryType: "production" | "sale" | "expense";
  date: string;
  label: string;
  details: string;
  eggsCollected?: number;
  eggsBroken?: number;
  mortalityCount?: number;
  feedQuantityKg?: number;
  traysSold?: number;
  unitPriceXof?: number;
  amountXof: number;
  category: string;
}

interface ReportData {
  cycleStartDate?: string;
  rawEntries: ReportEntry[];
}

function entryTypeLabel(type: EntryType | ReportEntry["entryType"]) {
  switch (type) {
    case "production":
      return "Production";
    case "sale":
      return "Vente";
    case "expense":
      return "Depense";
    default:
      return "Toutes";
  }
}

export default function RapportsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [entryType, setEntryType] = useState<EntryType>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/daily-records?report=true&days=all")
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        setStartDate(json.cycleStartDate ?? "");
        setEndDate(format(new Date(), "yyyy-MM-dd"));
      })
      .catch(() => setData({ rawEntries: [] }))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredEntries = useMemo(() => {
    const entries = data?.rawEntries ?? [];
    return entries.filter((entry) => {
      if (entryType !== "all" && entry.entryType !== entryType) return false;
      if (startDate && entry.date < startDate) return false;
      if (endDate && entry.date > endDate) return false;
      return true;
    });
  }, [data, endDate, entryType, startDate]);

  const totals = useMemo(() => {
    return filteredEntries.reduce(
      (acc, entry) => {
        acc.entries += 1;
        if (entry.entryType === "production") {
          acc.eggs += entry.eggsCollected ?? 0;
        }
        if (entry.entryType === "sale") {
          acc.sales += entry.amountXof;
          acc.trays += entry.traysSold ?? 0;
        }
        if (entry.entryType === "expense" || entry.entryType === "production") {
          acc.expenses += entry.amountXof;
        }
        return acc;
      },
      { eggs: 0, sales: 0, expenses: 0, trays: 0, entries: 0 }
    );
  }, [filteredEntries]);

  const exportCsv = () => {
    const headers = [
      "Date",
      "Type",
      "Libelle",
      "Details",
      "Quantite",
      "Montant_XOF",
      "Categorie",
    ];
    const rows = filteredEntries.map((entry) => {
      const quantity =
        entry.entryType === "production"
          ? entry.eggsCollected ?? 0
          : entry.entryType === "sale"
            ? entry.traysSold ?? 0
            : "";

      return [
        entry.date,
        entryTypeLabel(entry.entryType),
        entry.label,
        entry.details,
        quantity,
        entry.amountXof,
        entry.category,
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(";")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport-fermafrik-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const popup = window.open("", "_blank", "width=1200,height=900");
    if (!popup) return;

    const rows = filteredEntries
      .map(
        (entry) => `
          <tr>
            <td>${entry.date}</td>
            <td>${entryTypeLabel(entry.entryType)}</td>
            <td>${entry.label}</td>
            <td>${entry.details}</td>
            <td>${
              entry.entryType === "production"
                ? formatNumber(entry.eggsCollected ?? 0)
                : entry.entryType === "sale"
                  ? formatNumber(entry.traysSold ?? 0)
                  : "-"
            }</td>
            <td>${formatXOF(entry.amountXof)}</td>
            <td>${entry.category}</td>
          </tr>
        `
      )
      .join("");

    popup.document.write(`
      <html>
        <head>
          <title>Rapport Fermafrik</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin-bottom: 8px; }
            p { color: #475569; }
            .stats { display: flex; gap: 16px; margin: 20px 0; }
            .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; min-width: 180px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 12px; vertical-align: top; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Rapport des saisies</h1>
          <p>Periode: ${startDate || "debut"} au ${endDate || "aujourd'hui"} | Type: ${entryTypeLabel(entryType)}</p>
          <div class="stats">
            <div class="card"><strong>Entrees</strong><br/>${formatNumber(totals.entries)}</div>
            <div class="card"><strong>Oeufs</strong><br/>${formatNumber(totals.eggs)}</div>
            <div class="card"><strong>Ventes</strong><br/>${formatXOF(totals.sales)}</div>
            <div class="card"><strong>Depenses</strong><br/>${formatXOF(totals.expenses)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Libelle</th>
                <th>Details</th>
                <th>Quantite</th>
                <th>Montant</th>
                <th>Categorie</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const applyPreset = (preset: "month" | "last7" | "last30" | "all") => {
    const today = new Date();
    if (preset === "month") {
      setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
      setEndDate(format(endOfMonth(today), "yyyy-MM-dd"));
      return;
    }
    if (preset === "last7") {
      setStartDate(format(subDays(today, 6), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
      return;
    }
    if (preset === "last30") {
      setStartDate(format(subDays(today, 29), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
      return;
    }
    setStartDate(data?.cycleStartDate ?? "");
    setEndDate(format(today, "yyyy-MM-dd"));
  };

  return (
    <div>
      <Header
        title="Rapports"
        username={session?.user?.name ?? undefined}
        userRole={session?.user?.role}
      />
      <div className="p-4 md:p-6 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Filter className="h-4 w-4 text-amber-500" />
                Toutes les donnees saisies depuis le debut
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Filtrez les productions, ventes et depenses puis exportez le resultat.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportCsv} disabled={filteredEntries.length === 0}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={exportPdf} disabled={filteredEntries.length === 0}>
                <FileText className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>

          <div className="grid gap-3 mt-5 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Date debut</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Date fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Type</label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as EntryType)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="all">Toutes les saisies</option>
                <option value="production">Production</option>
                <option value="sale">Ventes</option>
                <option value="expense">Depenses</option>
              </select>
            </div>
            <div className="xl:col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-500">Raccourcis</label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => applyPreset("month")}>
                  Ce mois
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset("last7")}>
                  7 jours
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset("last30")}>
                  30 jours
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset("all")}>
                  Depuis le debut
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={CalendarRange}
            label="Lignes filtrees"
            value={formatNumber(totals.entries)}
            subtitle={entryTypeLabel(entryType)}
          />
          <StatCard
            icon={Egg}
            label="Oeufs recoltes"
            value={formatNumber(totals.eggs)}
            subtitle="Sur la selection"
          />
          <StatCard
            icon={ShoppingCart}
            label="Ventes"
            value={formatXOF(totals.sales)}
            subtitle={`${formatNumber(totals.trays)} plaquettes`}
          />
          <StatCard
            icon={Receipt}
            label="Depenses"
            value={formatXOF(totals.expenses)}
            subtitle="Aliment inclus"
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Journal complet des saisies</h3>
            <p className="text-sm text-slate-400 mt-1">
              Productions, ventes et depenses dans un seul tableau.
            </p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Chargement...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Aucune donnee pour ces filtres.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Libelle</th>
                    <th className="text-left px-4 py-3 font-medium">Details</th>
                    <th className="text-left px-4 py-3 font-medium">Quantite</th>
                    <th className="text-left px-4 py-3 font-medium">Montant</th>
                    <th className="text-left px-4 py-3 font-medium">Categorie</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {entry.date}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {entryTypeLabel(entry.entryType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {entry.label}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{entry.details}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {entry.entryType === "production"
                          ? `${formatNumber(entry.eggsCollected ?? 0)} oeufs`
                          : entry.entryType === "sale"
                            ? `${formatNumber(entry.traysSold ?? 0)} plq`
                            : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        {formatXOF(entry.amountXof)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {entry.category === "production"
                          ? "Production"
                          : entry.category === "vente"
                            ? "Vente"
                            : getCategoryLabel(entry.category)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: ElementType;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">
        {label}
      </p>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}
