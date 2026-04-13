"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FiltersBar } from "@/components/controls/FiltersBar";
import { PlaceCard } from "@/components/panels/PlaceCard";
import type { Place, PlaceType } from "@/lib/types";

const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-white">
      <p className="text-sm font-semibold text-slate-600">Загрузка карты...</p>
    </div>
  )
});

const ALL_TYPES = "Все";
const defaultFocus = {
  lat: 59.9343,
  lng: 30.3351,
  zoom: 13
};

const typeColors: Record<PlaceType, string> = {
  Памятники: "#b45309",
  Здания: "#1d4ed8",
  Улицы: "#0f766e",
  Мосты: "#8b3e2f",
  Мемориалы: "#6d28d9"
};

interface PlacesResponse {
  count: number;
  data: Place[];
}

interface TypesResponse {
  data: string[];
}

const normalize = (value: string) => value.trim().toLocaleLowerCase("ru-RU");

const measureDistance = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latDistance = toRadians(b.lat - a.lat);
  const lngDistance = toRadians(b.lng - a.lng);
  const c1 =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      Math.sin(lngDistance / 2) *
      Math.sin(lngDistance / 2);
  const c2 = 2 * Math.atan2(Math.sqrt(c1), Math.sqrt(1 - c1));
  return earthRadiusKm * c2;
};

