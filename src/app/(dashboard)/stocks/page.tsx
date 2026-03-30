"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import {
  MapPin,
  Phone,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canWrite } from "@/lib/utils";

interface Client {
  id: number;
  name: string;
  city?: string | null;
  phone?: string | null;
}

const clientSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  city: z.string().optional(),
  phone: z.string().optional(),
});
type ClientFormData = z.infer<typeof clientSchema>;

export default function ClientsPage() {
  const { data: session } = useSession();
  const readonly = !canWrite(session?.user?.role);

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<ClientFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({ resolver: zodResolver(clientSchema) });

  const loadClients = useCallback(async () => {
    const res = await fetch("/api/clients");
    const json = await res.json();
    setClients(json.clients ?? []);
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.city ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q)
    );
  });

  const onCreateClient = async (data: ClientFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      toast.success("Client créé");
      reset();
      setShowNewForm(false);
      await loadClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onUpdateClient = async (id: number) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      toast.success("Client mis à jour");
      setEditingId(null);
      await loadClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDeleteClient = async (id: number) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      toast.success("Client supprimé");
      setDeleteConfirmId(null);
      await loadClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const startEdit = (c: Client) => {
    setEditingId(c.id);
    setEditData({ name: c.name, city: c.city ?? "", phone: c.phone ?? "" });
  };

  return (
    <div>
      <Header
        title="Clients"
        username={session?.user?.name ?? undefined}
        userRole={session?.user?.role}
      />
      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">

        {/* Stats + actions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{clients.length}</p>
              <p className="text-xs text-slate-400">client{clients.length !== 1 ? "s" : ""} enregistré{clients.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          {!readonly && (
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => { setShowNewForm((v) => !v); setEditingId(null); }}
            >
              <Plus className="h-4 w-4" />
              Nouveau client
            </Button>
          )}
        </div>

        {/* Formulaire nouveau client */}
        {showNewForm && !readonly && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Nouveau client</h3>
              <button onClick={() => { setShowNewForm(false); reset(); }} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onCreateClient)} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label required>Nom</Label>
                  <Input {...register("name")} placeholder="Ex: Amadou Diallo" error={errors.name?.message} />
                </div>
                <div className="space-y-1">
                  <Label>Ville</Label>
                  <Input {...register("city")} placeholder="Ex: Dakar" />
                </div>
                <div className="space-y-1">
                  <Label>Téléphone</Label>
                  <Input {...register("phone")} placeholder="Ex: 77 000 00 00" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowNewForm(false); reset(); }}>Annuler</Button>
                <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" loading={isSubmitting}>
                  Créer
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, ville ou téléphone…"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Liste des clients */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {filteredClients.length === 0 ? (
            <div className="py-14 text-center">
              <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                {search ? "Aucun client ne correspond à la recherche" : "Aucun client enregistré"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <div key={client.id} className="px-5 py-4">
                  {editingId === client.id ? (
                    /* Mode édition */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label required>Nom</Label>
                          <input
                            value={editData.name ?? ""}
                            onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Ville</Label>
                          <input
                            value={editData.city ?? ""}
                            onChange={(e) => setEditData((d) => ({ ...d, city: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Téléphone</Label>
                          <input
                            value={editData.phone ?? ""}
                            onChange={(e) => setEditData((d) => ({ ...d, phone: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>Annuler</Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                          loading={isSubmitting}
                          onClick={() => onUpdateClient(client.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Sauvegarder
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Mode affichage */
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 font-bold text-slate-600 text-sm">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{client.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {client.city && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <MapPin className="h-3 w-3" />
                              {client.city}
                            </span>
                          )}
                          {client.phone && (
                            <a
                              href={`tel:${client.phone}`}
                              className="flex items-center gap-1 text-xs text-amber-600 hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {client.phone}
                            </a>
                          )}
                        </div>
                      </div>
                      {!readonly && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEdit(client)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {deleteConfirmId === client.id ? (
                            <span className="flex items-center gap-1">
                              <button
                                onClick={() => onDeleteClient(client.id)}
                                className="text-xs text-red-600 font-semibold hover:underline px-1"
                              >
                                Confirmer
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-xs text-slate-400 hover:underline px-1"
                              >
                                Annuler
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(client.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
