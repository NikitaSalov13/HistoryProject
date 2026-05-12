"use client";

import Link from "next/link";
import {
  type PointerEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import { PhotoCompare } from "@/components/photo/PhotoCompare";
import { buildCoverPositionedStyle, COMPARE_FRAME_ASPECT_RATIO } from "@/lib/image-layout";
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
  image_then_zoom: string;
  image_then_x: string;
  image_then_y: string;
  image_now_zoom: string;
  image_now_x: string;
  image_now_y: string;
  source_title: string;
  source_author: string;
  source_url: string;
  source_license: string;
  verification_status: "verified" | "needs_review";
}

interface MediaFileInfo {
  name: string;
  url: string;
  size: number;
  updatedAt: string;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
const previewFrameAspectRatio = COMPARE_FRAME_ASPECT_RATIO;

const parseNumericInput = (
  value: string,
  min: number,
  max: number,
  fallback: number,
  precision = 0
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const normalized = clamp(parsed, min, max);
  return precision > 0 ? Number(normalized.toFixed(precision)) : Math.round(normalized);
};

const parseNumericUnbounded = (value: string, fallback: number, precision = 0): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return precision > 0 ? Number(parsed.toFixed(precision)) : Math.round(parsed);
};

const imageStyle = (zoomRaw: string, xRaw: string, yRaw: string, imageRatio: number) => {
  const zoom = parseNumericInput(zoomRaw, 0.6, 1.8, 1, 2);
  const xForLayout = parseNumericUnbounded(xRaw, 50, 2);
  const yForLayout = parseNumericUnbounded(yRaw, 50, 2);
  return buildCoverPositionedStyle({
    imageRatio,
    zoom,
    x: xForLayout,
    y: yForLayout,
    frameAspectRatio: previewFrameAspectRatio
  });
};

