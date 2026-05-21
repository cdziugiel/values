// features/report-builder/lib/report-components/value-systems-bar-chart.ts
export type ValueSystemsBarChartOrientation = "horizontal" | "vertical";


export type ValueSystemsBarChartLabelMode =
  | "full"
  | "short"
  | "initial"
  | "none";

export type ValueSystemsBarChartOptions = {
  title?: string;
  description?: string;
  orientation?: ValueSystemsBarChartOrientation;
  scale?: ValueSystemsBarChartScale;
  size?: ValueSystemsBarChartSize;
  showSummary?: boolean;

  labelMode?: ValueSystemsBarChartLabelMode;

  items: ValueSystemChartItem[];
};

export type ValueSystemsBarChartScale = {
  min: number;
  max: number;
  step?: number;
};

export type ValueSystemChartItem = {
  code: string;
  label: string;
  shortLabel?: string;
  value: number;
  color?: string;
};

export type ValueSystemsBarChartSize = {
  width?: string;
  maxWidth?: string;

  horizontal?: {
    labelWidth?: string;
    valueWidth?: string;
    barHeight?: string;
    rowGap?: string;
    columnGap?: string;
    scaleHeight?: string;
    barRadius?: string;
  };

  vertical?: {
    plotHeight?: string;
    barWidth?: string;
    columnGap?: string;
    scaleWidth?: string;
    labelGap?: string;
    barRadius?: string;

    labelFontSize?: string;
    valueFontSize?: string;
    scaleFontSize?: string;
    valueLabelOffset?: string;
    labelPrimaryColor?: string;
    labelSecondaryColor?: string;

    labelFirstColor?: string;
    labelRestColor?: string;
  };
};

const DEFAULT_SCALE: Required<ValueSystemsBarChartScale> = {
  min: 0,
  max: 5,
  step: 1,
};


function cssLengthOrFallback(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  if (
    /^-?\d+(\.\d+)?(px|mm|cm|in|pt|rem|em|%)$/.test(trimmed) ||
    trimmed === "auto" ||
    trimmed === "none"
  ) {
    return trimmed;
  }

  return fallback;
}




function buildChartSizeStyle(size: ValueSystemsBarChartSize | undefined) {
  const width = cssLengthOrFallback(size?.width, "100%");
  const maxWidth = cssLengthOrFallback(size?.maxWidth, "none");

  const horizontal = size?.horizontal ?? {};
  const vertical = size?.vertical ?? {};

  const vars: Record<string, string> = {
    "--hr-vs-chart-width": width,
    "--hr-vs-chart-max-width": maxWidth,

    "--hr-vs-horizontal-label-width": cssLengthOrFallback(
      horizontal.labelWidth,
      "38mm",
    ),
    "--hr-vs-horizontal-value-width": cssLengthOrFallback(
      horizontal.valueWidth,
      "12mm",
    ),
    "--hr-vs-horizontal-bar-height": cssLengthOrFallback(
      horizontal.barHeight,
      "6.2mm",
    ),
    "--hr-vs-horizontal-row-gap": cssLengthOrFallback(
      horizontal.rowGap,
      "4.1mm",
    ),
    "--hr-vs-horizontal-column-gap": cssLengthOrFallback(
      horizontal.columnGap,
      "5mm",
    ),
    "--hr-vs-horizontal-scale-height": cssLengthOrFallback(
      horizontal.scaleHeight,
      "4mm",
    ),

    "--hr-vs-vertical-plot-height": cssLengthOrFallback(
      vertical.plotHeight,
      "76mm",
    ),
    "--hr-vs-vertical-bar-width": cssLengthOrFallback(
      vertical.barWidth,
      "7mm",
    ),
    "--hr-vs-vertical-column-gap": cssLengthOrFallback(
      vertical.columnGap,
      "4mm",
    ),
    "--hr-vs-vertical-scale-width": cssLengthOrFallback(
      vertical.scaleWidth,
      "12mm",
    ),
    "--hr-vs-vertical-label-gap": cssLengthOrFallback(
      vertical.labelGap,
      "3mm",
    ),
    "--hr-vs-horizontal-bar-radius": cssLengthOrFallback(
      horizontal.barRadius,
      "999px",
    ),

    "--hr-vs-vertical-bar-radius": cssLengthOrFallback(
      vertical.barRadius,
      "3mm",
    ),
    "--hr-vs-vertical-label-font-size": cssLengthOrFallback(
      vertical.labelFontSize,
      "2.75mm",
    ),
    "--hr-vs-vertical-value-font-size": cssLengthOrFallback(
      vertical.valueFontSize,
      "3mm",
    ),
    "--hr-vs-vertical-scale-font-size": cssLengthOrFallback(
      vertical.scaleFontSize,
      "2.75mm",
    ),
    "--hr-vs-vertical-value-label-offset": cssLengthOrFallback(
      vertical.valueLabelOffset,
      "1.2mm",
    ),
    "--hr-vs-vertical-label-primary-color":
      typeof vertical.labelPrimaryColor === "string"
        ? vertical.labelPrimaryColor
        : "#111111",

    "--hr-vs-vertical-label-secondary-color":
      typeof vertical.labelSecondaryColor === "string"
        ? vertical.labelSecondaryColor
        : "#4b5563",
        "--hr-vs-vertical-label-first-color":
    typeof vertical.labelFirstColor === "string"
        ? vertical.labelFirstColor
        : "#111111",

"--hr-vs-vertical-label-rest-color":
    typeof vertical.labelRestColor === "string"
        ? vertical.labelRestColor
        : "#4b5563",
  };

  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");
}

function toFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function normalizeScale(
  scale: ValueSystemsBarChartScale | undefined,
): Required<ValueSystemsBarChartScale> {
  const min = toFiniteNumber(scale?.min, DEFAULT_SCALE.min);
  const max = toFiniteNumber(scale?.max, DEFAULT_SCALE.max);

  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);

  const range = safeMax - safeMin;
  const rawStep = toFiniteNumber(scale?.step, DEFAULT_SCALE.step);

  const step = rawStep > 0 ? rawStep : range > 0 ? range / 5 : 1;

  return {
    min: safeMin,
    max: safeMax,
    step,
  };
}


function getVerticalAxisLabelStyle(index: number) {
  const color =
    index === 0
      ? "var(--hr-vs-vertical-label-primary-color, #111111)"
      : "var(--hr-vs-vertical-label-secondary-color, #4b5563)";

  return `color: ${color};`;
}


function buildTicks(scale: Required<ValueSystemsBarChartScale>) {
  const ticks: number[] = [];

  if (scale.max <= scale.min) {
    return [scale.min];
  }

  for (let value = scale.min; value <= scale.max + scale.step / 1000; value += scale.step) {
    ticks.push(Number(value.toFixed(6)));
  }

  if (ticks[ticks.length - 1] !== scale.max) {
    ticks.push(scale.max);
  }

  return ticks;
}

function valueToPercent(value: number, scale: Required<ValueSystemsBarChartScale>) {
  const range = scale.max - scale.min;

  if (range <= 0) {
    return 0;
  }

  return ((value - scale.min) / range) * 100;
}

function getZeroPercent(scale: Required<ValueSystemsBarChartScale>) {
  if (scale.min >= 0) {
    return 0;
  }

  if (scale.max <= 0) {
    return 100;
  }

  return valueToPercent(0, scale);
}

function getBarGeometry(value: number, scale: Required<ValueSystemsBarChartScale>) {
  const clampedValue = clamp(value, scale.min, scale.max);
  const valuePercent = valueToPercent(clampedValue, scale);
  const zeroPercent = getZeroPercent(scale);

  const start = Math.min(zeroPercent, valuePercent);
  const width = Math.abs(valuePercent - zeroPercent);

  return {
    value: clampedValue,
    valuePercent,
    zeroPercent,
    start,
    width,
    isNegative: clampedValue < 0,
  };
}

function formatScaleValue(value: number) {
  const rounded = Math.abs(value) < 0.000001 ? 0 : value;

  return Number.isInteger(rounded)
    ? String(rounded).replace(".", ",")
    : rounded.toFixed(1).replace(".", ",");
}


