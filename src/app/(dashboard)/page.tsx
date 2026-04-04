import { format, subDays } from "date-fns";
import { and, desc, eq, sql } from "drizzle-orm";
import { DollarSign, Egg, Package, TrendingUp, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";
import { CycleTimeline } from "@/components/timeline/CycleTimeline";
import { DailySummary } from "@/components/dashboard/DailySummary";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { MonthlyProduction } from "@/components/dashboard/MonthlyProduction";
import { db } from "@/db";
import { buildings, cycles, dailyRecords, expenses, sales } from "@/db/schema";
import {
  calculateEffectifVivant,
  eggsToTrays,
  formatNumber,
  formatXOF,
} from "@/lib/utils";

async function getDashboardData() {
  const building = await db.query.buildings.findFirst({
    where: eq(buildings.status, "active"),
  });

  if (!building) return null;

  const cycle = await db.query.cycles.findFirst({
    where: eq(cycles.buildingId, building.id),
    orderBy: desc(cycles.id),
  });

  if (!cycle) return { building, cycle: null };

  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const yesterdayRecord = await db.query.dailyRecords.findFirst({
    where: and(
      eq(dailyRecords.cycleId, cycle.id),
      eq(dailyRecords.recordDate, yesterday)
    ),
  });

  const cycleAggregates = await db
    .select({
      totalEggs: sql<number>`COALESCE(SUM(${dailyRecords.eggsCollected}), 0)`,
      totalBroken: sql<number>`COALESCE(SUM(${dailyRecords.eggsBroken}), 0)`,
      totalMortality: sql<number>`COALESCE(SUM(${dailyRecords.mortalityCount}), 0)`,
      totalFeedCost: sql<number>`COALESCE(SUM(CAST(${dailyRecords.feedCost} AS NUMERIC)), 0)`,
    })
    .from(dailyRecords)
    .where(eq(dailyRecords.cycleId, cycle.id));

  const salesAggregates = await db
    .select({
      totalTrays: sql<number>`COALESCE(SUM(${sales.traysSold}), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(CAST(${sales.totalAmount} AS NUMERIC)), 0)`,
    })
    .from(sales)
    .where(eq(sales.cycleId, cycle.id));

  const expensesTotal = await db
    .select({
      total: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS NUMERIC)), 0)`,
    })
    .from(expenses)
    .where(eq(expenses.cycleId, cycle.id));

  const agg = cycleAggregates[0] ?? {
    totalEggs: 0,
    totalBroken: 0,
    totalMortality: 0,
    totalFeedCost: 0,
  };
  const salesAgg = salesAggregates[0] ?? { totalTrays: 0, totalRevenue: 0 };
  const expTotal = Number(expensesTotal[0]?.total ?? 0);

  const effectifVivant = calculateEffectifVivant(
    cycle.initialCount,
    Number(agg.totalMortality)
  );

  const totalEggsCycle = Number(agg.totalEggs);
  const totalBrokenCycle = Number(agg.totalBroken);
  const totalSoldTrays = Number(salesAgg.totalTrays);
  const stockOeufs = Math.max(
    0,
    totalEggsCycle - totalBrokenCycle - totalSoldTrays * 30
  );
  const stockPlaquettes = eggsToTrays(stockOeufs);

  const totalRevenue = Number(salesAgg.totalRevenue);
  const totalExpenses = expTotal + Number(agg.totalFeedCost);
  const beneficeNet = totalRevenue - totalExpenses;

  const tauxPonteVeille = yesterdayRecord
    ? Number(
        ((yesterdayRecord.eggsCollected / Math.max(effectifVivant, 1)) * 100).toFixed(1)
      )
    : 0;

  return {
    building,
    cycle,
    yesterdayRecord,
    effectifVivant,
    totalMortality: Number(agg.totalMortality),
    tauxPonteVeille,
    stockOeufs,
    stockPlaquettes,
    totalRevenue,
    totalExpenses,
    beneficeNet,
    totalEggsCycle,
    yesterdayEggs: yesterdayRecord?.eggsCollected ?? 0,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData();

  if (!data || !data.cycle) {
    return (
      <div>
        <Header
          title="Tableau de bord"
          username={session?.user?.name ?? undefined}
          userRole={session?.user?.role}
        />
        <div className="p-6">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
            <p className="text-orange-700 font-medium">Aucun cycle actif trouve.</p>
            <p className="text-orange-600 text-sm mt-1">
              Configurez un batiment puis un cycle pour commencer.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Tableau de bord"
        username={session?.user?.name ?? undefined}
        userRole={session?.user?.role}
      />
      <div className="p-6 space-y-6 bg-slate-50">
        <DashboardAlerts
          stockPlaquettes={data.stockPlaquettes}
          tauxPonteVeille={data.tauxPonteVeille}
          yesterdayEggs={data.yesterdayEggs}
          effectifVivant={data.effectifVivant}
          totalMortality={data.totalMortality}
        />

        <CycleTimeline
          startDate={data.cycle.startDate}
          initialCount={data.cycle.initialCount}
          currentMortality={data.totalMortality}
        />

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            title="Effectif vivant"
            value={formatNumber(data.effectifVivant)}
            subtitle={`/ ${data.building.capacity} initial`}
            icon={<Users className="h-6 w-6" />}
            color="green"
          />
          <KpiCard
            title="Oeufs de la veille"
            value={formatNumber(data.yesterdayEggs)}
            subtitle="Saisie du soir precedent"
            icon={<Egg className="h-6 w-6" />}
            color="orange"
          />
          <KpiCard
            title="Taux de ponte veille"
            value={`${data.tauxPonteVeille}%`}
            subtitle="Sur la veille"
            icon={<TrendingUp className="h-6 w-6" />}
            color="blue"
          />
          <KpiCard
            title="Oeufs depuis le debut"
            value={formatNumber(data.totalEggsCycle)}
            subtitle="Cycle en cours"
            icon={<Egg className="h-6 w-6" />}
            color="orange"
          />
          <KpiCard
            title="Stock oeufs"
            value={formatNumber(data.stockOeufs)}
            subtitle={`${formatNumber(data.stockPlaquettes)} plaquettes`}
            icon={<Package className="h-6 w-6" />}
            color="gray"
          />
          <KpiCard
            title="Benefice net cycle"
            value={formatXOF(data.beneficeNet)}
            subtitle="CA - depenses"
            icon={<DollarSign className="h-6 w-6" />}
            color={data.beneficeNet >= 0 ? "green" : "red"}
          />
        </div>

        <MonthlyProduction cycleStartDate={data.cycle.startDate} />

        <DailySummary
          recordDate={data.yesterdayRecord?.recordDate}
          eggsCollected={data.yesterdayRecord?.eggsCollected}
          eggsBroken={data.yesterdayRecord?.eggsBroken}
          eggsSold={data.yesterdayRecord?.eggsSold}
          mortalityCount={data.yesterdayRecord?.mortalityCount}
          feedQuantityKg={Number(data.yesterdayRecord?.feedQuantityKg ?? 0)}
          feedCost={Number(data.yesterdayRecord?.feedCost ?? 0)}
          revenue={Number(data.yesterdayRecord?.revenue ?? 0)}
          effectifVivant={data.effectifVivant}
          hasRecord={!!data.yesterdayRecord}
          titre="Resume de la veille"
        />
      </div>
    </div>
  );
}
