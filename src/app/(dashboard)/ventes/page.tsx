"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useSession } from "next-auth/react";
import { z } from "zod";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Phone,
  Plus,
  ShoppingCart,
  Trash2,
  UserPlus,
  X,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canWrite, formatXOF, isAdmin } from "@/lib/utils";

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

interface ExpenseRow {
  id: number;
  label: string;
  amount: string | number;
  category: string;
}

interface BuildingInfo {
  buildingId: number;
  cycleId: number;
}

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

export default function VentesPage() {
  const { data: session } = useSession();
  const readonly = !canWrite(session?.user?.role);
  const userIsAdmin = isAdmin(session?.user?.role);

  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [salesList, setSalesList] = useState<SaleRow[]>([]);
  const [linkedExpenses, setLinkedExpenses] = useState<ExpenseRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfo | null>(null);
  const [defaultPrice, setDefaultPrice] = useState(7000);
  const [showForm, setShowForm] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [withExpense, setWithExpense] = useState(false);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClientSubmitting, setIsClientSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset: resetSaleForm,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: { unitPrice: defaultPrice, withExpense: false },
  });

  const {
    register: registerClient,
    handleSubmit: handleClientSubmit,
    reset: resetClientForm,
    formState: { errors: clientErrors },
  } = useForm<NewClientFormData>({ resolver: zodResolver(newClientSchema) });

  const loadSales = useCallback(async (date: string) => {
    setIsLoadingSales(true);
    try {
      const [salesRes, expensesRes] = await Promise.all([
        fetch(`/api/sales?date=${date}`),
        fetch(`/api/expenses?date=${date}`),
      ]);
      const [salesJson, expensesJson] = await Promise.all([salesRes.json(), expensesRes.json()]);
      setSalesList(salesJson.sales ?? []);
      setLinkedExpenses(expensesJson.expenses ?? []);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setIsLoadingSales(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    const res = await fetch("/api/clients");
    const json = await res.json();
    setClients(json.clients ?? []);
  }, []);

  useEffect(() => {
    loadClients();
    fetch("/api/daily-records?info=true")
      .then((r) => r.json())
      .then((json) => { if (json.buildingId) setBuildingInfo(json); });
    fetch("/api/settings")
      .then((r) => r.json())
      .then((json) => { if (json.prix_plaquette) setDefaultPrice(Number(json.prix_plaquette)); });
  }, [loadClients]);

  useEffect(() => { loadSales(selectedDate); }, [loadSales, selectedDate]);
  useEffect(() => { setValue("unitPrice", defaultPrice); }, [defaultPrice, setValue]);

  const traysSold = watch("traysSold") || 0;
  const unitPrice = watch("unitPrice") || defaultPrice;
  const estimatedTotal = traysSold * unitPrice;

  const totalTrays = salesList.reduce((s, v) => s + v.traysSold, 0);
  const totalSalesAmount = salesList.reduce((s, v) => s + Number(v.totalAmount), 0);
  const totalExpensesAmount = linkedExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const netAmount = totalSalesAmount - totalExpensesAmount;

  const navigate = (dir: 1 | -1) => {
    const d = new Date(`${selectedDate}T00:00:00`);
    setSelectedDate(format(dir === 1 ? addDays(d, 1) : subDays(d, 1), "yyyy-MM-dd"));
  };

  const resetForm = () => {
    setShowForm(false);
    setShowNewClientForm(false);
    setSelectedClient(null);
    setWithExpense(false);
    resetSaleForm({ unitPrice: defaultPrice, withExpense: false });
  };

  const openForm = () => {
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const onSubmitSale = async (formData: SaleFormData) => {
    if (readonly || !buildingInfo) return;
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
        body.linkedExpense = {
          type: formData.expenseType,
          amount: formData.expenseAmount,
          note: formData.expenseNote || undefined,
        };
      }
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur serveur");
      toast.success("Vente enregistrée");
      resetForm();
      await loadSales(selectedDate);
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
      await loadClients();
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

  const handleDelete = async (saleId: number) => {
    try {
      const res = await fetch(`/api/sales/${saleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur serveur");
      toast.success("Vente supprimée");
      setDeleteConfirmId(null);
      await loadSales(selectedDate);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    }
  };

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
  const dateLabel = format(new Date(`${selectedDate}T00:00:00`), "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div>
      <Header
        title="Ventes"
        username={session?.user?.name ?? undefined}
        userRole={session?.user?.role}
      />
      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">

        {/* Navigation date */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-slate-900 capitalize">{dateLabel}</p>
          </div>
          <button
            onClick={() => navigate(1)}
            disabled={isToday}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {!isToday && (
            <button
              onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
              className="text-xs font-medium text-amber-600 hover:underline whitespace-nowrap"
            >
              Aujourd'hui
            </button>
          )}
        </div>

        {/* Métriques */}
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
            <p className={`text-xl font-bold ${netAmount >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatXOF(netAmount)}</p>
          </div>
        </div>

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
                      <button
                        type="button"
                        onClick={() => setShowNewClientForm((v) => !v)}
                        className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Nouveau client
                      </button>
                    </div>

                    {/* Formulaire nouveau client */}
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
                          <Button
                            type="button"
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                            loading={isClientSubmitting}
                            onClick={handleClientSubmit(onCreateClient)}
                          >
                            Créer
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Sélection client */}
                    {selectedClient ? (
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{selectedClient.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {selectedClient.city && (
                              <p className="text-xs text-slate-500">{selectedClient.city}</p>
                            )}
                            {selectedClient.phone && (
                              <a
                                href={`tel:${selectedClient.phone}`}
                                className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium"
                              >
                                <Phone className="h-3 w-3" />
                                {selectedClient.phone}
                              </a>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedClient(null); setValue("clientId", undefined); }}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <select
                        onChange={(e) => {
                          const id = parseInt(e.target.value);
                          if (!isNaN(id)) {
                            const c = clients.find((cl) => cl.id === id) ?? null;
                            setSelectedClient(c);
                            setValue("clientId", id);
                          }
                        }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        defaultValue=""
                      >
                        <option value="">— Choisir un client —</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.city ? ` | ${c.city}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Quantité + prix */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label required>Plaquettes vendues</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="0"
                        {...register("traysSold")}
                        error={errors.traysSold?.message}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label required>Prix / plaquette (XOF)</Label>
                      <Input
                        type="number"
                        min="1"
                        {...register("unitPrice")}
                        error={errors.unitPrice?.message}
                      />
                    </div>
                  </div>

                  {/* Total estimé */}
                  {estimatedTotal > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-800 text-lg">{formatXOF(estimatedTotal)}</p>
                        <p className="text-xs text-emerald-600">{traysSold} plaquettes · {traysSold * 30} œufs</p>
                      </div>
                    </div>
                  )}

                  {/* Dépense liée */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <label className="flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={withExpense}
                        onChange={(e) => setWithExpense(e.target.checked)}
                        className="rounded"
                      />
                      <Package className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">Ajouter une dépense liée (transport, plaquettes…)</span>
                    </label>
                    {withExpense && (
                      <div className="p-4 space-y-3 bg-white border-t border-slate-100">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label required>Type</Label>
                            <select
                              {...register("expenseType")}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                            >
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

                  {/* Boutons */}
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                      loading={isSubmitting}
                    >
                      Enregistrer
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Liste des ventes */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Ventes du jour</h2>
            {totalTrays > 0 && (
              <span className="text-xs text-slate-400">{salesList.length} vente{salesList.length > 1 ? "s" : ""}</span>
            )}
          </div>

          {isLoadingSales ? (
            <div className="p-8 text-center text-slate-400 text-sm">Chargement…</div>
          ) : salesList.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Aucune vente pour cette journée</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {salesList.map((sale) => {
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
                    {userIsAdmin && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {deleteConfirmId === sale.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(sale.id)}
                              className="text-xs text-red-600 font-semibold hover:underline"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-xs text-slate-400 hover:underline ml-2"
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(sale.id)}
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

        {/* Dépenses liées */}
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
