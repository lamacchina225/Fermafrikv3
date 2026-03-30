import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar userRole={session.user.role} username={session.user.name ?? undefined} />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav userRole={session.user.role} />
    </div>
  );
}
