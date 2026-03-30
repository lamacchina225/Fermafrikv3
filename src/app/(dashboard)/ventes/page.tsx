"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useSession } from "next-auth/react";
import { z } from "zod";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  UserPlus,
  X,
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
  clientPhone?: string | null;
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
  addExpense: z.boolean().default(false),
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
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClientSubmitting, setIsClientSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset: resetSaleForm,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      unitPrice: defaultPrice,
      addExpense: false,
    },
  });

  const {
    register: registerClient,
    handleSubmit: handleClientSubmit,
    reset: resetClientForm,
    formState: { errors: clientErrors },
  } = useForm<NewClientFormData>({
    resolver: zodResolver(newClientSchema),
  });

  const loadSales = useCallback(async (date: string) => {
    setIsLoadingSales(true);
    try {
      const [salesRes, expensesRes] = await Promise.all([
        fetch(`/api/sales?date=${date}`),
        fetch(`/api/expenses?date=${date}`),
      ]);
      const salesJson = await salesRes.json();
      const expensesJson = await expensesRes.json();
      setSalesList(salesJson.sales ?? []);
      setLinkedExpenses(expensesJson.expenses ?? []);
    } catch {
      toast.error("Erreur lors du chargement des ventes");
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
      .then((json) => {
        if (json.buildingId) setBuildingInfo(json);
      });
    fetch("/api/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.prix_plaquette) setDefaultPrice(Number(json.prix_plaquette));
      });
  }, [loadClients]);

  useEffect(() => {
    loadSales(selectedDate);
  }, [loadSales, selectedDate]);

  useEffect(() => {
    setValue("unitPrice", defaultPrice);
  }, [defaultPrice, setValue]);

  const traysSold = watch("traysSold") || 0;
  const unitPrice = watch("unitPrice") || defaultPrice;
  const addExpense = watch("addExpense");
  const estimatedTotal = traysSold * unitPrice;

  const filteredClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
          (client.city && client.city.toLowerCase().includes(clientSearch.toLowerCase())) ||
          (client.phone && client.phone.includes(clientSearch))
      ),
    [clientSearch, clients]
  );

  const totalTrays = salesList.reduce((sum, sale) => sum + sale.traysSold, 0);
  const totalSalesAmount = salesList.reduce(
    (sum, sale) => sum + Number(sale.totalAmount),
    0
  );
  const totalExpensesAmount = linkedExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );

  const resetInlineForm = () => {
    setShowSaleForm(false);
    setShowNewClientForm(false);
    setSelectedClient(null);
    setClientSearch("");
    setExpenseOpen(false);
    resetSaleForm({ unitPrice: defaultPrice, addExpense: false });
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
        clientId: formData.clientId ?? null,
        buyerName: formData.buyerName || null,
      };

      if (
        formData.addExpense &&
        formData.expenseType &&
        formData.expenseAmount &&
        formData.expenseAmount > 0
      ) {
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

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Erreur serveur");
      }

      toast.success("Vente enregistree");
      resetInlineForm();
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

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Erreur serveur");
      }

      const { client } = await res.json();
      await loadClients();
      setSelectedClient(client);
      setValue("clientId", client.id);
      setValue("buyerName", client.name);
      setShowNewClientForm(false);
      resetClientForm();
      toast.success("Client cree");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setIsClientSubmitting(false);
    }
  };

  const handleDelete = async (saleId: number) => {
    if (!userIsAdmin || !confirm("Supprimer cette vente ?")) return;
    try {
      const res = await fetch(`/api/sales/${saleId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Erreur serveur");
      }
      toast.success("Vente supprimee");
      await loadSales(selectedDate);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    }
  };

  const dateLabel = format(new Date(`${selectedDate}T00:00:00`), "EEEE d MMMM yyyy", {
    locale: fr,
  });

  return (
    <div>
      <Header
        title="Ventes du jour"
        username={session?.user?.name ?? undefined}
        userRole={session?.user?.role}
      />
      <div className="p-4 md:p-6 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Date de vente</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="text-sm text-slate-500 capitalize">{dateLabel}</div>
          <div className="lg:ml-auto flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDate(format(new Date(), "yyyy-MM-dd"));
              }}
            >
              Aujourd hui
            </Button>
            {!readonly && (
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => {
                  setShowSaleForm((value) => !value);
                  setSelectedClient(null);
                  setClientSearch("");
                  setExpenseOpen(false);
                  resetSaleForm({ unitPrice: defaultPrice, addExpense: false });
                }}
              >
                <Plus className="h-4 w-4" />
                Saisir une vente
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Plaquettes du jour" value={String(totalTrays)} />
          <MetricCard label="Montant vendu" value={formatXOF(totalSalesAmount)} />
          <MetricCard label="Depenses liees" value={formatXOF(totalExpensesAmount)} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Saisie des ventes de la journee</h2>
            <p className="text-xs text-slate-400 mt-1">
              Prix par defaut : {formatXOF(defaultPrice)} par plaquette. Vous pouvez creer
              un client et ajouter un cout de transport ou de plaquettes.
            </p>
          </div>

          {showSaleForm && !readonly && (
            <div className="border-b border-amber-100 bg-amber-50/40 p-5">
              <form onSubmit={handleSubmit(onSubmitSale)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label required>Prix par plaquette (XOF)</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder={String(defaultPrice)}
                      {...register("unitPrice")}
                      error={errors.unitPrice?.message}
                    />
                  </div>
                </div>

                {estimatedTotal > 0 && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="font-semibold text-emerald-800">
                        {formatXOF(estimatedTotal)}
                      </p>
                      <p className="text-xs text-emerald-600">
                        {traysSold} plaquettes pour {traysSold * 30} oeufs
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Client</Label>
                    <button
                      type="button"
                      onClick={() => setShowNewClientForm((value) => !value)}
                      className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Nouveau client
                    </button>
                  </div>

                  {showNewClientForm && (
                    <div className="border border-amber-200 rounded-xl bg-amber-50 p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label required>Nom</Label>
                          <Input {...registerClient("name")} error={clientErrors.name?.message} />
                        </div>
                        <div className="space-y-1">
                          <Label>Ville</Label>
                          <Input {...registerClient("city")} />
                        </div>
                        <div className="space-y-1">
                          <Label>Telephone</Label>
                          <Input {...registerClient("phone")} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowNewClientForm(false)}>
                          Annuler
                        </Button>
                        <Button
                          type="button"
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                          loading={isClientSubmitting}
                          onClick={handleClientSubmit(onCreateClient)}
                        >
                          Creer le client
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedClient ? (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{selectedClient.name}</p>
                        {selectedClient.city && (
                          <p className="text-xs text-slate-500">{selectedClient.city}</p>
                        )}
                        {selectedClient.phone && (
                          <a
                            href={`tel:${selectedClient.phone}`}
                            className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs font-medium"
                          >
                            <Phone className="h-3 w-3" />
                            {selectedClient.phone}
                          </a>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClient(null);
                          setValue("clientId", undefined);
                          setValue("buyerName", "");
                        }}
                      >
                        <X className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="text"
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          placeholder="Rechercher un client..."
                          className="pl-9"
                        />
                      </div>

                      {clientSearch ? (
                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                          {filteredClients.length === 0 ? (
                            <p className="p-3 text-sm text-slate-400 text-center">
                              Aucun client trouve
                            </p>
                          ) : (
                            filteredClients.map((client) => (
                              <button
                                key={client.id}
                                type="button"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setValue("clientId", client.id);
                                  setValue("buyerName", client.name);
                                  setClientSearch("");
                                }}
                                className="w-full p-3 text-left hover:bg-slate-50"
                              >
                                <p className="font-medium text-slate-900 text-sm">{client.name}</p>
                                <p className="text-xs text-slate-400">
                                  {[client.city, client.phone].filter(Boolean).join(" | ")}
                                </p>
                              </button>
                            ))
                          )}
                        </div>
                      ) : (
                        <Input
                          type="text"
                          placeholder="Ou saisir un nom libre..."
                          {...register("buyerName")}
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpenseOpen((value) => !value)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-sm font-medium text-slate-700"
                  >
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-slate-500" />
                      Ajouter une depense liee a cette vente
                    </span>
                    {expenseOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  {expenseOpen && (
                    <div className="p-4 space-y-3 bg-white">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" {...register("addExpense")} />
                        Enregistrer transport, plaquettes ou autre cout
                      </label>
                      {addExpense && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label required>Type</Label>
                            <select
                              {...register("expenseType")}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                            >
                              <option value="">Choisir...</option>
                              <option value="transport">Transport</option>
                              <option value="plateaux">Plaquettes</option>
                              <option value="autre">Autre</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label required>Montant</Label>
                            <Input type="number" min="1" {...register("expenseAmount")} />
                          </div>
                          <div className="space-y-1">
                            <Label>Note</Label>
                            <Input type="text" {...register("expenseNote")} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={resetInlineForm}>
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

          {isLoadingSales ? (
            <div className="p-8 text-center text-slate-400">Chargement...</div>
          ) : salesList.length === 0 ? (
            <div className="py-14 text-center">
              <ShoppingCart className="h-11 w-11 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Aucune vente pour cette journee</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {salesList.map((sale) => {
                const clientName = sale.clientName || sale.buyerName;
                return (
                  <div key={sale.id} className="px-5 py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-slate-900">
                          {sale.traysSold} plaquette{sale.traysSold > 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatXOF(Number(sale.unitPrice))}/plq
                        </span>
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                          {formatXOF(Number(sale.totalAmount))}
                        </span>
                      </div>
                      {clientName && (
                        <p className="text-sm text-slate-500 mt-1">
                          {clientName}
                          {sale.clientCity ? ` | ${sale.clientCity}` : ""}
                        </p>
                      )}
                    </div>
                    {userIsAdmin && (
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        title="Supprimer cette vente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Depenses rattachees a la journee</h3>
          </div>
          {linkedExpenses.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">Aucune depense enregistree pour cette date.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {linkedExpenses.map((expense) => (
                <div key={expense.id} className="px-5 py-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{expense.label}</p>
                    <p className="text-xs text-slate-400">{expense.category}</p>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {formatXOF(Number(expense.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
