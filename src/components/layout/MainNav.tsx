"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { strings } from "@/lib/i18n/strings";

const links = [
  { href: "/", label: strings.nav.home },
  { href: "/ipos", label: strings.nav.ipos },
  { href: "/data-sources", label: strings.nav.sources },
];

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 font-mono text-[0.68rem] uppercase tracking-[0.12em]">
      {links.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              active
                ? "rounded-md bg-primary/10 px-3 py-1.5 text-primary"
                : "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