export const VALUE_SYSTEMS_BAR_CHART_CSS = `
.hr-vs-bar-chart {
  width: var(--hr-vs-chart-width, 100%);
  max-width: var(--hr-vs-chart-max-width, none);
}

.hr-vs-bar-chart-header {
  margin-bottom: 7mm;
  max-width: 190mm;
}

.hr-vs-bar-chart-title {
  margin: 0;
  color: var(--hr-fg);
  font-size: 6.4mm;
  font-weight: 680;
  line-height: 1.08;
  letter-spacing: -0.035em;
}

.hr-vs-bar-chart-description {
  margin: 3.5mm 0 0 0;
  max-width: 185mm;
  color: var(--hr-muted);
  font-size: 3.55mm;
  line-height: 1.55;
}

.hr-vs-bar-chart-card {
  border-top: 1px solid var(--hr-border);
  border-bottom: 1px solid var(--hr-border-soft);
  padding: 6mm 0 6.5mm 0;
}

/* -----------------------------
   Common
----------------------------- */

.hr-vs-bar-value {
  color: var(--hr-fg);
  font-size: 3.45mm;
  font-weight: 700;
  line-height: 1;
}

.hr-vs-bar-label-main {
  display: block;
  color: var(--hr-fg);
  font-size: 3.45mm;
  font-weight: 680;
  line-height: 1.2;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.hr-vs-bar-label-sub {
  display: block;
  margin-top: 0.8mm;
  color: var(--hr-muted);
  font-size: 2.95mm;
  line-height: 1.25;
}

/* -----------------------------
   Horizontal chart
----------------------------- */

.hr-vs-bar-chart--horizontal .hr-vs-bar-chart-scale {
  display: grid;
  grid-template-columns:
    var(--hr-vs-horizontal-label-width, 38mm)
    1fr
    var(--hr-vs-horizontal-value-width, 12mm);
  gap: var(--hr-vs-horizontal-column-gap, 5mm);
  margin-bottom: 3mm;
  color: var(--hr-muted-2);
  font-size: 2.75mm;
  line-height: 1;
}

.hr-vs-bar-chart--horizontal .hr-vs-bar-chart-scale-track {
  position: relative;
  height: var(--hr-vs-horizontal-scale-height, 4mm);
}

.hr-vs-bar-chart--horizontal .hr-vs-bar-chart-scale-tick {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  white-space: nowrap;
}

.hr-vs-bar-chart--horizontal .hr-vs-bar-chart-grid {
  display: grid;
  gap: var(--hr-vs-horizontal-row-gap, 4.1mm);
}

.hr-vs-bar-chart--horizontal .hr-vs-bar-row {
  display: grid;
  grid-template-columns:
    var(--hr-vs-horizontal-label-width, 38mm)
    1fr
    var(--hr-vs-horizontal-value-width, 12mm);
  gap: var(--hr-vs-horizontal-column-gap, 5mm);
  align-items: center;
}

.hr-vs-bar-chart--horizontal .hr-vs-bar-label {
  min-width: 0;
}

.hr-vs-bar-chart--horizontal .hr-vs-bar-track {
  position: relative;
  height: var(--hr-vs-horizontal-bar-height, 6.2mm);
  overflow: hidden;
  border-radius: 999px;
  background:
    linear-gradient(
      90deg,
      rgba(17, 24, 39, 0.055) 0,
      rgba(17, 24, 39, 0.055) 1px,
      transparent 1px,
      transparent 20%
    ),
    #f4f6f8;
  background-size: 20% 100%;
}

.hr-vs-bar-chart--horizontal .hr-vs-bar-zero {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(17, 24, 39, 0.22);
  z-index: 2;
}

.hr-vs-bar-chart--horizontal .hr-vs-bar-fill {
  position: absolute;
  top: 0;
  height: 100%;
  min-width: 1.2mm;
  border-radius: var(--hr-vs-horizontal-bar-radius, 999px);
}

.hr-vs-bar-chart--horizontal .hr-vs-bar-fill--negative {
  opacity: 0.72;
}

.hr-vs-bar-chart--horizontal .hr-vs-bar-value {
  text-align: right;
}

/* -----------------------------
   Vertical chart
----------------------------- */

.hr-vs-bar-chart--vertical .hr-vs-bar-chart-vertical-layout {
  display: grid;
  grid-template-columns: var(--hr-vs-vertical-scale-width, 12mm) 1fr;
  gap: var(--hr-vs-vertical-column-gap, 4mm);
  align-items: stretch;
}

.hr-vs-bar-chart--vertical .hr-vs-bar-chart-vertical-scale {
  position: relative;
  height: var(--hr-vs-vertical-plot-height, 70mm);
  color: var(--hr-muted-2);
  font-size: var(--hr-vs-vertical-scale-font-size, 2.75mm);
}

.hr-vs-bar-chart--vertical .hr-vs-bar-chart-vertical-scale-tick {
  position: absolute;
  right: 0;
  transform: translateY(-50%);
  white-space: nowrap;
}

.hr-vs-bar-chart--vertical .hr-vs-bar-chart-vertical-plot {
  position: relative;
  height: var(--hr-vs-vertical-plot-height, 76mm);
  display: grid;
  grid-template-columns: repeat(var(--hr-vs-bar-count), minmax(0, 1fr));
  gap: var(--hr-vs-vertical-column-gap, 4mm);
  padding: 0;
  border-bottom: 1px solid var(--hr-border-soft);
}

.hr-vs-bar-chart--vertical .hr-vs-bar-chart-vertical-grid-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(17, 24, 39, 0.08);
  z-index: 1;
}

.hr-vs-bar-chart--vertical .hr-vs-bar-chart-vertical-grid-line--zero {
  background: rgba(17, 24, 39, 0.22);
  z-index: 2;
}

.hr-vs-bar-chart--vertical .hr-vs-bar-chart-vertical-zero {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(17, 24, 39, 0.22);
  z-index: 2;
}

.hr-vs-bar-chart--vertical .hr-vs-bar-column {
  position: relative;
  min-width: 0;
}

.hr-vs-bar-chart--vertical .hr-vs-bar-column-track {
  position: relative;
  height: var(--hr-vs-vertical-plot-height, 76mm);
}

.hr-vs-bar-chart--vertical .hr-vs-bar-column-fill {
  position: absolute;
  left: 50%;
  width: var(--hr-vs-vertical-bar-width, 7mm);
  min-height: 1.2mm;
  transform: translateX(-50%);
  border-radius:
    var(--hr-vs-vertical-bar-radius, 3mm)
    var(--hr-vs-vertical-bar-radius, 3mm)
    0
    0;
}

.hr-vs-bar-chart--vertical .hr-vs-bar-column-fill--negative {
  border-radius:
    0
    0
    var(--hr-vs-vertical-bar-radius, 3mm)
    var(--hr-vs-vertical-bar-radius, 3mm);
  opacity: 0.72;
}

.hr-vs-bar-chart--vertical .hr-vs-bar-column-value {
  position: absolute;
  left: 50%;
  z-index: 4;
  transform: translateX(-50%);
  color: var(--hr-fg);
  font-size: var(--hr-vs-vertical-value-font-size, 3mm);
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
}

.hr-vs-bar-chart--vertical .hr-vs-bar-column-value--positive {
  text-align: center;
}

.hr-vs-bar-chart--vertical .hr-vs-bar-column-value--negative {
  text-align: center;
}

.hr-vs-bar-chart--vertical .hr-vs-bar-column-labels {
  margin-top: 3mm;
  display: grid;
  grid-template-columns: repeat(var(--hr-vs-bar-count), minmax(0, 1fr));
  gap: var(--hr-vs-vertical-column-gap, 4mm);
}

.hr-vs-bar-chart--vertical .hr-vs-bar-column-label {
  min-width: 0;
  text-align: center;
}

.hr-vs-bar-chart--vertical .hr-vs-bar-label-main {
  display: block;
  max-width: 100%;
  font-size: var(--hr-vs-vertical-label-font-size, 2.75mm);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}

.hr-vs-bar-chart--vertical .hr-vs-bar-label-first {
  color: var(--hr-vs-vertical-label-first-color, #111111);
}

.hr-vs-bar-chart--vertical .hr-vs-bar-label-rest {
  color: var(--hr-vs-vertical-label-rest-color, #4b5563);
}

/* -----------------------------
   Summary
----------------------------- */

.hr-vs-bar-summary {
  margin-top: 7mm;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8mm;
}

.hr-vs-bar-summary-box {
  border-top: 1px solid var(--hr-border-soft);
  padding-top: 4mm;
}

.hr-vs-bar-summary-label {
  margin: 0 0 2mm 0;
  color: var(--hr-muted);
  font-size: 2.85mm;
  font-weight: 720;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.hr-vs-bar-summary-text {
  margin: 0;
  color: var(--hr-fg-soft);
  font-size: 3.35mm;
  line-height: 1.52;
}

.hr-vs-bar-summary-text strong {
  color: var(--hr-fg);
  font-weight: 680;
}
`;



