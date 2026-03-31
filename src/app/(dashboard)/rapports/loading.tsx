import { KpiSkeleton, TableSkeleton } from "@/components/dashboard/PageSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function RapportsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200" />
      <KpiSkeleton />
      <div className="bg-white rounded-xl shadow-sm p-6">
        <Skeleton className="h-[200px] w-full" />
      </div>
      <TableSkeleton rows={10} />
    </div>
  );
}
