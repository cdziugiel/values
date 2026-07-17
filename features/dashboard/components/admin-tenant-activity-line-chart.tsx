"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  FileCheck2,
  RotateCcw,
  UserRoundPlus,
} from "lucide-react";

import type {
  AdminActivityAggregation,
  AdminActivityFailure,
  AdminActivityMetric,
  AdminActivityPoint,
  AdminActivitySeries,
  AdminActivityTenantOption,
} from "@/features/dashboard/api/admin-dashboard-activity.queries";

type Props = {
  tenantOptions: AdminActivityTenantOption[];
  selectedTenantSlugs: string[];
  metric: AdminActivityMetric;
  aggregation: AdminActivityAggregation;
  offset: number;
  from: string;
  to: string;
  rangeLabel: string;
  series: AdminActivitySeries[];
  aggregate: AdminActivityPoint[];
  failures: AdminActivityFailure[];
};

const WIDTH = 1000;
const HEIGHT = 340;
const PADDING = { top: 28, right: 24, bottom: 52, left: 52 };

const SERIES_STYLES = [
  { stroke: "#171717", fill: "#171717" },
  { stroke: "#0f766e", fill: "#0f766e" },
  { stroke: "#2563eb", fill: "#2563eb" },
  { stroke: "#7c3aed", fill: "#7c3aed" },
  { stroke: "#c2410c", fill: "#c2410c" },
  { stroke: "#be123c", fill: "#be123c" },
  { stroke: "#0369a1", fill: "#0369a1" },
  { stroke: "#4d7c0f", fill: "#4d7c0f" },
  { stroke: "#a16207", fill: "#a16207" },
  { stroke: "#6b7280", fill: "#6b7280" },
];

const METRICS: Array<{
  value: AdminActivityMetric;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: "sessions", label: "Sesje", icon: <Activity size={14} /> },
  {
    value: "respondents",
    label: "Nowi respondenci",
    icon: <UserRoundPlus size={14} />,
  },
  { value: "snapshots", label: "Wyniki", icon: <FileCheck2 size={14} /> },
];

const AGGREGATIONS: Array<{
  value: AdminActivityAggregation;
  label: string;
}> = [
  { value: "day", label: "Dni" },
  { value: "week", label: "Tygodnie" },
  { value: "month", label: "Miesiące" },
  { value: "quarter", label: "Kwartały" },
];

