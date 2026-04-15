import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { EGGS_PER_TRAY } from "@/lib/constants";

// ── Réexport des constantes métier ──────────────────────────────────────────
export { EGGS_PER_TRAY } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formate un montant en XOF (Franc CFA)
 */
export function formatXOF(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0 XOF";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 XOF";
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num) + " XOF";
}

/**
 * Formate un nombre avec séparateurs de milliers
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("fr-FR").format(num);
}

/**
 * Calcule le taux de ponte
 * @param eggsCollected - Nombre d'oeufs récoltés
 * @param livingHens - Effectif vivant (poules)
 * @returns Taux en pourcentage
 */
export function calculateTauxPonte(
  eggsCollected: number,
  livingHens: number
): number {
  if (livingHens <= 0) return 0;
  return Math.round((eggsCollected / livingHens) * 100 * 10) / 10;
}

/**
 * Calcule l'effectif vivant
 * @param initialCount - Effectif initial
 * @param totalMortality - Mortalité cumulée
 */
export function calculateEffectifVivant(
  initialCount: number,
  totalMortality: number
): number {
  return Math.max(0, initialCount - totalMortality);
}

/**
 * Calcule le stock d'oeufs disponibles
 * @param totalCollected - Total récoltes
 * @param totalSold - Total vendus (en oeufs)
 * @param totalBroken - Total casses
 */
export function calculateStockOeufs(
  totalCollected: number,
  totalSoldTrays: number,
  totalBroken: number,
  eggsPerTray: number = EGGS_PER_TRAY
): number {
  const totalSoldEggs = totalSoldTrays * eggsPerTray;
  return Math.max(0, totalCollected - totalSoldEggs - totalBroken);
}

/**
 * Convertit des oeufs en plaquettes
 */
export function eggsToTrays(eggs: number, eggsPerTray: number = EGGS_PER_TRAY): number {
  return Math.floor(eggs / eggsPerTray);
}

/**
 * Convertit des plaquettes en oeufs
 */
export function traysToEggs(trays: number, eggsPerTray: number = EGGS_PER_TRAY): number {
  return trays * eggsPerTray;
}

/**
 * Calcule le bénéfice net
 * @param totalRevenue - Chiffre d'affaires total
 * @param totalExpenses - Total des dépenses
 */
export function calculateBeneficeNet(
  totalRevenue: number,
  totalExpenses: number
): number {
  return totalRevenue - totalExpenses;
}

/**
 * Formate une date en français
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "dd MMMM yyyy", { locale: fr });
  } catch {
    return "-";
  }
}

/**
 * Formate une date courte
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "dd/MM/yyyy", { locale: fr });
  } catch {
    return "-";
  }
}

/**
 * Distance relative d'une date depuis maintenant
 */
export function formatRelativeDate(date: Date | string): string {
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return formatDistance(d, new Date(), { addSuffix: true, locale: fr });
  } catch {
    return "-";
  }
}

/**
 * Retourne la date du jour au format YYYY-MM-DD
 */
export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Vérifie si un utilisateur a les droits d'écriture
 */
export function canWrite(role: string | undefined | null): boolean {
  return role === "admin" || role === "gestionnaire";
}

/**
 * Vérifie si un utilisateur est admin
 */
export function isAdmin(role: string | undefined | null): boolean {
  return role === "admin";
}

/**
 * Retourne le label d'une catégorie de dépense
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    alimentation: "Alimentation",
    sante: "Santé",
    energie: "Énergie",
    main_oeuvre: "Main d'oeuvre",
    equipement: "Équipement",
    autre: "Autre",
  };
  return labels[category] ?? category;
}

/**
 * Retourne le label d'un type de mouvement stock
 */
export function getFeedTypeLabel(feedType: string): string {
  const labels: Record<string, string> = {
    demarrage: "Démarrage",
    croissance: "Croissance",
    ponte: "Ponte",
  };
  return labels[feedType] ?? feedType;
}

/**
 * Retourne le label d'une phase
 */
export function getPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    demarrage: "Démarrage",
    croissance: "Croissance",
    production: "Production",
  };
  return labels[phase] ?? phase;
}

/**
 * Tronque un texte à une longueur donnée
 */
export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}
