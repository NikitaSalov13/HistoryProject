import type { Metadata } from "next";
import type { ReactNode } from "react";

import { MainNav } from "@/components/layout/MainNav";

import "./globals.css";

export const metadata: Metadata = {
  title: "Тогда / Сейчас",
  description:
    "Образовательный сервис с интерактивной картой Санкт-Петербурга: сравнение фотографий периода блокады Ленинграда и современного вида мест."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-parchment text-ink antialiased">
        <div className="relative min-h-screen overflow-x-clip">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_circle_at_15%_15%,rgba(31,95,120,0.18),transparent_45%),radial-gradient(1000px_circle_at_100%_100%,rgba(139,62,47,0.15),transparent_55%)]" />
          <MainNav />
          <main className="w-full px-3 pb-6 pt-3 sm:px-4 lg:px-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
