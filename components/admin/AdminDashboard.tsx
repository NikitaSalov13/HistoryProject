"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Place } from "@/lib/types";

interface AdminDashboardProps {
  adminUsername: string;
  initialPlaces: Place[];
  placeTypes: string[];
}

interface PlaceFormState {
  id: string;
  title: string;
  type: string;
  address: string;
  lat: string;
  lng: string;
  period_then: string;
  year_then: string;
  year_now: string;
  description: string;
  image_then: string;
  image_now: string;
  image_then_alt: string;
  image_now_alt: string;
  source_title: string;
  source_author: string;
  source_url: string;
  source_license: string;
  verification_status: "verified" | "needs_review";
}

const createEmptyForm = (defaultType: string): PlaceFormState => ({
  id: "",
  title: "",
  type: defaultType,
  address: "",
  lat: "",
  lng: "",
  period_then: "1941-1944",
  year_then: "1942",
  year_now: `${new Date().getFullYear()}`,
  description: "",
  image_then: "",
  image_now: "",
  image_then_alt: "",
  image_now_alt: "",
  source_title: "",
  source_author: "",
  source_url: "",
  source_license: "",
  verification_status: "verified"
});

const placeToForm = (place: Place): PlaceFormState => ({
  id: place.id,
  title: place.title,
  type: place.type,
  address: place.address,
  lat: String(place.coordinates.lat),
  lng: String(place.coordinates.lng),
  period_then: place.period_then,
  year_then: String(place.year_then),
  year_now: String(place.year_now),
  description: place.description,
  image_then: place.images.then,
  image_now: place.images.now,
  image_then_alt: place.images.then_alt,
  image_now_alt: place.images.now_alt,
  source_title: place.sources[0]?.title ?? "",
  source_author: place.sources[0]?.author ?? "",
  source_url: place.sources[0]?.url ?? "",
  source_license: place.sources[0]?.license ?? "",
  verification_status: place.verification_status
});

const sortByTitle = (places: Place[]): Place[] =>
  [...places].sort((a, b) => a.title.localeCompare(b.title, "ru-RU"));

