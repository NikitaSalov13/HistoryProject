const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const COMPARE_FRAME_ASPECT_RATIO = 4 / 3;

const toSafeRatio = (ratio: number, fallback: number): number =>
  ratio > 0 && Number.isFinite(ratio) ? ratio : fallback;

interface PositionedImageOptions {
  imageRatio: number;
  zoom: number;
  x: number;
  y: number;
  frameAspectRatio?: number;
}

export function buildCoverPositionedStyle({
  imageRatio,
  zoom,
  x,
  y,
  frameAspectRatio = COMPARE_FRAME_ASPECT_RATIO
}: PositionedImageOptions): Readonly<{
  width: string;
  height: string;
  left: string;
  top: string;
}> {
  const safeFrameRatio = toSafeRatio(frameAspectRatio, COMPARE_FRAME_ASPECT_RATIO);
  const safeImageRatio = toSafeRatio(imageRatio, safeFrameRatio);
  const normalizedZoom = clamp(zoom, 0.6, 1.8);

  const baseWidthPct =
    safeImageRatio >= safeFrameRatio ? (safeImageRatio / safeFrameRatio) * 100 : 100;
  const baseHeightPct =
    safeImageRatio >= safeFrameRatio ? 100 : (safeFrameRatio / safeImageRatio) * 100;

  const scaledWidthPct = baseWidthPct * normalizedZoom;
  const scaledHeightPct = baseHeightPct * normalizedZoom;
  const leftPct = (100 - scaledWidthPct) * (x / 100);
  const topPct = (100 - scaledHeightPct) * (y / 100);

  return {
    width: `${scaledWidthPct}%`,
    height: `${scaledHeightPct}%`,
    left: `${leftPct}%`,
    top: `${topPct}%`
  };
}
