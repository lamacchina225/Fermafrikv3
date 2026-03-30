"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Package, Plus, ArrowUp, ArrowDown, Egg } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatXOF, formatDateShort, canWrite, getFeedTypeLabel } from "@/lib/utils";
import type { FeedStockEntry } from "@/types";

const feedStockSchema = z.object({
  movementDate: z.string().min(1, "La date est requise"),
  movementType: z.enum(["in", "out"]),
  quantityKg: z.coerce.number().min(0.1, "Quantité invalide"),
  unitCost: z.coerce.number().min(0).optional(),
  feedType: z.enum(["demarrage", "croissance", "ponte"]),
  notes: z.string().optional(),
});

type FeedStockFormData = z.infer<typeof feedStockSchema>;

interface StockSummary {
  totalEggs: number;
  totalBroken: number;
  totalSoldEggs: number;
  stockOeufs: number;
  stockPlaquettes: number;
}

export default function StocksPage() {
  const { data: session } = useSession();
  const [feedEntries, setFeedEntries] = useState<FeedStockEntry[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buildingInfo, setBuildingInfo] = useState<{ buildingId: number } | null>(null);

  const readonly = !canWrite(session?.user?.role);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FeedStockFormData>({
    resolver: zodResolver(feedStockSchema),
    defaultValues: {
      movementDate: format(new Date(), "yyyy-MM-dd"),
      movementType: "in",
      feedType: "ponte",
    },
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stockRes, summaryRes] = await Promise.all([
        fetch("/api/stocks"),
        fetch("/api/stocks?summary=true"),
      ]);
      const stockData = await stockRes.json();
      const summaryData = await summaryRes.json();
      setFeedEntries(stockData.entries ?? []);
      setStockSummary(summaryData);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    fetch("/api/daily-records?info=true")
      .then((r) => r.json())
      .then((d) => { if (d.buildingId) setBuildingInfo({ buildingId: d.buildingId }); });
  }, [loadData]);

  const onSubmit = async (data: FeedStockFormData) => {
    if (readonly || !buildingInfo) return;
    setIsSubmitting(true);
    try {
      const totalCost = data.unitCost ? data.unitCost * data.quantityKg : undefined;
      const res = await fetch("/api/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, buildingId: buildingInfo.buildingId, totalCost }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Mouvement stock enregistré !");
      setIsDialogOpen(false);
      reset({ movementDate: format(new Date(), "yyyy-MM-dd"), movementType: "in", feedType: "ponte" });
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stock aliments par type
  const stockParType = feedEntries.reduce<Record<string, number>>((acc, entry) => {
    const sign = entry.movementType === "in" ? 1 : -1;
    acc[entry.feedType] = (acc[entry.feedType] ?? 0) + sign * Number(entry.quantityKg);
    return acc;
  }, {});

  return (
    <div>
      <Header
        title="Stocks"
        username={session?.user?.name ?? undefined}
        userRole={session?.user?.role}
      />
      <div className="p-6 space-y-6">
        <Tabs defaultValue="oeufs">
          <TabsList>
            <TabsTrigger value="oeufs">
              <Egg className="h-4 w-4 mr-2" />
              Stock oeufs
            </TabsTrigger>
            <TabsTrigger value="aliments">
              <Package className="h-4 w-4 mr-2" />
              Stock aliments
            </TabsTrigger>
          </TabsList>

          {/* Stock oeufs */}
          <TabsContent value="oeufs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-yellow-500">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total récolté</p>
                <p className="text-2xl font-bold">{(stockSummary?.totalEggs ?? 0).toLocaleString("fr-FR")}</p>
                <p className="text-xs text-gray-400 mt-1">oeufs</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-red-400">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Vendus + cassés</p>
                <p className="text-2xl font-bold">
                  {((stockSummary?.totalSoldEggs ?? 0) + (stockSummary?.totalBroken ?? 0)).toLocaleString("fr-FR")}
                </p>
                <p className="text-xs text-gray-400 mt-1">oeufs</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-green-500">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Stock disponible</p>
                <p className="text-2xl font-bold text-green-600">
                  {(stockSummary?.stockOeufs ?? 0).toLocaleString("fr-FR")}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  = {stockSummary?.stockPlaquettes ?? 0} plaquettes
                </p>
              </div>
            </div>
            <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Formule de calcul</h3>
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <span className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg font-medium border border-yellow-100">
                  {(stockSummary?.totalEggs ?? 0).toLocaleString("fr-FR")} récoltés
                </span>
                <span className="text-gray-400">−</span>
                <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg font-medium border border-red-100">
                  {(stockSummary?.totalSoldEggs ?? 0).toLocaleString("fr-FR")} vendus
                </span>
                <span className="text-gray-400">−</span>
                <span className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg font-medium border border-orange-100">
                  {(stockSummary?.totalBroken ?? 0).toLocaleString("fr-FR")} cassés
                </span>
                <span className="text-gray-400">=</span>
                <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-semibold border border-green-200">
                  {(stockSummary?.stockOeufs ?? 0).toLocaleString("fr-FR")} en stock
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Stock aliments */}
          <TabsContent value="aliments">
            {/* Résumé par type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {(["demarrage", "croissance", "ponte"] as const).map((type) => (
                <div key={type} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    {getFeedTypeLabel(type)}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(stockParType[type] ?? 0).toFixed(1)} kg
                  </p>
                  <p className={`text-xs mt-1 ${(stockParType[type] ?? 0) < 50 ? "text-red-500 font-medium" : "text-gray-400"}`}>
                    {(stockParType[type] ?? 0) < 50 ? "Stock faible !" : "Stock correct"}
                  </p>
                </div>
              ))}
            </div>

            {/* Historique mouvements */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Mouvements stock aliments</h2>
                {!readonly && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4" />
                        Mouvement
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nouveau mouvement stock</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                        <div className="space-y-1.5">
                          <Label required>Date</Label>
                          <Input type="date" {...register("movementDate")} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label required>Type de mouvement</Label>
                            <Select defaultValue="in" onValueChange={(v) => setValue("movementType", v as "in" | "out")}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in">Entrée (achat)</SelectItem>
                                <SelectItem value="out">Sortie (distribution)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label required>Type d&apos;aliment</Label>
                            <Select defaultValue="ponte" onValueChange={(v) => setValue("feedType", v as "demarrage" | "croissance" | "ponte")}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="demarrage">Démarrage</SelectItem>
                                <SelectItem value="croissance">Croissance</SelectItem>
                                <SelectItem value="ponte">Ponte</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label required>Quantité (kg)</Label>
                            <Input type="number" min="0.1" step="0.1" placeholder="0" {...register("quantityKg")} error={errors.quantityKg?.message} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Prix unitaire (XOF/kg)</Label>
                            <Input type="number" min="0" placeholder="0" {...register("unitCost")} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Notes</Label>
                          <Textarea placeholder="Fournisseur, lot..." {...register("notes")} />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                            Annuler
                          </Button>
                          <Button type="submit" className="flex-1" loading={isSubmitting}>
                            Enregistrer
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Chargement...</div>
              ) : feedEntries.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun mouvement enregistré</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Aliment</th>
                        <th>Quantité</th>
                        <th>Coût total</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td>{formatDateShort(entry.movementDate)}</td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              {entry.movementType === "in" ? (
                                <ArrowUp className="h-4 w-4 text-green-500" />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-red-500" />
                              )}
                              <Badge variant={entry.movementType === "in" ? "success" : "destructive"}>
                                {entry.movementType === "in" ? "Entrée" : "Sortie"}
                              </Badge>
                            </div>
                          </td>
                          <td>{getFeedTypeLabel(entry.feedType)}</td>
                          <td className="font-medium">{Number(entry.quantityKg).toFixed(1)} kg</td>
                          <td>{entry.totalCost ? formatXOF(entry.totalCost) : "-"}</td>
                          <td className="text-gray-500 max-w-xs truncate">{entry.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