const DEFAULT_BAR_COLOR = "#526F70";
const MAX_COLOR = "#2FAFA2";

const VALUE_SYSTEM_CODE_ALIASES: Record<string, string> = {
  TRADITION: "TRADITION",
  EXPANSION: "EXPANSION",
  NORMS: "NORMS",
  ASPIRATIONS: "ASPIRATIONS",

  MEDIATION: "MEDIATIONS",
  MEDIATIONS: "MEDIATIONS",

  MINDFULNESS: "MINDFULNESS",

  HOLISTIC: "HOLISM",
  HOLISM: "HOLISM",
};


function getVerticalValueLabelStyle(
  value: number,
  scale: Required<ValueSystemsBarChartScale>,
) {
  const safeValue = clamp(value, scale.min, scale.max);
  const valuePercent = ((safeValue - scale.min) / (scale.max - scale.min)) * 100;
  const offset = "var(--hr-vs-vertical-value-label-offset, 1.2mm)";

  if (safeValue < 0) {
    return `top: calc(${(100 - valuePercent).toFixed(4)}% + ${offset});`;
  }

  return `bottom: calc(${valuePercent.toFixed(4)}% + ${offset});`;
}

function normalizeValueSystemCode(code: string) {
  return VALUE_SYSTEM_CODE_ALIASES[code] ?? code;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
}

