import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function PreviewItemCard({
  item,
  index,
}: {
  item: QuestionnairePreviewItem;
  index: number;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium leading-relaxed">{item.text}</div>

            {item.required ? (
              <Badge variant="secondary">wymagane</Badge>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{item.code}</span>
            <span>· {item.type}</span>
          </div>

          {item.helpText ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {item.helpText}
            </p>
          ) : null}

          <PreviewItemInput item={item} />
        </div>
      </div>
    </div>
  );
}

export async function QuestionnairePreviewPage({
  versionId,
}: QuestionnairePreviewPageProps) {
  await requireSuperAdmin();

  const data = await getQuestionnairePreviewData(versionId);

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Nie znaleziono wersji"
          description="Nie znaleziono wersji kwestionariusza do podglądu."
          actions={
            <Button asChild variant="outline">
              <Link href="/dashboard/questionnaires">Wróć</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const totalItems =
    data.pages.reduce((acc, page) => acc + page.items.length, 0) +
    data.unpagedItems.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Podgląd: ${data.questionnaire.name}`}
        description="Administracyjny podgląd kwestionariusza. Odpowiedzi nie są zapisywane."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/questionnaires/editor/${data.version.id}`}>
                Edytuj treść
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href="/dashboard/questionnaires">Wróć do listy</Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{data.version.name}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{data.questionnaire.code}</Badge>
            <Badge variant="outline">wersja {data.version.version}</Badge>
            <Badge variant="secondary">{data.version.status}</Badge>

            {data.version.isPublic ? (
              <Badge variant="secondary">publiczna</Badge>
            ) : null}
          </div>

          {data.version.description ? (
            <p className="text-sm text-muted-foreground">
              {data.version.description}
            </p>
          ) : data.questionnaire.description ? (
            <p className="text-sm text-muted-foreground">
              {data.questionnaire.description}
            </p>
          ) : null}

          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-xl border bg-muted/30 p-3">
              <div className="text-xs uppercase text-muted-foreground">
                Strony
              </div>
              <div className="mt-1 text-lg font-semibold">
                {data.pages.length}
              </div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-3">
              <div className="text-xs uppercase text-muted-foreground">
                Pytania
              </div>
              <div className="mt-1 text-lg font-semibold">{totalItems}</div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-3">
              <div className="text-xs uppercase text-muted-foreground">
                Tryb
              </div>
              <div className="mt-1 text-lg font-semibold">Podgląd</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {data.pages.length === 0 && data.unpagedItems.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
          Ta wersja nie ma jeszcze stron ani itemów.
        </div>
      ) : null}

      {data.pages.map((page) => (
        <section key={page.id} className="space-y-5 rounded-2xl border p-5">
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground">
              {page.code}
            </div>

            <h2 className="mt-1 text-xl font-semibold">{page.title}</h2>

            {page.description ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {page.description}
              </p>
            ) : null}
          </div>

          {page.items.length === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
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
        <section className="space-y-5 rounded-2xl border p-5">
          <div>
            <h2 className="text-xl font-semibold">Itemy bez strony</h2>
            <p className="mt-2 text-sm text-muted-foreground">
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
  );
}