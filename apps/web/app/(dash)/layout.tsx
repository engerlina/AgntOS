import { Logo } from "@/components/brand";
import { DashNav } from "@/components/dashboard/nav";
import { requireUser } from "@/lib/session";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  // Real authorization (middleware is only an optimistic redirect).
  await requireUser();

  return (
    <div className="flex min-h-dvh flex-col bg-cloud">
      <header className="sticky top-0 z-10 border-b-2 border-line bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Logo href="/dashboard" />
          <DashNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">{children}</main>
    </div>
  );
}
