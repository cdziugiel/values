"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  FileCheck2,
  RotateCcw,
  UserRoundPlus,
} from "lucide-react";

export type TenantActivityPoint = {
  date: string;
  label: string;
  respondents: number;
  sessions: number;
  snapshots: number;
};

export type TenantActivityAggregation =
  | "day"
  | "week"
  | "month"
  | "quarter";

type TenantActivityMetric =
  | "respondents"
  | "sessions"
  | "snapshots";

type TenantActivityLineChartProps = {
  data: TenantActivityPoint[];
  aggregation: TenantActivityAggregation;
  offset: number;
  from: string;
  to: string;
  rangeLabel: string;
};

const METRICS: Array<{
  key: TenantActivityMetric;
  label: string;
  icon: ReactNode;
  strokeClassName: string;
  dotClassName: string;
}> = [
  {
    key: "respondents",
    label: "Nowi respondenci",
    icon: <UserRoundPlus size={15} />,
    strokeClassName: "stroke-[#171717]",
    dotClassName: "fill-[#171717]",
  },
  {
    key: "sessions",
    label: "Sesje",
    icon: <Activity size={15} />,
    strokeClassName: "stroke-[#0f766e]",
    dotClassName: "fill-[#0f766e]",
  },
  {
    key: "snapshots",
    label: "Wyniki",
    icon: <FileCheck2 size={15} />,
    strokeClassName: "stroke-[#2563eb]",
    dotClassName: "fill-[#2563eb]",
  },
];

const AGGREGATION_OPTIONS: Array<{
  value: TenantActivityAggregation;
  label: string;
}> = [
  {
    value: "day",
    label: "Dni",
  },
  {
    value: "week",
    label: "Tygodnie",
  },
  {
    value: "month",
    label: "Miesiące",
  },
  {
    value: "quarter",
    label: "Kwartały",
  },
];

const WIDTH = 1000;
const HEIGHT = 330;

const PADDING = {
  top: 24,
  right: 24,
  bottom: 48,
  left: 48,
};

function buildPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
    )
    .join(" ");
}

