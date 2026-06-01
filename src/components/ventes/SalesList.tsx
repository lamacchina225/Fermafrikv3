"use client";

import { Pencil, ShoppingCart, TrendingUp, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatXOF } from "@/lib/utils";

interface Client {
  id: number;
  name: string;
  city?: string | null;
  phone?: string | null;
}

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

export interface SaleEditValues {
  saleDate: string;
  traysSold: string;
  unitPrice: string;
  clientId: string;
  buyerName: string;
}

interface Props {
  title?: string;
  emptyMessage?: string;
  showDate?: boolean;
  sales: SaleRow[];
  isLoading: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  clients: Client[];
  editingSaleId: number | null;
  editValues: SaleEditValues;
  isUpdating: boolean;
  deleteConfirmId: number | null;
  onEditStart: (sale: SaleRow) => void;
  onEditChange: (field: keyof SaleEditValues, value: string) => void;
  onEditSubmit: (saleId: number) => void;
  onEditCancel: () => void;
  onDeleteRequest: (id: number) => void;
  onDeleteConfirm: (id: number) => void;
  onDeleteCancel: () => void;
}

export function SalesList({
  title = "Ventes du jour",
  emptyMessage = "Aucune vente pour cette journee",
  showDate = false,
  sales,
  isLoading,
  canEdit,
  isAdmin,
  clients,
  editingSaleId,
  editValues,
  isUpdating,
  deleteConfirmId,
  onEditStart,
  onEditChange,
  onEditSubmit,
  onEditCancel,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: Props) {
  const estimatedEditTotal =
    (Number(editValues.traysSold) || 0) * (Number(editValues.unitPrice) || 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {sales.length > 0 && (
          <span className="text-xs text-slate-400">
            {sales.length} vente{sales.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
      ) : sales.length === 0 ? (
        <div className="py-12 text-center">
          <ShoppingCart className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {sales.map((sale) => {
            const clientName = sale.clientName || sale.buyerName;
            const isEditing = editingSaleId === sale.id;

            return (
              <div key={sale.id} className="px-5 py-4">
                {isEditing ? (
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onEditSubmit(sale.id);
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">Modifier la vente</h3>
                        <p className="text-xs text-slate-500">Le total est recalcule automatiquement.</p>
                      </div>
                      <button
                        type="button"
                        onClick={onEditCancel}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        aria-label="Fermer le formulaire de modification"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label required>Date</Label>
                        <Input
                          type="date"
                          value={editValues.saleDate}
                          onChange={(event) => onEditChange("saleDate", event.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label required>Plaquettes</Label>
                        <Input
                          type="number"
                          min="1"
                          value={editValues.traysSold}
                          onChange={(event) => onEditChange("traysSold", event.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label required>Prix / plaquette</Label>
                        <Input
                          type="number"
                          min="1"
                          value={editValues.unitPrice}
                          onChange={(event) => onEditChange("unitPrice", event.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Client</Label>
                        <select
                          value={editValues.clientId}
                          onChange={(event) => onEditChange("clientId", event.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          <option value="">Aucun client enregistre</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                              {client.city ? ` | ${client.city}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Acheteur libre</Label>
                        <Input
                          value={editValues.buyerName}
                          onChange={(event) => onEditChange("buyerName", event.target.value)}
                          placeholder="Nom si aucun client"
                          disabled={Boolean(editValues.clientId)}
                        />
                      </div>
                    </div>

                    {estimatedEditTotal > 0 && (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                        <p className="text-xs font-medium text-emerald-700">Nouveau total</p>
                        <p className="text-lg font-bold text-emerald-800">{formatXOF(estimatedEditTotal)}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={onEditCancel}>
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                        loading={isUpdating}
                      >
                        Enregistrer
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {showDate && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                            {sale.saleDate}
                          </span>
                        )}
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
                          {clientName}
                          {sale.clientCity ? ` - ${sale.clientCity}` : ""}
                        </p>
                      )}
                    </div>
                    {(canEdit || isAdmin) && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {deleteConfirmId === sale.id ? (
                          <>
                            <button
                              onClick={() => onDeleteConfirm(sale.id)}
                              className="text-xs text-red-600 font-semibold hover:underline"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={onDeleteCancel}
                              className="text-xs text-slate-400 hover:underline ml-2"
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            {canEdit && (
                              <button
                                onClick={() => onEditStart(sale)}
                                className="p-1.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                aria-label="Modifier la vente"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => onDeleteRequest(sale.id)}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label="Supprimer la vente"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
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
