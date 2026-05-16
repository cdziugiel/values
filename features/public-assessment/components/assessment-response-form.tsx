// features/public-assessment/components/assessment-response-form.tsx
"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { completeAssessmentSessionAction } from "../api/complete-assessment-session.actions";

import { Input } from "@/components/ui/input";
import {
  saveAssessmentResponsesAction,
  type SaveAssessmentResponsesState,
} from "../api/assessment-response.actions";

type AssessmentResponseFormOption = {
  value: string | number | boolean;
  label: string;
};

type AssessmentResponseFormItem = {
  id: string;
  code: string;
  type: string;
  text: string;
  helpText: string | null;
  required: boolean;

  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;

  options?: unknown;
  responseConfig?: unknown;

  existingNumberValue: number | null;
  existingTextValue?: string | null;
  existingBooleanValue?: boolean | null;
  existingJsonValue?: unknown | null;

  questionnaireId: string;
  questionnaireVersionId: string;
  questionnaireName: string;
  questionnaireVersionName: string;
  questionnaireOrderIndex?: number;

  questionnairePageId?: string | null;
  pageId?: string | null;
  pageCode?: string | null;
  pageTitle?: string | null;
  pageDescription?: string | null;
  pageOrderIndex?: number | null;

  orderIndex?: number | null;
};

type AssessmentResponseFormProps = {
  token: string;
  sessionId: string;
  items: AssessmentResponseFormItem[];
  mode?: "token" | "my-assessment";
  tenantSlug?: string;
};

const initialState: SaveAssessmentResponsesState = {
  status: "idle",
  message: "",
};




function getLikertValueLabels(config: Record<string, unknown>) {
  const valueLabels = config.valueLabels;

  if (
    typeof valueLabels === "object" &&
    valueLabels !== null &&
    !Array.isArray(valueLabels)
  ) {
    return valueLabels as Record<string, unknown>;
  }

  return {};
}

function getLikertStoredValueLabel({
  config,
  value,
}: {
  config: Record<string, unknown>;
  value: number;
}) {
  const labels = getLikertValueLabels(config);
  const label = labels[String(value)];

  return typeof label === "string" && label.trim() ? label.trim() : null;
}

function getLikertVisibleValueLabel({
  config,
  value,
}: {
  config: Record<string, unknown>;
  value: number;
}) {
  if (config.showValueLabels !== true) {
    return null;
  }

  return getLikertStoredValueLabel({ config, value });
}

function getLikertDisplay(config: Record<string, unknown>) {
  const value = config.display;

  if (value === "radio" || value === "slider" || value === "buttons") {
    return value;
  }

  return "buttons";
}

function shouldShowLikertValueLabels(config: Record<string, unknown>) {
  return config.showValueLabels === true;
}

function normalizeOptions(value: unknown): AssessmentResponseFormOption[] {
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
    .filter(Boolean) as AssessmentResponseFormOption[];
}

