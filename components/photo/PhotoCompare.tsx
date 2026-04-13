"use client";

import { useState } from "react";

interface PhotoCompareProps {
  title: string;
  yearThen: number;
  yearNow: number;
  thenImage: string;
  nowImage: string;
  thenAlt: string;
  nowAlt: string;
}

type MobileMode = "then" | "now" | "compare";

export function PhotoCompare({
  title,
  yearThen,
  yearNow,
  thenImage,
  nowImage,
  thenAlt,
  nowAlt
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
  sliderValue,
  onSliderChange
}: DesktopCompareProps) {
  return (
    <figure className="relative overflow-hidden rounded-2xl border border-slate-800/10 bg-slate-200/70">
      <div className="relative aspect-[4/3]">
        <img
          src={thenImage}
          alt={`${title}: ${thenAlt}`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
          aria-hidden="true"
        >
          <img
            src={nowImage}
            alt={`${title}: ${nowAlt}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 w-[2px] bg-white/95 shadow-[0_0_0_1px_rgba(24,35,55,0.2)]"
          style={{ left: `${sliderValue}%` }}
          aria-hidden="true"
        />
        <span className="absolute left-3 top-3 rounded-full bg-rust/90 px-3 py-1 text-xs font-bold text-white">
          Тогда {yearThen}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-sea/90 px-3 py-1 text-xs font-bold text-white">
          Сейчас {yearNow}
        </span>
      </div>
      <figcaption className="space-y-2 p-3">
        <label className="block text-sm font-semibold text-slate-700" htmlFor="desktop-compare">
          Сравнение «Тогда / Сейчас»
        </label>
        <input
          id="desktop-compare"
          type="range"
          min={0}
          max={100}
          value={sliderValue}
          onChange={(event) => onSliderChange(Number(event.target.value))}
          className="h-2 w-full cursor-pointer accent-sea"
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
  sliderValue,
  mobileMode,
  onSliderChange,
  onModeChange
}: MobileCompareProps) {
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
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/10 bg-slate-200/70">
          <div className="relative aspect-[4/3]">
            <img
              src={thenImage}
              alt={`${title}: ${thenAlt}`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
              aria-hidden="true"
            >
              <img
                src={nowImage}
                alt={`${title}: ${nowAlt}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 w-[2px] bg-white/95"
              style={{ left: `${sliderValue}%` }}
              aria-hidden="true"
            />
          </div>
          <div className="space-y-2 p-3">
            <p className="text-xs font-semibold text-slate-700">
              Тогда {yearThen} / Сейчас {yearNow}
            </p>
            <input
              type="range"
              min={0}
              max={100}
              value={sliderValue}
              onChange={(event) => onSliderChange(Number(event.target.value))}
              className="h-2 w-full cursor-pointer accent-sea"
              aria-label="Слайдер сравнения фотографий"
            />
          </div>
        </div>
      ) : (
        <figure className="overflow-hidden rounded-2xl border border-slate-800/10">
          <img
            src={mobileMode === "then" ? thenImage : nowImage}
            alt={`${title}: ${mobileMode === "then" ? thenAlt : nowAlt}`}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
          <figcaption className="bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            {mobileMode === "then" ? `Тогда ${yearThen}` : `Сейчас ${yearNow}`}
          </figcaption>
        </figure>
      )}
    </div>
  );
}
