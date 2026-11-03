import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/logout";

export default async function DriveLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || (session.role !== "driver" && session.role !== "attendant")) redirect("/login");

  return (
    <div className="min-h-screen bg-wall">
      <header className="bg-ink text-sheet px-4 py-2.5 flex items-center justify-between gap-3">
        <span className="font-narrow font-bold uppercase tracking-[0.14em] text-[0.8125rem]">RouteBoard</span>
        <div className="flex items-center gap-4 min-w-0">
          <span className="stamp text-sheet/60 truncate">{session.fullName}</span>
          <form action={logoutAction}>
            <button className="stamp text-sheet/60 hover:text-sheet">Out</button>
          </form>
        </div>
      </header>
      <main className="max-w-md mx-auto bg-sheet min-h-[calc(100vh-2.875rem)]">{children}</main>
    </div>
  );
}
