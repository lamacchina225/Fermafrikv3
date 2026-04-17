"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  Egg, AlertTriangle, Package, DollarSign,
  ChevronDown, ChevronUp, Save, Calendar,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RecentRecordsTable } from "@/components/saisie/RecentRecordsTable";
import {
  buildExpenseLabel,
  calculateMortalityFromLivingHens,
  canWrite,
  formatNumber,
} from "@/lib/utils";

const saisieSchema = z.object({
  recordDate: z.string().min(1, "La date est requise"),
  eggsCollected: z.coerce.number().min(0, "Valeur invalide").default(0),
  eggsBroken: z.coerce.number().min(0, "Valeur invalide").default(0),
  mortalityCount: z.coerce.number().min(0, "Valeur invalide").default(0),
  livingHensCount: z.coerce.number().min(0, "Valeur invalide").default(0),
  mortalityCause: z.string().optional(),
  feedQuantityKg: z.coerce.number().min(0).default(0),
  feedType: z.enum(["demarrage", "croissance", "ponte"]).optional(),
  feedCost: z.coerce.number().min(0).default(0),
  expenseLabel: z.string().optional(),
  expenseAmount: z.coerce.number().min(0).optional(),
  expenseCategory: z
    .enum(["alimentation", "sante", "energie", "main_oeuvre", "equipement", "autre"])
    .optional(),
});

type SaisieFormData = z.infer<typeof saisieSchema>;

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

interface BuildingInfo {
  buildingId: number;
  cycleId: number;
  buildingName: string;
  initialCount: number;
  totalMortality: number;
  effectifVivant: number;
}

const sections = [
  { id: "oeufs", title: "Oeufs & Récolte", icon: Egg, color: "yellow" },
  { id: "troupeau", title: "Troupeau & Mortalité", icon: AlertTriangle, color: "red" },
  { id: "alimentation", title: "Alimentation", icon: Package, color: "blue" },
  { id: "depenses", title: "Dépenses diverses", icon: DollarSign, color: "green" },
] as const;

const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
  yellow: { bg: "bg-yellow-50", icon: "text-yellow-600", border: "border-yellow-200" },
  red: { bg: "bg-red-50", icon: "text-red-600", border: "border-red-200" },
  blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-200" },
  green: { bg: "bg-green-50", icon: "text-green-600", border: "border-green-200" },
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const INFO_KEY = "/api/daily-records?info=true";
const RECENT_KEY = "/api/daily-records?recent=true";

