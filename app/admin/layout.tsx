import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/logout";

/* The index down the left edge of the chart, inked solid so the sheet beside
   it reads as paper. Roman numerals are the timetable's own wayfinding. */
const NAV = [
  { href: "/admin", label: "Today", n: "I" },
  { href: "/admin/students", label: "Students", n: "II" },
  { href: "/admin/routes", label: "Routes", n: "III" },
  { href: "/admin/buses", label: "Buses", n: "IV" },
  { href: "/admin/staff", label: "Staff", n: "V" },
  { href: "/admin/schedule", label: "Schedule", n: "VI" },
  { href: "/admin/messages", label: "Messages", n: "VII" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  return (
    <div className="min-h-screen flex">
      <aside className="w-14 lg:w-56 shrink-0 bg-blue text-sheet flex flex-col sticky top-0 h-screen">
        <div className="px-3 lg:px-5 py-4 border-b border-sheet/20">
          <div className="font-narrow font-bold uppercase tracking-[0.14em] text-[0.9375rem] leading-none">
            <span className="lg:hidden">RB</span>
            <span className="hidden lg:inline">RouteBoard</span>
          </div>
          <div className="hidden lg:block typed text-[0.6875rem] text-sheet/60 mt-1.5 truncate">
            {session.fullName}
          </div>
        </div>

        <AdminNav items={NAV} />

        <form action={logoutAction} className="px-3 lg:px-5 py-4 border-t border-sheet/20">
          <button className="stamp text-sheet/60 hover:text-sheet transition-colors">
            <span className="lg:hidden">Out</span>
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </form>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
