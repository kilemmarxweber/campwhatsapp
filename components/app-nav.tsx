"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type AppNavItem = {
  href: string;
  label: string;
};

function isActive(pathname: string, href: string, allHrefs: string[]) {
  const matches = allHrefs
    .filter((item) => pathname === item || pathname.startsWith(`${item}/`))
    .sort((a, b) => b.length - a.length);
  return matches[0] === href;
}

export function AppNav({ items }: { items: AppNavItem[] }) {
  const pathname = usePathname();
  const hrefs = items.map((item) => item.href);

  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 pb-3">
      {items.map((item) => {
        const active = isActive(pathname, item.href, hrefs);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
