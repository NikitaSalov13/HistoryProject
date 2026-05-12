"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";

import { getPlaceTypeColor } from "@/lib/place-colors";
import type { Place } from "@/lib/types";

interface FocusPoint {
  lat: number;
  lng: number;
  zoom: number;
}

interface MapCanvasProps {
  places: Place[];
  selectedPlaceId: string | null;
  focusPoint: FocusPoint | null;
  userPosition: { lat: number; lng: number } | null;
  onSelectPlace: (id: string) => void;
}

interface YMapsModules {
  YMap: React.ComponentType<Record<string, unknown>>;
  YMapDefaultSchemeLayer: React.ComponentType<Record<string, unknown>>;
  YMapDefaultFeaturesLayer: React.ComponentType<Record<string, unknown>>;
  YMapMarker: React.ComponentType<Record<string, unknown>>;
  YMapControls?: React.ComponentType<Record<string, unknown>>;
  YMapZoomControl?: React.ComponentType<Record<string, unknown>>;
  YMapClusterer: React.ComponentType<Record<string, unknown>>;
  clusterByGrid: (config: { gridSize: number }) => unknown;
}

declare global {
  interface Window {
    ymaps3?: {
      ready: Promise<void>;
      import: (name: string) => Promise<Record<string, unknown>>;
    };
  }
}

const defaultCenter: [number, number] = [30.3351, 59.9343];
const scriptId = "yandex-maps-v3-script";
const clustererPackageName = "@yandex/ymaps3-clusterer@0.0.1";
let yandexScriptLoadPromise: Promise<void> | null = null;

const waitForYMaps = async (timeoutMs = 10000): Promise<void> => {
  const startedAt = Date.now();
  while (!window.ymaps3) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Yandex Maps API did not initialize in time");
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, 50);
    });
  }
};

const getYandexScriptUrl = (apiKey: string): string => {
  const baseUrl = (
    process.env.NEXT_PUBLIC_YANDEX_MAPS_JS_ENDPOINT?.trim() || "https://api-maps.yandex.ru/v3/"
  ).replace(/\?+$/, "");

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
};

const loadYandexMapsScript = async (apiKey: string): Promise<void> => {
  if (window.ymaps3) {
    return;
  }

  if (yandexScriptLoadPromise) {
    await yandexScriptLoadPromise;
    return;
  }

  yandexScriptLoadPromise = (async () => {
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      await waitForYMaps(10000);
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = getYandexScriptUrl(apiKey);
      script.async = true;
      script.onload = async () => {
        try {
          await waitForYMaps(5000);
          resolve();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          reject(
            new Error(
              `Yandex script loaded but ymaps3 is missing. ${message}. URL: ${script.src}`
            )
          );
        }
      };
      script.onerror = () =>
        reject(new Error(`Failed to load Yandex Maps API script: ${script.src}`));
      document.head.appendChild(script);
    });
  })().catch((error) => {
    yandexScriptLoadPromise = null;
    throw error;
  });

  await yandexScriptLoadPromise;
};

