import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  FileText,
  ListChecks,
  Pencil,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { PageHeader } from "@/shared/ui";

import {
  getQuestionnairePreviewData,
  type QuestionnairePreviewItem,
} from "../api/questionnaire-preview.queries";

type QuestionnairePreviewPageProps = {
  versionId: string;
};

type PreviewOption = {
  value: string | number | boolean;
  label: string;
};

function normalizeOptions(value: unknown): PreviewOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((option) => {
      if (typeof option !== "object" || option === null) {
        return null;
      }

      const raw = option as Record<string, unknown>;
      const optionValue = raw.value;

      if (
        typeof optionValue !== "string" &&
        typeof optionValue !== "number" &&
        typeof optionValue !== "boolean"
      ) {
        return null;
      }

      return {
        value: optionValue,
        label: String(raw.label ?? optionValue),
      };
    })
    .filter(Boolean) as PreviewOption[];
}

function normalizeResponseConfig(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function optionValueToString(value: string | number | boolean) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function getNumberConfig(
  config: Record<string, unknown>,
  key: string,
  fallback: number,
) {
  const value = config[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function getLikertDisplay(config: Record<string, unknown>) {
  const value = config.display;

  if (value === "radio" || value === "slider" || value === "buttons") {
    return value;
  }

  return "buttons";
}

function getConfigString(
  config: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = config[key];

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback;
}

function createLikertValues(item: QuestionnairePreviewItem) {
  const scaleMin = item.scaleMin ?? 1;
  const scaleMax = item.scaleMax ?? 5;
  const responseConfig = normalizeResponseConfig(item.responseConfig);
  const step = getNumberConfig(responseConfig, "step", 1);

  const values: number[] = [];

  if (step <= 0) {
    return [scaleMin, scaleMax];
  }

  for (let value = scaleMin; value <= scaleMax; value += step) {
    values.push(Number(value.toFixed(6)));
  }

  return values;
}

function PreviewItemInput({ item }: { item: QuestionnairePreviewItem }) {
  const options = normalizeOptions(item.options);
  const responseConfig = normalizeResponseConfig(item.responseConfig);

  if (item.type === "likert") {
    const values = createLikertValues(item);
    const scaleMin = item.scaleMin ?? 1;
    const scaleMax = item.scaleMax ?? 5;
    const step = getNumberConfig(responseConfig, "step", 1);
    const display = getLikertDisplay(responseConfig);

    if (display === "slider") {
      return (
        <div className="mt-4 space-y-3">
          <input
            type="range"
            min={scaleMin}
            max={scaleMax}
            step={step}
            defaultValue={Math.round((scaleMin + scaleMax) / 2)}
            className="w-full"
            disabled
          />

          <div className="flex justify-between gap-4 text-xs text-muted-foreground">
            <span>{item.scaleMinLabel ?? scaleMin}</span>
            <span>{item.scaleMaxLabel ?? scaleMax}</span>
          </div>
        </div>
      );
    }

    if (display === "radio") {
      return (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            {values.map((value) => (
              <label
                key={value}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <input type="radio" disabled />
              </label>
            ))}
          </div>

          <div className="flex justify-between gap-4 text-xs text-muted-foreground">
            <span>{item.scaleMinLabel ?? scaleMin}</span>
            <span>{item.scaleMaxLabel ?? scaleMax}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex min-w-10 items-center justify-center rounded-md border px-3 py-2 text-sm"
            >
              {value}
            </span>
          ))}
        </div>

        <div className="flex justify-between gap-4 text-xs text-muted-foreground">
          <span>{item.scaleMinLabel ?? scaleMin}</span>
          <span>{item.scaleMaxLabel ?? scaleMax}</span>
        </div>
      </div>
    );
  }

  if (item.type === "true_false") {
    const trueFalseOptions =
      options.length > 0
        ? options
        : [
            { value: true, label: "Prawda" },
            { value: false, label: "Fałsz" },
          ];

    return (
      <div className="mt-4 space-y-2">
        {trueFalseOptions.map((option) => (
          <label
            key={optionValueToString(option.value)}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <input type="radio" disabled />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    );
  }
  if (item.type === "current_desired") {
    const currentLabel = getConfigString(
      responseConfig,
      "currentLabel",
      "Tak jest teraz",
    );

    const desiredLabel = getConfigString(
      responseConfig,
      "desiredLabel",
      "Chcę, żeby tak było",
    );

    return (
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <input type="checkbox" disabled />
          <span>{currentLabel}</span>
        </label>

        <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <input type="checkbox" disabled />
          <span>{desiredLabel}</span>
        </label>
      </div>
    );
  }
  if (item.type === "single_choice") {
    return (
      <div className="mt-4 space-y-2">
        {options.map((option) => (
          <label
            key={optionValueToString(option.value)}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <input type="radio" disabled />
            <span>{option.label}</span>
          </label>
        ))}

        {options.length === 0 ? (
          <p className="text-sm text-destructive">
            Brak zdefiniowanych opcji odpowiedzi.
          </p>
        ) : null}
      </div>
    );
  }

  if (item.type === "multiple_choice") {
    return (
      <div className="mt-4 space-y-2">
        {options.map((option) => (
          <label
            key={optionValueToString(option.value)}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <input type="checkbox" disabled />
            <span>{option.label}</span>
          </label>
        ))}

        {options.length === 0 ? (
          <p className="text-sm text-destructive">
            Brak zdefiniowanych opcji odpowiedzi.
          </p>
        ) : null}
      </div>
    );
  }

  if (item.type === "text") {
    const multiline = responseConfig.multiline !== false;
    const maxLength =
      typeof responseConfig.maxLength === "number"
        ? responseConfig.maxLength
        : 1000;

    if (multiline) {
      return (
        <textarea
          disabled
          maxLength={maxLength}
          className="mt-4 min-h-28 w-full rounded-md border bg-muted/40 px-3 py-2 text-sm"
          placeholder="Pole odpowiedzi tekstowej"
        />
      );
    }

    return (
      <input
        disabled
        maxLength={maxLength}
        className="mt-4 h-10 w-full rounded-md border bg-muted/40 px-3 text-sm"
        placeholder="Pole odpowiedzi tekstowej"
      />
    );
  }

  if (item.type === "number") {
    const min = responseConfig.min;
    const max = responseConfig.max;
    const step = getNumberConfig(responseConfig, "step", 1);

    return (
      <input
        disabled
        type="number"
        min={typeof min === "number" ? min : undefined}
        max={typeof max === "number" ? max : undefined}
        step={step}
        className="mt-4 h-10 w-full rounded-md border bg-muted/40 px-3 text-sm"
        placeholder="Pole odpowiedzi liczbowej"
      />
    );
  }

  return (
    <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      Nieobsługiwany typ pytania: {item.type}
    </p>
  );
}

function BrandButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Button
      asChild
      variant={variant === "primary" ? "default" : "outline"}
      className={
        variant === "primary"
          ? "rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
          : "rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
      }
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
            {label}
          </p>

          <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#171717]">
            {value}
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          {icon}
        </div>
      </div>
    </article>
  );
}

function PreviewItemCard({
  item,
  index,
}: {
  item: QuestionnairePreviewItem;
  index: number;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <div className="flex gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-xs font-semibold text-[#171717]">
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <h3 className="font-medium leading-7 tracking-[-0.01em] text-[#171717]">
              {item.text}
            </h3>

            {item.required ? (
              <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                wymagane
              </Badge>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#6b7280]">
            <span className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1 font-mono">
              {item.code}
            </span>
            <span className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1">
              {item.type}
            </span>
          </div>

          {item.helpText ? (
            <p className="mt-3 text-sm leading-6 text-[#6b7280]">
              {item.helpText}
            </p>
          ) : null}

          <PreviewItemInput item={item} />
        </div>
      </div>
    </article>
  );
}

export async function QuestionnairePreviewPage({
  versionId,
}: QuestionnairePreviewPageProps) {
  await requireSuperAdmin();

  const data = await getQuestionnairePreviewData(versionId);

  if (!data) {
    return (
      <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <PageHeader
            title="Nie znaleziono wersji"
            description="Nie znaleziono wersji kwestionariusza do podglądu."
          />

          <BrandButton href="/dashboard/questionnaires" variant="secondary">
            <ArrowLeft size={16} />
            Wróć
          </BrandButton>
        </div>
      </div>
    );
  }

  const totalItems =
    data.pages.reduce((acc, page) => acc + page.items.length, 0) +
    data.unpagedItems.length;

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <PageHeader
          title={`Podgląd: ${data.questionnaire.name}`}
          description="Administracyjny podgląd kwestionariusza. Odpowiedzi nie są zapisywane."
          actions={
            <div className="flex flex-wrap gap-2">
              <BrandButton
                href={`/dashboard/questionnaires/editor/${data.version.id}`}
                variant="secondary"
              >
                <Pencil size={16} />
                Edytuj treść
              </BrandButton>

              <BrandButton href="/dashboard/questionnaires" variant="secondary">
                <ArrowLeft size={16} />
                Wróć do listy
              </BrandButton>
            </div>
          }
        />

        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <Eye size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  Podgląd kwestionariusza
                </span>
              </div>

              <h1 className="text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                {data.version.name}
              </h1>

              <div className="mt-5 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border-black/10 bg-white/70 font-mono text-[#6b7280]"
                >
                  {data.questionnaire.code}
                </Badge>

                <Badge
                  variant="outline"
                  className="rounded-full border-black/10 bg-white/70 text-[#6b7280]"
                >
                  wersja {data.version.version}
                </Badge>

                <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  {data.version.status}
                </Badge>

                {data.version.isPublic ? (
                  <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                    publiczna
                  </Badge>
                ) : null}
              </div>

              {data.version.description ? (
                <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                  {data.version.description}
                </p>
              ) : data.questionnaire.description ? (
                <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                  {data.questionnaire.description}
                </p>
              ) : null}
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <ShieldCheck size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    Tryb podglądu
                  </p>
                  <p className="mt-0.5 text-sm text-[#6b7280]">
                    bez zapisu odpowiedzi
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-black/10 bg-white/35 p-6 md:grid-cols-3 md:p-8">
            <MetricCard
              label="Strony"
              value={data.pages.length}
              icon={<FileText size={18} />}
            />

            <MetricCard
              label="Pytania"
              value={totalItems}
              icon={<ListChecks size={18} />}
            />

            <MetricCard
              label="Tryb"
              value="Podgląd"
              icon={<Eye size={18} />}
            />
          </div>
        </section>

        {data.pages.length === 0 && data.unpagedItems.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
            Ta wersja nie ma jeszcze stron ani itemów.
          </div>
        ) : null}

        {data.pages.map((page, pageIndex) => (
          <section
            key={page.id}
            className="space-y-5 rounded-[2rem] hv-brand-card p-6"
          >
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-sm font-semibold text-[#171717]">
                {pageIndex + 1}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
                  {page.code}
                </p>

                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
                  {page.title}
                </h2>

                {page.description ? (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">
                    {page.description}
                  </p>
                ) : null}
              </div>
            </div>

            {page.items.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-5 text-sm text-[#6b7280]">
                Brak pytań na tej stronie.
              </div>
            ) : (
              <div className="space-y-4">
                {page.items.map((item, index) => (
                  <PreviewItemCard key={item.id} item={item} index={index} />
                ))}
              </div>
            )}
          </section>
        ))}

        {data.unpagedItems.length > 0 ? (
          <section className="space-y-5 rounded-[2rem] hv-brand-card p-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
                Itemy bez strony
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                Te pytania nie są przypisane do konkretnej strony.
              </p>
            </div>

            <div className="space-y-4">
              {data.unpagedItems.map((item, index) => (
                <PreviewItemCard key={item.id} item={item} index={index} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}