const buildImageView = (zoomRaw: string, xRaw: string, yRaw: string) => ({
  zoom: parseNumericInput(zoomRaw, 0.6, 1.8, 1, 2),
  x: parseNumericUnbounded(xRaw, 50, 2),
  y: parseNumericUnbounded(yRaw, 50, 2)
});

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
  image_then_zoom: "1",
  image_then_x: "50",
  image_then_y: "50",
  image_now_zoom: "1",
  image_now_x: "50",
  image_now_y: "50",
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
  image_then_zoom: String(place.images.then_view?.zoom ?? 1),
  image_then_x: String(place.images.then_view?.x ?? 50),
  image_then_y: String(place.images.then_view?.y ?? 50),
  image_now_zoom: String(place.images.now_view?.zoom ?? 1),
  image_now_x: String(place.images.now_view?.x ?? 50),
  image_now_y: String(place.images.now_view?.y ?? 50),
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
  const [mediaFiles, setMediaFiles] = useState<MediaFileInfo[]>([]);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [isMediaUploading, setIsMediaUploading] = useState(false);
  const [mediaErrorText, setMediaErrorText] = useState<string | null>(null);
  const [thenPreviewRatio, setThenPreviewRatio] = useState(previewFrameAspectRatio);
  const [nowPreviewRatio, setNowPreviewRatio] = useState(previewFrameAspectRatio);

  useEffect(() => {
    setThenPreviewRatio(previewFrameAspectRatio);
  }, [form.image_then]);

  useEffect(() => {
    setNowPreviewRatio(previewFrameAspectRatio);
  }, [form.image_now]);

  const updatePreviewCenterFromPointer = (
    event: PointerEvent<HTMLDivElement>,
    target: "then" | "now"
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      return;
    }

    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    setForm((prev) =>
      target === "then"
        ? {
            ...prev,
            image_then_x: String(Number(x.toFixed(2))),
            image_then_y: String(Number(y.toFixed(2)))
          }
        : {
            ...prev,
            image_now_x: String(Number(x.toFixed(2))),
            image_now_y: String(Number(y.toFixed(2)))
          }
    );
  };

  const handlePreviewPointerDown =
    (target: "then" | "now") => (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      updatePreviewCenterFromPointer(event, target);
    };

  const handlePreviewPointerMove =
    (target: "then" | "now") => (event: PointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        return;
      }

      updatePreviewCenterFromPointer(event, target);
    };

  const handlePreviewPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleThenPreviewImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const ratio = event.currentTarget.naturalWidth / Math.max(event.currentTarget.naturalHeight, 1);
    if (Number.isFinite(ratio) && ratio > 0) {
      setThenPreviewRatio(ratio);
    }
  };

  const handleNowPreviewImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const ratio = event.currentTarget.naturalWidth / Math.max(event.currentTarget.naturalHeight, 1);
    if (Number.isFinite(ratio) && ratio > 0) {
      setNowPreviewRatio(ratio);
    }
  };

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
      now_alt: form.image_now_alt.trim(),
      then_view: buildImageView(form.image_then_zoom, form.image_then_x, form.image_then_y),
      now_view: buildImageView(form.image_now_zoom, form.image_now_x, form.image_now_y)
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

  const loadMediaFiles = useCallback(async () => {
    setIsMediaLoading(true);
    setMediaErrorText(null);

    try {
      const response = await fetch("/api/admin/media");
      const payload = (await response.json()) as { data?: MediaFileInfo[]; error?: string };

      if (!response.ok || !payload.data) {
        setMediaErrorText(payload.error ?? "Не удалось загрузить список файлов.");
        return;
      }

      setMediaFiles(payload.data);
    } catch {
      setMediaErrorText("Ошибка сети при загрузке списка файлов.");
    } finally {
      setIsMediaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMediaFiles();
  }, [loadMediaFiles]);

  const handleUploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) {
      return;
    }

    setIsMediaUploading(true);
    setMediaErrorText(null);
    setErrorText(null);
    setStatusText(null);

    try {
      const uploadedUrls: string[] = [];

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.set("file", file);

        const response = await fetch("/api/admin/media", {
          method: "POST",
          body: formData
        });
        const payload = (await response.json()) as { data?: MediaFileInfo; error?: string };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? `Не удалось загрузить файл: ${file.name}`);
        }

        uploadedUrls.push(payload.data.url);
      }

      await loadMediaFiles();

      setForm((previous) => {
        const nextThen = previous.image_then || uploadedUrls[0] || "";
        const nextNow = previous.image_now || uploadedUrls[1] || uploadedUrls[0] || "";

        return {
          ...previous,
          image_then: nextThen,
          image_now: nextNow
        };
      });

      setStatusText(`Загружено файлов: ${uploadedUrls.length}.`);
    } catch (error) {
      if (error instanceof Error) {
        setMediaErrorText(error.message);
      } else {
        setMediaErrorText("Не удалось загрузить файлы.");
      }
    } finally {
      setIsMediaUploading(false);
      event.target.value = "";
    }
  };

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

  const previewYearThen = parseNumericInput(form.year_then, 1900, 2100, 1942, 0);
  const previewYearNow = parseNumericInput(
    form.year_now,
    1900,
    2100,
    new Date().getFullYear(),
    0
  );
  const previewTitle = form.title.trim() || "Предпросмотр карточки";
  const previewThenAlt = form.image_then_alt.trim() || "Фото тогда";
  const previewNowAlt = form.image_now_alt.trim() || "Фото сейчас";

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

            <section className="rounded-2xl border border-slate-800/10 bg-slate-50/80 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-ink">Медиатека</h3>
                <button
                  type="button"
                  onClick={() => void loadMediaFiles()}
                  disabled={isMediaLoading || isMediaUploading}
                  className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-ink transition hover:border-slate-500 disabled:opacity-60"
                >
                  {isMediaLoading ? "Обновляем..." : "Обновить список"}
                </button>
              </div>

              <p className="mt-1 text-xs text-slate-600">
                Файлы сохраняются в <code>/public/uploads</code> и доступны только после загрузки.
              </p>

              <label className="mt-3 block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Загрузить фото
                </span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif,.avif,image/jpeg,image/png,image/webp,image/gif,image/avif"
                  multiple
                  onChange={handleUploadFiles}
                  disabled={isMediaUploading}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-sea file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[#174d62] disabled:opacity-60"
                />
              </label>

              <p className="mt-2 text-xs font-semibold text-slate-600">
                {isMediaUploading
                  ? "Загрузка файлов..."
                  : isMediaLoading
                    ? "Загрузка списка файлов..."
                    : `Файлов в медиатеке: ${mediaFiles.length}`}
              </p>

              {mediaErrorText ? (
                <p className="mt-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {mediaErrorText}
                </p>
              ) : null}
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Фото тогда (из медиатеки)
                </span>
                <select
                  value={form.image_then}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, image_then: event.target.value }))
                  }
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                >
                  <option value="">Выберите файл</option>
                  {form.image_then && !mediaFiles.some((item) => item.url === form.image_then) ? (
                    <option value={form.image_then}>{form.image_then}</option>
                  ) : null}
                  {mediaFiles.map((item) => (
                    <option key={`then-${item.url}`} value={item.url}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500 break-all">
                  Путь: {form.image_then || "не выбран"}
                </p>
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Фото сейчас (из медиатеки)
                </span>
                <select
                  value={form.image_now}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, image_now: event.target.value }))
                  }
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                >
                  <option value="">Выберите файл</option>
                  {form.image_now && !mediaFiles.some((item) => item.url === form.image_now) ? (
                    <option value={form.image_now}>{form.image_now}</option>
                  ) : null}
                  {mediaFiles.map((item) => (
                    <option key={`now-${item.url}`} value={item.url}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500 break-all">
                  Путь: {form.image_now || "не выбран"}
                </p>
              </label>
            </div>

            <section className="rounded-2xl border border-slate-800/10 bg-slate-50/80 p-3">
              <h3 className="text-lg font-semibold text-ink">Предпросмотр кадрирования</h3>
              <p className="mt-1 text-xs text-slate-600">
                Настройте масштаб и центр кадра отдельно для «Тогда» и «Сейчас».
              </p>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-slate-300 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-700">Фото «Тогда»</p>
                  <div
                    className="relative aspect-[4/3] touch-none overflow-hidden rounded-xl border border-slate-300 bg-slate-100 cursor-grab active:cursor-grabbing"
                    onPointerDown={handlePreviewPointerDown("then")}
                    onPointerMove={handlePreviewPointerMove("then")}
                    onPointerUp={handlePreviewPointerUp}
                    onPointerCancel={handlePreviewPointerUp}
                    aria-label="Предпросмотр фото тогда, перетащите для смещения кадра"
                  >
                    {form.image_then ? (
                      <img
                        src={form.image_then}
                        alt="Предпросмотр фото тогда"
                        className="absolute max-w-none select-none pointer-events-none"
                        style={imageStyle(
                          form.image_then_zoom,
                          form.image_then_x,
                          form.image_then_y,
                          thenPreviewRatio
                        )}
                        onLoad={handleThenPreviewImageLoad}
                        draggable={false}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-500">
                        Выберите файл
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-slate-700">
                        Масштаб: {parseNumericInput(form.image_then_zoom, 0.6, 1.8, 1, 2).toFixed(2)}x
                      </span>
                      <input
                        type="number"
                        min={0.1}
                        step={0.05}
                        value={form.image_then_zoom}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, image_then_zoom: event.target.value }))
                        }
                        className="min-h-10 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-slate-700">
                        Центр по X: {parseNumericUnbounded(form.image_then_x, 50, 2)}%
                      </span>
                      <input
                        type="number"
                        step={1}
                        value={form.image_then_x}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, image_then_x: event.target.value }))
                        }
                        className="min-h-10 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-slate-700">
                        Центр по Y: {parseNumericUnbounded(form.image_then_y, 50, 2)}%
                      </span>
                      <input
                        type="number"
                        step={1}
                        value={form.image_then_y}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, image_then_y: event.target.value }))
                        }
                        className="min-h-10 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-slate-300 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-700">Фото «Сейчас»</p>
                  <div
                    className="relative aspect-[4/3] touch-none overflow-hidden rounded-xl border border-slate-300 bg-slate-100 cursor-grab active:cursor-grabbing"
                    onPointerDown={handlePreviewPointerDown("now")}
                    onPointerMove={handlePreviewPointerMove("now")}
                    onPointerUp={handlePreviewPointerUp}
                    onPointerCancel={handlePreviewPointerUp}
                    aria-label="Предпросмотр фото сейчас, перетащите для смещения кадра"
                  >
                    {form.image_now ? (
                      <img
                        src={form.image_now}
                        alt="Предпросмотр фото сейчас"
                        className="absolute max-w-none select-none pointer-events-none"
                        style={imageStyle(
                          form.image_now_zoom,
                          form.image_now_x,
                          form.image_now_y,
                          nowPreviewRatio
                        )}
                        onLoad={handleNowPreviewImageLoad}
                        draggable={false}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-500">
                        Выберите файл
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-slate-700">
                        Масштаб: {parseNumericInput(form.image_now_zoom, 0.6, 1.8, 1, 2).toFixed(2)}x
                      </span>
                      <input
                        type="number"
                        min={0.1}
                        step={0.05}
                        value={form.image_now_zoom}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, image_now_zoom: event.target.value }))
                        }
                        className="min-h-10 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-slate-700">
                        Центр по X: {parseNumericUnbounded(form.image_now_x, 50, 2)}%
                      </span>
                      <input
                        type="number"
                        step={1}
                        value={form.image_now_x}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, image_now_x: event.target.value }))
                        }
                        className="min-h-10 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-slate-700">
                        Центр по Y: {parseNumericUnbounded(form.image_now_y, 50, 2)}%
                      </span>
                      <input
                        type="number"
                        step={1}
                        value={form.image_now_y}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, image_now_y: event.target.value }))
                        }
                        className="min-h-10 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sea focus:ring-2 focus:ring-sea/25"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800/10 bg-slate-50/80 p-3">
              <h3 className="text-lg font-semibold text-ink">
                Предпросмотр итоговой карточки (со слайдером)
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Этот блок рендерится тем же компонентом, что и у пользователя.
              </p>
              <div className="mt-3">
                <PhotoCompare
                  title={previewTitle}
                  yearThen={previewYearThen}
                  yearNow={previewYearNow}
                  thenImage={form.image_then}
                  nowImage={form.image_now}
                  thenAlt={previewThenAlt}
                  nowAlt={previewNowAlt}
                  thenView={buildImageView(form.image_then_zoom, form.image_then_x, form.image_then_y)}
                  nowView={buildImageView(form.image_now_zoom, form.image_now_x, form.image_now_y)}
                />
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Alt для фото тогда</span>
                <input
                  value={form.image_then_alt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, image_then_alt: event.target.value }))
                  }
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
