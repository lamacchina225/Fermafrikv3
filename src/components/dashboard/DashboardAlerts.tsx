"use client";

import { useEffect, useMemo } from "react";
import { AlertTriangle, Bell, Egg } from "lucide-react";

type AlertItem = {
  id: string;
  title: string;
  description: string;
  severity: "warning" | "critical";
  icon: typeof AlertTriangle;
};

type DashboardAlertsProps = {
  tauxPonteVeille: number;
  yesterdayEggs: number;
  effectifVivant: number;
  totalMortality: number;
};

const NOTIFICATION_PREFIX = "fermafrik:alert:";

export function DashboardAlerts(props: DashboardAlertsProps) {
  const alerts = useMemo<AlertItem[]>(() => {
    const nextAlerts: AlertItem[] = [];

    if (props.tauxPonteVeille > 0 && props.tauxPonteVeille < 55) {
      nextAlerts.push({
        id: "production-drop",
        title: "Baisse de production",
        description: `Le taux de ponte d'hier est de ${props.tauxPonteVeille}%.`,
        severity: props.tauxPonteVeille < 45 ? "critical" : "warning",
        icon: Egg,
      });
    }

    const mortalityRate = props.effectifVivant > 0
      ? (props.totalMortality / (props.effectifVivant + props.totalMortality)) * 100
      : 0;

    if (mortalityRate >= 4) {
      nextAlerts.push({
        id: "mortality-high",
        title: "Mortalite a surveiller",
        description: `La mortalite cumulee atteint ${mortalityRate.toFixed(1)}% du lot.`,
        severity: mortalityRate >= 6 ? "critical" : "warning",
        icon: AlertTriangle,
      });
    }

    if (props.yesterdayEggs === 0) {
      nextAlerts.push({
        id: "missing-production",
        title: "Aucune production hier",
        description: "Aucune collecte n'a ete enregistree sur la veille.",
        severity: "warning",
        icon: Bell,
      });
    }

    return nextAlerts;
  }, [
    props.effectifVivant,
    props.tauxPonteVeille,
    props.totalMortality,
    props.yesterdayEggs,
  ]);

  useEffect(() => {
    if (!("Notification" in window) || alerts.length === 0) {
      return;
    }

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
      return;
    }

    if (Notification.permission !== "granted") {
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    alerts.forEach((alert) => {
      const storageKey = `${NOTIFICATION_PREFIX}${alert.id}:${today}`;
      if (window.localStorage.getItem(storageKey)) {
        return;
      }

      const notification = new Notification(`Ferm'Afrik: ${alert.title}`, {
        body: alert.description,
        icon: "/api/icon?size=192",
        badge: "/api/icon?size=96",
        tag: storageKey,
      });

      notification.onclick = () => window.focus();
      window.localStorage.setItem(storageKey, "sent");
    });
  }, [alerts]);

  if (alerts.length === 0) {
    return (
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-2 text-emerald-600 shadow-sm">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900">Alerte ferme</p>
            <p className="text-sm text-emerald-800">
              Aucun signal critique pour le moment. La ferme tourne dans une zone stable.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Bell className="h-5 w-5 text-amber-600" />
        <h2 className="font-semibold text-slate-900">Notifications internes de la ferme</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {alerts.map((alert) => {
          const Icon = alert.icon;

          return (
            <article
              key={alert.id}
              className={`rounded-xl border p-4 ${
                alert.severity === "critical"
                  ? "border-red-200 bg-red-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2 text-slate-700 shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{alert.title}</p>
                  <p className="mt-1 text-sm text-slate-700">{alert.description}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
