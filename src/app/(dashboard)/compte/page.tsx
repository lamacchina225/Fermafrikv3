"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Key, User, Shield } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Requis"),
    newPassword: z.string().min(6, "Minimum 6 caractères"),
    confirmPassword: z.string().min(1, "Requis"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

interface AccountInfo {
  id: number;
  username: string;
  email: string | null;
  role: string;
  createdAt: string;
}

export default function ComptePage() {
  const { data: session } = useSession();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setAccount(data);
      })
      .catch(() => {});
  }, []);

  const onChangePassword = async (data: PasswordFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Mot de passe modifié !");
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabels: Record<string, string> = {
    admin: "Administrateur",
    gestionnaire: "Gestionnaire",
    demo: "Démo",
  };

  return (
    <div>
      <Header
        title="Mon compte"
        username={session?.user?.name ?? undefined}
        userRole={session?.user?.role}
      />
      <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
        {/* Infos du compte */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <User className="h-6 w-6 text-primary-700" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-lg">
                {account?.username ?? session?.user?.name ?? "..."}
              </h2>
              <Badge
                variant={
                  account?.role === "admin"
                    ? "default"
                    : account?.role === "gestionnaire"
                      ? "info"
                      : "warning"
                }
              >
                <Shield className="h-3 w-3 mr-1" />
                {roleLabels[account?.role ?? ""] ?? account?.role}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide">
                Nom d&apos;utilisateur
              </p>
              <p className="text-slate-900 font-medium mt-1">
                {account?.username ?? "..."}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide">Email</p>
              <p className="text-slate-900 font-medium mt-1">
                {account?.email ?? "Non renseigné"}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide">
                Membre depuis
              </p>
              <p className="text-slate-900 font-medium mt-1">
                {account?.createdAt ? formatDate(account.createdAt) : "..."}
              </p>
            </div>
          </div>
        </div>

        {/* Changement de mot de passe */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-amber-500" />
            Changer le mot de passe
          </h3>

          <form
            onSubmit={handleSubmit(onChangePassword)}
            className="space-y-4 max-w-md"
          >
            <div className="space-y-1.5">
              <Label required>Mot de passe actuel</Label>
              <Input
                type="password"
                {...register("currentPassword")}
                error={errors.currentPassword?.message}
              />
            </div>
            <div className="space-y-1.5">
              <Label required>Nouveau mot de passe</Label>
              <Input
                type="password"
                placeholder="Minimum 6 caractères"
                {...register("newPassword")}
                error={errors.newPassword?.message}
              />
            </div>
            <div className="space-y-1.5">
              <Label required>Confirmer le nouveau mot de passe</Label>
              <Input
                type="password"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
              />
            </div>
            <Button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-white"
              loading={isSubmitting}
            >
              Modifier le mot de passe
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
