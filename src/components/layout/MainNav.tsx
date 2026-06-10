"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";

export function MainNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const links = [
    { href: "/", label: t.nav.home },
    { href: "/ipos", label: t.nav.ipos },
    { href: "/data-sources", label: t.nav.sources },
  ];
  return (
    <nav className="flex items-center gap-5 text-[0.8rem] font-medium">
      {links.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              active
                ? "text-primary"
                : "text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
