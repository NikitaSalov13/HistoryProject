"use client";

interface FiltersBarProps {
  types: string[];
  selectedType: string;
  searchValue: string;
  resultCount: number;
  isLocating: boolean;
  onTypeChange: (type: string) => void;
  onSearchChange: (value: string) => void;
  onLocateMe: () => void;
  onReset: () => void;
}

export function FiltersBar({
  types,
  selectedType,
  searchValue,
  resultCount,
  isLocating,
  onTypeChange,
  onSearchChange,
  onLocateMe,
  onReset
}: FiltersBarProps) {
  return (
    <section
      className="rounded-3xl border border-slate-800/10 bg-white/95 p-3 shadow-panel sm:p-4"
      aria-label="Фильтры и поиск"
    >
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 rounded-2xl border border-slate-800/15 bg-white px-3 py-2">
          <span className="text-sm font-semibold text-slate-600">Поиск</span>
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            type="search"
            className="min-h-8 w-full border-0 bg-transparent text-base text-ink outline-none placeholder:text-slate-500"
            placeholder="Название или адрес"
            aria-label="Поиск по названию и адресу"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Тип места">
          {types.map((type) => {
            const isActive = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition ${
                  isActive
                    ? "border-ink bg-ink text-white"
                    : "border-slate-300 bg-white text-ink hover:border-sea"
                }`}
                onClick={() => onTypeChange(type)}
                aria-pressed={isActive}
              >
                {type}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onLocateMe}
            className="inline-flex min-h-11 items-center rounded-full border border-sea bg-sea px-4 text-sm font-semibold text-white transition hover:bg-[#174d62]"
          >
            {isLocating ? "Определяем..." : "Ближайшие точки"}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-ink transition hover:border-slate-500"
          >
            Сбросить
          </button>
          <p className="text-sm text-slate-600" aria-live="polite">
            Найдено: {resultCount}
          </p>
        </div>
      </div>
    </section>
  );
}
