"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { History, Pencil, Trash2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface RecentRecord {
  id: number;
  recordDate: string;
  eggsCollected: number;
  eggsBroken: number;
  mortalityCount: number;
  mortalityCause: string | null;
  feedQuantityKg: string | null;
  feedType: string | null;
  feedCost: string | null;
}

interface Props {
  records: RecentRecord[];
  readonly: boolean;
  deleteConfirmId: number | null;
  isDeleting: boolean;
  onEdit: (rec: RecentRecord) => void;
  onDeleteRequest: (id: number) => void;
  onDeleteConfirm: (id: number) => void;
  onDeleteCancel: () => void;
}

export function RecentRecordsTable({
  records,
  readonly,
  deleteConfirmId,
  isDeleting,
  onEdit,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: Props) {
  if (records.length === 0) return null;

  return (
    <div className="mt-8 space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-slate-500" />
        <h3 className="font-semibold text-slate-900">Saisies récentes</h3>
        <span className="text-xs text-slate-400">(14 dernières)</span>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                <th className="text-left px-4 py-2.5 font-medium">Date</th>
                <th className="text-right px-4 py-2.5 font-medium">Oeufs</th>
                <th className="text-right px-4 py-2.5 font-medium">Cassés</th>
                <th className="text-right px-4 py-2.5 font-medium">Mort.</th>
                <th className="text-right px-4 py-2.5 font-medium">Alim. (kg)</th>
                {!readonly && (
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr
                  key={rec.id}
                  className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap capitalize">
                    {format(
                      new Date(rec.recordDate + "T00:00:00"),
                      "EEE d MMM yyyy",
                      { locale: fr }
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-800">
                    {formatNumber(rec.eggsCollected)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-500">
                    {rec.eggsBroken || "–"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {rec.mortalityCount > 0 ? (
                      <span className="text-rose-600 font-medium">
                        {rec.mortalityCount}
                      </span>
                    ) : (
                      <span className="text-slate-400">–</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-500">
                    {Number(rec.feedQuantityKg ?? 0) > 0
                      ? Number(rec.feedQuantityKg)
                      : "–"}
                  </td>
                  {!readonly && (
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(rec)}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <Pencil className="h-3 w-3" />
                          Modifier
                        </button>
                        <span className="text-slate-200">|</span>
                        {deleteConfirmId === rec.id ? (
                          <span className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onDeleteConfirm(rec.id)}
                              disabled={isDeleting}
                              className="text-xs text-red-600 font-semibold hover:underline"
                            >
                              Confirmer
                            </button>
                            <button
                              type="button"
                              onClick={onDeleteCancel}
                              className="text-xs text-slate-500 hover:underline"
                            >
                              Annuler
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onDeleteRequest(rec.id)}
                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:underline"
                          >
                            <Trash2 className="h-3 w-3" />
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
