"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "首页" },
  { href: "/notes", label: "笔记" },
  { href: "/blog", label: "博客" },
  { href: "/about", label: "关于" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();

  const home = pathname === "/";

  return (
    <header
      className={`z-20 bg-background ${home ? "absolute inset-x-0 top-0" : "border-b border-line"}`}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3">
        <Link href="/" className="text-sm font-bold tracking-[0.14em] text-white">
          Kayne
        </Link>
        <nav aria-label="站内导航">
          <ul className="flex flex-wrap items-center gap-1 text-sm">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex border-b px-3 py-1.5 ${
                      active
                        ? "border-white text-white"
                        : "border-transparent text-muted hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
