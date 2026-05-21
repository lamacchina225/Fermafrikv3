import { format, subDays } from "date-fns";
import { and, desc, eq, sql } from "drizzle-orm";
import { DollarSign, Egg, TrendingUp, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";
import { CycleTimeline } from "@/components/timeline/CycleTimeline";
import { DailySummary } from "@/components/dashboard/DailySummary";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { MonthlyProduction } from "@/components/dashboard/MonthlyProduction";
import { ToggleKpiCard } from "@/components/dashboard/ToggleKpiCard";
import { db } from "@/db";
import { buildings, cycles, dailyRecords, expenses, sales } from "@/db/schema";
import {
  AUTO_FEED_EXPENSE_LABEL,
  calculateEffectifVivant,
  formatNumber,
  formatXOF,
} from "@/lib/utils";
import { getCurrentBusinessPeriod, isIsoDateWithinPeriod } from "@/lib/business-period";

async function getDashboardData(farmId: number) {
  const building = await db.query.buildings.findFirst({
    where: and(eq(buildings.farmId, farmId), eq(buildings.status, "active")),
  });

  if (!building) return null;

  const cycle = await db.query.cycles.findFirst({
    where: and(eq(cycles.farmId, farmId), eq(cycles.buildingId, building.id)),
    orderBy: desc(cycles.id),
  });

  if (!cycle) return { building, cycle: null };

  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const currentBusinessPeriod = getCurrentBusinessPeriod();

  const cycleFilter = and(eq(dailyRecords.farmId, farmId), eq(dailyRecords.cycleId, cycle.id));

  const [yesterdayRecord, cycleAggregates, cycleSales, cycleRecords, cycleExpenses] =
    await Promise.all([
      db.query.dailyRecords.findFirst({
        where: and(
          eq(dailyRecords.farmId, farmId),
          eq(dailyRecords.cycleId, cycle.id),
          eq(dailyRecords.recordDate, yesterday)
        ),
      }),
      db
        .select({
          totalEggs: sql<number>`COALESCE(SUM(${dailyRecords.eggsCollected}), 0)`,
          totalBroken: sql<number>`COALESCE(SUM(${dailyRecords.eggsBroken}), 0)`,
          totalMortality: sql<number>`COALESCE(SUM(${dailyRecords.mortalityCount}), 0)`,
        })
        .from(dailyRecords)
        .where(cycleFilter),
      db.query.sales.findMany({
        where: and(eq(sales.farmId, farmId), eq(sales.cycleId, cycle.id)),
        columns: {
          saleDate: true,
          totalAmount: true,
        },
      }),
      db.query.dailyRecords.findMany({
        where: cycleFilter,
        columns: {
          recordDate: true,
          eggsCollected: true,
          feedCost: true,
        },
      }),
      db.query.expenses.findMany({
        where: and(eq(expenses.farmId, farmId), eq(expenses.cycleId, cycle.id)),
        columns: {
          expenseDate: true,
          label: true,
          category: true,
          amount: true,
        },
      }),
    ]);

  const agg = cycleAggregates[0] ?? {
    totalEggs: 0,
    totalBroken: 0,
    totalMortality: 0,
  };

  const effectifVivant = calculateEffectifVivant(
    cycle.initialCount,
    Number(agg.totalMortality)
  );

  const totalEggsCycle = Number(agg.totalEggs);
  const autoFeedExpenseDates = new Set(
    cycleExpenses
      .filter((expense) => expense.label === AUTO_FEED_EXPENSE_LABEL && expense.category === "alimentation")
      .map((expense) => expense.expenseDate)
  );
  const unresolvedFeedCostTotal = cycleRecords.reduce((sum, record) => {
    if (autoFeedExpenseDates.has(record.recordDate)) return sum;
    return sum + Number(record.feedCost ?? 0);
  }, 0);
  const totalRevenue = cycleSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const totalExpenses =
    cycleExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0) +
    unresolvedFeedCostTotal;
  const beneficeNet = totalRevenue - totalExpenses;

  const monthRecords = cycleRecords.filter((record) =>
    isIsoDateWithinPeriod(record.recordDate, currentBusinessPeriod.start, currentBusinessPeriod.end)
  );
  const monthSales = cycleSales.filter((sale) =>
    isIsoDateWithinPeriod(sale.saleDate, currentBusinessPeriod.start, currentBusinessPeriod.end)
  );
  const monthExpenses = cycleExpenses.filter((expense) =>
    isIsoDateWithinPeriod(expense.expenseDate, currentBusinessPeriod.start, currentBusinessPeriod.end)
  );
  const monthAutoFeedExpenseDates = new Set(
    monthExpenses
      .filter((expense) => expense.label === AUTO_FEED_EXPENSE_LABEL && expense.category === "alimentation")
      .map((expense) => expense.expenseDate)
  );
  const monthUnresolvedFeedCostTotal = monthRecords.reduce((sum, record) => {
    if (monthAutoFeedExpenseDates.has(record.recordDate)) return sum;
    return sum + Number(record.feedCost ?? 0);
  }, 0);
  const currentPeriodEggs = monthRecords.reduce((sum, record) => sum + Number(record.eggsCollected ?? 0), 0);
  const currentPeriodRevenue = monthSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const currentPeriodExpenses =
    monthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0) +
    monthUnresolvedFeedCostTotal;
  const currentPeriodBeneficeNet = currentPeriodRevenue - currentPeriodExpenses;

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
    totalRevenue,
    totalExpenses,
    beneficeNet,
    totalEggsCycle,
    currentBusinessPeriodLabel: currentBusinessPeriod.labelToDate,
    currentPeriodEggs,
    currentPeriodRevenue,
    currentPeriodBeneficeNet,
    yesterdayEggs: yesterdayRecord?.eggsCollected ?? 0,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const farmId = session.user.farmId ? parseInt(session.user.farmId, 10) : NaN;
  if (isNaN(farmId)) {
    return (
      <div>
        <Header
          title="Tableau de bord"
          username={session?.user?.name ?? undefined}
          userRole={session?.user?.role}
        />
        <div className="p-6">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
            <p className="text-orange-700 font-medium">Aucune ferme associee a votre compte.</p>
            <p className="text-orange-600 text-sm mt-1">
              Contactez l&apos;administrateur pour configurer votre acces.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const data = await getDashboardData(farmId);

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
          <ToggleKpiCard
            primary={{
              title: "Oeufs cycle",
              value: formatNumber(data.totalEggsCycle),
              subtitle: "Cycle en cours",
            }}
            secondary={{
              title: "Oeufs mois en cours",
              value: formatNumber(data.currentPeriodEggs),
              subtitle: data.currentBusinessPeriodLabel,
            }}
            icon={<Egg className="h-6 w-6" />}
            primaryColor="orange"
            secondaryColor="orange"
          />
          <ToggleKpiCard
            primary={{
              title: "CA cycle",
              value: formatXOF(data.totalRevenue),
              subtitle: "Ventes du cycle",
            }}
            secondary={{
              title: "CA mois en cours",
              value: formatXOF(data.currentPeriodRevenue),
              subtitle: data.currentBusinessPeriodLabel,
            }}
            icon={<DollarSign className="h-6 w-6" />}
            primaryColor="gray"
            secondaryColor="gray"
          />
          <ToggleKpiCard
            primary={{
              title: "Benefice net cycle",
              value: formatXOF(data.beneficeNet),
              subtitle: "CA - depenses",
            }}
            secondary={{
              title: "Benefice net mois en cours",
              value: formatXOF(data.currentPeriodBeneficeNet),
              subtitle: data.currentBusinessPeriodLabel,
            }}
            icon={<DollarSign className="h-6 w-6" />}
            primaryColor={data.beneficeNet >= 0 ? "green" : "red"}
            secondaryColor={data.currentPeriodBeneficeNet >= 0 ? "green" : "red"}
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
