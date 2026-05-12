"use client";

import { type CSSProperties, type SyntheticEvent, useEffect, useId, useState } from "react";

import { buildCoverPositionedStyle, COMPARE_FRAME_ASPECT_RATIO } from "@/lib/image-layout";
import type { PlaceImageView } from "@/lib/types";

interface PhotoCompareProps {
  title: string;
  yearThen: number;
  yearNow: number;
  thenImage: string;
  nowImage: string;
  thenAlt: string;
  nowAlt: string;
  thenView?: PlaceImageView;
  nowView?: PlaceImageView;
  edgeSnapAtCenter?: boolean;
}

type MobileMode = "then" | "now" | "compare";

interface ImageState {
  isLoaded: boolean;
  hasError: boolean;
  naturalWidth: number;
  naturalHeight: number;
  onLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
  onError: () => void;
}

const compareFrameStyle: CSSProperties = {
  maxWidth: "min(100%, 880px)"
};
const frameAspectRatio = COMPARE_FRAME_ASPECT_RATIO;

function useImageState(source: string): ImageState {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setNaturalWidth(0);
    setNaturalHeight(0);
  }, [source]);

  return {
    isLoaded,
    hasError,
    naturalWidth,
    naturalHeight,
    onLoad: (event) => {
      const target = event.currentTarget;
      setNaturalWidth(target.naturalWidth || 0);
      setNaturalHeight(target.naturalHeight || 0);
      setIsLoaded(true);
      setHasError(false);
    },
    onError: () => {
      setHasError(true);
      setIsLoaded(false);
      setNaturalWidth(0);
      setNaturalHeight(0);
    }
  };
}

function FallbackBlock({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-200 px-4 text-center text-sm font-semibold text-slate-600">
      {text}
    </div>
  );
}

const getImageRatio = (state: ImageState): number =>
  state.naturalWidth > 0 && state.naturalHeight > 0
    ? state.naturalWidth / state.naturalHeight
    : frameAspectRatio;

interface PositionedImageStyleOptions {
  side?: "left" | "right";
  edgeSnapAtCenter?: boolean;
}

function positionedImageStyle(
  view: PlaceImageView | undefined,
  imageRatio: number,
  options: PositionedImageStyleOptions = {}
): CSSProperties {
  const zoom = Number.isFinite(view?.zoom) ? (view?.zoom as number) : 1;
  const y = Number.isFinite(view?.y) ? (view?.y as number) : 50;
  const rawX = Number.isFinite(view?.x) ? (view?.x as number) : 50;
  const edgeSnapAtCenter = options.edgeSnapAtCenter ?? false;

  const x = (() => {
    if (!edgeSnapAtCenter || !options.side) {
      return rawX;
    }

    const isDefaultCenteredX = Math.abs(rawX - 50) < 0.001;
    if (!isDefaultCenteredX) {
      return rawX;
    }

    return options.side === "left" ? 0 : 100;
  })();
  const isAutoEdgeSnap = edgeSnapAtCenter && !!options.side && Math.abs(rawX - 50) < 0.001;
  const xForLayout = isAutoEdgeSnap ? x : x;
  const yForLayout = y;
  return buildCoverPositionedStyle({
    imageRatio,
    zoom,
    x: xForLayout,
    y: yForLayout,
    frameAspectRatio
  });
}

function compareSideImageStyle(
  view: PlaceImageView | undefined,
  imageRatio: number,
  side: "left" | "right",
  edgeSnapAtCenter: boolean
): CSSProperties {
  return positionedImageStyle(view, imageRatio, { side, edgeSnapAtCenter });
}

