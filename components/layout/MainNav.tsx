"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [{ href: "/", label: "Карта" }];

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[1000] border-b border-slate-800/10 bg-parchment/90 backdrop-blur">
      <div className="flex w-full items-center justify-between px-3 py-3 sm:px-4 lg:px-6">
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-2xl font-semibold leading-none text-rust">
            Тогда / Сейчас
          </span>
          <span className="hidden text-sm text-slate-600 sm:inline">
            Блокада Ленинграда: карта памяти
          </span>
        </div>
        <nav aria-label="Основная навигация">
          <ul className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`inline-flex min-h-11 items-center rounded-full px-4 text-base font-semibold transition ${
                      isActive
                        ? "bg-ink text-white"
                        : "bg-white/80 text-ink hover:bg-white"
                    }`}
                    aria-current={isActive ? "page" : undefined}
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
