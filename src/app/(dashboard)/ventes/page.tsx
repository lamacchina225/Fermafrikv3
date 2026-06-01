"use client";

import { useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { AlertTriangle, Package, Plus, ShoppingCart, UserPlus, X, CheckCircle2, Phone } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateNavigator } from "@/components/ventes/DateNavigator";
import { SalesMetrics } from "@/components/ventes/SalesMetrics";
import { SalesList, type SaleEditValues } from "@/components/ventes/SalesList";
import { canWrite, formatXOF, isAdmin, EGGS_PER_TRAY } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Client { id: number; name: string; city?: string | null; phone?: string | null; }
interface SaleRow {
  id: number; saleDate: string; traysSold: number;
  unitPrice: string | number; totalAmount: string | number;
  buyerName?: string | null; clientId?: number | null;
  clientName?: string | null; clientCity?: string | null;
}
interface ExpenseRow { id: number; label: string; amount: string | number; category: string; }
interface BuildingInfo { buildingId: number; cycleId: number; }

// ─── Schemas ─────────────────────────────────────────────────────────────────

const saleFormSchema = z.object({
  traysSold: z.coerce.number().min(1, "Minimum 1 plaquette"),
  unitPrice: z.coerce.number().min(1, "Prix invalide"),
  clientId: z.coerce.number().optional().nullable(),
  buyerName: z.string().optional(),
  withExpense: z.boolean().default(false),
  expenseType: z.enum(["transport", "plateaux", "autre"]).optional(),
  expenseAmount: z.coerce.number().optional(),
  expenseNote: z.string().optional(),
});

const newClientSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  city: z.string().optional(),
  phone: z.string().optional(),
});

type SaleFormData = z.infer<typeof saleFormSchema>;
type NewClientFormData = z.infer<typeof newClientSchema>;

// ─── SWR fetcher ─────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Page ────────────────────────────────────────────────────────────────────

