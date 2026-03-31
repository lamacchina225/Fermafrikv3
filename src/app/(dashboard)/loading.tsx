import { KpiSkeleton, TableSkeleton } from "@/components/dashboard/PageSkeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200" />
      <KpiSkeleton />
      <TableSkeleton rows={7} />
    </div>
  );
}
