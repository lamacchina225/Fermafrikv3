export type Phase = "demarrage" | "croissance" | "production";

export interface PhaseInfo {
  phase: Phase;
  phaseLabel: string;
  jourRestants: number;
  pourcentageGlobal: number;
  pourcentagePhase: number;
  joursDuCycle: number;
  finPhase: Date;
  debutPhase: Date;
}

/**
 * Calcul de la phase d'un cycle avicole selon les règles métier :
 * - Les mois sont comptés du 18 au 17
 * - Démarrage : Jour 1 à M+2 (0 à ~60 jours)
 * - Croissance : M+2 à M+6 (~60 à ~180 jours)
 * - Production : M+6 à M+18 (~180 à ~540 jours)
 *
 * @param startDate - Date de début du cycle
 * @param referenceDate - Date de référence (aujourd'hui par défaut)
 */
export function calculatePhase(
  startDate: Date | string,
  referenceDate: Date = new Date()
): PhaseInfo {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const ref = new Date(referenceDate);

  // Calcul du nombre de jours depuis le début du cycle
  const diffMs = ref.getTime() - start.getTime();
  const joursDuCycle = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  // Calcul du nombre de mois entiers (du 18 au 17)
  // Un mois complet = la période du 18 d'un mois au 17 du mois suivant
  const moisComplets = compterMoisCycle(start, ref);

  // Durée totale du cycle : 18 mois
  const dureesTotaleMois = 18;
  const dureeDemarrageMois = 2;
  const dureeCroissanceMois = 4; // M+2 à M+6
  const dureeProductionMois = 12; // M+6 à M+18

  // Calcul des dates de début/fin de chaque phase
  const debutDemarrage = start;
  const finDemarrage = addMoisCycle(start, dureeDemarrageMois);
  const debutCroissance = finDemarrage;
  const finCroissance = addMoisCycle(start, dureeDemarrageMois + dureeCroissanceMois);
  const debutProduction = finCroissance;
  const finProduction = addMoisCycle(start, dureesTotaleMois);

  // Détermination de la phase actuelle
  let phase: Phase;
  let debutPhase: Date;
  let finPhase: Date;
  let phaseLabel: string;
  let jourRestants: number;
  let pourcentagePhase: number;

  if (moisComplets < dureeDemarrageMois) {
    phase = "demarrage";
    phaseLabel = "Démarrage";
    debutPhase = debutDemarrage;
    finPhase = finDemarrage;
  } else if (moisComplets < dureeDemarrageMois + dureeCroissanceMois) {
    phase = "croissance";
    phaseLabel = "Croissance";
    debutPhase = debutCroissance;
    finPhase = finCroissance;
  } else {
    phase = "production";
    phaseLabel = "Production";
    debutPhase = debutProduction;
    finPhase = finProduction;
  }

  // Calcul des jours restants dans la phase
  const finPhaseMs = finPhase.getTime() - ref.getTime();
  jourRestants = Math.max(0, Math.ceil(finPhaseMs / (1000 * 60 * 60 * 24)));

  // Calcul du pourcentage d'avancement dans la phase
  const debutPhaseMs = ref.getTime() - debutPhase.getTime();
  const dureePhaseTotale = finPhase.getTime() - debutPhase.getTime();
  pourcentagePhase = Math.min(
    100,
    Math.max(0, Math.round((debutPhaseMs / dureePhaseTotale) * 100))
  );

  // Calcul du pourcentage global d'avancement du cycle
  const finCycleMs = finProduction.getTime() - start.getTime();
  const avancementCycleMs = ref.getTime() - start.getTime();
  const pourcentageGlobal = Math.min(
    100,
    Math.max(0, Math.round((avancementCycleMs / finCycleMs) * 100))
  );

  return {
    phase,
    phaseLabel,
    jourRestants,
    pourcentageGlobal,
    pourcentagePhase,
    joursDuCycle,
    finPhase,
    debutPhase,
  };
}

/**
 * Compte le nombre de mois complets du 18 au 17 écoulés depuis startDate
 */
function compterMoisCycle(startDate: Date, referenceDate: Date): number {
  const startDay = startDate.getDate();
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();

  const refDay = referenceDate.getDate();
  const refMonth = referenceDate.getMonth();
  const refYear = referenceDate.getFullYear();

  // Nombre brut de mois calendaires
  let moisBruts = (refYear - startYear) * 12 + (refMonth - startMonth);

  // Si le jour de référence n'a pas encore atteint le jour de début,
  // un mois complet n'est pas encore écoulé
  if (refDay < startDay) {
    moisBruts--;
  }

  return Math.max(0, moisBruts);
}

/**
 * Ajoute n mois à une date (du jour de début au même jour n mois plus tard)
 */
function addMoisCycle(date: Date, mois: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + mois);
  return result;
}

/**
 * Retourne la couleur associée à une phase
 */
export function getPhaseColor(phase: Phase): string {
  const colors: Record<Phase, string> = {
    demarrage: "#ffb703",
    croissance: "#8ecae6",
    production: "#95d5b2",
  };
  return colors[phase];
}

/**
 * Retourne la classe Tailwind associée à une phase
 */
export function getPhaseBgClass(phase: Phase): string {
  const classes: Record<Phase, string> = {
    demarrage: "bg-yellow-400",
    croissance: "bg-blue-300",
    production: "bg-green-300",
  };
  return classes[phase];
}

/**
 * Calcule les bornes temporelles de chaque phase pour l'affichage de la timeline
 */
export interface TimelinePhase {
  phase: Phase;
  label: string;
  debut: Date;
  fin: Date;
  color: string;
  dureeJours: number;
  pourcentageDuree: number;
}

export function getTimelinePhases(startDate: Date | string): TimelinePhase[] {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const fin = addMoisCycle(start, 18);
  const dureeTotale = fin.getTime() - start.getTime();

  const finDemarrage = addMoisCycle(start, 2);
  const finCroissance = addMoisCycle(start, 6);

  const phases: TimelinePhase[] = [
    {
      phase: "demarrage",
      label: "Démarrage",
      debut: start,
      fin: finDemarrage,
      color: "#ffb703",
      dureeJours: Math.round(
        (finDemarrage.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      ),
      pourcentageDuree: Math.round(
        ((finDemarrage.getTime() - start.getTime()) / dureeTotale) * 100
      ),
    },
    {
      phase: "croissance",
      label: "Croissance",
      debut: finDemarrage,
      fin: finCroissance,
      color: "#8ecae6",
      dureeJours: Math.round(
        (finCroissance.getTime() - finDemarrage.getTime()) / (1000 * 60 * 60 * 24)
      ),
      pourcentageDuree: Math.round(
        ((finCroissance.getTime() - finDemarrage.getTime()) / dureeTotale) * 100
      ),
    },
    {
      phase: "production",
      label: "Production",
      debut: finCroissance,
      fin: fin,
      color: "#95d5b2",
      dureeJours: Math.round(
        (fin.getTime() - finCroissance.getTime()) / (1000 * 60 * 60 * 24)
      ),
      pourcentageDuree: Math.round(
        ((fin.getTime() - finCroissance.getTime()) / dureeTotale) * 100
      ),
    },
  ];

  return phases;
}
