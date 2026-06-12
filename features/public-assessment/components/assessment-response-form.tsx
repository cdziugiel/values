// features/public-assessment/components/assessment-response-form.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  ListChecks,
  MoveLeft,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { completeAssessmentSessionAction } from "../api/complete-assessment-session.actions";

import { Input } from "@/components/ui/input";
import {
  saveAssessmentResponsesAction,
  type SaveAssessmentResponsesState,
} from "../api/assessment-response.actions";
import Link from "next/link";

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
  projectQuestionnaireId?: string;
  items: AssessmentResponseFormItem[];
  mode?: "token" | "my-assessment";
  tenantSlug?: string;
  isSuperAdmin?: boolean;
};

const initialState: SaveAssessmentResponsesState = {
  status: "idle",
  message: "",
};

type CurrentDesiredAnswer = {
  current: boolean;
  desired: boolean;
};

function normalizeCurrentDesiredAnswer(value: unknown): CurrentDesiredAnswer {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      current: false,
      desired: false,
    };
  }

  const raw = value as Record<string, unknown>;

  return {
    current: raw.current === true,
    desired: raw.desired === true,
  };
}

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


function currentDesiredAnswerToInputValue(answer: CurrentDesiredAnswer) {
  return JSON.stringify({
    current: answer.current,
    desired: answer.desired,
  });
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
  if (item.type === "current_desired") {
    return normalizeCurrentDesiredAnswer(item.existingJsonValue);
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


function CurrentDesiredItemInput({
  item,
  fieldName,
  existingValue,
  responseConfig,
}: {
  item: AssessmentResponseFormItem;
  fieldName: string;
  existingValue: unknown;
  responseConfig: Record<string, unknown>;
}) {
  const existingAnswer = normalizeCurrentDesiredAnswer(existingValue);

  const [answer, setAnswer] = useState({
    current: existingAnswer.current,
    desired: existingAnswer.desired,
  });

  const currentLabel =
    typeof responseConfig.currentLabel === "string"
      ? responseConfig.currentLabel
      : "Tak jest teraz";

  const desiredLabel =
    typeof responseConfig.desiredLabel === "string"
      ? responseConfig.desiredLabel
      : "Chcę, żeby tak było";

  function updateMarker(marker: "current" | "desired", checked: boolean) {
    setAnswer((previous) => ({
      ...previous,
      [marker]: checked,
    }));
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <input
        type="hidden"
        name={fieldName}
        value={JSON.stringify(answer)}
      />

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm text-[#171717] shadow-sm transition hover:bg-white focus-within:ring-2 focus-within:ring-[#2dd4bf]/40">
        <input
          type="checkbox"
          name={`current-desired-ui:${item.id}:current`}
          checked={answer.current}
          onChange={(event) => updateMarker("current", event.target.checked)}
        />
        <span>{currentLabel}</span>
      </label>

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm text-[#171717] shadow-sm transition hover:bg-white focus-within:ring-2 focus-within:ring-[#2dd4bf]/40">
        <input
          type="checkbox"
          name={`current-desired-ui:${item.id}:desired`}
          checked={answer.desired}
          onChange={(event) => updateMarker("desired", event.target.checked)}
        />
        <span>{desiredLabel}</span>
      </label>
    </div>
  );
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
    <div className="space-y-3">
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

                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white transition hover:bg-[#f3f4f6] peer-checked:border-[#171717] peer-checked:bg-[#171717] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#2dd4bf] sm:h-10 sm:w-10">
                  <span className="h-2.5 w-2.5 rounded-full bg-white sm:h-3 sm:w-3" />
                </span>

                {visibleValueLabel ? (
                  <span className="max-w-[44px] text-center text-[10px] leading-tight text-[#6b7280] sm:max-w-[72px] sm:text-xs">
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
          className="w-full accent-[#171717]"
        />

        <div className="flex justify-between gap-4 text-xs text-[#6b7280]">
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

      <div className="min-h-6 text-center text-sm text-[#6b7280]">
        {selectedLikertLabel ? (
          <span className="inline-flex rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-sm font-medium text-[#0f766e]">
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
  if (item.type === "current_desired") {
    return (
      <CurrentDesiredItemInput
        item={item}
        fieldName={fieldName}
        existingValue={existingValue}
        responseConfig={responseConfig}
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
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-[#171717] transition hover:bg-white focus-within:ring-2 focus-within:ring-[#2dd4bf]/40"
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
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-[#171717] transition hover:bg-white focus-within:ring-2 focus-within:ring-[#2dd4bf]/40"
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
          <p className="text-sm text-red-700">
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
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-[#171717] transition hover:bg-white focus-within:ring-2 focus-within:ring-[#2dd4bf]/40"
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
          <p className="text-sm text-red-700">
            Brak zdefiniowanych opcji odpowiedzi.
          </p>
        ) : null}

        {item.required ? (
          <p className="text-xs text-[#6b7280]">
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
          className="mt-4 min-h-28 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
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
        className="mt-4 rounded-2xl border-black/10 bg-white"
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
        className="mt-4 rounded-2xl border-black/10 bg-white"
        placeholder="Wpisz liczbę..."
      />
    );
  }

  return (
    <p className="mt-4 rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      Nieobsługiwany typ pytania: {item.type}
    </p>
  );
}
function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function getRandomInteger(min: number, max: number) {
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);

  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

function getRandomArrayItem<T>(items: T[]) {
  if (items.length === 0) {
    return null;
  }

  return items[getRandomInteger(0, items.length - 1)] ?? null;
}

function shuffleArray<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function getRandomTextAnswer(item: AssessmentResponseFormItem) {
  const responseConfig = normalizeResponseConfig(item.responseConfig);
  const maxLength = getNumberConfig(responseConfig, "maxLength", 1000);

  const value = `Odpowiedź testowa superadmin — ${item.code}`;

  return value.slice(0, maxLength);
}

function getRandomNumberAnswer(item: AssessmentResponseFormItem) {
  const responseConfig = normalizeResponseConfig(item.responseConfig);

  const min =
    typeof responseConfig.min === "number" && Number.isFinite(responseConfig.min)
      ? responseConfig.min
      : item.scaleMin ?? 1;

  const max =
    typeof responseConfig.max === "number" && Number.isFinite(responseConfig.max)
      ? responseConfig.max
      : item.scaleMax ?? 10;

  const step = getNumberConfig(responseConfig, "step", 1);

  if (step <= 0) {
    return getRandomInteger(min, max);
  }

  const stepsCount = Math.max(0, Math.floor((max - min) / step));
  const randomStep = getRandomInteger(0, stepsCount);

  return Number((min + randomStep * step).toFixed(6));
}

function getRandomAnswerForItem(item: AssessmentResponseFormItem) {
  const options = normalizeOptions(item.options);

  if (item.type === "likert") {
    return getRandomArrayItem(createLikertValues(item));
  }

  if (item.type === "true_false") {
    const trueFalseOptions =
      options.length > 0
        ? options
        : [
          { value: true, label: "Prawda" },
          { value: false, label: "Fałsz" },
        ];

    const selected = getRandomArrayItem(trueFalseOptions);

    return selected ? optionValueToString(selected.value) : "true";
  }


  if (item.type === "current_desired") {
    const current = Math.random() >= 0.5;
    const desired = Math.random() >= 0.5;

    if (!current && !desired) {
      return {
        current: true,
        desired: false,
      };
    }

    return {
      current,
      desired,
    };
  }

  if (item.type === "single_choice") {
    const selected = getRandomArrayItem(options);

    return selected ? optionValueToString(selected.value) : null;
  }

  if (item.type === "multiple_choice") {
    if (options.length === 0) {
      return [];
    }

    const maxSelectedCount = Math.min(3, options.length);
    const selectedCount = item.required
      ? getRandomInteger(1, maxSelectedCount)
      : getRandomInteger(0, maxSelectedCount);

    return shuffleArray(options)
      .slice(0, selectedCount)
      .map((option) => optionValueToString(option.value));
  }

  if (item.type === "text") {
    return getRandomTextAnswer(item);
  }

  if (item.type === "number") {
    return getRandomNumberAnswer(item);
  }

  return null;
}

function dispatchControlChange(control: HTMLElement) {
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

function fillRandomAnswerForItem(
  form: HTMLFormElement,
  item: AssessmentResponseFormItem,
) {
  const fieldName = buildFieldName(item);
  const answer = getRandomAnswerForItem(item);

  if (answer === null) {
    return;
  }

  const controls = Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input[name], textarea[name]",
    ),
  ).filter((control) => control.name === fieldName);


  if (controls.length === 0) {
    return;
  }


  if (item.type === "current_desired") {
    const currentDesiredAnswer = normalizeCurrentDesiredAnswer(answer);

    const hiddenControl = controls.find(
      (control) =>
        control instanceof HTMLInputElement &&
        control.type === "hidden" &&
        control.name === fieldName,
    );

    if (hiddenControl instanceof HTMLInputElement) {
      hiddenControl.value = currentDesiredAnswerToInputValue(currentDesiredAnswer);
      dispatchControlChange(hiddenControl);
    }

    const uiControls = Array.from(
      form.querySelectorAll<HTMLInputElement>(
        `input[name="current-desired-ui:${item.id}:current"], input[name="current-desired-ui:${item.id}:desired"]`,
      ),
    );

    uiControls.forEach((control) => {
      const marker = control.name.endsWith(":current") ? "current" : "desired";

      control.checked = currentDesiredAnswer[marker];
      dispatchControlChange(control);
    });

    return;
  }
  const firstControl = controls[0];

  if (!firstControl) {
    return;
  }

  if (firstControl instanceof HTMLInputElement && firstControl.type === "radio") {
    const selectedValue = String(answer);
    const matchingControl =
      controls.find(
        (control) =>
          control instanceof HTMLInputElement &&
          control.value === selectedValue,
      ) ?? getRandomArrayItem(controls);

    if (matchingControl instanceof HTMLInputElement) {
      matchingControl.checked = true;
      dispatchControlChange(matchingControl);
    }

    return;
  }

  if (
    firstControl instanceof HTMLInputElement &&
    firstControl.type === "checkbox"
  ) {
    const selectedValues = Array.isArray(answer) ? answer.map(String) : [];

    controls.forEach((control) => {
      if (control instanceof HTMLInputElement) {
        control.checked = selectedValues.includes(control.value);
        dispatchControlChange(control);
      }
    });

    return;
  }

  if (firstControl instanceof HTMLInputElement) {
    firstControl.value = String(answer);
    dispatchControlChange(firstControl);
    return;
  }

  if (firstControl instanceof HTMLTextAreaElement) {
    firstControl.value = String(answer);
    dispatchControlChange(firstControl);
  }
}
export function AssessmentResponseForm({
  token,
  sessionId,
  items,
  mode = "token",
  tenantSlug = "",
  projectQuestionnaireId,
  isSuperAdmin = false,
}: AssessmentResponseFormProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const shouldScrollToTopRef = useRef(false);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [state, setState] = useState<SaveAssessmentResponsesState>({
    status: "idle",
    message: "",
  });
  const [answeredPageIndexes, setAnsweredPageIndexes] = useState<Set<number>>(
    () => new Set(),
  );
  const [isPending, startTransition] = useTransition();
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  function hasInitialAnswer(item: AssessmentResponseFormItem) {
    if (item.type === "likert" || item.type === "number") {
      return typeof item.existingNumberValue === "number";
    }

    if (item.type === "text" || item.type === "single_choice") {
      return Boolean(item.existingTextValue?.trim());
    }

    if (item.type === "true_false") {
      return typeof item.existingBooleanValue === "boolean";
    }

    if (item.type === "multiple_choice") {
      return Array.isArray(item.existingJsonValue) && item.existingJsonValue.length > 0;
    }

    if (item.type === "current_desired") {
      const answer = normalizeCurrentDesiredAnswer(item.existingJsonValue);
      return answer.current || answer.desired;
    }

    return false;
  }

  function hasFormAnswer(formData: FormData, item: AssessmentResponseFormItem) {
    const fieldName = buildFieldName(item);

    if (item.type === "multiple_choice") {
      return formData.getAll(fieldName).some((value) => String(value).trim());
    }

    const value = formData.get(fieldName);

    if (value === null) {
      return false;
    }

    if (item.type === "current_desired") {
      if (typeof value !== "string" || !value.trim()) {
        return false;
      }

      try {
        const answer = normalizeCurrentDesiredAnswer(JSON.parse(value));
        return answer.current || answer.desired;
      } catch {
        return false;
      }
    }

    return String(value).trim().length > 0;
  }

  function isPageAnsweredFromFormData(
    formData: FormData | null,
    page: (typeof pageGroups)[number],
  ) {
    const itemsToCheck = page.items.filter((item) => item.required);

    const effectiveItems = itemsToCheck.length > 0 ? itemsToCheck : page.items;

    return effectiveItems.every((item) =>
      formData ? hasFormAnswer(formData, item) : hasInitialAnswer(item),
    );
  }

  function calculateAnsweredPageIndexes(formData: FormData | null) {
    const nextAnswered = new Set<number>();

    pageGroups.forEach((page, pageIndex) => {
      if (isPageAnsweredFromFormData(formData, page)) {
        nextAnswered.add(pageIndex);
      }
    });

    return nextAnswered;
  }

  function refreshAnsweredPageIndexes() {
    setAnsweredPageIndexes(calculateAnsweredPageIndexes(getFormData()));
  }
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

  const answeredPagesCount = answeredPageIndexes.size;

  const answeredProgress =
    pageGroups.length === 0
      ? 0
      : Math.round((answeredPagesCount / pageGroups.length) * 100);

  const firstUnansweredPageIndex = pageGroups.findIndex(
    (_page, pageIndex) => !answeredPageIndexes.has(pageIndex),
  );

  const fallbackUnansweredPageIndex =
    firstUnansweredPageIndex === -1
      ? Math.min(currentPageIndex, pageGroups.length - 1)
      : firstUnansweredPageIndex;


  function goToPageFromProgressClick(pageIndex: number) {
    const safePageIndex = Math.max(
      0,
      Math.min(pageIndex, pageGroups.length - 1),
    );

    saveCurrentForm({
      onSuccess: () => {
        refreshAnsweredPageIndexes();
        requestScrollToTop();
        setCurrentPageIndex(safePageIndex);
      },
    });
  }

  function handleAnsweredProgressClick(
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    if (pageGroups.length === 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const clickedPageIndex = Math.min(
      pageGroups.length - 1,
      Math.floor(ratio * pageGroups.length),
    );

    if (clickedPageIndex < answeredPagesCount) {
      goToPageFromProgressClick(clickedPageIndex);
      return;
    }

    goToPageFromProgressClick(fallbackUnansweredPageIndex);
  }


  function requestScrollToTop() {
    shouldScrollToTopRef.current = true;
  }

  function findScrollParent(element: HTMLElement | null): HTMLElement | null {
    let current = element?.parentElement ?? null;

    while (current) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;

      const canScroll =
        overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay";

      if (canScroll && current.scrollHeight > current.clientHeight) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  function scrollAssessmentViewToTop() {
    const scrollParent = findScrollParent(rootRef.current);

    if (scrollParent) {
      scrollParent.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });

      return;
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    if (!shouldScrollToTopRef.current) {
      return;
    }

    shouldScrollToTopRef.current = false;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollAssessmentViewToTop();
      });
    });
  }, [currentPageIndex]);


  useEffect(() => {
    setAnsweredPageIndexes(calculateAnsweredPageIndexes(null));
  }, [pageGroups]);

  async function saveFormData(formData: FormData) {
    const nextState = await saveAssessmentResponsesAction(
      {
        status: "idle",
        message: "",
      },
      formData,
    );

    setState(nextState);

    return nextState;
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
      const nextState = await saveFormData(formData);

      if (nextState.status === "success") {
        options?.onSuccess?.();
      } else {
        options?.onError?.();
      }
    });
  }

  async function fillAllPagesRandomlyForSuperAdmin() {
/*     if (!isSuperAdmin || isAutoFilling ) {
      return;
    }
 */
    const form = formRef.current;

    if (!form) {
      setState({
        status: "error",
        message: "Nie udało się odczytać formularza.",
      });
      return;
    }

    setIsAutoFilling(true);
    setState({
      status: "idle",
      message: "",
    });

    try {
      for (let pageIndex = 0; pageIndex < pageGroups.length; pageIndex += 1) {
        requestScrollToTop();
        setCurrentPageIndex(pageIndex);
        await waitForNextFrame();

        const page = pageGroups[pageIndex];

        if (!page) {
          continue;
        }

        page.items.forEach((item) => {
          fillRandomAnswerForItem(form, item);
        });

        const saveState = await saveFormData(new FormData(form));

        if (saveState.status !== "success") {
          setState({
            status: "error",
            message:
              saveState.message ||
              "Nie udało się zapisać losowych odpowiedzi.",
          });

          return;
        }
      }

      requestScrollToTop();
      setCurrentPageIndex(pageGroups.length - 1);

      setState({
        status: "success",
        message:
          "Losowe odpowiedzi zostały zaznaczone i zapisane na wszystkich stronach. Sprawdź je, a następnie świadomie kliknij „Zakończ badanie”.",
      });

    } finally {
      setIsAutoFilling(false);
    }
  }

  function goToPreviousPage() {
    saveCurrentForm({
      onSuccess: () => {
        refreshAnsweredPageIndexes();
        requestScrollToTop();
        setCurrentPageIndex((previous) => Math.max(previous - 1, 0));
      },
    });
  }
  function validateCurrentDesiredPage(page: typeof currentPage) {
    if (!page) {
      return true;
    }

    const currentDesiredItems = page.items.filter(
      (item) => item.type === "current_desired",
    );

    if (currentDesiredItems.length === 0) {
      return true;
    }

    const formData = getFormData();

    if (!formData) {
      setState({
        status: "error",
        message: "Nie udało się odczytać formularza.",
      });

      return false;
    }

    let currentCount = 0;
    let desiredCount = 0;

    for (const item of currentDesiredItems) {
      const rawValue = formData.get(buildFieldName(item));

      if (typeof rawValue !== "string" || !rawValue.trim()) {
        continue;
      }

      try {
        const parsed = JSON.parse(rawValue);
        const answer = normalizeCurrentDesiredAnswer(parsed);

        if (answer.current) {
          currentCount += 1;
        }

        if (answer.desired) {
          desiredCount += 1;
        }
      } catch {
        continue;
      }
    }

    if (currentCount < 1 || desiredCount < 1) {
      setState({
        status: "error",
        message:
          "Na tej stronie zaznacz co najmniej jedną odpowiedź w kolumnie „Tak jest” i co najmniej jedną w kolumnie „Chcę tak”.",
      });

      return false;
    }

    return true;
  }



  function goToNextPage() {
    const form = formRef.current;

    if (form && !form.reportValidity()) {
      return;
    }

    if (!validateCurrentDesiredPage(currentPage)) {
      return;
    }

    saveCurrentForm({
      onSuccess: () => {
        refreshAnsweredPageIndexes();
        requestScrollToTop();
        setCurrentPageIndex((previous) =>
          Math.min(previous + 1, pageGroups.length - 1),
        );
      },
    });
  }

  function finishAssessment() {
    const form = formRef.current;
      if (!projectQuestionnaireId) {
        setState({
          status: "error",
          message:
            "Brakuje identyfikatora kwestionariusza. Nie można zakończyć tej części badania.",
        });

        return;
      }

    if (form && !form.reportValidity()) {
      return;
    }

    if (!validateCurrentDesiredPage(currentPage)) {
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
      const saveState = await saveFormData(formData);

      setState(saveState);

      if (saveState.status !== "success") {
        return;
      }

      const completeFormData = new FormData();
      completeFormData.set("token", token);
      completeFormData.set("sessionId", sessionId);
      completeFormData.set("mode", mode);
      completeFormData.set("tenantSlug", tenantSlug);
      completeFormData.set("projectQuestionnaireId", projectQuestionnaireId);

      const completeState = await completeAssessmentSessionAction(
        {
          status: "idle",
          message: "",
        },
        completeFormData,
      );

      setState({
        status: completeState.status,
        message: completeState.message,
      });
    });
  }

  if (pageGroups.length === 0 || !currentPage) {
    return (
      <div className="min-h-screen  px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl rounded-[2rem] hv-brand-card p-6 md:p-8">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              <FileText size={20} />
            </div>

            <div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                Brak pytań
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                Ta sesja badania nie zawiera żadnych aktywnych pytań.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">

      <form
        ref={formRef}
        onChangeCapture={refreshAnsweredPageIndexes}
        className="mx-auto w-full max-w-5xl space-y-8"
      >
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input
          type="hidden"
          name="projectQuestionnaireId"
          value={projectQuestionnaireId}
        />


        <section className="sticky top-4 z-30 overflow-hidden rounded-[2rem] border border-black/10 bg-white/90 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur hv-brand-card">
          <div className="border-t border-black/10 bg-white/35 p-4 md:p-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
              <FileText size={14} />
              <span className="hv-brand-eyebrow text-[0.68rem]">
                {currentPage.questionnaireName}
              </span>
            </div>

            <div className="mb-2 flex flex-wrap justify-between gap-3 text-xs text-[#6b7280]">
              <span>{Math.round(((answeredPagesCount / pageGroups.length) * 100))}% ukończone</span>

              <span>
                {currentPage.items.length}{" "}
                {currentPage.items.length === 1 ? "pytanie" : "pytań"} na tej stronie
              </span>

              <span>
                Strona {currentPageIndex + 1} z {pageGroups.length}
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleAnsweredProgressClick}
                className="group relative h-3 w-full cursor-pointer overflow-hidden rounded-full bg-[#e5e7eb] text-left transition hover:bg-[#d1d5db] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/50"
                aria-label="Przejdź do strony badania według postępu odpowiedzi"
              >
                {/* Warstwa 1: faktycznie wypełnione strony */}
                <span
                  className="absolute inset-y-0 left-0 z-10 rounded-full bg-[#9ca3af] transition-all group-hover:bg-[#8b95a1]"
                  style={{ width: `${answeredProgress}%` }}
                />

                {/* Warstwa 2: obecna strona / bieżąca pozycja */}
                <span
                  className="absolute inset-y-0 left-0 z-20 rounded-full bg-gradient-to-r from-[#171717] to-[#2dd4bf] transition-all"
                  style={{ width: `${progress}%` }}
                />


              </button>

            </div>
          </div>

          <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-end md:px-6 md:py-2 lg:px-7 lg:p-2 py-2">
            <div className="max-w-4xl">
              <h1 className="max-w-4xl text-2xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#171717] md:text-4xl">
                {currentPage.pageTitle}
              </h1>

              <p className="my-3 text-sm font-medium text-[#6b7280]">
                {currentPage.questionnaireVersionName}
              </p>

              {currentPage.pageDescription ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  {currentPage.pageDescription}
                </p>
              ) : null}
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
                    className="group relative overflow-hidden rounded-[1.75rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 has-[input:checked]:border-[rgba(45,212,191,0.42)] has-[input:checked]:bg-[rgba(45,212,191,0.08)] hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)] sm:p-6"
                  >
                    <div className="flex flex-col gap-3 md:grid md:grid-cols-[2rem_minmax(0,1fr)_auto] md:items-start md:gap-5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-xs font-semibold text-[#171717]">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="text-[1.05rem] font-medium leading-snug tracking-[-0.01em] text-[#171717] sm:text-lg">
                          {item.text}
                        </div>

                        {item.helpText ? (
                          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
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
            className={[
              "rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
              state.status === "success"
                ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
                : "border-red-200 bg-red-50 text-red-700",
            ].join(" ")}
          >
            <div className="flex gap-2">
              {state.status === "success" ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              ) : (
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              )}
              <span>{state.message}</span>
            </div>
          </div>
        ) : null}

        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-[2rem] border border-black/10 bg-white/90 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={isFirstPage || isPending || isAutoFilling}
            onClick={goToPreviousPage}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-5 text-sm font-semibold text-[#171717] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft size={16} />
            Wstecz
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {isSuperAdmin || !isSuperAdmin ? (
              <button
                type="button"
                disabled={isPending || isAutoFilling}
                onClick={fillAllPagesRandomlyForSuperAdmin}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-5 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:opacity-60"
              >
                <Sparkles size={16} />
                {isAutoFilling
                  ? "Losowe uzupełnianie..."
                  : "Losowo uzupełnij wszystkie strony"}
              </button>
            ) : null}

            {!isLastPage ? (
              <button
                type="button"
                disabled={isPending || isAutoFilling}
                onClick={goToNextPage}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#171717] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] disabled:opacity-60"
              >
                {isPending ? "Zapisywanie..." : "Dalej"}
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isPending || isAutoFilling}
                onClick={finishAssessment}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#171717] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] disabled:opacity-60"
              >
                <ClipboardCheck size={16} />
                {isPending ? "Zapisywanie..." : "Zakończ ten kwestionariusz"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}