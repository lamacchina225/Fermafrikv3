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
  linkedExpenseId: number | null;
  linkedExpenseLabel: string | null;
  linkedExpenseAmount: string | null;
  linkedExpenseCategory: "alimentation" | "sante" | "energie" | "main_oeuvre" | "equipement" | "autre" | null;
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
  { id: "oeufs", title: "Oeufs & Recolte", icon: Egg, color: "yellow" },
  { id: "troupeau", title: "Troupeau & Mortalite", icon: AlertTriangle, color: "red" },
  { id: "alimentation", title: "Alimentation", icon: Package, color: "blue" },
  { id: "depenses", title: "Depenses diverses", icon: DollarSign, color: "green" },
] as const;

const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
  yellow: { bg: "bg-yellow-50", icon: "text-yellow-600", border: "border-yellow-200" },
  red: { bg: "bg-red-50", icon: "text-red-600", border: "border-red-200" },
  blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-200" },
  green: { bg: "bg-green-50", icon: "text-green-600", border: "border-green-200" },
};

const fetcher = (url: string) => fetch(url).then((response) => response.json());

const INFO_KEY = "/api/daily-records?info=true";
const HISTORY_PAGE_SIZE = 30;

export default function SaisiePage() {
  const { data: session, status } = useSession();
  const [openSections, setOpenSections] = useState<string[]>(["oeufs"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_SIZE);
  const [searchFromDate, setSearchFromDate] = useState("");
  const [searchToDate, setSearchToDate] = useState("");
  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");

  const readonly = !canWrite(session?.user?.role);

  const { data: buildingInfo, mutate: mutateBuildingInfo } = useSWR<BuildingInfo>(
    INFO_KEY,
    fetcher,
    { revalidateOnFocus: false }
  );

  const historyKey = useMemo(() => {
    const params = new URLSearchParams({
      activeCycle: "true",
      limit: historyLimit.toString(),
      offset: "0",
    });
    if (appliedFromDate) params.set("fromDate", appliedFromDate);
    if (appliedToDate) params.set("toDate", appliedToDate);
    return `/api/daily-records?${params.toString()}`;
  }, [appliedFromDate, appliedToDate, historyLimit]);

  const { data: historyData } = useSWR<{
    records: RecentRecord[];
    pagination: { total: number; limit: number; offset: number };
  }>(historyKey, fetcher, { revalidateOnFocus: false });

  const historyRecords = [...(historyData?.records ?? [])].sort((a, b) =>
    b.recordDate.localeCompare(a.recordDate)
  );
  const historyTotal = historyData?.pagination.total ?? 0;
  const hasMoreHistory = historyRecords.length < historyTotal;

  const editingRecord = historyRecords.find((record) => record.id === editingRecordId) ?? null;

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
    setOpenSections((previous) =>
      previous.includes(sectionId)
        ? previous.filter((section) => section !== sectionId)
        : [...previous, sectionId]
    );
  };

  const handleEditSetup = (record: RecentRecord) => {
    setEditingRecordId(record.id);
    setValue("recordDate", record.recordDate);
    setValue("eggsCollected", record.eggsCollected);
    setValue("eggsBroken", record.eggsBroken);
    setValue("mortalityCount", record.mortalityCount);
    setValue("mortalityCause", record.mortalityCause ?? "");
    setValue("feedQuantityKg", Number(record.feedQuantityKg ?? 0));
    setValue("feedType", (record.feedType as "demarrage" | "croissance" | "ponte" | undefined) ?? undefined);
    setValue("feedCost", Number(record.feedCost ?? 0));
    setValue("expenseLabel", record.linkedExpenseLabel ?? "");
    setValue("expenseAmount", Number(record.linkedExpenseAmount ?? 0) || 0);
    setValue("expenseCategory", record.linkedExpenseCategory ?? undefined);
    setOpenSections(["oeufs", "troupeau", "alimentation", "depenses"]);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info(`Edition du ${format(new Date(`${record.recordDate}T00:00:00`), "d MMMM yyyy", { locale: fr })}`);
  };

  const currentMortalityValue = Number(watch("mortalityCount") ?? 0);
  const currentLivingHensValue = Number(watch("livingHensCount") ?? 0);
  const currentRecordDate = watch("recordDate");
  const currentFeedType = watch("feedType");
  const currentExpenseCategory = watch("expenseCategory");
  const previousMortality = editingRecord?.mortalityCount ?? 0;

  const duplicateCheckKey = currentRecordDate
    ? `/api/daily-records?activeCycle=true&fromDate=${currentRecordDate}&toDate=${currentRecordDate}&limit=1&offset=0`
    : null;

  const { data: duplicateCheckData } = useSWR<{
    records: RecentRecord[];
    pagination: { total: number; limit: number; offset: number };
  }>(duplicateCheckKey, fetcher, { revalidateOnFocus: false });

  const duplicateRecord =
    duplicateCheckData?.records.find((record) => record.id !== editingRecordId) ?? null;

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

  const refreshHistory = () => {
    mutate(historyKey);
    if (duplicateCheckKey) mutate(duplicateCheckKey);
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/daily-records/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Erreur lors de la suppression");
      toast.success("Saisie supprimee");
      setDeleteConfirmId(null);
      setEditingRecordId((current) => (current === id ? null : current));
      refreshHistory();
      mutateBuildingInfo();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (data: SaisieFormData) => {
    if (readonly) {
      toast.error("Mode demo : lecture seule");
      return;
    }
    if (!buildingInfo) {
      toast.error("Aucun batiment actif trouve");
      return;
    }
    if (!editingRecordId && duplicateRecord) {
      toast.warning("Une saisie existe deja pour cette date. Ouvrez-la en modification.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/daily-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: editingRecordId ?? undefined,
          ...data,
          buildingId: buildingInfo.buildingId,
          cycleId: buildingInfo.cycleId,
          linkedExpense:
            data.expenseLabel && data.expenseAmount && data.expenseAmount > 0
              ? {
                  label: data.expenseLabel,
                  amount: data.expenseAmount,
                  category: data.expenseCategory ?? "autre",
                }
              : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Erreur lors de la sauvegarde");
      }

      const result = await response.json();
      toast.success(result.updated ? "Saisie mise a jour !" : "Saisie enregistree !");

      reset({
        recordDate: format(new Date(), "yyyy-MM-dd"),
        eggsCollected: 0,
        eggsBroken: 0,
        mortalityCount: 0,
        livingHensCount: buildingInfo.effectifVivant,
        feedQuantityKg: 0,
        feedCost: 0,
        feedType: undefined,
        expenseLabel: "",
        expenseAmount: 0,
        expenseCategory: undefined,
      });
      setEditingRecordId(null);
      setOpenSections(["oeufs"]);
      refreshHistory();
      mutateBuildingInfo();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyHistoryFilters = () => {
    setHistoryLimit(HISTORY_PAGE_SIZE);
    setAppliedFromDate(searchFromDate);
    setAppliedToDate(searchToDate);
  };

  const clearHistoryFilters = () => {
    setSearchFromDate("");
    setSearchToDate("");
    setAppliedFromDate("");
    setAppliedToDate("");
    setHistoryLimit(HISTORY_PAGE_SIZE);
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
              Mode demo : consultation uniquement. Aucune modification possible.
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
                  {editingRecord ? "Effectif apres modification" : "Effectif apres cette saisie"}
                </p>
                <p className="mt-1 text-lg font-semibold text-amber-700">
                  {formatNumber(projectedEffectif)}
                </p>
              </div>
            </div>

            {editingRecord && (
              <p className="mt-3 text-xs text-slate-600">
                Modification du {format(new Date(`${editingRecord.recordDate}T00:00:00`), "d MMMM yyyy", { locale: fr })} :
                l&apos;effectif projete tient compte de l&apos;ancienne mortalite deja enregistree.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            {duplicateRecord && !editingRecordId && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Une saisie existe deja pour cette date
                      </p>
                      <p className="mt-1 text-xs text-amber-800">
                        Une seule saisie est autorisee par date. Modifiez la saisie existante pour eviter les doublons.
                      </p>
                    </div>
                  </div>
                  {!readonly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                      onClick={() => handleEditSetup(duplicateRecord)}
                    >
                      Modifier
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

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
                          <Label htmlFor="eggsCollected" required>Oeufs recoltes</Label>
                          <Input
                            id="eggsCollected"
                            type="number"
                            min="0"
                            placeholder="0"
                            {...register("eggsCollected")}
                            error={errors.eggsCollected?.message}
                            disabled={readonly}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="eggsBroken">Oeufs casses</Label>
                          <Input
                            id="eggsBroken"
                            type="number"
                            min="0"
                            placeholder="0"
                            {...register("eggsBroken")}
                            disabled={readonly}
                          />
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
                            <Label htmlFor="mortalityCount">Mortalite du jour</Label>
                            <Input
                              id="mortalityCount"
                              type="number"
                              min="0"
                              placeholder="0"
                              {...register("mortalityCount")}
                              disabled={readonly}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="livingHensCount">Poules vivantes apres saisie</Label>
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
                              Base avant saisie : {formatNumber(effectifAvantSaisie)} poules. La mortalite du jour est recalculee automatiquement.
                            </p>
                          </div>
                        </div>
                        {(watch("mortalityCount") ?? 0) > 0 && (
                          <div className="space-y-1.5">
                            <Label htmlFor="mortalityCause">Cause de la mortalite</Label>
                            <Textarea
                              id="mortalityCause"
                              placeholder="Maladie, accident, cause inconnue..."
                              {...register("mortalityCause")}
                              disabled={readonly}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {section.id === "alimentation" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="feedQuantityKg">Quantite (kg)</Label>
                          <Input
                            id="feedQuantityKg"
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="0"
                            {...register("feedQuantityKg")}
                            disabled={readonly}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Type d&apos;aliment</Label>
                          <Select
                            value={currentFeedType}
                            onValueChange={(value) => setValue("feedType", value as "demarrage" | "croissance" | "ponte")}
                            disabled={readonly}
                          >
                            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="demarrage">Demarrage</SelectItem>
                              <SelectItem value="croissance">Croissance</SelectItem>
                              <SelectItem value="ponte">Ponte</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="feedCost">Cout (XOF)</Label>
                          <Input
                            id="feedCost"
                            type="number"
                            min="0"
                            placeholder="0"
                            {...register("feedCost")}
                            disabled={readonly}
                          />
                        </div>
                      </div>
                    )}

                    {section.id === "depenses" && (
                      <div className="space-y-4">
                        <p className="text-xs text-gray-500">
                          Enregistrez une depense supplementaire pour cette journee (facultatif)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="expenseLabel">Libelle</Label>
                            <Input
                              id="expenseLabel"
                              type="text"
                              placeholder="Ex: Achat medicaments..."
                              {...register("expenseLabel")}
                              disabled={readonly}
                            />
                            <p className="text-xs text-slate-500">
                              Si vous laissez ce champ vide, un libelle automatique sera utilise selon la categorie.
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="expenseAmount">Montant (XOF)</Label>
                            <Input
                              id="expenseAmount"
                              type="number"
                              min="0"
                              placeholder="0"
                              {...register("expenseAmount")}
                              disabled={readonly}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Categorie</Label>
                          <Select
                            value={currentExpenseCategory}
                            onValueChange={(value) => setValue("expenseCategory", value as "alimentation" | "sante" | "energie" | "main_oeuvre" | "equipement" | "autre")}
                            disabled={readonly}
                          >
                            <SelectTrigger><SelectValue placeholder="Choisir une categorie..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="alimentation">Alimentation</SelectItem>
                              <SelectItem value="sante">Sante</SelectItem>
                              <SelectItem value="energie">Energie</SelectItem>
                              <SelectItem value="main_oeuvre">Main d&apos;oeuvre</SelectItem>
                              <SelectItem value="equipement">Equipement</SelectItem>
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

        <div className="mt-8 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="historyFromDate">Du</Label>
              <Input
                id="historyFromDate"
                type="date"
                value={searchFromDate}
                onChange={(event) => setSearchFromDate(event.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="historyToDate">Au</Label>
              <Input
                id="historyToDate"
                type="date"
                value={searchToDate}
                onChange={(event) => setSearchToDate(event.target.value)}
              />
            </div>
            <Button type="button" onClick={applyHistoryFilters} className="sm:w-auto">
              Rechercher
            </Button>
            {(appliedFromDate || appliedToDate || searchFromDate || searchToDate) && (
              <Button type="button" variant="outline" onClick={clearHistoryFilters} className="sm:w-auto">
                Reinitialiser
              </Button>
            )}
          </div>
        </div>

        <RecentRecordsTable
          records={historyRecords}
          total={historyTotal}
          hasMore={hasMoreHistory}
          readonly={readonly}
          deleteConfirmId={deleteConfirmId}
          isDeleting={isDeleting}
          onEdit={handleEditSetup}
          onDeleteRequest={setDeleteConfirmId}
          onDeleteConfirm={handleDelete}
          onDeleteCancel={() => setDeleteConfirmId(null)}
          onLoadMore={() => setHistoryLimit((current) => current + HISTORY_PAGE_SIZE)}
        />
      </div>
    </div>
  );
}
