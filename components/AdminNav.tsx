"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({ items }: { items: { href: string; label: string; n: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 py-2">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-baseline gap-3 px-3 lg:px-5 py-2.5 transition-colors ${
              active ? "bg-sheet text-blue" : "hover:bg-sheet/10"
            }`}
          >
            <span className={`font-narrow font-bold text-[0.6875rem] w-5 shrink-0 ${active ? "text-blue-2" : "text-sheet/50"}`}>
              {item.n}
            </span>
            <span className="hidden lg:inline stamp">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