function formatScore(value: number) {
  return value.toFixed(1).replace(".", ",");
}


function renderHorizontalChart({
  items,
  scale,
  ticks,
}: {
  items: Array<ValueSystemChartItem & { value: number; color: string }>;
  scale: Required<ValueSystemsBarChartScale>;
  ticks: number[];
}) {
  const zeroPercent = getZeroPercent(scale);

  return `
<div class="hr-vs-bar-chart-scale" aria-hidden="true">
  <div></div>
  <div class="hr-vs-bar-chart-scale-track">
    ${ticks
      .map((tick) => {
        const left = valueToPercent(tick, scale);

        return `
          <span
            class="hr-vs-bar-chart-scale-tick"
            style="left: ${left.toFixed(4)}%;"
          >
            ${escapeHtml(formatScaleValue(tick))}
          </span>
        `;
      })
      .join("")}
  </div>
  <div></div>
</div>

<div class="hr-vs-bar-chart-grid">
  ${items
      .map((item) => {
        const geometry = getBarGeometry(item.value, scale);

        return `
        <div class="hr-vs-bar-row">
          <div class="hr-vs-bar-label">
            <span class="hr-vs-bar-label-main">${escapeHtml(item.label)}</span>
            ${item.shortLabel
            ? `<span class="hr-vs-bar-label-sub">${escapeHtml(item.shortLabel)}</span>`
            : ""
          }
          </div>

          <div
            class="hr-vs-bar-track"
            aria-label="${escapeHtml(item.label)}: ${escapeHtml(
            formatScore(geometry.value),
          )}"
          >
            <div
              class="hr-vs-bar-zero"
              style="left: ${zeroPercent.toFixed(4)}%;"
            ></div>

            <div
              class="hr-vs-bar-fill ${geometry.isNegative ? "hr-vs-bar-fill--negative" : ""
          }"
              style="
                left: ${geometry.start.toFixed(4)}%;
                width: ${geometry.width.toFixed(4)}%;
                background: ${escapeHtml(item.color)};
              "
            ></div>
          </div>

          <div class="hr-vs-bar-value">
            ${escapeHtml(formatScore(geometry.value))}
          </div>
        </div>
      `;
      })
      .join("")}
</div>
`.trim();
}
function renderStyledAxisLabel(label: string) {
    const normalizedLabel = String(label ?? "").trim();

    if (!normalizedLabel) {
        return "";
    }

    const firstLetter = normalizedLabel.slice(0, 1);
    const rest = normalizedLabel.slice(1);

    return `
<span class="hr-vs-bar-label-first">${escapeHtml(firstLetter)}</span>${rest
        ? `<span class="hr-vs-bar-label-rest">${escapeHtml(rest)}</span>`
        : ""
    }
`.trim();
}