function normalizeResponseConfig(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
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

function getBooleanConfig(
  config: Record<string, unknown>,
  key: string,
  fallback: boolean,
) {
  const value = config[key];

  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function optionValueToString(value: string | number | boolean) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function getExistingValue(item: AssessmentResponseFormItem) {
  if (item.type === "likert" || item.type === "number") {
    return item.existingNumberValue;
  }

  if (item.type === "text") {
    return item.existingTextValue ?? "";
  }

  if (item.type === "true_false") {
    if (typeof item.existingBooleanValue === "boolean") {
      return item.existingBooleanValue ? "true" : "false";
    }

    return "";
  }

  if (item.type === "single_choice") {
    return item.existingTextValue ?? "";
  }

  if (item.type === "multiple_choice") {
    if (Array.isArray(item.existingJsonValue)) {
      return item.existingJsonValue.map(String);
    }

    return [];
  }

  return "";
}

function createLikertValues(item: AssessmentResponseFormItem) {
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

function buildFieldName(item: AssessmentResponseFormItem) {
  return [
    "response",
    item.questionnaireId,
    item.questionnaireVersionId,
    item.id,
    item.code,
    item.type,
  ].join(":");
}


function LikertScaleChoice({
  fieldName,
  values,
  existingNumber,
  responseConfig,
  htmlRequired,
  showValueLabels,
  onChange,
}: {
  fieldName: string;
  values: number[];
  existingNumber: number | null;
  responseConfig: Record<string, unknown>;
  htmlRequired: boolean;
  showValueLabels: boolean;
  onChange?: (value: number) => void;
}) {
  return (
    <div className=" space-y-3">
      <div className="w-full px-1 sm:px-2">
        <div
          className="grid w-full items-start gap-1.5 sm:gap-3"
          style={{
            gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))`,
          }}
        >
          {values.map((value, index) => {
            const storedValueLabel = getLikertStoredValueLabel({
              config: responseConfig,
              value,
            });

            const visibleValueLabel =
              showValueLabels && storedValueLabel ? storedValueLabel : null;

            const ariaLabel =
              storedValueLabel ?? `Pozycja ${index + 1} z ${values.length}`;
            return (
              <label
                key={value}
                className="flex min-w-0 cursor-pointer flex-col items-center gap-1.5 sm:gap-2"
              >
                <input
                  type="radio"
                  name={fieldName}
                  value={value}
                  required={htmlRequired}
                  defaultChecked={existingNumber === value}
                  className="peer sr-only"
                  aria-label={ariaLabel}
                  onChange={() => onChange?.(value)}
                />

                <span className="flex h-8 w-8 items-center justify-center rounded-full border bg-background transition hover:bg-muted peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary sm:h-10 sm:w-10">
                  <span className="h-2.5 w-2.5 rounded-full bg-background sm:h-3 sm:w-3" />
                </span>

                {visibleValueLabel ? (
                  <span className="max-w-[44px] text-center text-[10px] leading-tight text-muted-foreground sm:max-w-[72px] sm:text-xs">
                    {visibleValueLabel}
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function LikertItemInput({
  item,
  fieldName,
  existingValue,
  responseConfig,
  htmlRequired,
}: {
  item: AssessmentResponseFormItem;
  fieldName: string;
  existingValue: unknown;
  responseConfig: Record<string, unknown>;
  htmlRequired: boolean;
}) {
  const values = createLikertValues(item);
  const scaleMin = item.scaleMin ?? 1;
  const scaleMax = item.scaleMax ?? 5;
  const step = getNumberConfig(responseConfig, "step", 1);
  const display = getLikertDisplay(responseConfig);
  const showValueLabels = shouldShowLikertValueLabels(responseConfig);

  const existingNumber =
    typeof existingValue === "number" ? existingValue : null;

  const [selectedLikertValue, setSelectedLikertValue] = useState<number | null>(
    existingNumber,
  );

  const selectedLikertLabel =
    selectedLikertValue === null || showValueLabels
      ? null
      : getLikertStoredValueLabel({
        config: responseConfig,
        value: selectedLikertValue,
      });

  if (display === "slider") {
    return (
      <div className="mt-4 w-full space-y-3">
        <input
          type="range"
          name={fieldName}
          min={scaleMin}
          max={scaleMax}
          step={step}
          required={htmlRequired}
          defaultValue={existingNumber ?? Math.round((scaleMin + scaleMax) / 2)}
          className="w-full"
        />

        <div className="flex justify-between gap-4 text-xs text-muted-foreground">
          <span>{item.scaleMinLabel ?? ""}</span>
          <span>{item.scaleMaxLabel ?? ""}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 md:ml-auto md:mt-0 md:w-[360px] md:max-w-[55vw]">
      <LikertScaleChoice
        fieldName={fieldName}
        values={values}
        existingNumber={existingNumber}
        responseConfig={responseConfig}
        htmlRequired={htmlRequired}
        showValueLabels={showValueLabels}
        onChange={setSelectedLikertValue}
      />

      <div className="min-h-6 text-center text-sm text-muted-foreground">
        {selectedLikertLabel ? (
          <span className="inline-flex rounded-full border bg-green-50 px-3 py-1 text-sm font-medium text-green-800">
            {selectedLikertLabel}
          </span>
        ) : showValueLabels ? null : (
          <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[1fr_auto_1fr] md:grid-cols-2">
            <div className="text-left leading-snug">
              {item.scaleMinLabel ?? ""}
            </div>

            <div className="text-right leading-snug">
              {item.scaleMaxLabel ?? ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



function AssessmentItemInput({
  item,
  isCurrentPage,
}: {
  item: AssessmentResponseFormItem;
  isCurrentPage: boolean;
}) {
  const fieldName = buildFieldName(item);
  const existingValue = getExistingValue(item);
  const options = normalizeOptions(item.options);
  const responseConfig = normalizeResponseConfig(item.responseConfig);
  const htmlRequired = isCurrentPage && item.required;

  if (item.type === "likert") {
    return (
      <LikertItemInput
        item={item}
        fieldName={fieldName}
        existingValue={existingValue}
        responseConfig={responseConfig}
        htmlRequired={htmlRequired}
      />
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
        {trueFalseOptions.map((option) => {
          const value = optionValueToString(option.value);

          return (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-md  px-2 py-2 text-sm hover:bg-muted"
            >
              <input
                type="radio"
                name={fieldName}
                value={value}
                required={htmlRequired}
                defaultChecked={existingValue === value}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (item.type === "single_choice") {
    return (
      <div className="mt-4 space-y-2">
        {options.map((option) => {
          const value = optionValueToString(option.value);

          return (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              <input
                type="radio"
                name={fieldName}
                value={value}
                required={htmlRequired}
                defaultChecked={existingValue === value}
              />
              <span>{option.label}</span>
            </label>
          );
        })}

        {options.length === 0 ? (
          <p className="text-sm text-destructive">
            Brak zdefiniowanych opcji odpowiedzi.
          </p>
        ) : null}
      </div>
    );
  }

  if (item.type === "multiple_choice") {
    const selectedValues = Array.isArray(existingValue)
      ? existingValue.map(String)
      : [];

    return (
      <div className="mt-4 space-y-2">
        {options.map((option) => {
          const value = optionValueToString(option.value);

          return (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                name={fieldName}
                value={value}
                defaultChecked={selectedValues.includes(value)}
              />
              <span>{option.label}</span>
            </label>
          );
        })}

        {options.length === 0 ? (
          <p className="text-sm text-destructive">
            Brak zdefiniowanych opcji odpowiedzi.
          </p>
        ) : null}

        {item.required ? (
          <p className="text-xs text-muted-foreground">
            To pytanie jest wymagane. Wybierz przynajmniej jedną odpowiedź przed
            zakończeniem badania.
          </p>
        ) : null}
      </div>
    );
  }

  if (item.type === "text") {
    const multiline = getBooleanConfig(responseConfig, "multiline", true);
    const maxLength = getNumberConfig(responseConfig, "maxLength", 1000);
    const value = typeof existingValue === "string" ? existingValue : "";

    if (multiline) {
      return (
        <textarea
          name={fieldName}
          required={htmlRequired}
          defaultValue={value}
          maxLength={maxLength}
          className="mt-4 min-h-28 w-full rounded-md  bg-background px-2 py-2 text-sm"
          placeholder="Wpisz odpowiedź..."
        />
      );
    }

    return (
      <Input
        name={fieldName}
        required={htmlRequired}
        defaultValue={value}
        maxLength={maxLength}
        className="mt-4"
        placeholder="Wpisz odpowiedź..."
      />
    );
  }

  if (item.type === "number") {
    const min = responseConfig.min;
    const max = responseConfig.max;
    const step = getNumberConfig(responseConfig, "step", 1);

    return (
      <Input
        name={fieldName}
        type="number"
        required={htmlRequired}
        defaultValue={
          typeof existingValue === "number" ? String(existingValue) : ""
        }
        min={typeof min === "number" ? min : undefined}
        max={typeof max === "number" ? max : undefined}
        step={step}
        className="mt-4"
        placeholder="Wpisz liczbę..."
      />
    );
  }

  return (
    <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      Nieobsługiwany typ pytania: {item.type}
    </p>
  );
}

export function AssessmentResponseForm({
  token,
  sessionId,
  items,
  mode = "token",
  tenantSlug = "",
}: AssessmentResponseFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [state, setState] = useState<SaveAssessmentResponsesState>({
    status: "idle",
    message: "",
  });

  const [isPending, startTransition] = useTransition();

  const pageGroups = useMemo(() => {
    const itemsByVersion = items.reduce<
      Record<string, AssessmentResponseFormItem[]>
    >((acc, item) => {
      acc[item.questionnaireVersionId] ??= [];
      acc[item.questionnaireVersionId].push(item);

      return acc;
    }, {});

    return Object.entries(itemsByVersion)
      .flatMap(([versionId, versionItems]) => {
        const firstItem = versionItems[0];

        const itemsByPage = versionItems.reduce<
          Record<
            string,
            {
              pageTitle: string;
              pageDescription: string | null;
              pageOrderIndex: number;
              questionnaireName: string;
              questionnaireVersionName: string;
              questionnaireOrderIndex: number;
              items: AssessmentResponseFormItem[];
            }
          >
        >((acc, item) => {
          const pageKey =
            item.questionnairePageId ?? item.pageId ?? "__NO_PAGE__";

          acc[pageKey] ??= {
            pageTitle: item.pageTitle ?? "Pozostałe pytania",
            pageDescription: item.pageDescription ?? null,
            pageOrderIndex: item.pageOrderIndex ?? Number.MAX_SAFE_INTEGER,
            questionnaireName: firstItem.questionnaireName,
            questionnaireVersionName: firstItem.questionnaireVersionName,
            questionnaireOrderIndex:
              firstItem.questionnaireOrderIndex ?? Number.MAX_SAFE_INTEGER,
            items: [],
          };

          acc[pageKey].items.push(item);

          return acc;
        }, {});

        return Object.entries(itemsByPage).map(([pageId, page]) => ({
          versionId,
          pageId,
          ...page,
          items: page.items.sort(
            (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
          ),
        }));
      })
      .sort((a, b) => {
        const questionnaireDiff =
          a.questionnaireOrderIndex - b.questionnaireOrderIndex;

        if (questionnaireDiff !== 0) {
          return questionnaireDiff;
        }

        return a.pageOrderIndex - b.pageOrderIndex;
      });
  }, [items]);

  const currentPage = pageGroups[currentPageIndex] ?? null;
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === pageGroups.length - 1;

  const progress =
    pageGroups.length === 0
      ? 0
      : Math.round(((currentPageIndex + 1) / pageGroups.length) * 100);

  function getFormData() {
    if (!formRef.current) {
      return null;
    }

    return new FormData(formRef.current);
  }

  function saveCurrentForm(options?: {
    onSuccess?: () => void;
    onError?: () => void;
  }) {
    const formData = getFormData();

    if (!formData) {
      setState({
        status: "error",
        message: "Nie udało się odczytać formularza.",
      });
      options?.onError?.();
      return;
    }

    startTransition(async () => {
      const nextState = await saveAssessmentResponsesAction(
        {
          status: "idle",
          message: "",
        },
        formData,
      );

      setState(nextState);

      if (nextState.status === "success") {
        options?.onSuccess?.();
      } else {
        options?.onError?.();
      }
    });
  }

  function goToPreviousPage() {
    saveCurrentForm({
      onSuccess: () => {
        setCurrentPageIndex((previous) => Math.max(previous - 1, 0));
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    });
  }

  function goToNextPage() {
    const form = formRef.current;

    if (form && !form.reportValidity()) {
      return;
    }

    saveCurrentForm({
      onSuccess: () => {
        setCurrentPageIndex((previous) =>
          Math.min(previous + 1, pageGroups.length - 1),
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    });
  }

  function finishAssessment() {
    const form = formRef.current;

    if (form && !form.reportValidity()) {
      return;
    }

    const formData = getFormData();

    if (!formData) {
      setState({
        status: "error",
        message: "Nie udało się odczytać formularza.",
      });
      return;
    }

    startTransition(async () => {
      const saveState = await saveAssessmentResponsesAction(
        {
          status: "idle",
          message: "",
        },
        formData,
      );

      setState(saveState);

      if (saveState.status !== "success") {
        return;
      }

      const completeFormData = new FormData();
      completeFormData.set("token", token);
      completeFormData.set("sessionId", sessionId);
      completeFormData.set("mode", mode);
      completeFormData.set("tenantSlug", tenantSlug);

      await completeAssessmentSessionAction(
        {
          status: "idle",
          message: "",
        },
        completeFormData,
      );
    });
  }

  if (pageGroups.length === 0 || !currentPage) {
    return (
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Brak pytań</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ta sesja badania nie zawiera żadnych aktywnych pytań.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <form ref={formRef} className="space-y-8">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="tenantSlug" value={tenantSlug} />

        <section className="rounded-2xl border bg-card p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm text-muted-foreground">
                {currentPage.questionnaireName}
              </div>

              <h2 className="mt-1 text-xl font-semibold">
                {currentPage.pageTitle}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {currentPage.questionnaireVersionName}
              </p>

              {currentPage.pageDescription ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {currentPage.pageDescription}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
              <div className="text-xs uppercase text-muted-foreground">
                Postęp
              </div>
              <div className="mt-1 font-medium">
                Strona {currentPageIndex + 1} z {pageGroups.length}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>{progress}% ukończone</span>
              <span>
                {currentPage.items.length}{" "}
                {currentPage.items.length === 1 ? "pytanie" : "pytań"} na tej
                stronie
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </section>

        {pageGroups.map((pageGroup, pageIndex) => {
          const isCurrentPage = pageIndex === currentPageIndex;

          return (
            <section
              key={`${pageGroup.versionId}:${pageGroup.pageId}`}
              className={isCurrentPage ? "space-y-5" : "hidden"}
              aria-hidden={!isCurrentPage}
            >
              <div className="space-y-6">
                {pageGroup.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-xl border bg-background p-4 transition-colors has-[input:checked]:border-green-500 has-[input:checked]:bg-green-50/30 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 md:grid md:grid-cols-[2rem_minmax(0,1fr)_auto] md:items-start md:gap-5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="text-[1.05rem] font-medium leading-snug sm:text-lg">
                          {item.text}
                        </div>

                        {item.helpText ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.helpText}
                          </p>
                        ) : null}
                      </div>

                      <div className="w-full md:flex md:justify-end">
                        <AssessmentItemInput
                          item={item}
                          isCurrentPage={isCurrentPage}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {state.status !== "idle" ? (
          <div
            className={
              state.status === "success"
                ? "rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
                : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            }
          >
            {state.message}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={isFirstPage || isPending}
            onClick={goToPreviousPage}
            className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            Wstecz
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {!isLastPage ? (
              <button
                type="button"
                disabled={isPending}
                onClick={goToNextPage}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {isPending ? "Zapisywanie..." : "Dalej"}
              </button>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={finishAssessment}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {isPending ? "Zapisywanie..." : "Zakończ badanie"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}