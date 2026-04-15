"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import Link from "next/link";
import { Building2, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Minimum 3 caractères")
      .max(50)
      .regex(/^[a-zA-Z0-9_]+$/, "Lettres, chiffres et _ uniquement"),
    email: z.string().email("Email invalide").optional().or(z.literal("")),
    password: z
      .string()
      .min(8, "Minimum 8 caractères")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[0-9]/, "Au moins un chiffre"),
    confirmPassword: z.string().min(1, "Confirmez le mot de passe"),
    farmName: z.string().min(1, "Le nom de la ferme est requis").max(200),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
          farmName: data.farmName,
          email: data.email || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur lors de l'inscription");
      }

      toast.success("Compte créé ! Connexion en cours...");

      // Connexion automatique
      const result = await signIn("credentials", {
        username: data.username,
        password: data.password,
        redirect: false,
      });

      if (result?.ok) {
        router.push("/");
        router.refresh();
      } else {
        router.push("/login");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de l'inscription"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <Image
              src="/logo.png"
              alt="Ferm'Afrik"
              width={120}
              height={120}
              className="drop-shadow-xl"
              priority
            />
          </div>
          <p className="text-white/70 text-sm">Créez votre compte pour gérer votre ferme</p>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Inscription</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Nom de la ferme */}
            <div className="space-y-1.5">
              <Label htmlFor="farmName" required>
                Nom de votre ferme
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="farmName"
                  type="text"
                  placeholder="Ex: Ferme Diallo"
                  className={`flex h-10 w-full rounded-lg border bg-white pl-10 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400
                    focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-colors
                    ${errors.farmName ? "border-red-400" : "border-gray-200"}`}
                  {...register("farmName")}
                />
              </div>
              {errors.farmName && (
                <p className="text-xs text-red-500">{errors.farmName.message}</p>
              )}
            </div>

            {/* Nom d'utilisateur */}
            <div className="space-y-1.5">
              <Label htmlFor="username" required>
                Nom d&apos;utilisateur
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="username"
                  type="text"
                  placeholder="Ex: amadou_diallo"
                  className={`flex h-10 w-full rounded-lg border bg-white pl-10 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400
                    focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-colors
                    ${errors.username ? "border-red-400" : "border-gray-200"}`}
                  {...register("username")}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-red-500">{errors.username.message}</p>
              )}
            </div>

            {/* Email (optionnel) */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email (optionnel)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  className={`flex h-10 w-full rounded-lg border bg-white pl-10 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400
                    focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-colors
                    ${errors.email ? "border-red-400" : "border-gray-200"}`}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div className="space-y-1.5">
              <Label htmlFor="password" required>
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 car., 1 majuscule, 1 chiffre"
                  className={`flex h-10 w-full rounded-lg border bg-white pl-10 pr-10 py-2 text-sm text-gray-900 placeholder:text-gray-400
                    focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-colors
                    ${errors.password ? "border-red-400" : "border-gray-200"}`}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Confirmation */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" required>
                Confirmer le mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Retapez le mot de passe"
                  className={`flex h-10 w-full rounded-lg border bg-white pl-10 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400
                    focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-colors
                    ${errors.confirmPassword ? "border-red-400" : "border-gray-200"}`}
                  {...register("confirmPassword")}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 text-white h-11"
              loading={isLoading}
            >
              Créer mon compte
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-primary-600 font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>

        <p className="text-center text-white/50 text-xs mt-6">
          Ferm&apos;Afrik v3 · Gestion avicole
        </p>
      </div>
    </div>
  );
}
