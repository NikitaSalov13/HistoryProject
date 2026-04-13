import { Suspense } from "react";

import { MapExplorer } from "@/components/map/MapExplorer";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-slate-800/10 bg-white/90 shadow-panel">
          <p className="text-base font-semibold text-slate-600">Загрузка интерфейса...</p>
        </div>
      }
    >
      <MapExplorer />
    </Suspense>
  );
}