export function MapExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlStateInitialized = useRef(false);

  const [places, setPlaces] = useState<Place[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState(ALL_TYPES);
  const [searchValue, setSearchValue] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [focusPoint, setFocusPoint] = useState(defaultFocus);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorText(null);

      try {
        const [placesResponse, typesResponse] = await Promise.all([
          fetch("/api/places", { cache: "no-store" }),
          fetch("/api/types", { cache: "no-store" })
        ]);

        if (!placesResponse.ok || !typesResponse.ok) {
          throw new Error("Request failed");
        }

        const placesPayload = (await placesResponse.json()) as PlacesResponse;
        const typesPayload = (await typesResponse.json()) as TypesResponse;

        if (!isMounted) {
          return;
        }

        setPlaces(placesPayload.data);
        setTypes(typesPayload.data);
      } catch {
        if (isMounted) {
          setErrorText("Не удалось загрузить данные. Обновите страницу.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!places.length || urlStateInitialized.current) {
      return;
    }

    const placeFromUrl = searchParams.get("place");
    if (!placeFromUrl) {
      urlStateInitialized.current = true;
      return;
    }

    const place = places.find((item) => item.id === placeFromUrl);
    if (place) {
      setSelectedPlaceId(place.id);
      setFocusPoint({
        lat: place.coordinates.lat,
        lng: place.coordinates.lng,
        zoom: 16
      });
    }

    urlStateInitialized.current = true;
  }, [places, searchParams]);

  const allFilterTypes = useMemo(() => [ALL_TYPES, ...types], [types]);

  const filteredPlaces = useMemo(() => {
    const normalizedSearch = normalize(searchValue);

    return places.filter((place) => {
      const matchesType = selectedType === ALL_TYPES || place.type === selectedType;
      const matchesSearch =
        !normalizedSearch ||
        normalize(place.title).includes(normalizedSearch) ||
        normalize(place.address).includes(normalizedSearch);

      return matchesType && matchesSearch;
    });
  }, [places, searchValue, selectedType]);

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId]
  );

  const mapPlaces = useMemo(() => {
    if (selectedPlace && !filteredPlaces.some((place) => place.id === selectedPlace.id)) {
      return [...filteredPlaces, selectedPlace];
    }

    return filteredPlaces;
  }, [filteredPlaces, selectedPlace]);

  const setPlaceQueryParam = useCallback(
    (placeId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (placeId) {
        params.set("place", placeId);
      } else {
        params.delete("place");
      }

      const queryString = params.toString();
      router.replace(queryString ? `/?${queryString}` : "/", { scroll: false });
    },
    [router, searchParams]
  );

  const handleSelectPlace = useCallback(
    (placeId: string) => {
      const place = places.find((item) => item.id === placeId);
      if (!place) {
        return;
      }

      setSelectedPlaceId(placeId);
      setCopySuccess(false);
      setFocusPoint({
        lat: place.coordinates.lat,
        lng: place.coordinates.lng,
        zoom: 16
      });
      setPlaceQueryParam(placeId);
    },
    [places, setPlaceQueryParam]
  );

  const handleCloseCard = useCallback(() => {
    setSelectedPlaceId(null);
    setCopySuccess(false);
    setPlaceQueryParam(null);
  }, [setPlaceQueryParam]);

  const handleResetFilters = useCallback(() => {
    setSelectedType(ALL_TYPES);
    setSearchValue("");
    setErrorText(null);
    setSelectedPlaceId(null);
    setFocusPoint(defaultFocus);
    setPlaceQueryParam(null);
  }, [setPlaceQueryParam]);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorText("Геолокация недоступна в этом браузере.");
      return;
    }

    const source = filteredPlaces.length ? filteredPlaces : places;
    if (!source.length) {
      setErrorText("Нет точек для поиска ближайшего места.");
      return;
    }

    setIsLocating(true);
    setErrorText(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        setUserPosition(current);
        setFocusPoint({
          lat: current.lat,
          lng: current.lng,
          zoom: 14
        });

        let nearest = source[0];
        let minDistance = measureDistance(current, source[0].coordinates);

        for (const place of source.slice(1)) {
          const distance = measureDistance(current, place.coordinates);
          if (distance < minDistance) {
            minDistance = distance;
            nearest = place;
          }
        }

        handleSelectPlace(nearest.id);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setErrorText("Не удалось определить местоположение. Проверьте разрешение геолокации.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [filteredPlaces, handleSelectPlace, places]);

  const handleCopyLink = useCallback(async () => {
    if (!selectedPlace) {
      return;
    }

    try {
      const shareUrl = `${window.location.origin}/?place=${selectedPlace.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setErrorText("Не удалось скопировать ссылку. Скопируйте адрес страницы вручную.");
    }
  }, [selectedPlace]);

  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_430px]">
      <div className="space-y-3">
        <FiltersBar
          types={allFilterTypes}
          selectedType={selectedType}
          searchValue={searchValue}
          resultCount={filteredPlaces.length}
          isLocating={isLocating}
          onTypeChange={setSelectedType}
          onSearchChange={setSearchValue}
          onLocateMe={handleLocateMe}
          onReset={handleResetFilters}
        />

        {errorText ? (
          <p
            className="rounded-2xl border border-amber-600/30 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
            role="alert"
          >
            {errorText}
          </p>
        ) : null}

        <div className="relative h-[calc(100vh-13rem)] min-h-[440px] overflow-hidden rounded-3xl border border-slate-800/10 bg-white shadow-panel">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-base font-semibold text-slate-600">Загрузка точек...</p>
            </div>
          ) : (
            <MapCanvas
              places={mapPlaces}
              selectedPlaceId={selectedPlaceId}
              focusPoint={focusPoint}
              userPosition={userPosition}
              onSelectPlace={handleSelectPlace}
            />
          )}

          <aside
            className="pointer-events-none absolute bottom-3 left-3 z-[500] max-w-[220px] rounded-2xl border border-slate-800/10 bg-white/95 p-3 shadow"
            aria-label="Легенда"
          >
            <p className="text-sm font-bold text-ink">Легенда</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {(types as PlaceType[]).map((type) => (
                <li key={type} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: typeColors[type] }}
                    aria-hidden="true"
                  />
                  <span>{type}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="h-[calc(100vh-13rem)] min-h-[440px]">
          {selectedPlace ? (
            <PlaceCard
              place={selectedPlace}
              onClose={handleCloseCard}
              onCopyLink={handleCopyLink}
              copySuccess={copySuccess}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-slate-800/10 bg-white/90 p-6 text-center shadow-panel">
              <p className="max-w-xs text-xl font-semibold text-ink">
                Выберите точку на карте, чтобы открыть карточку места.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                В карточке доступны сравнение «Тогда / Сейчас», описание и ссылка
                на архивный источник.
              </p>
            </div>
          )}
        </div>
      </aside>

      {selectedPlace ? (
        <>
          <button
            type="button"
            aria-label="Закрыть карточку места"
            className="fixed inset-0 z-[1100] bg-black/35 lg:hidden"
            onClick={handleCloseCard}
          />
          <div className="fixed inset-x-0 bottom-0 z-[1200] h-[80vh] rounded-t-3xl border border-slate-800/10 bg-white p-2 shadow-[0_-12px_32px_rgba(0,0,0,0.2)] lg:hidden">
            <div className="mx-auto my-2 h-1.5 w-12 rounded-full bg-slate-300" aria-hidden="true" />
            <div className="h-[calc(80vh-1.5rem)]">
              <PlaceCard
                place={selectedPlace}
                onClose={handleCloseCard}
                onCopyLink={handleCopyLink}
                copySuccess={copySuccess}
              />
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
