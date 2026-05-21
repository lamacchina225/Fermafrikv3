"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Heart, Plus, Syringe, Pill } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { formatXOF, formatDateShort, canWrite } from "@/lib/utils";
import type { HealthRecord } from "@/types";

const healthSchema = z.object({
  recordDate: z.string().min(1, "La date est requise"),
  type: z.enum(["vaccination", "medication"]),
  productName: z.string().min(1, "Le produit est requis"),
  dose: z.string().optional(),
  cost: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type HealthFormData = z.infer<typeof healthSchema>;

export default function SantePage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buildingInfo, setBuildingInfo] = useState<{
    buildingId: number;
    cycleId: number;
  } | null>(null);

  const readonly = !canWrite(session?.user?.role);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<HealthFormData>({
    resolver: zodResolver(healthSchema),
    defaultValues: {
      recordDate: format(new Date(), "yyyy-MM-dd"),
      type: "vaccination",
    },
  });

  const selectedType = watch("type");

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setRecords(data.records ?? []);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
    fetch("/api/daily-records?info=true")
      .then((r) => r.json())
      .then((d) => { if (d.buildingId) setBuildingInfo(d); });
  }, [loadRecords]);

  const onSubmit = async (data: HealthFormData) => {
    if (readonly || !buildingInfo) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          buildingId: buildingInfo.buildingId,
          cycleId: buildingInfo.cycleId,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Enregistrement santé sauvegardé !");
      setIsDialogOpen(false);
      reset({ recordDate: format(new Date(), "yyyy-MM-dd"), type: "vaccination" });
      loadRecords();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  };

  const vaccinations = records.filter((r) => r.type === "vaccination");
  const medications = records.filter((r) => r.type === "medication");
  const totalCost = records.reduce((sum, r) => sum + Number(r.cost ?? 0), 0);

  return (
    <div>
      <Header
        title="Santé"
        username={session?.user?.name ?? undefined}
        userRole={session?.user?.role}
      />
      <div className="p-6 space-y-6">
        {/* Résumé */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-blue-500">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Vaccinations</p>
            <p className="text-2xl font-bold text-gray-900">{vaccinations.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-orange-500">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Médicaments</p>
            <p className="text-2xl font-bold text-gray-900">{medications.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-red-500">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Coût total santé</p>
            <p className="text-2xl font-bold text-gray-900">{formatXOF(totalCost)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-800">
            Chaque acte santé avec un coût est automatiquement ajouté aux dépenses dans la catégorie
            {" "}
            <span className="font-semibold">Santé</span>.
          </p>
        </div>

        {/* Historique */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Historique santé</h2>
            {!readonly && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    Nouvel enregistrement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enregistrement santé</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                    <div className="space-y-1.5">
                      <Label required>Date</Label>
                      <Input type="date" {...register("recordDate")} error={errors.recordDate?.message} />
                    </div>
                    <div className="space-y-1.5">
                      <Label required>Type</Label>
                      <Select
                        defaultValue="vaccination"
                        onValueChange={(v) => setValue("type", v as "vaccination" | "medication")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vaccination">Vaccination</SelectItem>
                          <SelectItem value="medication">Médicament</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label required>Produit / Vaccin</Label>
                      <Input
                        type="text"
                        placeholder="Nom du produit"
                        {...register("productName")}
                        error={errors.productName?.message}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Dose</Label>
                        <Input type="text" placeholder="Ex: 0.5ml/poule" {...register("dose")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Coût (XOF)</Label>
                        <Input type="number" min="0" placeholder="0" {...register("cost")} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea placeholder="Observations..." {...register("notes")} />
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
          ) : records.length === 0 ? (
            <div className="p-8 text-center">
              <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucun enregistrement santé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Produit</th>
                    <th>Dose</th>
                    <th>Coût</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{formatDateShort(record.recordDate)}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          {record.type === "vaccination" ? (
                            <Syringe className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Pill className="h-4 w-4 text-orange-500" />
                          )}
                          <Badge variant={record.type === "vaccination" ? "info" : "warning"}>
                            {record.type === "vaccination" ? "Vaccination" : "Médicament"}
                          </Badge>
                        </div>
                      </td>
                      <td className="font-medium">{record.productName}</td>
                      <td className="text-gray-500">{record.dose || "-"}</td>
                      <td>{record.cost ? formatXOF(record.cost) : "-"}</td>
                      <td className="text-gray-500 max-w-xs truncate">{record.notes || "-"}</td>
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