export default function VentesPage() {
  const { data: session } = useSession();
  const readonly = !canWrite(session?.user?.role);
  const userIsAdmin = isAdmin(session?.user?.role);

  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showForm, setShowForm] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [withExpense, setWithExpense] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClientSubmitting, setIsClientSubmitting] = useState(false);
  const [isUpdatingSale, setIsUpdatingSale] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<SaleEditValues>({
    saleDate: selectedDate,
    traysSold: "",
    unitPrice: "",
    clientId: "",
    buyerName: "",
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // ─── SWR data fetching ───────────────────────────────────────────────────

  const { data: buildingInfo } = useSWR<BuildingInfo>(
    "/api/daily-records?info=true", fetcher, { revalidateOnFocus: false }
  );

  const { data: settingsData } = useSWR<Record<string, string>>(
    "/api/settings", fetcher, { revalidateOnFocus: false }
  );
  const defaultPrice = Number(settingsData?.prix_plaquette ?? 7000);

  const { data: clientsData, mutate: mutateClients } = useSWR<{ clients: Client[] }>(
    "/api/clients", fetcher, { revalidateOnFocus: false }
  );
  const clients = clientsData?.clients ?? [];

  const salesKey = `/api/sales?date=${selectedDate}`;
  const recentSalesKey = "/api/sales?limit=50";
  const expensesKey = `/api/expenses?date=${selectedDate}`;

  const { data: salesData, isLoading: isLoadingSales } = useSWR<{ sales: SaleRow[] }>(
    salesKey, fetcher
  );
  const { data: recentSalesData, isLoading: isLoadingRecentSales } = useSWR<{ sales: SaleRow[] }>(
    recentSalesKey, fetcher
  );
  const { data: expensesData } = useSWR<{ expenses: ExpenseRow[] }>(expensesKey, fetcher);

  const salesList = salesData?.sales ?? [];
  const recentSalesList = (recentSalesData?.sales ?? []).filter((sale) => sale.saleDate !== selectedDate);
  const linkedExpenses = expensesData?.expenses ?? [];

  // ─── Computed ────────────────────────────────────────────────────────────

  const totalTrays = salesList.reduce((s, v) => s + v.traysSold, 0);
  const totalSalesAmount = salesList.reduce((s, v) => s + Number(v.totalAmount), 0);
  const totalExpensesAmount = linkedExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const netAmount = totalSalesAmount - totalExpensesAmount;
  const existingSaleForDate = salesList[0] ?? null;

  // ─── Forms ───────────────────────────────────────────────────────────────

  const { register, handleSubmit, reset: resetSaleForm, setValue, watch, formState: { errors } } =
    useForm<SaleFormData>({
      resolver: zodResolver(saleFormSchema),
      defaultValues: { unitPrice: defaultPrice, withExpense: false },
    });

  const { register: registerClient, handleSubmit: handleClientSubmit, reset: resetClientForm, formState: { errors: clientErrors } } =
    useForm<NewClientFormData>({ resolver: zodResolver(newClientSchema) });

  const traysSold = watch("traysSold") || 0;
  const unitPrice = watch("unitPrice") || defaultPrice;
  const estimatedTotal = traysSold * unitPrice;

  const describeSale = (sale: SaleRow) => {
    const buyer = sale.clientName || sale.buyerName || "client non renseigne";
    return `Il y a deja une vente de ${sale.traysSold} plaquette${sale.traysSold > 1 ? "s" : ""} à ${buyer} le ${sale.saleDate}.`;
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const resetForm = () => {
    setShowForm(false);
    setShowNewClientForm(false);
    setSelectedClient(null);
    setWithExpense(false);
    resetSaleForm({ unitPrice: defaultPrice, withExpense: false });
  };

  const openForm = () => {
    if (existingSaleForDate) {
      toast.warning(`${describeSale(existingSaleForDate)} Modifiez la vente existante.`);
      handleEditStart(existingSaleForDate);
      return;
    }
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const revalidateSalesDependents = (dates: string[]) => {
    for (const date of dates) {
      mutate(`/api/sales?date=${date}`);
    }
    mutate((key) => {
      if (typeof key !== "string") return false;
      return (
        key.startsWith("/api/sales") ||
        key.startsWith("/api/stocks") ||
        key.startsWith("/api/daily-records")
      );
    });
  };

  const onSubmitSale = async (formData: SaleFormData) => {
    if (readonly || !buildingInfo) return;
    if (existingSaleForDate) {
      toast.warning(`${describeSale(existingSaleForDate)} Modifiez la vente existante.`);
      handleEditStart(existingSaleForDate);
      return;
    }
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        buildingId: buildingInfo.buildingId,
        cycleId: buildingInfo.cycleId,
        saleDate: selectedDate,
        traysSold: formData.traysSold,
        unitPrice: formData.unitPrice,
        clientId: selectedClient?.id ?? null,
        buyerName: selectedClient?.name ?? formData.buyerName ?? null,
      };
      if (withExpense && formData.expenseType && formData.expenseAmount && formData.expenseAmount > 0) {
        body.linkedExpense = { type: formData.expenseType, amount: formData.expenseAmount, note: formData.expenseNote || undefined };
      }
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur serveur");
      toast.success("Vente enregistrée");
      resetForm();
      revalidateSalesDependents([selectedDate]);
      mutate(expensesKey);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCreateClient = async (formData: NewClientFormData) => {
    if (readonly) return;
    setIsClientSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur serveur");
      const { client } = await res.json();
      mutateClients();
      setSelectedClient(client);
      setValue("clientId", client.id);
      setShowNewClientForm(false);
      resetClientForm();
      toast.success("Client créé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setIsClientSubmitting(false);
    }
  };

  const handleEditStart = (sale: SaleRow) => {
    setDeleteConfirmId(null);
    setEditingSaleId(sale.id);
    setEditValues({
      saleDate: sale.saleDate,
      traysSold: String(sale.traysSold),
      unitPrice: String(Number(sale.unitPrice)),
      clientId: sale.clientId ? String(sale.clientId) : "",
      buyerName: sale.clientId ? "" : sale.buyerName ?? "",
    });
  };

  const handleEditChange = (field: keyof SaleEditValues, value: string) => {
    setEditValues((current) => ({
      ...current,
      [field]: value,
      ...(field === "clientId" && value ? { buyerName: "" } : {}),
    }));
  };

  const handleEditCancel = () => {
    setEditingSaleId(null);
    setEditValues({
      saleDate: selectedDate,
      traysSold: "",
      unitPrice: "",
      clientId: "",
      buyerName: "",
    });
  };

  const handleEditSubmit = async (saleId: number) => {
    if (readonly) return;

    const editTraysSold = Number(editValues.traysSold);
    const editUnitPrice = Number(editValues.unitPrice);
    if (!editValues.saleDate || editTraysSold < 1 || editUnitPrice < 1) {
      toast.error("Date, quantite et prix sont obligatoires");
      return;
    }

    setIsUpdatingSale(true);
    try {
      const previousSale = [...salesList, ...recentSalesList].find((sale) => sale.id === saleId);
      const previousDate = previousSale?.saleDate ?? selectedDate;
      const res = await fetch(`/api/sales/${saleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleDate: editValues.saleDate,
          traysSold: editTraysSold,
          unitPrice: editUnitPrice,
          clientId: editValues.clientId ? Number(editValues.clientId) : null,
          buyerName: editValues.clientId ? null : editValues.buyerName || null,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        if (res.status === 409 && error.existingSale) {
          toast.warning(`${describeSale(error.existingSale)} Modifiez la vente existante.`);
          handleEditStart(error.existingSale);
          return;
        }
        throw new Error(error.error ?? "Erreur serveur");
      }

      const { sale } = await res.json();
      toast.success("Vente modifiee");
      setEditingSaleId(null);
      revalidateSalesDependents([previousDate, sale.saleDate]);
      mutate(expensesKey);
      if (sale.saleDate !== selectedDate) {
        setSelectedDate(sale.saleDate);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setIsUpdatingSale(false);
    }
  };

  const handleDelete = async (saleId: number) => {
    try {
      const res = await fetch(`/api/sales/${saleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur serveur");
      toast.success("Vente supprimée");
      setDeleteConfirmId(null);
      revalidateSalesDependents([selectedDate]);
      mutate(expensesKey);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      <Header title="Ventes" username={session?.user?.name ?? undefined} userRole={session?.user?.role} />
      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">

        <DateNavigator selectedDate={selectedDate} onChange={setSelectedDate} />

        <SalesMetrics totalTrays={totalTrays} totalSalesAmount={totalSalesAmount} netAmount={netAmount} />

        {existingSaleForDate && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Une vente existe deja pour cette date
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    {describeSale(existingSaleForDate)} Une seule vente est autorisee par date.
                  </p>
                </div>
              </div>
              {!readonly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                  onClick={() => handleEditStart(existingSaleForDate)}
                >
                  Modifier
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Formulaire nouvelle vente */}
        {!readonly && (
          <div ref={formRef}>
            {!showForm ? (
              <button
                onClick={openForm}
                className="w-full flex items-center justify-center gap-2 p-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-semibold text-sm shadow-sm transition-colors"
              >
                <Plus className="h-5 w-5" />
                Nouvelle vente
              </button>
            ) : (
              <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 bg-amber-50/50">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-amber-600" />
                    <h2 className="font-semibold text-slate-900">Nouvelle vente</h2>
                  </div>
                  <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmitSale)} className="p-5 space-y-5">
                  {/* Client */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Client</Label>
                      <button type="button" onClick={() => setShowNewClientForm((v) => !v)}
                        className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700">
                        <UserPlus className="h-3.5 w-3.5" />
                        Nouveau client
                      </button>
                    </div>

                    {showNewClientForm && (
                      <div className="border border-amber-200 rounded-xl bg-amber-50/60 p-4 space-y-3">
                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Créer un client</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label required>Nom</Label>
                            <Input {...registerClient("name")} placeholder="Ex: Amadou Diallo" error={clientErrors.name?.message} />
                          </div>
                          <div className="space-y-1">
                            <Label>Ville</Label>
                            <Input {...registerClient("city")} placeholder="Ex: Dakar" />
                          </div>
                          <div className="space-y-1">
                            <Label>Téléphone</Label>
                            <Input {...registerClient("phone")} placeholder="Ex: 77 000 00 00" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => { setShowNewClientForm(false); resetClientForm(); }}>
                            Annuler
                          </Button>
                          <Button type="button" size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"
                            loading={isClientSubmitting} onClick={handleClientSubmit(onCreateClient)}>
                            Créer
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedClient ? (
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{selectedClient.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {selectedClient.city && <p className="text-xs text-slate-500">{selectedClient.city}</p>}
                            {selectedClient.phone && (
                              <a href={`tel:${selectedClient.phone}`} className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                                <Phone className="h-3 w-3" />{selectedClient.phone}
                              </a>
                            )}
                          </div>
                        </div>
                        <button type="button" onClick={() => { setSelectedClient(null); setValue("clientId", undefined); }}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <select
                        onChange={(e) => {
                          const id = parseInt(e.target.value, 10);
                          if (!isNaN(id)) {
                            setSelectedClient(clients.find((cl) => cl.id === id) ?? null);
                            setValue("clientId", id);
                          }
                        }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        defaultValue=""
                      >
                        <option value="">— Choisir un client —</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}{c.city ? ` | ${c.city}` : ""}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Quantité + prix */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label required>Plaquettes vendues</Label>
                      <Input type="number" min="1" placeholder="0" {...register("traysSold")} error={errors.traysSold?.message} />
                    </div>
                    <div className="space-y-1.5">
                      <Label required>Prix / plaquette (XOF)</Label>
                      <Input type="number" min="1" {...register("unitPrice")} error={errors.unitPrice?.message} />
                    </div>
                  </div>

                  {estimatedTotal > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-800 text-lg">{formatXOF(estimatedTotal)}</p>
                        <p className="text-xs text-emerald-600">{traysSold} plaquettes · {traysSold * EGGS_PER_TRAY} œufs</p>
                      </div>
                    </div>
                  )}

                  {/* Dépense liée */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <label className="flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                      <input type="checkbox" checked={withExpense} onChange={(e) => setWithExpense(e.target.checked)} className="rounded" />
                      <Package className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">Ajouter une dépense liée (transport, plaquettes…)</span>
                    </label>
                    {withExpense && (
                      <div className="p-4 space-y-3 bg-white border-t border-slate-100">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label required>Type</Label>
                            <select {...register("expenseType")} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                              <option value="">Choisir…</option>
                              <option value="transport">Transport</option>
                              <option value="plateaux">Plaquettes</option>
                              <option value="autre">Autre</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label required>Montant (XOF)</Label>
                            <Input type="number" min="1" placeholder="0" {...register("expenseAmount")} />
                          </div>
                          <div className="space-y-1">
                            <Label>Note</Label>
                            <Input type="text" placeholder="Optionnel" {...register("expenseNote")} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>Annuler</Button>
                    <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" loading={isSubmitting}>
                      Enregistrer
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        <SalesList
          title="Ventes du jour"
          emptyMessage="Aucune vente pour cette journee"
          sales={salesList}
          isLoading={isLoadingSales}
          canEdit={!readonly}
          isAdmin={userIsAdmin}
          clients={clients}
          editingSaleId={editingSaleId}
          editValues={editValues}
          isUpdating={isUpdatingSale}
          deleteConfirmId={deleteConfirmId}
          onEditStart={handleEditStart}
          onEditChange={handleEditChange}
          onEditSubmit={handleEditSubmit}
          onEditCancel={handleEditCancel}
          onDeleteRequest={setDeleteConfirmId}
          onDeleteConfirm={handleDelete}
          onDeleteCancel={() => setDeleteConfirmId(null)}
        />

        <SalesList
          title="Historique des ventes"
          emptyMessage="Aucune vente enregistree"
          showDate
          sales={recentSalesList}
          isLoading={isLoadingRecentSales}
          canEdit={!readonly}
          isAdmin={userIsAdmin}
          clients={clients}
          editingSaleId={editingSaleId}
          editValues={editValues}
          isUpdating={isUpdatingSale}
          deleteConfirmId={deleteConfirmId}
          onEditStart={handleEditStart}
          onEditChange={handleEditChange}
          onEditSubmit={handleEditSubmit}
          onEditCancel={handleEditCancel}
          onDeleteRequest={setDeleteConfirmId}
          onDeleteConfirm={handleDelete}
          onDeleteCancel={() => setDeleteConfirmId(null)}
        />

        {linkedExpenses.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Dépenses liées</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {linkedExpenses.map((expense) => (
                <div key={expense.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{expense.label}</p>
                    <p className="text-xs text-slate-400 capitalize">{expense.category}</p>
                  </div>
                  <p className="font-semibold text-slate-700 text-sm">{formatXOF(Number(expense.amount))}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
