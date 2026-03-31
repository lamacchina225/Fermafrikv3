"use client";

import { formatXOF } from "@/lib/utils";

interface Props {
  totalTrays: number;
  totalSalesAmount: number;
  netAmount: number;
}

export function SalesMetrics({ totalTrays, totalSalesAmount, netAmount }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Plaquettes</p>
        <p className="text-xl font-bold text-slate-900">{totalTrays}</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Montant</p>
        <p className="text-xl font-bold text-slate-900">{formatXOF(totalSalesAmount)}</p>
      </div>
      <div className={`rounded-xl border shadow-sm p-3 text-center ${netAmount >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Net</p>
        <p className={`text-xl font-bold ${netAmount >= 0 ? "text-emerald-700" : "text-red-600"}`}>
          {formatXOF(netAmount)}
        </p>
      </div>
    </div>
  );
}
