// features/report-builder/lib/report-components/report-component-registry.ts
import type { ReportContext } from "../report-context";
import {
    renderValueSystemsBarChart,
    VALUE_SYSTEMS_BAR_CHART_CSS,
} from "./value-systems-bar-chart";
import { mapReportContextToValueSystemsBarChartItems } from "./value-systems-chart-data";

export type ReportComponentBinding = {
    slot: string;
    component: string;
    props?: Record<string, unknown> | null;
};

export type RenderReportComponentInput = {
    binding: ReportComponentBinding;
    context: ReportContext;
};

function labelModeOrFallback(value: unknown) {
    if (
        value === "full" ||
        value === "short" ||
        value === "initial" ||
        value === "none"
    ) {
        return value;
    }

    return "full";
}

function sourceOrFallback(value: unknown) {
    return value === "crossScores" ? "crossScores" : "scores";
}

function metricOrFallback(value: unknown) {
    if (
        value === "rawScore" ||
        value === "weightedScore" ||
        value === "meanScore" ||
        value === "weightedMeanScore" ||
        value === "normalizedScore"
    ) {
        return value;
    }

    return "weightedMeanScore";
}

function optionalString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function orientationOrFallback(value: unknown) {
    return value === "vertical" ? "vertical" : "horizontal";
}

function scaleOrFallback(value: unknown, legacyMaxValue?: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {
            min: 0,
            max: numberOrFallback(legacyMaxValue, 5),
            step: 1,
        };
    }

    const candidate = value as Record<string, unknown>;

    return {
        min: numberOrFallback(candidate.min, 0),
        max: numberOrFallback(candidate.max, numberOrFallback(legacyMaxValue, 5)),
        step: numberOrFallback(candidate.step, 1),
    };
}

function stringOrFallback(value: unknown, fallback: string) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}


function chartSizeOrUndefined(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }

    const candidate = value as Record<string, unknown>;

    const horizontal =
        candidate.horizontal &&
            typeof candidate.horizontal === "object" &&
            !Array.isArray(candidate.horizontal)
            ? (candidate.horizontal as Record<string, unknown>)
            : undefined;

    const vertical =
        candidate.vertical &&
            typeof candidate.vertical === "object" &&
            !Array.isArray(candidate.vertical)
            ? (candidate.vertical as Record<string, unknown>)
            : undefined;

    return {
        width: typeof candidate.width === "string" ? candidate.width : undefined,
        maxWidth:
            typeof candidate.maxWidth === "string" ? candidate.maxWidth : undefined,

        horizontal: horizontal
            ? {
                labelWidth:
                    typeof horizontal.labelWidth === "string"
                        ? horizontal.labelWidth
                        : undefined,
                valueWidth:
                    typeof horizontal.valueWidth === "string"
                        ? horizontal.valueWidth
                        : undefined,
                barHeight:
                    typeof horizontal.barHeight === "string"
                        ? horizontal.barHeight
                        : undefined,
                rowGap:
                    typeof horizontal.rowGap === "string" ? horizontal.rowGap : undefined,
                columnGap:
                    typeof horizontal.columnGap === "string"
                        ? horizontal.columnGap
                        : undefined,
                scaleHeight:
                    typeof horizontal.scaleHeight === "string"
                        ? horizontal.scaleHeight
                        : undefined,
                barRadius:
                    typeof horizontal.barRadius === "string"
                        ? horizontal.barRadius
                        : undefined,
            }
            : undefined,

        vertical: vertical
            ? {
                plotHeight:
                    typeof vertical.plotHeight === "string"
                        ? vertical.plotHeight
                        : undefined,
                barWidth:
                    typeof vertical.barWidth === "string" ? vertical.barWidth : undefined,
                columnGap:
                    typeof vertical.columnGap === "string"
                        ? vertical.columnGap
                        : undefined,
                scaleWidth:
                    typeof vertical.scaleWidth === "string"
                        ? vertical.scaleWidth
                        : undefined,
                labelGap:
                    typeof vertical.labelGap === "string" ? vertical.labelGap : undefined,
                barRadius:
                    typeof vertical.barRadius === "string"
                        ? vertical.barRadius
                        : undefined,

                labelFontSize:
                    typeof vertical.labelFontSize === "string"
                        ? vertical.labelFontSize
                        : undefined,
                valueFontSize:
                    typeof vertical.valueFontSize === "string"
                        ? vertical.valueFontSize
                        : undefined,
                scaleFontSize:
                    typeof vertical.scaleFontSize === "string"
                        ? vertical.scaleFontSize
                        : undefined,
                valueLabelOffset:
                    typeof vertical.valueLabelOffset === "string"
                        ? vertical.valueLabelOffset
                        : undefined,
                labelPrimaryColor:
                    typeof vertical.labelPrimaryColor === "string"
                        ? vertical.labelPrimaryColor
                        : undefined,

                labelSecondaryColor:
                    typeof vertical.labelSecondaryColor === "string"
                        ? vertical.labelSecondaryColor
                        : undefined,
                labelFirstColor:
                    typeof vertical.labelFirstColor === "string"
                        ? vertical.labelFirstColor
                        : undefined,

                labelRestColor:
                    typeof vertical.labelRestColor === "string"
                        ? vertical.labelRestColor
                        : undefined,
            }
            : undefined,

    };
}