export function TenantActivityLineChart({
  data,
  aggregation,
  offset,
  from,
  to,
  rangeLabel,
}: TenantActivityLineChartProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [enabledMetrics, setEnabledMetrics] = useState<
    Record<TenantActivityMetric, boolean>
  >({
    respondents: true,
    sessions: true,
    snapshots: true,
  });

  const [activeIndex, setActiveIndex] = useState<number | null>(
    null,
  );

  const [selectedFrom, setSelectedFrom] = useState(from);
  const [selectedTo, setSelectedTo] = useState(to);

  useEffect(() => {
    setSelectedFrom(from);
    setSelectedTo(to);
  }, [from, to]);

  useEffect(() => {
    setActiveIndex(null);
  }, [data, aggregation, offset, from, to]);

  const chart = useMemo(() => {
    const innerWidth =
      WIDTH - PADDING.left - PADDING.right;

    const innerHeight =
      HEIGHT - PADDING.top - PADDING.bottom;

    const enabledKeys = METRICS.filter(
      (metric) => enabledMetrics[metric.key],
    ).map((metric) => metric.key);

    const maximum = Math.max(
      1,
      ...data.flatMap((point) =>
        enabledKeys.map((key) => point[key]),
      ),
    );

    const yMaximum = Math.max(
      4,
      Math.ceil(maximum / 4) * 4,
    );

    const xForIndex = (index: number) => {
      if (data.length <= 1) {
        return PADDING.left + innerWidth / 2;
      }

      return (
        PADDING.left +
        (index / (data.length - 1)) * innerWidth
      );
    };

    const yForValue = (value: number) =>
      PADDING.top +
      innerHeight -
      (value / yMaximum) * innerHeight;

    const series = METRICS.map((metric) => ({
      ...metric,
      points: data.map((point, index) => ({
        x: xForIndex(index),
        y: yForValue(point[metric.key]),
        value: point[metric.key],
      })),
    }));

    const gridValues = Array.from(
      { length: 5 },
      (_, index) => (yMaximum / 4) * index,
    );

    return {
      innerWidth,
      innerHeight,
      xForIndex,
      yForValue,
      series,
      gridValues,
    };
  }, [data, enabledMetrics]);

  function updateActivityView({
    nextAggregation = aggregation,
    nextOffset = offset,
    nextFrom = from,
    nextTo = to,
  }: {
    nextAggregation?: TenantActivityAggregation;
    nextOffset?: number;
    nextFrom?: string;
    nextTo?: string;
  }) {
    const params = new URLSearchParams(
      searchParams.toString(),
    );

    params.set(
      "activityAggregation",
      nextAggregation,
    );

    params.set("activityFrom", nextFrom);
    params.set("activityTo", nextTo);

    if (nextOffset === 0) {
      params.delete("activityOffset");
    } else {
      params.set(
        "activityOffset",
        String(nextOffset),
      );
    }

    const query = params.toString();

    router.push(
      query ? `${pathname}?${query}` : pathname,
      {
        scroll: false,
      },
    );
  }

  function applyDateRange() {
    if (!selectedFrom || !selectedTo) {
      return;
    }

    if (selectedFrom > selectedTo) {
      return;
    }

    updateActivityView({
      nextFrom: selectedFrom,
      nextTo: selectedTo,
      nextOffset: 0,
    });
  }

  function toggleMetric(
    metric: TenantActivityMetric,
  ) {
    setEnabledMetrics((current) => {
      const enabledCount = Object.values(
        current,
      ).filter(Boolean).length;

      if (
        current[metric] &&
        enabledCount === 1
      ) {
        return current;
      }

      return {
        ...current,
        [metric]: !current[metric],
      };
    });
  }

  const activePoint =
    activeIndex !== null &&
    activeIndex < data.length
      ? data[activeIndex]
      : null;

  const dateRangeChanged =
    selectedFrom !== from ||
    selectedTo !== to;

  const invalidDateRange =
    !selectedFrom ||
    !selectedTo ||
    selectedFrom > selectedTo;

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label
                htmlFor="activity-date-from"
                className="block text-xs font-medium text-[#6b7280]"
              >
                Od
              </label>

              <input
                id="activity-date-from"
                type="date"
                value={selectedFrom}
                max={selectedTo || undefined}
                onChange={(event) =>
                  setSelectedFrom(
                    event.target.value,
                  )
                }
                className="h-9 rounded-full border border-black/10 bg-white/70 px-3 text-xs text-[#171717] outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="activity-date-to"
                className="block text-xs font-medium text-[#6b7280]"
              >
                Do
              </label>

              <input
                id="activity-date-to"
                type="date"
                value={selectedTo}
                min={selectedFrom || undefined}
                onChange={(event) =>
                  setSelectedTo(
                    event.target.value,
                  )
                }
                className="h-9 rounded-full border border-black/10 bg-white/70 px-3 text-xs text-[#171717] outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              />
            </div>

            <button
              type="button"
              onClick={applyDateRange}
              disabled={
                invalidDateRange ||
                !dateRangeChanged
              }
              className="inline-flex h-9 items-center gap-2 rounded-full bg-[#171717] px-4 text-xs font-medium text-white shadow-sm transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CalendarDays size={14} />
              Zastosuj zakres
            </button>

            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-black/[0.03] px-3 text-xs font-medium text-[#6b7280]">
              <CalendarDays size={14} />
              {rangeLabel}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 rounded-full border border-black/10 bg-black/[0.03] p-1">
            {AGGREGATION_OPTIONS.map(
              (option) => {
                const active =
                  option.value === aggregation;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      updateActivityView({
                        nextAggregation:
                          option.value,
                        nextOffset: offset,
                        nextFrom: from,
                        nextTo: to,
                      })
                    }
                    aria-pressed={active}
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-medium transition",
                      active
                        ? "bg-[#171717] text-white shadow-sm"
                        : "text-[#6b7280] hover:bg-white hover:text-[#171717]",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              },
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                updateActivityView({
                  nextOffset: offset - 1,
                })
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 text-xs font-medium text-[#171717] shadow-sm transition hover:bg-white"
            >
              <ChevronLeft size={15} />
              Poprzedni zakres
            </button>

            <button
              type="button"
              onClick={() =>
                updateActivityView({
                  nextOffset: offset + 1,
                })
              }
              disabled={offset >= 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 text-xs font-medium text-[#171717] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Następny zakres
              <ChevronRight size={15} />
            </button>

            <button
              type="button"
              onClick={() =>
                updateActivityView({
                  nextOffset: 0,
                })
              }
              disabled={offset === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 text-xs font-medium text-[#171717] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={14} />
              Wybrany zakres
            </button>

            {offset !== 0 ? (
              <span className="rounded-full bg-[#171717] px-3 py-1.5 text-xs font-medium text-white">
                Przesunięcie: {offset}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {METRICS.map((metric) => {
              const active =
                enabledMetrics[metric.key];

              return (
                <button
                  key={metric.key}
                  type="button"
                  onClick={() =>
                    toggleMetric(metric.key)
                  }
                  aria-pressed={active}
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition",
                    active
                      ? "border-black/15 bg-[#171717] text-white shadow-sm"
                      : "border-black/10 bg-white/70 text-[#6b7280] hover:bg-white",
                  ].join(" ")}
                >
                  {metric.icon}
                  {metric.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-8 text-center">
          <Database
            className="mx-auto text-[#9ca3af]"
            size={24}
          />

          <p className="mt-3 text-sm font-medium text-[#171717]">
            Brak danych w wybranym okresie
          </p>

          <p className="mt-1 text-sm text-[#6b7280]">
            Zmień zakres dat, agregację albo
            przejdź do wcześniejszego okresu.
          </p>
        </div>
      ) : (
        <div className="relative mt-5 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70">
          {activePoint ? (
            <div className="pointer-events-none absolute right-4 top-4 z-10 min-w-[190px] rounded-2xl border border-black/10 bg-white/95 p-3 shadow-lg backdrop-blur">
              <p className="text-xs font-semibold text-[#171717]">
                {activePoint.label}
              </p>

              <div className="mt-2 space-y-1.5">
                {METRICS.filter(
                  (metric) =>
                    enabledMetrics[metric.key],
                ).map((metric) => (
                  <div
                    key={metric.key}
                    className="flex items-center justify-between gap-6 text-xs"
                  >
                    <span className="text-[#6b7280]">
                      {metric.label}
                    </span>

                    <span className="font-semibold text-[#171717]">
                      {
                        activePoint[
                          metric.key
                        ]
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="Aktywność respondentów, sesji i wyników w czasie"
            className="block h-auto min-h-[280px] w-full"
            onMouseLeave={() =>
              setActiveIndex(null)
            }
          >
            {chart.gridValues.map((value) => {
              const y =
                chart.yForValue(value);

              return (
                <g key={value}>
                  <line
                    x1={PADDING.left}
                    x2={
                      WIDTH -
                      PADDING.right
                    }
                    y1={y}
                    y2={y}
                    className="stroke-black/[0.07]"
                    strokeWidth="1"
                  />

                  <text
                    x={PADDING.left - 12}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-[#9ca3af] text-[11px]"
                  >
                    {Math.round(value)}
                  </text>
                </g>
              );
            })}

            {data.map((point, index) => {
              const x =
                chart.xForIndex(index);

              const showLabel =
                data.length <= 10 ||
                index === 0 ||
                index ===
                  data.length - 1 ||
                index %
                  Math.ceil(
                    data.length / 7,
                  ) ===
                  0;

              const interactionWidth =
                chart.innerWidth /
                Math.max(
                  data.length - 1,
                  1,
                );

              return (
                <g key={point.date}>
                  <rect
                    x={
                      x -
                      interactionWidth / 2
                    }
                    y={PADDING.top}
                    width={interactionWidth}
                    height={
                      chart.innerHeight
                    }
                    fill="transparent"
                    onMouseEnter={() =>
                      setActiveIndex(index)
                    }
                  />

                  {activeIndex ===
                  index ? (
                    <line
                      x1={x}
                      x2={x}
                      y1={PADDING.top}
                      y2={
                        HEIGHT -
                        PADDING.bottom
                      }
                      className="stroke-black/15"
                      strokeDasharray="4 4"
                    />
                  ) : null}

                  {showLabel ? (
                    <text
                      x={x}
                      y={HEIGHT - 18}
                      textAnchor="middle"
                      className="fill-[#9ca3af] text-[11px]"
                    >
                      {point.label}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {chart.series.map((series) => {
              if (
                !enabledMetrics[
                  series.key
                ]
              ) {
                return null;
              }

              return (
                <g key={series.key}>
                  <path
                    d={buildPath(
                      series.points,
                    )}
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={
                      series.strokeClassName
                    }
                  />

                  {series.points.map(
                    (point, index) => (
                      <circle
                        key={`${series.key}-${data[index].date}`}
                        cx={point.x}
                        cy={point.y}
                        r={
                          activeIndex ===
                          index
                            ? 5
                            : 3
                        }
                        className={[
                          series.dotClassName,
                          "pointer-events-none stroke-white transition-all",
                        ].join(" ")}
                        strokeWidth="2"
                      />
                    ),
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}