export default function SaisiePage() {
  const { data: session, status } = useSession();
  const [openSections, setOpenSections] = useState<string[]>(["oeufs"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);

  const readonly = !canWrite(session?.user?.role);

  // SWR remplace les useEffect + fetch manuels
  const { data: buildingInfo, mutate: mutateBuildingInfo } = useSWR<BuildingInfo>(
    INFO_KEY,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: recentData } = useSWR<{ records: RecentRecord[] }>(
    RECENT_KEY,
    fetcher,
    { revalidateOnFocus: false }
  );

  const recentRecords = [...(recentData?.records ?? [])].sort((a, b) =>
    b.recordDate.localeCompare(a.recordDate)
  );

  const editingRecord = recentRecords.find((record) => record.id === editingRecordId) ?? null;

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors },
  } = useForm<SaisieFormData>({
    resolver: zodResolver(saisieSchema),
    defaultValues: {
      recordDate: format(new Date(), "yyyy-MM-dd"),
      eggsCollected: 0,
      eggsBroken: 0,
      mortalityCount: 0,
      livingHensCount: 0,
      feedQuantityKg: 0,
      feedCost: 0,
    },
  });

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((s) => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleEditSetup = (rec: RecentRecord) => {
    setEditingRecordId(rec.id);
    setValue("recordDate", rec.recordDate);
    setValue("eggsCollected", rec.eggsCollected);
    setValue("eggsBroken", rec.eggsBroken);
    setValue("mortalityCount", rec.mortalityCount);
    setValue("mortalityCause", rec.mortalityCause ?? "");
    setValue("feedQuantityKg", Number(rec.feedQuantityKg ?? 0));
    setValue("feedCost", Number(rec.feedCost ?? 0));
    setOpenSections(["oeufs", "troupeau", "alimentation"]);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info(`Édition du ${format(new Date(rec.recordDate + "T00:00:00"), "d MMMM yyyy", { locale: fr })}`);
  };

  const currentMortalityValue = Number(watch("mortalityCount") ?? 0);
  const currentLivingHensValue = Number(watch("livingHensCount") ?? 0);
  const previousMortality = editingRecord?.mortalityCount ?? 0;
  const effectifAvantSaisie = useMemo(() => {
    if (!buildingInfo) return 0;
    return Math.max(0, buildingInfo.initialCount - (buildingInfo.totalMortality - previousMortality));
  }, [buildingInfo, previousMortality]);

  const projectedEffectif = useMemo(() => {
    return Math.max(0, effectifAvantSaisie - currentMortalityValue);
  }, [currentMortalityValue, effectifAvantSaisie]);

  useEffect(() => {
    setValue("livingHensCount", projectedEffectif, { shouldDirty: false });
  }, [projectedEffectif, setValue]);

  const handleLivingHensChange = (value: string) => {
    const parsedValue = Number(value);
    const safeValue = Number.isFinite(parsedValue) ? parsedValue : 0;
    const nextMortality = calculateMortalityFromLivingHens(effectifAvantSaisie, safeValue);

    setValue("livingHensCount", Math.max(0, safeValue), { shouldDirty: true });
    setValue("mortalityCount", nextMortality, { shouldDirty: true, shouldValidate: true });
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/daily-records/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      toast.success("Saisie supprimée");
      setDeleteConfirmId(null);
      setEditingRecordId((current) => (current === id ? null : current));
      mutate(RECENT_KEY);
      mutateBuildingInfo();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (data: SaisieFormData) => {
    if (readonly) { toast.error("Mode démo : lecture seule"); return; }
    if (!buildingInfo) { toast.error("Aucun bâtiment actif trouvé"); return; }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/daily-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          buildingId: buildingInfo.buildingId,
          cycleId: buildingInfo.cycleId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Erreur lors de la sauvegarde");
      }

      const result = await response.json();
      toast.success(result.updated ? "Saisie mise à jour !" : "Saisie enregistrée !");

      const expenseAmount = Number(data.expenseAmount ?? 0);
      if (expenseAmount > 0) {
        const expenseResponse = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buildingId: buildingInfo.buildingId,
            cycleId: buildingInfo.cycleId,
            expenseDate: data.recordDate,
            label: buildExpenseLabel(data.expenseLabel, data.expenseCategory),
            amount: expenseAmount,
            category: data.expenseCategory ?? "autre",
          }),
        });

        if (!expenseResponse.ok) {
          const err = await expenseResponse.json().catch(() => null);
          throw new Error(err?.error ?? "Erreur lors de l'enregistrement de la dépense");
        }

        toast.success("Dépense enregistrée !");
      }

      reset({
        recordDate: format(new Date(), "yyyy-MM-dd"),
        eggsCollected: 0, eggsBroken: 0, mortalityCount: 0,
        livingHensCount: buildingInfo.effectifVivant,
        feedQuantityKg: 0, feedCost: 0,
        expenseLabel: "",
        expenseAmount: undefined,
        expenseCategory: undefined,
      });
      setEditingRecordId(null);
      setOpenSections(["oeufs"]);
      mutate(RECENT_KEY);
      mutateBuildingInfo();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Header
        title="Saisie de production"
        username={session?.user?.name ?? undefined}
        userRole={session?.user?.role}
      />
      <div className="p-6 max-w-3xl mx-auto">
        {readonly && status === "authenticated" && (
          <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <p className="text-orange-700 text-sm font-medium">
              Mode démo : consultation uniquement. Aucune modification possible.
            </p>
          </div>
        )}

        {buildingInfo && (
          <div className="mb-4 rounded-xl border border-primary-100 bg-primary-50 p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-700">
                {buildingInfo.buildingName}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-white/80 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Effectif initial</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatNumber(buildingInfo.initialCount)}
                </p>
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Poules vivantes actuellement</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatNumber(buildingInfo.effectifVivant)}
                </p>
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {editingRecord ? "Effectif après modification" : "Effectif après cette saisie"}
                </p>
                <p className="mt-1 text-lg font-semibold text-amber-700">
                  {formatNumber(projectedEffectif)}
                </p>
              </div>
            </div>
            {editingRecord && (
              <p className="mt-3 text-xs text-slate-600">
                Modification du {format(new Date(editingRecord.recordDate + "T00:00:00"), "d MMMM yyyy", { locale: fr })} :
                l&apos;effectif projete tient compte de l&apos;ancienne mortalite deja enregistree.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Date */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="space-y-1.5">
              <Label htmlFor="recordDate" required>Date de saisie</Label>
              <Input
                id="recordDate"
                type="date"
                {...register("recordDate")}
                error={errors.recordDate?.message}
                disabled={readonly}
              />
            </div>
          </div>

          {/* Sections accordéon */}
          {sections.map((section) => {
            const Icon = section.icon;
            const isOpen = openSections.includes(section.id);
            const colors = colorMap[section.color];

            return (
              <div
                key={section.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors ${
                    isOpen ? "border-b border-gray-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors.bg} ${colors.border} border`}>
                      <Icon className={`h-5 w-5 ${colors.icon}`} />
                    </div>
                    <span className="font-semibold text-gray-900">{section.title}</span>
                  </div>
                  {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </button>

                {isOpen && (
                  <div className="p-5 space-y-4">
                    {section.id === "oeufs" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="eggsCollected" required>Oeufs récoltés</Label>
                          <Input id="eggsCollected" type="number" min="0" placeholder="0"
                            {...register("eggsCollected")} error={errors.eggsCollected?.message} disabled={readonly} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="eggsBroken">Oeufs cassés</Label>
                          <Input id="eggsBroken" type="number" min="0" placeholder="0"
                            {...register("eggsBroken")} disabled={readonly} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Plaquettes (auto)</Label>
                          <div className="flex h-10 items-center px-3 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-600">
                            {Math.floor((watch("eggsCollected") || 0) / 30)} plaquettes
                          </div>
                        </div>
                      </div>
                    )}

                    {section.id === "troupeau" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="mortalityCount">Mortalité du jour</Label>
                            <Input id="mortalityCount" type="number" min="0" placeholder="0"
                              {...register("mortalityCount")} disabled={readonly} />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="livingHensCount">Poules vivantes après saisie</Label>
                            <Input
                              id="livingHensCount"
                              type="number"
                              min="0"
                              max={effectifAvantSaisie}
                              placeholder="0"
                              value={currentLivingHensValue}
                              onChange={(event) => handleLivingHensChange(event.target.value)}
                              disabled={readonly || !buildingInfo}
                              className="border-amber-200 bg-amber-50/60 focus:border-amber-500 focus:ring-amber-500/20"
                            />
                            <p className="text-xs text-slate-500">
                              Base avant saisie : {formatNumber(effectifAvantSaisie)} poules. La mortalité du jour est recalculée automatiquement.
                            </p>
                          </div>
                        </div>
                        {(watch("mortalityCount") ?? 0) > 0 && (
                          <div className="space-y-1.5">
                            <Label htmlFor="mortalityCause">Cause de la mortalité</Label>
                            <Textarea id="mortalityCause" placeholder="Maladie, accident, cause inconnue..."
                              {...register("mortalityCause")} disabled={readonly} />
                          </div>
                        )}
                      </div>
                    )}

                    {section.id === "alimentation" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="feedQuantityKg">Quantité (kg)</Label>
                          <Input id="feedQuantityKg" type="number" min="0" step="0.1" placeholder="0"
                            {...register("feedQuantityKg")} disabled={readonly} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Type d&apos;aliment</Label>
                          <Select onValueChange={(v) => setValue("feedType", v as "demarrage" | "croissance" | "ponte")} disabled={readonly}>
                            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="demarrage">Démarrage</SelectItem>
                              <SelectItem value="croissance">Croissance</SelectItem>
                              <SelectItem value="ponte">Ponte</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="feedCost">Coût (XOF)</Label>
                          <Input id="feedCost" type="number" min="0" placeholder="0"
                            {...register("feedCost")} disabled={readonly} />
                        </div>
                      </div>
                    )}

                    {section.id === "depenses" && (
                      <div className="space-y-4">
                        <p className="text-xs text-gray-500">
                          Enregistrez une dépense supplémentaire pour cette journée (facultatif)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="expenseLabel">Libellé</Label>
                          <Input id="expenseLabel" type="text" placeholder="Ex: Achat médicaments..."
                            {...register("expenseLabel")} disabled={readonly} />
                          <p className="text-xs text-slate-500">
                            Si vous laissez ce champ vide, un libellé automatique sera utilisé selon la catégorie.
                          </p>
                        </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="expenseAmount">Montant (XOF)</Label>
                            <Input id="expenseAmount" type="number" min="0" placeholder="0"
                              {...register("expenseAmount")} disabled={readonly} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Catégorie</Label>
                          <Select onValueChange={(v) => setValue("expenseCategory", v as "alimentation" | "sante" | "energie" | "main_oeuvre" | "equipement" | "autre")} disabled={readonly}>
                            <SelectTrigger><SelectValue placeholder="Choisir une catégorie..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="alimentation">Alimentation</SelectItem>
                              <SelectItem value="sante">Santé</SelectItem>
                              <SelectItem value="energie">Énergie</SelectItem>
                              <SelectItem value="main_oeuvre">Main d&apos;oeuvre</SelectItem>
                              <SelectItem value="equipement">Équipement</SelectItem>
                              <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!readonly && (
            <Button type="submit" className="w-full h-12 text-base bg-amber-500 hover:bg-amber-600 text-white" loading={isSubmitting}>
              <Save className="h-5 w-5" />
              Enregistrer la saisie
            </Button>
          )}
        </form>

        <RecentRecordsTable
          records={recentRecords}
          readonly={readonly}
          deleteConfirmId={deleteConfirmId}
          isDeleting={isDeleting}
          onEdit={handleEditSetup}
          onDeleteRequest={setDeleteConfirmId}
          onDeleteConfirm={handleDelete}
          onDeleteCancel={() => setDeleteConfirmId(null)}
        />
      </div>
    </div>
  );
}
