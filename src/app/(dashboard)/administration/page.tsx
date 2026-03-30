"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Settings, Building2, Users, DollarSign, Save, Lock } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { isAdmin } from "@/lib/utils";
import type { Building } from "@/types";

const settingsSchema = z.object({
  prix_plaquette: z.coerce.number().min(1, "Prix invalide"),
  nom_ferme: z.string().min(1, "Requis"),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const buildingSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  capacity: z.coerce.number().min(1, "Capacité invalide"),
  status: z.enum(["active", "inactive", "construction"]),
});

type BuildingFormData = z.infer<typeof buildingSchema>;

export default function AdministrationPage() {
  const { data: session } = useSession();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBuildingSubmitting, setIsBuildingSubmitting] = useState(false);

  const admin = isAdmin(session?.user?.role);

  const { register: regSettings, handleSubmit: handleSettings, reset: resetSettings } =
    useForm<SettingsFormData>({
      resolver: zodResolver(settingsSchema),
      defaultValues: { prix_plaquette: 7000, nom_ferme: "Ferm'Afrik" },
    });

  const { register: regBuilding, handleSubmit: handleBuilding, reset: resetBuilding } =
    useForm<BuildingFormData>({
      resolver: zodResolver(buildingSchema),
      defaultValues: { status: "active" },
    });

  const loadData = useCallback(async () => {
    try {
      const [settingsRes, buildingsRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/settings?type=buildings"),
      ]);
      const settingsData = await settingsRes.json();
      const buildingsData = await buildingsRes.json();

      if (settingsData.prix_plaquette) {
        resetSettings({
          prix_plaquette: Number(settingsData.prix_plaquette),
          nom_ferme: settingsData.nom_ferme || "Ferm'Afrik",
        });
      }
      setBuildings(buildingsData.buildings ?? []);
    } catch {}
  }, [resetSettings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onSaveSettings = async (data: SettingsFormData) => {
    if (!admin) {
      toast.error("Droits administrateur requis");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Paramètres sauvegardés !");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onAddBuilding = async (data: BuildingFormData) => {
    if (!admin) return;
    setIsBuildingSubmitting(true);
    try {
      const res = await fetch("/api/settings?type=buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Bâtiment ajouté !");
      resetBuilding({ status: "active" });
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsBuildingSubmitting(false);
    }
  };

  if (!admin && session?.user?.role !== "gestionnaire") {
    return (
      <div>
        <Header title="Administration" username={session?.user?.name ?? undefined} userRole={session?.user?.role} />
        <div className="p-6">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 text-center">
            <Lock className="h-12 w-12 text-orange-400 mx-auto mb-4" />
            <p className="text-orange-700 font-semibold">Accès restreint</p>
            <p className="text-orange-600 text-sm mt-1">Mode démo : accès à l'administration non disponible.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Administration"
        username={session?.user?.name ?? undefined}
        userRole={session?.user?.role}
      />
      <div className="p-6 space-y-6">
        {!admin && (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-blue-700 text-sm">
              Certains paramètres sont réservés aux administrateurs.
            </p>
          </div>
        )}

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">
              <Settings className="h-4 w-4 mr-2" />
              Général
            </TabsTrigger>
            <TabsTrigger value="batiments">
              <Building2 className="h-4 w-4 mr-2" />
              Bâtiments
            </TabsTrigger>
            {admin && (
              <TabsTrigger value="utilisateurs">
                <Users className="h-4 w-4 mr-2" />
                Utilisateurs
              </TabsTrigger>
            )}
          </TabsList>

          {/* Paramètres généraux */}
          <TabsContent value="general">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary-600" />
                Paramètres financiers
              </h2>
              <form onSubmit={handleSettings(onSaveSettings)} className="space-y-5 max-w-md">
                <div className="space-y-1.5">
                  <Label required>Nom de la ferme</Label>
                  <Input type="text" {...regSettings("nom_ferme")} disabled={!admin} />
                </div>
                <div className="space-y-1.5">
                  <Label required>Prix d'une plaquette (XOF)</Label>
                  <Input
                    type="number"
                    min="1"
                    {...regSettings("prix_plaquette")}
                    disabled={!admin}
                  />
                  <p className="text-xs text-gray-400">1 plaquette = 30 oeufs</p>
                </div>
                {admin && (
                  <Button type="submit" loading={isSubmitting}>
                    <Save className="h-4 w-4" />
                    Sauvegarder
                  </Button>
                )}
              </form>
            </div>
          </TabsContent>

          {/* Bâtiments */}
          <TabsContent value="batiments">
            <div className="space-y-4">
              {/* Liste bâtiments */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Bâtiments existants</h2>
                {buildings.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucun bâtiment configuré</p>
                ) : (
                  <div className="space-y-3">
                    {buildings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{b.name}</p>
                          <p className="text-sm text-gray-500">Capacité : {b.capacity.toLocaleString("fr-FR")} poules</p>
                        </div>
                        <Badge
                          variant={
                            b.status === "active" ? "success" :
                            b.status === "construction" ? "warning" : "secondary"
                          }
                        >
                          {b.status === "active" ? "Actif" : b.status === "construction" ? "En construction" : "Inactif"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ajouter bâtiment (admin only) */}
              {admin && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Ajouter un bâtiment</h2>
                  <form onSubmit={handleBuilding(onAddBuilding)} className="space-y-4 max-w-md">
                    <div className="space-y-1.5">
                      <Label required>Nom du bâtiment</Label>
                      <Input type="text" placeholder="Ex: Bâtiment B" {...regBuilding("name")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label required>Capacité (poules)</Label>
                      <Input type="number" min="1" placeholder="600" {...regBuilding("capacity")} />
                    </div>
                    <Button type="submit" loading={isBuildingSubmitting}>
                      Ajouter le bâtiment
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Utilisateurs (admin only) */}
          {admin && (
            <TabsContent value="utilisateurs">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Gestion des utilisateurs</h2>
                <div className="space-y-3">
                  {[
                    { username: "admin", role: "admin", label: "Administrateur" },
                    { username: "gestion", role: "gestionnaire", label: "Gestionnaire" },
                    { username: "demo", role: "demo", label: "Démo (lecture seule)" },
                  ].map((user) => (
                    <div key={user.username} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-semibold text-sm">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.username}</p>
                          <p className="text-xs text-gray-500">{user.label}</p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          user.role === "admin" ? "default" :
                          user.role === "gestionnaire" ? "info" : "warning"
                        }
                      >
                        {user.label}
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  Pour modifier les mots de passe, contactez l'administrateur système.
                </p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