export function AdminDashboard({
  adminUsername,
  initialPlaces,
  placeTypes
}: AdminDashboardProps) {
  const safeTypes = useMemo(() => (placeTypes.length ? placeTypes : ["Здания"]), [placeTypes]);
  const [places, setPlaces] = useState<Place[]>(sortByTitle(initialPlaces));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlaceFormState>(createEmptyForm(safeTypes[0]));
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setForm(createEmptyForm(safeTypes[0]));
  };

  const selectForEdit = (place: Place) => {
    setEditingId(place.id);
    setForm(placeToForm(place));
    setStatusText(null);
    setErrorText(null);
  };

  const parsePayload = () => ({
    id: form.id.trim(),
    title: form.title.trim(),
    type: form.type,
    address: form.address.trim(),
    coordinates: {
      lat: Number(form.lat),
      lng: Number(form.lng)
    },
    period_then: form.period_then.trim(),
    year_then: Number(form.year_then),
    year_now: Number(form.year_now),
    description: form.description.trim(),
    images: {
      then: form.image_then.trim(),
      now: form.image_now.trim(),
      then_alt: form.image_then_alt.trim(),
      now_alt: form.image_now_alt.trim()
    },
    sources: [
      {
        title: form.source_title.trim(),
        author: form.source_author.trim(),
        url: form.source_url.trim(),
        license: form.source_license.trim()
      }
    ],
    verification_status: form.verification_status
  });

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorText(null);
    setStatusText(null);
    setIsSaving(true);

    try {
      const payload = parsePayload();
      const isEdit = !!editingId;

      const response = await fetch(
        isEdit ? `/api/places/${encodeURIComponent(editingId)}` : "/api/places",
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const responsePayload = (await response.json()) as { data?: Place; error?: string };
      if (!response.ok || !responsePayload.data) {
        setErrorText(responsePayload.error ?? "Не удалось сохранить место.");
        return;
      }

      const savedPlace = responsePayload.data;
      setPlaces((previous) => {
        const index = previous.findIndex((place) => place.id === savedPlace.id);
        if (index === -1) {
          return sortByTitle([...previous, savedPlace]);
        }

        const next = [...previous];
        next[index] = savedPlace;
        return sortByTitle(next);
      });

      setStatusText(isEdit ? "Карточка обновлена." : "Новая карточка добавлена.");
      resetForm();
    } catch {
      setErrorText("Ошибка сети при сохранении. Повторите попытку.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrorText(null);
    setStatusText(null);

    const target = places.find((place) => place.id === id);
    if (!target) {
      return;
    }

    if (!window.confirm(`Удалить место "${target.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/places/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setErrorText(payload.error ?? "Не удалось удалить место.");
        return;
      }

      setPlaces((previous) => previous.filter((place) => place.id !== id));
      if (editingId === id) {
        resetForm();
      }
      setStatusText("Карточка удалена.");
    } catch {
      setErrorText("Ошибка сети при удалении. Повторите попытку.");
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/admin/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <section className="space-y-3">
      <header className="rounded-3xl border border-slate-800/10 bg-white/95 p-4 shadow-panel sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-semibold text-rust sm:text-5xl">Админ-панель</h1>
            <p className="mt-1 text-sm text-slate-600">Вход выполнен: {adminUsername}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-ink transition hover:border-slate-500"
            >
              Открыть карту
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex min-h-11 items-center rounded-full border border-ink bg-ink px-4 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-70"
            >
              {isLoggingOut ? "Выходим..." : "Выйти"}
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
        <section className="rounded-3xl border border-slate-800/10 bg-white/95 p-4 shadow-panel sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-3xl font-semibold text-ink">
              {editingId ? "Редактирование места" : "Добавление места"}
            </h2>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-ink transition hover:border-slate-500"
              >
                Отменить
              </button>
            ) : null}
          </div>

          {statusText ? (
            <p className="mb-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              {statusText}
            </p>
          ) : null}
          {errorText ? (
            <p className="mb-3 rounded-2xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {errorText}
            </p>
          ) : null}

          <form onSubmit={handleSave} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">ID</span>
                <input
                  value={form.id}
                  onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
                  required
                  disabled={!!editingId}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25 disabled:bg-slate-100"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Тип</span>
                <select
                  value={form.type}
                  onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                >
                  {safeTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-700">Название</span>
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                required
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-700">Адрес</span>
              <input
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                required
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Широта (lat)</span>
                <input
                  type="number"
                  step="0.000001"
                  value={form.lat}
                  onChange={(event) => setForm((prev) => ({ ...prev, lat: event.target.value }))}
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Долгота (lng)</span>
                <input
                  type="number"
                  step="0.000001"
                  value={form.lng}
                  onChange={(event) => setForm((prev) => ({ ...prev, lng: event.target.value }))}
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Период</span>
                <input
                  value={form.period_then}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, period_then: event.target.value }))
                  }
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Год тогда</span>
                <input
                  type="number"
                  value={form.year_then}
                  onChange={(event) => setForm((prev) => ({ ...prev, year_then: event.target.value }))}
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Год сейчас</span>
                <input
                  type="number"
                  value={form.year_now}
                  onChange={(event) => setForm((prev) => ({ ...prev, year_now: event.target.value }))}
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                />
              </label>
            </div>

            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-700">Описание</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                required
                rows={5}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Фото тогда (URL)</span>
                <input
                  type="url"
                  value={form.image_then}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, image_then: event.target.value }))
                  }
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Фото сейчас (URL)</span>
                <input
                  type="url"
                  value={form.image_now}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, image_now: event.target.value }))
                  }
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Alt для фото тогда</span>
                <input
                  value={form.image_then_alt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, image_then_alt: event.target.value }))
                  }
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Alt для фото сейчас</span>
                <input
                  value={form.image_now_alt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, image_now_alt: event.target.value }))
                  }
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Источник: название</span>
                <input
                  value={form.source_title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, source_title: event.target.value }))
                  }
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Источник: автор</span>
                <input
                  value={form.source_author}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, source_author: event.target.value }))
                  }
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Источник: ссылка</span>
                <input
                  type="url"
                  value={form.source_url}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, source_url: event.target.value }))
                  }
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Источник: лицензия</span>
                <input
                  value={form.source_license}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, source_license: event.target.value }))
                  }
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                />
              </label>
            </div>

            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Статус верификации
              </span>
              <select
                value={form.verification_status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    verification_status: event.target.value as Place["verification_status"]
                  }))
                }
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
              >
                <option value="verified">Проверено редактором</option>
                <option value="needs_review">Требует верификации</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-sea px-5 text-sm font-semibold text-white transition hover:bg-[#174d62] disabled:opacity-70"
            >
              {isSaving ? "Сохраняем..." : editingId ? "Сохранить изменения" : "Добавить место"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-800/10 bg-white/95 p-4 shadow-panel sm:p-5">
          <h2 className="text-3xl font-semibold text-ink">Текущие места ({places.length})</h2>
          <div className="mt-3 max-h-[72vh] space-y-2 overflow-y-auto pr-1">
            {places.map((place) => (
              <article
                key={place.id}
                className="rounded-2xl border border-slate-800/10 bg-white p-3 shadow-sm"
              >
                <p className="text-sm font-bold text-ink">{place.title}</p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {place.type} • {place.address}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">ID: {place.id}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => selectForEdit(place)}
                    className="inline-flex min-h-10 items-center rounded-full border border-slate-300 px-3 text-xs font-semibold text-ink transition hover:border-slate-500"
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(place.id)}
                    className="inline-flex min-h-10 items-center rounded-full border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Удалить
                  </button>
                </div>
              </article>
            ))}
            {!places.length ? (
              <p className="rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Список пуст.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
