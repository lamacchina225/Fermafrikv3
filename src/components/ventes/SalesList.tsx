"use client";

import { ShoppingCart, TrendingUp, Trash2 } from "lucide-react";
import { formatXOF } from "@/lib/utils";

interface SaleRow {
  id: number;
  saleDate: string;
  traysSold: number;
  unitPrice: string | number;
  totalAmount: string | number;
  buyerName?: string | null;
  clientId?: number | null;
  clientName?: string | null;
  clientCity?: string | null;
}

interface Props {
  sales: SaleRow[];
  isLoading: boolean;
  isAdmin: boolean;
  deleteConfirmId: number | null;
  onDeleteRequest: (id: number) => void;
  onDeleteConfirm: (id: number) => void;
  onDeleteCancel: () => void;
}

export function SalesList({
  sales, isLoading, isAdmin,
  deleteConfirmId, onDeleteRequest, onDeleteConfirm, onDeleteCancel,
}: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Ventes du jour</h2>
        {sales.length > 0 && (
          <span className="text-xs text-slate-400">{sales.length} vente{sales.length > 1 ? "s" : ""}</span>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Chargement…</div>
      ) : sales.length === 0 ? (
        <div className="py-12 text-center">
          <ShoppingCart className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aucune vente pour cette journée</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {sales.map((sale) => {
            const clientName = sale.clientName || sale.buyerName;
            return (
              <div key={sale.id} className="px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">
                      {sale.traysSold} plaquette{sale.traysSold > 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatXOF(Number(sale.unitPrice))}/plq
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                      {formatXOF(Number(sale.totalAmount))}
                    </span>
                  </div>
                  {clientName && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {clientName}{sale.clientCity ? ` · ${sale.clientCity}` : ""}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {deleteConfirmId === sale.id ? (
                      <>
                        <button onClick={() => onDeleteConfirm(sale.id)} className="text-xs text-red-600 font-semibold hover:underline">
                          Confirmer
                        </button>
                        <button onClick={onDeleteCancel} className="text-xs text-slate-400 hover:underline ml-2">
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onDeleteRequest(sale.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