export default function MapCanvas({
  places,
  selectedPlaceId,
  focusPoint,
  userPosition,
  onSelectPlace
}: MapCanvasProps) {
  const [modules, setModules] = useState<YMapsModules | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [location, setLocation] = useState<Record<string, unknown>>({
    center: defaultCenter,
    zoom: 13
  });

  useEffect(() => {
    if (!focusPoint) {
      return;
    }

    setLocation({
      center: [focusPoint.lng, focusPoint.lat],
      zoom: focusPoint.zoom,
      duration: 500
    });
  }, [focusPoint]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim();
      if (!apiKey) {
        setErrorText("Yandex API key is missing: set NEXT_PUBLIC_YANDEX_MAPS_API_KEY in .env");
        return;
      }

      try {
        await loadYandexMapsScript(apiKey);

        const ymaps3 = window.ymaps3;
        if (!ymaps3) {
          throw new Error("Yandex Maps API is unavailable");
        }

        await ymaps3.ready;

        const ymaps3Reactify = (await ymaps3.import(
          "@yandex/ymaps3-reactify"
        )) as unknown as {
          reactify: {
            bindTo: (
              react: typeof React,
              reactDom: typeof ReactDOM
            ) => {
              module: (value: Record<string, unknown>) => Record<string, unknown>;
            };
          };
        };

        const reactify = ymaps3Reactify.reactify.bindTo(React, ReactDOM);
        const clustererPackage = await ymaps3.import(clustererPackageName);

        if (cancelled) {
          return;
        }

        const core = reactify.module(ymaps3 as unknown as Record<string, unknown>);
        const clusterer = reactify.module(clustererPackage);

        setModules({
          ...(core as Omit<YMapsModules, "YMapClusterer" | "clusterByGrid">),
          ...(clusterer as Pick<YMapsModules, "YMapClusterer">),
          clusterByGrid: clustererPackage.clusterByGrid as YMapsModules["clusterByGrid"]
        });
      } catch (error) {
        if (!cancelled) {
          const details = error instanceof Error ? error.message : "Unknown error";
          console.error("Yandex map init error:", error);
          setErrorText(
            `Failed to load Yandex map. ${details}. Check API key, HTTP Referer restrictions, and browser blocking for yandex domains.`
          );
        }
      }
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, []);

  const features = useMemo(
    () =>
      places.map((place) => ({
        type: "Feature",
        id: place.id,
        geometry: {
          type: "Point",
          coordinates: [place.coordinates.lng, place.coordinates.lat]
        },
        properties: {
          place
        }
      })),
    [places]
  );

  if (errorText) {
    return (
      <div className="flex h-full items-center justify-center bg-white p-4">
        <p className="max-w-md text-center text-sm font-semibold text-rose-700">{errorText}</p>
      </div>
    );
  }

  if (!modules) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <p className="text-sm font-semibold text-slate-600">Loading map...</p>
      </div>
    );
  }

  const {
    YMap,
    YMapClusterer,
    YMapControls,
    YMapDefaultFeaturesLayer,
    YMapDefaultSchemeLayer,
    YMapMarker,
    YMapZoomControl,
    clusterByGrid
  } = modules;

  const renderMarker = (feature: {
    id: string;
    geometry: { coordinates: [number, number] };
    properties: { place: Place };
  }) => {
    const place = feature.properties.place;
    const isSelected = selectedPlaceId === place.id;
    const color = getPlaceTypeColor(place.type);

    return (
      <YMapMarker key={feature.id} coordinates={feature.geometry.coordinates}>
        <button
          type="button"
          className="marker-dot"
          onClick={() => onSelectPlace(place.id)}
          title={`${place.title}\n${place.address}`}
          aria-label={place.title}
        >
          <span
            className={`marker-dot__core${isSelected ? " is-selected" : ""}`}
            style={{ backgroundColor: color }}
          />
        </button>
      </YMapMarker>
    );
  };

  const renderCluster = (
    coordinates: [number, number],
    clusteredFeatures: Array<{ id: string }>
  ) => (
    <YMapMarker key={`cluster-${coordinates[0]}-${coordinates[1]}`} coordinates={coordinates}>
      <div className="yandex-cluster-marker">{clusteredFeatures.length}</div>
    </YMapMarker>
  );

  return (
    <div className="yandex-map-root h-full w-full">
      <YMap location={location}>
        <YMapDefaultSchemeLayer />
        <YMapDefaultFeaturesLayer />
        <YMapClusterer
          method={clusterByGrid({ gridSize: 64 })}
          features={features}
          marker={renderMarker}
          cluster={renderCluster}
        />

        {userPosition ? (
          <YMapMarker coordinates={[userPosition.lng, userPosition.lat]}>
            <div className="yandex-user-marker" title="You are here" />
          </YMapMarker>
        ) : null}

        {YMapControls && YMapZoomControl ? (
          <YMapControls position="right">
            <YMapZoomControl />
          </YMapControls>
        ) : null}
      </YMap>
    </div>
  );
}