function ManagedImage({
  src,
  alt,
  state,
  style,
  className
}: {
  src: string;
  alt: string;
  state: ImageState;
  style: CSSProperties;
  className: string;
}) {
  if (state.hasError) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      draggable={false}
      onLoad={state.onLoad}
      onError={state.onError}
      style={style}
      className={`${className} ${state.isLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
    />
  );
}

export function PhotoCompare({
  title,
  yearThen,
  yearNow,
  thenImage,
  nowImage,
  thenAlt,
  nowAlt,
  thenView,
  nowView,
  edgeSnapAtCenter = false
}: PhotoCompareProps) {
  const [sliderValue, setSliderValue] = useState(50);
  const [mobileMode, setMobileMode] = useState<MobileMode>("then");

  return (
    <section className="space-y-2">
      <div className="hidden md:block">
        <DesktopCompare
          title={title}
          yearThen={yearThen}
          yearNow={yearNow}
          thenImage={thenImage}
          nowImage={nowImage}
          thenAlt={thenAlt}
          nowAlt={nowAlt}
          thenView={thenView}
          nowView={nowView}
          edgeSnapAtCenter={edgeSnapAtCenter}
          sliderValue={sliderValue}
          onSliderChange={setSliderValue}
        />
      </div>
      <div className="md:hidden">
        <MobileCompare
          title={title}
          yearThen={yearThen}
          yearNow={yearNow}
          thenImage={thenImage}
          nowImage={nowImage}
          thenAlt={thenAlt}
          nowAlt={nowAlt}
          thenView={thenView}
          nowView={nowView}
          edgeSnapAtCenter={edgeSnapAtCenter}
          sliderValue={sliderValue}
          mobileMode={mobileMode}
          onSliderChange={setSliderValue}
          onModeChange={setMobileMode}
        />
      </div>
    </section>
  );
}

interface CompareBaseProps {
  title: string;
  yearThen: number;
  yearNow: number;
  thenImage: string;
  nowImage: string;
  thenAlt: string;
  nowAlt: string;
  thenView?: PlaceImageView;
  nowView?: PlaceImageView;
  edgeSnapAtCenter: boolean;
  sliderValue: number;
}

interface DesktopCompareProps extends CompareBaseProps {
  onSliderChange: (value: number) => void;
}

function DesktopCompare({
  title,
  yearThen,
  yearNow,
  thenImage,
  nowImage,
  thenAlt,
  nowAlt,
  thenView,
  nowView,
  edgeSnapAtCenter,
  sliderValue,
  onSliderChange
}: DesktopCompareProps) {
  const sliderId = useId();
  const thenState = useImageState(thenImage);
  const nowState = useImageState(nowImage);

  const comparisonAvailable = !thenState.hasError && !nowState.hasError;
  const bothUnavailable = thenState.hasError && nowState.hasError;
  const thenImageRatio = getImageRatio(thenState);
  const nowImageRatio = getImageRatio(nowState);
  const thenImageStyle = positionedImageStyle(thenView, thenImageRatio);
  const nowImageStyle = positionedImageStyle(nowView, nowImageRatio);
  const thenCompareStyle = compareSideImageStyle(
    thenView,
    thenImageRatio,
    "left",
    edgeSnapAtCenter
  );
  const nowCompareStyle = compareSideImageStyle(nowView, nowImageRatio, "right", edgeSnapAtCenter);

  return (
    <figure
      className="mx-auto w-full overflow-hidden rounded-2xl border border-slate-800/10 bg-slate-200/70"
      style={compareFrameStyle}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {!nowState.hasError ? (
          <ManagedImage
            src={nowImage}
            alt={`${title}: ${nowAlt}`}
            state={nowState}
            style={comparisonAvailable ? nowCompareStyle : nowImageStyle}
            className="absolute max-w-none select-none pointer-events-none"
          />
        ) : !thenState.hasError ? (
          <ManagedImage
            src={thenImage}
            alt={`${title}: ${thenAlt}`}
            state={thenState}
            style={thenImageStyle}
            className="absolute max-w-none select-none pointer-events-none"
          />
        ) : null}

        {comparisonAvailable ? (
          <div
            className="absolute inset-0 overflow-hidden bg-slate-100"
            style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
            aria-hidden="true"
          >
            <ManagedImage
              src={thenImage}
              alt={`${title}: ${thenAlt}`}
              state={thenState}
              style={thenCompareStyle}
              className="absolute max-w-none select-none pointer-events-none"
            />
          </div>
        ) : null}

        {bothUnavailable ? <FallbackBlock text="Фотографии временно недоступны" /> : null}

        {comparisonAvailable ? (
          <div
            className="pointer-events-none absolute inset-y-0 w-[2px] bg-white/95 shadow-[0_0_0_1px_rgba(24,35,55,0.2)]"
            style={{ left: `${sliderValue}%` }}
            aria-hidden="true"
          />
        ) : null}

        <span className="absolute left-3 top-3 z-10 rounded-full bg-rust/90 px-3 py-1 text-xs font-bold text-white">
          Тогда {yearThen}
        </span>
        <span className="absolute right-3 top-3 z-10 rounded-full bg-sea/90 px-3 py-1 text-xs font-bold text-white">
          Сейчас {yearNow}
        </span>

        {!comparisonAvailable && !bothUnavailable ? (
          <p className="absolute bottom-3 left-3 right-3 z-10 rounded-xl bg-white/90 px-3 py-2 text-center text-xs font-semibold text-slate-700">
            Для сравнения нужно загрузить оба изображения.
          </p>
        ) : null}
      </div>

      <figcaption className="space-y-2 p-3">
        <label className="block text-sm font-semibold text-slate-700" htmlFor={sliderId}>
          Сравнение «Тогда / Сейчас»
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          value={sliderValue}
          onChange={(event) => onSliderChange(Number(event.target.value))}
          disabled={!comparisonAvailable}
          className="h-2 w-full cursor-pointer accent-sea disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Слайдер сравнения фотографий"
        />
      </figcaption>
    </figure>
  );
}

interface MobileCompareProps extends CompareBaseProps {
  mobileMode: MobileMode;
  onSliderChange: (value: number) => void;
  onModeChange: (mode: MobileMode) => void;
}

function MobileCompare({
  title,
  yearThen,
  yearNow,
  thenImage,
  nowImage,
  thenAlt,
  nowAlt,
  thenView,
  nowView,
  edgeSnapAtCenter,
  sliderValue,
  mobileMode,
  onSliderChange,
  onModeChange
}: MobileCompareProps) {
  const mobileSliderId = useId();
  const thenState = useImageState(thenImage);
  const nowState = useImageState(nowImage);

  const comparisonAvailable = !thenState.hasError && !nowState.hasError;
  const bothUnavailable = thenState.hasError && nowState.hasError;
  const activeImageIsThen = mobileMode === "then";
  const activeImage = activeImageIsThen ? thenImage : nowImage;
  const activeAlt = activeImageIsThen ? thenAlt : nowAlt;
  const activeState = activeImageIsThen ? thenState : nowState;
  const thenImageRatio = getImageRatio(thenState);
  const nowImageRatio = getImageRatio(nowState);
  const activeImageRatio = activeImageIsThen ? thenImageRatio : nowImageRatio;
  const activeStyle = positionedImageStyle(activeImageIsThen ? thenView : nowView, activeImageRatio);
  const thenImageStyle = positionedImageStyle(thenView, thenImageRatio);
  const nowImageStyle = positionedImageStyle(nowView, nowImageRatio);
  const thenCompareStyle = compareSideImageStyle(
    thenView,
    thenImageRatio,
    "left",
    edgeSnapAtCenter
  );
  const nowCompareStyle = compareSideImageStyle(nowView, nowImageRatio, "right", edgeSnapAtCenter);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-full border px-4 text-sm font-semibold ${
            mobileMode === "then"
              ? "border-rust bg-rust text-white"
              : "border-slate-300 bg-white text-ink"
          }`}
          onClick={() => onModeChange("then")}
          aria-pressed={mobileMode === "then"}
        >
          Тогда
        </button>
        <button
          type="button"
          className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-full border px-4 text-sm font-semibold ${
            mobileMode === "now"
              ? "border-sea bg-sea text-white"
              : "border-slate-300 bg-white text-ink"
          }`}
          onClick={() => onModeChange("now")}
          aria-pressed={mobileMode === "now"}
        >
          Сейчас
        </button>
        <button
          type="button"
          className={`inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold ${
            mobileMode === "compare"
              ? "border-ink bg-ink text-white"
              : "border-slate-300 bg-white text-ink"
          }`}
          onClick={() => onModeChange("compare")}
          aria-pressed={mobileMode === "compare"}
        >
          Сравнить
        </button>
      </div>

      {mobileMode === "compare" ? (
        <div
          className="mx-auto w-full overflow-hidden rounded-2xl border border-slate-800/10 bg-slate-200/70"
          style={compareFrameStyle}
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
            {!nowState.hasError ? (
              <ManagedImage
                src={nowImage}
                alt={`${title}: ${nowAlt}`}
                state={nowState}
                style={comparisonAvailable ? nowCompareStyle : nowImageStyle}
                className="absolute max-w-none select-none pointer-events-none"
              />
            ) : !thenState.hasError ? (
              <ManagedImage
                src={thenImage}
                alt={`${title}: ${thenAlt}`}
                state={thenState}
                style={thenImageStyle}
                className="absolute max-w-none select-none pointer-events-none"
              />
            ) : null}

            {comparisonAvailable ? (
              <div
                className="absolute inset-0 overflow-hidden bg-slate-100"
                style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
                aria-hidden="true"
              >
                <ManagedImage
                  src={thenImage}
                  alt={`${title}: ${thenAlt}`}
                  state={thenState}
                  style={thenCompareStyle}
                  className="absolute max-w-none select-none pointer-events-none"
                />
              </div>
            ) : null}

            {bothUnavailable ? <FallbackBlock text="Фотографии временно недоступны" /> : null}

            {comparisonAvailable ? (
              <div
                className="pointer-events-none absolute inset-y-0 w-[2px] bg-white/95"
                style={{ left: `${sliderValue}%` }}
                aria-hidden="true"
              />
            ) : null}
          </div>

          <div className="space-y-2 p-3">
            <p className="text-xs font-semibold text-slate-700">
              Тогда {yearThen} / Сейчас {yearNow}
            </p>
            {!comparisonAvailable && !bothUnavailable ? (
              <p className="text-xs font-semibold text-slate-600">
                Для сравнения нужно загрузить оба изображения.
              </p>
            ) : null}
            <input
              id={mobileSliderId}
              type="range"
              min={0}
              max={100}
              value={sliderValue}
              onChange={(event) => onSliderChange(Number(event.target.value))}
              disabled={!comparisonAvailable}
              className="h-2 w-full cursor-pointer accent-sea disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Слайдер сравнения фотографий"
            />
          </div>
        </div>
      ) : (
        <figure
          className="mx-auto w-full overflow-hidden rounded-2xl border border-slate-800/10 bg-slate-200/70"
          style={compareFrameStyle}
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
            {activeState.hasError ? (
              <FallbackBlock text="Фотография временно недоступна" />
            ) : (
              <ManagedImage
                src={activeImage}
                alt={`${title}: ${activeAlt}`}
                state={activeState}
                style={activeStyle}
                className="absolute max-w-none select-none pointer-events-none"
              />
            )}
          </div>
          <figcaption className="bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            {mobileMode === "then" ? `Тогда ${yearThen}` : `Сейчас ${yearNow}`}
          </figcaption>
        </figure>
      )}
    </div>
  );
}
