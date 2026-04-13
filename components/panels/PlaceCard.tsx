"use client";

import type { Place } from "@/lib/types";
import { PhotoCompare } from "@/components/photo/PhotoCompare";

interface PlaceCardProps {
  place: Place;
  onClose: () => void;
  onCopyLink: () => void;
  copySuccess: boolean;
}

const verificationLabels: Record<Place["verification_status"], string> = {
  verified: "Проверено редактором",
  needs_review: "Требует верификации"
};

export function PlaceCard({ place, onClose, onCopyLink, copySuccess }: PlaceCardProps) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-800/10 bg-white shadow-panel">
      <header className="flex items-start justify-between gap-3 border-b border-slate-800/10 p-4 sm:p-5">
        <div>
          <h2 className="text-3xl font-semibold leading-tight text-ink">{place.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{place.address}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">
              {place.type}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {place.year_then} / {place.year_now}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-2xl leading-none text-slate-700 transition hover:border-slate-500"
          aria-label="Закрыть карточку"
        >
          ×
        </button>
      </header>

      <div className="sheet-scroll flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        <PhotoCompare
          title={place.title}
          yearThen={place.year_then}
          yearNow={place.year_now}
          thenImage={place.images.then}
          nowImage={place.images.now}
          thenAlt={place.images.then_alt}
          nowAlt={place.images.now_alt}
        />

        <section aria-label="Описание">
          <h3 className="text-2xl font-semibold text-ink">Описание</h3>
          <p className="mt-2 text-base leading-relaxed text-slate-700">{place.description}</p>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Период архивного изображения: {place.period_then}
          </p>
        </section>

        <section aria-label="Источники">
          <h3 className="text-2xl font-semibold text-ink">Источники</h3>
          <ul className="mt-2 space-y-2">
            {place.sources.map((source) => (
              <li
                key={`${place.id}-${source.url}`}
                className="rounded-2xl border border-slate-800/10 bg-slate-50/80 p-3"
              >
                <p className="text-sm font-bold text-slate-800">{source.title}</p>
                <p className="mt-1 text-sm text-slate-700">Автор: {source.author}</p>
                <p className="mt-1 text-sm text-slate-700">Лицензия: {source.license}</p>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex min-h-10 items-center rounded-full bg-white px-3 text-sm font-semibold text-sea underline-offset-2 hover:underline"
                >
                  Открыть источник
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800/10 bg-slate-50/80 p-3"
          aria-label="Статус верификации"
        >
          <p className="text-sm font-semibold text-slate-700">
            Статус: {verificationLabels[place.verification_status]}
          </p>
          <button
            type="button"
            onClick={onCopyLink}
            className="inline-flex min-h-11 items-center rounded-full border border-sea bg-sea px-4 text-sm font-semibold text-white transition hover:bg-[#174d62]"
          >
            {copySuccess ? "Ссылка скопирована" : "Скопировать ссылку"}
          </button>
        </section>
      </div>
    </article>
  );
}
