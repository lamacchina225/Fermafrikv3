import { FormSkeleton, TableSkeleton } from "@/components/dashboard/PageSkeleton";

export default function VentesLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200" />
      <FormSkeleton />
      <TableSkeleton rows={8} />
    </div>
  );
}