function buildPath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function AdminTenantActivityLineChart({
  tenantOptions,
  selectedTenantSlugs,
  metric,
  aggregation,
  offset,
  from,
  to,
  rangeLabel,
  series,
  aggregate,
  failures,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedFrom, setSelectedFrom] = useState(from);
  const [selectedTo, setSelectedTo] = useState(to);
  const [draftTenants, setDraftTenants] = useState(selectedTenantSlugs);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedFrom(from);
    setSelectedTo(to);
    setDraftTenants(selectedTenantSlugs);
    setActiveIndex(null);
  }, [from, to, selectedTenantSlugs, metric, aggregation, offset]);

  const compareMode = selectedTenantSlugs.length > 1;
  const displayedSeries = useMemo(
    () =>
      compareMode
        ? series
        : [
            {
              tenantId: "aggregate",
              tenantSlug: "aggregate",
              tenantName:
                selectedTenantSlugs.length === 1
                  ? series[0]?.tenantName ?? "Wybrany partner"
                  : "Wszyscy partnerzy",
              points: aggregate,
            },
          ],
    [aggregate, compareMode, selectedTenantSlugs.length, series],
  );

  const chart = useMemo(() => {
    const innerWidth = WIDTH - PADDING.left - PADDING.right;
    const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
    const pointCount = displayedSeries[0]?.points.length ?? 0;
    const maximum = Math.max(
      1,
      ...displayedSeries.flatMap((item) => item.points.map((point) => point.value)),
    );
    const yMaximum = Math.max(4, Math.ceil(maximum / 4) * 4);

    const xForIndex = (index: number) =>
      pointCount <= 1
        ? PADDING.left + innerWidth / 2
        : PADDING.left + (index / (pointCount - 1)) * innerWidth;

    const yForValue = (value: number) =>
      PADDING.top + innerHeight - (value / yMaximum) * innerHeight;

    return {
      innerWidth,
      innerHeight,
      xForIndex,
      yForValue,
      gridValues: Array.from({ length: 5 }, (_, index) => (yMaximum / 4) * index),
      series: displayedSeries.map((item, seriesIndex) => ({
        ...item,
        style: SERIES_STYLES[seriesIndex % SERIES_STYLES.length],
        chartPoints: item.points.map((point, index) => ({
          x: xForIndex(index),
          y: yForValue(point.value),
          value: point.value,
        })),
      })),
    };
  }, [displayedSeries]);

  function update(paramsPatch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(paramsPatch)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function applyTenants() {
    update({
      activityTenants: draftTenants.length > 0 ? draftTenants.join(",") : null,
      activityOffset: null,
    });
  }

  const invalidDateRange =
    !selectedFrom || !selectedTo || selectedFrom > selectedTo;

  const firstPoints = displayedSeries[0]?.points ?? [];
  const activeLabel =
    activeIndex !== null ? firstPoints[activeIndex]?.label ?? null : null;

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto] xl:items-end">
          <div className="flex flex-wrap items-end gap-3">
            <details className="group relative">
              <summary className="flex h-9 min-w-[240px] cursor-pointer list-none items-center justify-between gap-3 rounded-full border border-black/10 bg-white/70 px-4 text-xs font-medium text-[#171717] shadow-sm">
                <span>
                  {selectedTenantSlugs.length === 0
                    ? "Wszyscy partnerzy"
                    : selectedTenantSlugs.length === 1
                      ? tenantOptions.find(
                          (tenant) => tenant.tenantSlug === selectedTenantSlugs[0],
                        )?.tenantName ?? "1 partner"
                      : `${selectedTenantSlugs.length} partnerów`}
                </span>
                <ChevronDown size={14} />
              </summary>

              <div className="absolute left-0 top-11 z-30 w-[320px] rounded-2xl border border-black/10 bg-white p-3 shadow-xl">
                <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                  {tenantOptions.map((tenant) => {
                    const checked = draftTenants.includes(tenant.tenantSlug);

                    return (
                      <label
                        key={tenant.tenantId}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-black/[0.03]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!tenant.available}
                          onChange={() =>
                            setDraftTenants((current) =>
                              checked
                                ? current.filter((slug) => slug !== tenant.tenantSlug)
                                : [...current, tenant.tenantSlug].slice(0, 10),
                            )
                          }
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {tenant.tenantName}
                        </span>
                        {!tenant.available ? (
                          <span className="text-[11px] text-[#9ca3af]">niedostępny</span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/10 pt-3">
                  <button
                    type="button"
                    onClick={() => setDraftTenants([])}
                    className="text-xs font-medium text-[#6b7280] hover:text-[#171717]"
                  >
                    Wszyscy
                  </button>
                  <button
                    type="button"
                    onClick={applyTenants}
                    className="rounded-full bg-[#171717] px-4 py-2 text-xs font-medium text-white"
                  >
                    Zastosuj
                  </button>
                </div>
              </div>
            </details>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#6b7280]">Od</label>
              <input
                type="date"
                value={selectedFrom}
                max={selectedTo || undefined}
                onChange={(event) => setSelectedFrom(event.target.value)}
                className="h-9 rounded-full border border-black/10 bg-white/70 px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#6b7280]">Do</label>
              <input
                type="date"
                value={selectedTo}
                min={selectedFrom || undefined}
                onChange={(event) => setSelectedTo(event.target.value)}
                className="h-9 rounded-full border border-black/10 bg-white/70 px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              />
            </div>

            <button
              type="button"
              disabled={invalidDateRange}
              onClick={() =>
                update({
                  activityFrom: selectedFrom,
                  activityTo: selectedTo,
                  activityOffset: null,
                })
              }
              className="inline-flex h-9 items-center gap-2 rounded-full bg-[#171717] px-4 text-xs font-medium text-white disabled:opacity-40"
            >
              <CalendarDays size={14} />
              Zastosuj zakres
            </button>

            <span className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-black/[0.03] px-3 text-xs text-[#6b7280]">
              <CalendarDays size={14} />
              {rangeLabel}
            </span>
          </div>

          <div className="flex flex-wrap gap-1 rounded-full border border-black/10 bg-black/[0.03] p-1">
            {AGGREGATIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  update({
                    activityAggregation: option.value,
                    activityOffset: null,
                  })
                }
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  aggregation === option.value
                    ? "bg-[#171717] text-white shadow-sm"
                    : "text-[#6b7280] hover:bg-white hover:text-[#171717]",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                update({ activityOffset: String(offset - 1) })
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 text-xs font-medium"
            >
              <ChevronLeft size={15} />
              Poprzedni zakres
            </button>
            <button
              type="button"
              disabled={offset >= 0}
              onClick={() =>
                update({
                  activityOffset: offset + 1 === 0 ? null : String(offset + 1),
                })
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 text-xs font-medium disabled:opacity-40"
            >
              Następny zakres
              <ChevronRight size={15} />
            </button>
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => update({ activityOffset: null })}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 text-xs font-medium disabled:opacity-40"
            >
              <RotateCcw size={14} />
              Wybrany zakres
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {METRICS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => update({ activityMetric: option.value })}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium",
                  metric === option.value
                    ? "border-black/15 bg-[#171717] text-white"
                    : "border-black/10 bg-white/70 text-[#6b7280]",
                ].join(" ")}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {failures.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Dane pobrano z {series.length} z {series.length + failures.length} wybranych baz.
          <span className="ml-1 text-amber-700">
            Niedostępne: {failures.map((item) => item.tenantName).join(", ")}.
          </span>
        </div>
      ) : null}

      {displayedSeries.length === 0 || firstPoints.length === 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-8 text-center">
          <Database className="mx-auto text-[#9ca3af]" size={24} />
          <p className="mt-3 text-sm font-medium text-[#171717]">
            Brak danych w wybranym okresie
          </p>
          <p className="mt-1 text-sm text-[#6b7280]">
            Zmień partnerów, zakres dat albo agregację.
          </p>
        </div>
      ) : (
        <div className="relative mt-5 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70">
          {activeIndex !== null && activeLabel ? (
            <div className="pointer-events-none absolute right-4 top-4 z-10 min-w-[220px] rounded-2xl border border-black/10 bg-white/95 p-3 shadow-lg">
              <p className="text-xs font-semibold text-[#171717]">{activeLabel}</p>
              <div className="mt-2 space-y-1.5">
                {displayedSeries.map((item) => (
                  <div
                    key={item.tenantId}
                    className="flex items-center justify-between gap-6 text-xs"
                  >
                    <span className="max-w-[170px] truncate text-[#6b7280]">
                      {item.tenantName}
                    </span>
                    <span className="font-semibold text-[#171717]">
                      {item.points[activeIndex]?.value ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="Porównanie aktywności partnerów w czasie"
            className="block h-auto min-h-[290px] w-full"
            onMouseLeave={() => setActiveIndex(null)}
          >
            {chart.gridValues.map((value) => {
              const y = chart.yForValue(value);
              return (
                <g key={value}>
                  <line
                    x1={PADDING.left}
                    x2={WIDTH - PADDING.right}
                    y1={y}
                    y2={y}
                    stroke="rgba(0,0,0,0.07)"
                  />
                  <text
                    x={PADDING.left - 12}
                    y={y + 4}
                    textAnchor="end"
                    fill="#9ca3af"
                    fontSize="11"
                  >
                    {Math.round(value)}
                  </text>
                </g>
              );
            })}

            {firstPoints.map((point, index) => {
              const x = chart.xForIndex(index);
              const showLabel =
                firstPoints.length <= 10 ||
                index === 0 ||
                index === firstPoints.length - 1 ||
                index % Math.ceil(firstPoints.length / 7) === 0;
              const interactionWidth =
                chart.innerWidth / Math.max(firstPoints.length - 1, 1);

              return (
                <g key={point.date}>
                  <rect
                    x={x - interactionWidth / 2}
                    y={PADDING.top}
                    width={interactionWidth}
                    height={chart.innerHeight}
                    fill="transparent"
                    onMouseEnter={() => setActiveIndex(index)}
                  />
                  {activeIndex === index ? (
                    <line
                      x1={x}
                      x2={x}
                      y1={PADDING.top}
                      y2={HEIGHT - PADDING.bottom}
                      stroke="rgba(0,0,0,0.15)"
                      strokeDasharray="4 4"
                    />
                  ) : null}
                  {showLabel ? (
                    <text
                      x={x}
                      y={HEIGHT - 18}
                      textAnchor="middle"
                      fill="#9ca3af"
                      fontSize="11"
                    >
                      {point.label}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {chart.series.map((item) => (
              <g key={item.tenantId}>
                <path
                  d={buildPath(item.chartPoints)}
                  fill="none"
                  stroke={item.style.stroke}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {item.chartPoints.map((point, index) => (
                  <circle
                    key={`${item.tenantId}-${firstPoints[index]?.date}`}
                    cx={point.x}
                    cy={point.y}
                    r={activeIndex === index ? 5 : 3}
                    fill={item.style.fill}
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}
              </g>
            ))}
          </svg>

          {compareMode ? (
            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-black/10 px-4 py-3">
              {chart.series.map((item) => (
                <div key={item.tenantId} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.style.fill }}
                  />
                  <span className="text-[#6b7280]">{item.tenantName}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}