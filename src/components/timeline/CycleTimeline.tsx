"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  calculatePhase,
  getTimelinePhases,
  type Phase,
} from "@/lib/phase-calculator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, TrendingUp } from "lucide-react";

interface CycleTimelineProps {
  startDate: string;
  initialCount: number;
  currentMortality?: number;
}

const phaseLabels: Record<Phase, string> = {
  demarrage: "Démarrage",
  croissance: "Croissance",
  production: "Production",
};

const phaseColors: Record<Phase, string> = {
  demarrage: "#ffb703",
  croissance: "#8ecae6",
  production: "#95d5b2",
};

const phaseBadgeVariants: Record<Phase, "demarrage" | "croissance" | "production"> = {
  demarrage: "demarrage",
  croissance: "croissance",
  production: "production",
};

export function CycleTimeline({
  startDate,
  initialCount,
  currentMortality = 0,
}: CycleTimelineProps) {
  const phaseInfo = useMemo(() => calculatePhase(startDate), [startDate]);
  const timelinePhases = useMemo(() => getTimelinePhases(startDate), [startDate]);

  const effectifVivant = initialCount - currentMortality;
  const tauxMortalite = initialCount > 0
    ? Math.round((currentMortality / initialCount) * 100 * 10) / 10
    : 0;

  const formatDate = (date: Date) =>
    format(date, "dd MMM yyyy", { locale: fr });

  const startDateFormatted = formatDate(parseISO(startDate));
  const finCycleFormatted = formatDate(phaseInfo.finPhase);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cycle en cours</h2>
          <p className="text-sm text-gray-500">
            Démarré le {startDateFormatted} · Jour {phaseInfo.joursDuCycle}
          </p>
        </div>
        <Badge variant={phaseBadgeVariants[phaseInfo.phase]} className="text-sm px-3 py-1">
          Phase {phaseLabels[phaseInfo.phase]}
        </Badge>
      </div>

      {/* Barre de progression globale */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Début: {startDateFormatted}
          </span>
          <span className="font-medium text-gray-700">
            {phaseInfo.pourcentageGlobal}% du cycle
          </span>
          <span className="flex items-center gap-1">
            Fin: {formatDate(timelinePhases[2].fin)}
          </span>
        </div>

        {/* Timeline visuelle avec les 3 phases */}
        <div className="relative h-10 flex rounded-lg overflow-hidden shadow-inner">
          {timelinePhases.map((tPhase) => {
            const isCurrentPhase = tPhase.phase === phaseInfo.phase;
            const isPastPhase =
              (tPhase.phase === "demarrage" && phaseInfo.phase !== "demarrage") ||
              (tPhase.phase === "croissance" && phaseInfo.phase === "production");

            return (
              <div
                key={tPhase.phase}
                className="relative flex items-center justify-center text-xs font-semibold transition-all"
                style={{
                  width: `${tPhase.pourcentageDuree}%`,
                  backgroundColor: tPhase.color,
                  opacity: isPastPhase ? 0.6 : 1,
                }}
              >
                {/* Indicateur phase en cours */}
                {isCurrentPhase && (
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: `repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 4px,
                        rgba(0,0,0,0.1) 4px,
                        rgba(0,0,0,0.1) 8px
                      )`,
                    }}
                  />
                )}
                <span
                  className="relative z-10 truncate px-2 text-gray-800"
                  style={{ textShadow: "0 1px 2px rgba(255,255,255,0.5)" }}
                >
                  {tPhase.label}
                  <span className="hidden sm:inline">
                    {" "}({tPhase.dureeJours}j)
                  </span>
                </span>
              </div>
            );
          })}

          {/* Curseur position actuelle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gray-800 z-20 shadow-lg"
            style={{ left: `${phaseInfo.pourcentageGlobal}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gray-800 rotate-45 rounded-sm shadow" />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gray-800 rotate-45 rounded-sm shadow" />
          </div>
        </div>

        {/* Légende des dates par phase */}
        <div className="flex mt-1">
          {timelinePhases.map((tPhase, idx) => (
            <div
              key={tPhase.phase}
              className="text-xs text-gray-400"
              style={{ width: `${tPhase.pourcentageDuree}%` }}
            >
              {idx === 0 && formatDate(tPhase.debut)}
            </div>
          ))}
        </div>
      </div>

      {/* Phase actuelle - détails */}
      <div
        className="rounded-lg p-4 mb-4 border-l-4"
        style={{
          backgroundColor: phaseColors[phaseInfo.phase] + "20",
          borderLeftColor: phaseColors[phaseInfo.phase],
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Phase {phaseLabels[phaseInfo.phase]}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {phaseInfo.jourRestants} jours restants
          </span>
        </div>
        <Progress
          value={phaseInfo.pourcentagePhase}
          indicatorColor={phaseColors[phaseInfo.phase]}
          className="h-2"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">
            {formatDate(phaseInfo.debutPhase)}
          </span>
          <span className="text-xs font-medium text-gray-700">
            {phaseInfo.pourcentagePhase}%
          </span>
          <span className="text-xs text-gray-500">
            {formatDate(phaseInfo.finPhase)}
          </span>
        </div>
      </div>

      {/* Statistiques troupeau */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{effectifVivant.toLocaleString("fr-FR")}</p>
          <p className="text-xs text-gray-500 mt-1">Effectif vivant</p>
        </div>
        <div className="text-center border-x border-gray-100">
          <p className="text-2xl font-bold text-gray-900">{currentMortality.toLocaleString("fr-FR")}</p>
          <p className="text-xs text-gray-500 mt-1">
            Mortalité cumulée
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <p className={`text-2xl font-bold ${tauxMortalite > 5 ? "text-red-600" : "text-emerald-600"}`}>
              {tauxMortalite}%
            </p>
            <TrendingUp className={`h-4 w-4 ${tauxMortalite > 5 ? "text-red-500" : "text-emerald-500"}`} />
          </div>
          <p className="text-xs text-gray-500 mt-1">Taux mortalité</p>
        </div>
      </div>
    </div>
  );
}