function getChartLabel(
  item: ValueSystemChartItem,
  labelMode: ValueSystemsBarChartLabelMode,
) {
  const fullLabel = String(item.label ?? item.code ?? "").trim();
  const shortLabel = String(item.shortLabel ?? fullLabel.slice(0, 3)).trim();

  if (labelMode === "none") return "";

  if (labelMode === "initial") {
    return (shortLabel || fullLabel).slice(0, 1).toUpperCase();
  }

  if (labelMode === "short") {
    return (shortLabel || fullLabel).slice(0, 3).toUpperCase();
  }

  return fullLabel;
}


function renderVerticalChart({
  items,
  scale,
  ticks,
  labelMode,
}: {
  items: Array<ValueSystemChartItem & { value: number; color: string }>;
  scale: Required<ValueSystemsBarChartScale>;
  ticks: number[];
  labelMode: ValueSystemsBarChartLabelMode;
}) {


  return `
<div
  class="hr-vs-bar-chart-vertical-layout"
  style="--hr-vs-bar-count: ${items.length};"
>
  <div class="hr-vs-bar-chart-vertical-scale" aria-hidden="true">
    ${ticks
      .map((tick) => {
        const bottomPercent = valueToPercent(tick, scale);
        const topPercent = 100 - bottomPercent;

        return `
          <span
            class="hr-vs-bar-chart-vertical-scale-tick"
            style="top: ${topPercent.toFixed(4)}%;"
          >
            ${escapeHtml(formatScaleValue(tick))}
          </span>
        `;
      })
      .join("")}
  </div>

  <div>
    <div class="hr-vs-bar-chart-vertical-plot">
      ${ticks
      .map((tick) => {
        const bottomPercent = valueToPercent(tick, scale);
        const topPercent = 100 - bottomPercent;
        const isZero = Math.abs(tick) < 0.000001;

        return `
            <div
              class="hr-vs-bar-chart-vertical-grid-line ${isZero ? "hr-vs-bar-chart-vertical-grid-line--zero" : ""
          }"
              style="top: ${topPercent.toFixed(4)}%;"
            ></div>
          `;
      })
      .join("")}

      ${items
      .map((item) => {
        const geometry = getBarGeometry(item.value, scale);
        const zeroFromBottom = getZeroPercent(scale);
        const bottom = geometry.isNegative
          ? valueToPercent(geometry.value, scale)
          : zeroFromBottom;

        const valueTopPercent = 100 - geometry.valuePercent;
        const valueLabelTop = geometry.isNegative
          ? 100 - bottom - 4
          : valueTopPercent - 5;
        const valueLabelStyle = getVerticalValueLabelStyle(item.value, scale);
        const valueLabelClass =
          item.value < 0
            ? "hr-vs-bar-column-value hr-vs-bar-column-value--negative"
            : "hr-vs-bar-column-value hr-vs-bar-column-value--positive";
        return `
            <div class="hr-vs-bar-column">
              <div
                class="hr-vs-bar-column-track"
                aria-label="${escapeHtml(item.label)}: ${escapeHtml(
          formatScore(geometry.value),
        )}"
              >
                <div
                  class="hr-vs-bar-column-fill ${geometry.isNegative ? "hr-vs-bar-column-fill--negative" : ""
          }"
                  style="
                    bottom: ${bottom.toFixed(4)}%;
                    height: ${geometry.width.toFixed(4)}%;
                    background: ${escapeHtml(item.color)};
                  "
                ></div>

