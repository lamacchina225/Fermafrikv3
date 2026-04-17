"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const loginSchema = z.object({
  username: z.string().min(1, "Le nom d'utilisateur est requis"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        username: data.username,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Identifiants incorrects. Vérifiez votre nom d'utilisateur et mot de passe.");
      } else if (result?.ok) {
        toast.success("Connexion réussie !");
        router.push("/");
        router.refresh();
      }
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-olive-800 via-olive-700 to-brand-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex h-52 w-96 max-w-full items-center justify-center overflow-hidden">
            <Image
              src="/logo.png"
              alt="Ferm'Afrik"
              width={420}
              height={210}
              className="login-logo-img h-full w-full object-contain drop-shadow-xl"
              priority
            />
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Connexion
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                  placeholder="admin"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  spellCheck={false}
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
                  placeholder="••••••••"
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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-white shadow-md"
              loading={isLoading}
            >
              Se connecter
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-primary-600 font-medium hover:underline">
              Créer une ferme
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