function numberOrFallback(value: unknown, fallback: number) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return fallback;
}

export function getReportComponentsCss() {
    return [VALUE_SYSTEMS_BAR_CHART_CSS].join("\n\n");
}

export function normalizeReportComponentBindings(
    value: unknown,
): ReportComponentBinding[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((item): item is ReportComponentBinding => {
            if (!item || typeof item !== "object") {
                return false;
            }

            const candidate = item as Partial<ReportComponentBinding>;

            return (
                typeof candidate.slot === "string" &&
                candidate.slot.trim() !== "" &&
                typeof candidate.component === "string" &&
                candidate.component.trim() !== ""
            );
        })
        .map((item) => ({
            slot: item.slot.trim(),
            component: item.component.trim(),
            props:
                item.props && typeof item.props === "object" && !Array.isArray(item.props)
                    ? (item.props as Record<string, unknown>)
                    : {},
        }));
}

function booleanOrFallback(value: unknown, fallback: boolean) {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        if (value === "true") {
            return true;
        }

        if (value === "false") {
            return false;
        }
    }

    return fallback;
}



export function renderReportComponent({
    binding,
    context,
}: RenderReportComponentInput) {
    const props = binding.props ?? {};

    if (binding.component === "ValueSystemsBarChart") {
        const category = stringOrFallback(props.category, "vMEME");
        const metric = stringOrFallback(
            props.metric,
            "weightedMeanScore",
        ) as "weightedMeanScore" | "meanScore" | "normalizedScore" | "rawScore";

        const items = mapReportContextToValueSystemsBarChartItems({
            context,
            source: sourceOrFallback(props.source),
            targetCategory: stringOrFallback(props.targetCategory, "vMEME"),
            filterCategory: optionalString(props.filterCategory),
            filterCode: optionalString(props.filterCode),
            metric: metricOrFallback(props.metric),
        });

        return renderValueSystemsBarChart({
            title:
                typeof props.title === "string"
                    ? props.title
                    : "Wyniki w systemach wartości",
            description:
                typeof props.description === "string" ? props.description : undefined,
            orientation: orientationOrFallback(props.orientation),
            scale: scaleOrFallback(props.scale, props.maxValue),
            size: chartSizeOrUndefined(props.size),
            showSummary: booleanOrFallback(props.showSummary, true),
            items,
            labelMode: labelModeOrFallback(props.labelMode),

        });
    }

    return `
<div class="report-slot">
  Nieznany komponent raportu: ${binding.component}
</div>
`.trim();
}