<span
  class="${valueLabelClass}"
  style="${escapeHtml(valueLabelStyle)}"
>
  ${escapeHtml(formatScore(item.value))}
</span>
              </div>
            </div>
          `;
      })
      .join("")}
    </div>

    <div
      class="hr-vs-bar-column-labels"
      style="--hr-vs-bar-count: ${items.length};"
    >
${items
    .map((item) => {
        const label = getChartLabel(item, labelMode);

        return `
    <div class="hr-vs-bar-column-label">
      ${
          label
              ? `<span class="hr-vs-bar-label-main">${renderStyledAxisLabel(label)}</span>`
              : ""
      }
    </div>
  `;
    })
    .join("")}
    </div>
  </div>
</div>
`.trim();
}

export function renderValueSystemsBarChart(
  options: ValueSystemsBarChartOptions,
) {
  const scale = normalizeScale(options.scale);
  const ticks = buildTicks(scale);
  const orientation = options.orientation ?? "horizontal";
  const labelMode = options.labelMode ?? "full";

  const normalizedItems = options.items.map((item) => {
    const rawValue = Number(item.value);
    const safeRawValue = Number.isFinite(rawValue) ? rawValue : scale.min;
    const normalizedCode = normalizeValueSystemCode(item.code);

    return {
      ...item,
      code: normalizedCode,
      rawValue: safeRawValue,
      value: clamp(safeRawValue, scale.min, scale.max),
    };
  });

  const maxValue = normalizedItems.length
    ? Math.max(...normalizedItems.map((item) => item.rawValue))
    : null;

  const items = normalizedItems.map((item) => {
    const isMax =
      maxValue !== null && Math.abs(item.rawValue - maxValue) < 0.000001;

    return {
      ...item,
      color: isMax ? MAX_COLOR : DEFAULT_BAR_COLOR,
    };
  });

  const strongest = [...items].sort((a, b) => b.rawValue - a.rawValue)[0];
  const weakest = [...items].sort((a, b) => a.rawValue - b.rawValue)[0];

  const chartHtml =
    orientation === "vertical"
      ? renderVerticalChart({ items, scale, ticks, labelMode })
      : renderHorizontalChart({ items, scale, ticks });

  const sizeStyle = buildChartSizeStyle(options.size);

  return `
<section
  class="hr-vs-bar-chart hr-vs-bar-chart--${escapeHtml(orientation)}"
  style="${escapeHtml(sizeStyle)}"
>
  ${options.title || options.description
      ? `
    <header class="hr-vs-bar-chart-header">
      ${options.title
        ? `<h2 class="hr-vs-bar-chart-title">${escapeHtml(options.title)}</h2>`
        : ""
      }
      ${options.description
        ? `<p class="hr-vs-bar-chart-description">${escapeHtml(options.description)}</p>`
        : ""
      }
    </header>
  `
      : ""
    }

  <div class="hr-vs-bar-chart-card">
    ${chartHtml}
  </div>

  ${options.showSummary !== false && strongest && weakest
      ? `
  <div class="hr-vs-bar-summary">
    <div class="hr-vs-bar-summary-box">
      <p class="hr-vs-bar-summary-label">Najwyższy wynik</p>
      <p class="hr-vs-bar-summary-text">
        Najwyższy wynik widoczny jest w obszarze
        <strong>${escapeHtml(strongest.label)}</strong>
        (${escapeHtml(formatScore(strongest.value))}).
      </p>
    </div>

    <div class="hr-vs-bar-summary-box">
      <p class="hr-vs-bar-summary-label">Najniższy wynik</p>
      <p class="hr-vs-bar-summary-text">
        Najniższy wynik widoczny jest w obszarze
        <strong>${escapeHtml(weakest.label)}</strong>
        (${escapeHtml(formatScore(weakest.value))}).
      </p>
    </div>
  </div>
  `
      : ""
    }
</section>
`.trim();
}