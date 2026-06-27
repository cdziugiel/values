"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Check,
  ChevronDown,
  Clipboard,
  Gift,
  Loader2,
  LockKeyhole,
  Pencil,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  claimNormativeRewardAction,
  completeNormativeProfileAction,
} from "../api/normative-profile.actions";
import {
  EDUCATION_FIELD_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_SECTOR_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  INDUSTRY_OPTIONS,
  JOB_FUNCTION_OPTIONS,
  JOB_LEVEL_OPTIONS,
  LOCALITY_SIZE_OPTIONS,
  ORGANIZATION_SIZE_OPTIONS,
  SEX_OPTIONS,
  VOIVODESHIP_OPTIONS,
} from "../lib/normative-profile-options";
import {
  initialClaimNormativeRewardActionState,
  initialCompleteNormativeProfileActionState,
} from "../types/normative-profile-action.types";
import type {
  NormativeProfileStatusDto,
  NormativeProfileValuesDto,
} from "../types/normative-profile.types";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";


const EMPLOYMENT_STATUSES_WITHOUT_CURRENT_JOB = new Set([
  "unemployed",
  "retired",
]);

function getLabel(
  options: readonly {
    value: string;
    label: string;
  }[],
  value: string,
) {
  return (
    options.find(
      (option) =>
        option.value === value,
    )?.label ?? value
  );
}

function SelectField({
  id,
  name,
  label,
  options,
  defaultValue,
  required = true,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  options: readonly {
    value: string;
    label: string;
  }[];
  defaultValue?: string;
  required?: boolean;
onChange?: (
  event: ChangeEvent<HTMLSelectElement>,
) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
      </Label>

      <select
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        onChange={onChange}
        className={selectClassName}
      >
        <option
          value=""
          disabled
        >
          Wybierz odpowiedź
        </option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "pl-PL",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(new Date(value));
}

function ProfileSummary({
  profile,
}: {
  profile: NormativeProfileValuesDto;
}) {
  return (
    <div className="grid gap-3 rounded-xl border bg-background p-4 text-sm sm:grid-cols-2">
      <div>
        <span className="text-muted-foreground">
          Województwo:
        </span>{" "}
        {getLabel(
          VOIVODESHIP_OPTIONS,
          profile.voivodeshipCode,
        )}
      </div>
      <div>
        <span className="text-muted-foreground">
          Wykształcenie:
        </span>{" "}
        {getLabel(
          EDUCATION_LEVEL_OPTIONS,
          profile.educationLevel,
        )}
      </div>
      <div>
        <span className="text-muted-foreground">
          Branża:
        </span>{" "}
        {getLabel(
          INDUSTRY_OPTIONS,
          profile.industryCode,
        )}
      </div>
      <div>
        <span className="text-muted-foreground">
          Poziom stanowiska:
        </span>{" "}
        {getLabel(
          JOB_LEVEL_OPTIONS,
          profile.jobLevel,
        )}
      </div>
    </div>
  );
}

export function NormativeProfileCard({
  tenantSlug,
  assessmentSessionId,
  initialStatus,
}: {
  tenantSlug: string;
  assessmentSessionId: string;
  initialStatus:
    NormativeProfileStatusDto;
}) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    completeNormativeProfileAction,
    initialCompleteNormativeProfileActionState,
  );

  const [
    claimState,
    claimAction,
    claimPending,
  ] = useActionState(
    claimNormativeRewardAction,
    initialClaimNormativeRewardActionState,
  );


const [isEditing, setIsEditing] =
  useState(!initialStatus.completed);

const [copied, setCopied] =
  useState(false);

/**
 * Pełny kod jest dostępny wyłącznie bezpośrednio po wydaniu.
 * Zachowujemy go lokalnie, żeby późniejsza aktualizacja profilu
 * nie zastąpiła go DTO zawierającym tylko podgląd kodu.
 */
const [revealedDiscountCode, setRevealedDiscountCode] =
  useState<string | null>(null);

/**
 * Pozwala wykryć każde zakończenie Server Action,
 * również wtedy, gdy status przed i po zapisie jest taki sam.
 */
const wasSubmittingRef =
  useRef(false);

/**
 * Po zamknięciu formularza przewiniemy widok
 * do karty podsumowania.
 */
const shouldScrollToSummaryRef =
  useRef(false);

const summaryRef =
  useRef<HTMLDivElement>(null);

const profile =
  state.profile ??
  initialStatus.profile;

const actionReward =
  claimState.reward ??
  state.reward ??
  null;

const reward =
  actionReward ??
  initialStatus.reward;

const latestActionCode =
  claimState.reward?.discountCode ??
  state.reward?.discountCode ??
  null;

const visibleCode =
  latestActionCode ??
  revealedDiscountCode;

const preview =
  reward?.discountCodePreview ??
  null;

const expiresAt =
  reward?.expiresAt ??
  null;

const eligibleAgainAt =
  reward?.eligibleAgainAt ??
  initialStatus.eligibleAgainAt;

const completed =
  initialStatus.completed ||
  state.status === "success" ||
  Boolean(state.profile);

const showEditor =
  !completed || isEditing;

/**
 * Nie usuwamy wcześniej ujawnionego kodu,
 * jeżeli kolejna akcja zwróci reward bez discountCode.
 */
useEffect(() => {
  if (latestActionCode) {
    setRevealedDiscountCode(
      latestActionCode,
    );
  }
}, [latestActionCode]);

/**
 * Rejestrujemy rozpoczęcie każdej operacji zapisu.
 */
useEffect(() => {
  if (pending) {
    wasSubmittingRef.current = true;
    return;
  }

  if (!wasSubmittingRef.current) {
    return;
  }

  wasSubmittingRef.current = false;

  if (state.status !== "success") {
    return;
  }

  shouldScrollToSummaryRef.current =
    true;

  setIsEditing(false);
}, [
  pending,
  state.status,
]);

/**
 * Ten efekt uruchamia się dopiero po ponownym renderze,
 * gdy formularz został już zastąpiony podsumowaniem.
 */
useEffect(() => {
  if (
    showEditor ||
    !shouldScrollToSummaryRef.current
  ) {
    return;
  }

  shouldScrollToSummaryRef.current =
    false;

  const frameId =
    window.requestAnimationFrame(() => {
      summaryRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

  return () => {
    window.cancelAnimationFrame(
      frameId,
    );
  };
}, [showEditor]);


const [employmentStatus, setEmploymentStatus] =
  useState(
    initialStatus.profile?.employmentStatus ??
      "",
  );

useEffect(() => {
  if (!isEditing) {
    return;
  }

  setEmploymentStatus(
    state.values?.employmentStatus ??
      profile?.employmentStatus ??
      "",
  );
}, [
  isEditing,
  state.formVersion,
  state.values?.employmentStatus,
  profile?.employmentStatus,
]);

  const hasNoCurrentEmployment =
  EMPLOYMENT_STATUSES_WITHOUT_CURRENT_JOB.has(
    employmentStatus,
  );

  const expiryLabel =
    useMemo(
      () =>
        formatDate(
          expiresAt,
        ),
      [expiresAt],
    );

  const eligibleAgainLabel =
    useMemo(
      () =>
        formatDate(
          eligibleAgainAt,
        ),
      [eligibleAgainAt],
    );


  async function copyCode() {
    if (!visibleCode) {
      return;
    }

    await navigator.clipboard.writeText(
      visibleCode,
    );
    setCopied(true);

    window.setTimeout(
      () => setCopied(false),
      2000,
    );
  }

if (
  completed &&
  !showEditor &&
  profile
) {
  return (
    <div
      ref={summaryRef}
      className="scroll-mt-4"
    >
      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
              <Check className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl">
                Dziękujemy za Twoje wsparcie.
              </CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {visibleCode ? (
            <div className="rounded-xl border bg-background p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Twój kod rabatowy na zakup raportów
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <code className="flex-1 rounded-md bg-muted px-4 py-3 text-center text-lg font-semibold tracking-wider">
                  {visibleCode}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    copyCode
                  }
                >
                  {copied ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Clipboard className="mr-2 h-4 w-4" />
                  )}
                  {copied
                    ? "Skopiowano"
                    : "Kopiuj kod"}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Kod można wykorzystać maksymalnie 4 razy — po jednym zakupie dla każdego raportu.
              </p>

            </div>
          ) : reward ? (
            <Alert>
              <Gift className="h-4 w-4" />
              <AlertTitle>
                Kod rabatowy przypisany do Twojego konta
              </AlertTitle>
              <AlertDescription>
                {preview
                  ? `Kod: ${preview}. Limit użyć: ${reward.usageLimit}.`
                  : `Limit użyć: ${reward.usageLimit}.`}
              </AlertDescription>
            </Alert>
          ) : null}

                        {expiryLabel ? (
            <p className="text-sm text-muted-foreground w-full">
              Kod jest ważny do {expiryLabel}.
            </p>
          ) : null}

          

          
          {initialStatus.canClaimNewReward ? (
            <form action={claimAction}>
              <input
                type="hidden"
                name="tenantSlug"
                value={tenantSlug}
              />
              <input
                type="hidden"
                name="assessmentSessionId"
                value={assessmentSessionId}
              />
              <Button
                type="submit"
                disabled={claimPending}
              >
                {claimPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="mr-2 h-4 w-4" />
                )}
                Odbierz nowy roczny kod
              </Button>
            </form>
          ) : eligibleAgainLabel ? (
            <p className="text-sm text-muted-foreground">
              Kolejny kod możesz otrzymać od {eligibleAgainLabel}.
            </p>
          ) : null}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setIsEditing(
                true,
              )
            }
          >
            <Pencil className="mr-2 h-4 w-4" />
            Zobacz / Popraw dane
          </Button>
          {claimState.status === "error" ? (
            <Alert variant="destructive">
              <AlertTitle>
                Nie udało się wydać kodu
              </AlertTitle>
              <AlertDescription>
                {claimState.message}
              </AlertDescription>
            </Alert>
          ) : null}

          {claimState.status === "success" ? (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertTitle>
                Gotowe
              </AlertTitle>
              <AlertDescription>
                {claimState.message}
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      </div>
    );
  }

  const defaultValues =
    state.values ??
    (profile
      ? {
          ...profile,
          consentAccepted: true,
        }
      : undefined);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">
              {completed
                ? "Popraw dane statystyczne"
                : "Pomóż nam tworzyć lepsze normy psychometryczne"}
            </CardTitle>
            <CardDescription className="mt-1 max-w-3xl">
              {completed
                ? "Zmiana danych nie tworzy nowego kodu rabatowego."
                : " Po zapisaniu danych otrzymasz kod rabatowy na cztery zakupy raportów HUMANET. Uzupełnienie formularza zajmuje około 2–3 minut."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form
          key={
            state.formVersion
          }
          action={
            formAction
          }
          className="space-y-8"
        >
          
          <input
            type="hidden"
            name="tenantSlug"
            value={tenantSlug}
          />
          <input
            type="hidden"
            name="assessmentSessionId"
            value={assessmentSessionId}
          />
          <input
            type="hidden"
            name="mode"
            value={
              completed
                ? "update"
                : "create"
            }
          />
          <input
            type="hidden"
            name="countryCode"
            value={
              defaultValues?.countryCode ??
              "PL"
            }
          />

          <section className="space-y-4">
            <div className="w-full border-b-1 pb-2">
              <h3 className="font-semibold">
                Podstawowe informacje
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">
                  Data urodzenia
                </Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                  max={
                    new Date()
                      .toISOString()
                      .slice(
                        0,
                        10,
                      )
                  }
                  defaultValue={
                    defaultValues?.dateOfBirth ??
                    ""
                  }
                />
              </div>

              <SelectField
                id="sex"
                name="sex"
                label="Płeć"
                options={
                  SEX_OPTIONS
                }
                defaultValue={
                  defaultValues?.sex
                }
              />

              <SelectField
                id="voivodeshipCode"
                name="voivodeshipCode"
                label="Województwo zamieszkania"
                options={
                  VOIVODESHIP_OPTIONS
                }
                defaultValue={
                  defaultValues?.voivodeshipCode
                }
              />

              <SelectField
                id="localitySize"
                name="localitySize"
                label="Wielkość miejscowości"
                options={
                  LOCALITY_SIZE_OPTIONS
                }
                defaultValue={
                  defaultValues?.localitySize
                }
              />
            </div>
          </section>

          <section className="space-y-4">
            
            <div className="w-full border-b-1 pb-2">
              <h3 className="font-semibold">
                Wykształcenie
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                id="educationLevel"
                name="educationLevel"
                label="Poziom wykształcenia"
                options={
                  EDUCATION_LEVEL_OPTIONS
                }
                defaultValue={
                  defaultValues?.educationLevel
                }
              />

<MultiSelectField
  id="educationFields"
  name="educationFields"
  label="Dziedzina wykształcenia"
  options={EDUCATION_FIELD_OPTIONS}
  defaultValue={
    defaultValues?.educationFields ??
    []
  }
/>
            </div>
          </section>

<section className="space-y-4">
  <div>
    <h3 className="font-semibold">
      Sytuacja zawodowa
    </h3>

    <p className="text-sm text-muted-foreground">
      Dodatkowe pytania zawodowe pojawią się tylko wtedy, gdy dotyczą Twojej aktualnej sytuacji.
    </p>
  </div>

  <div className="grid gap-4 md:grid-cols-2">
    <SelectField
      id="employmentStatus"
      name="employmentStatus"
      label="Aktualna sytuacja zawodowa"
      options={EMPLOYMENT_STATUS_OPTIONS}
      defaultValue={
        defaultValues?.employmentStatus
      }
      onChange={(event) => {
        setEmploymentStatus(
          event.target.value,
        );
      }}
    />

    {!hasNoCurrentEmployment ? (
      <>
        <SelectField
          id="industryCode"
          name="industryCode"
          label="Branża"
          options={INDUSTRY_OPTIONS}
          defaultValue={
            defaultValues?.industryCode
          }
        />

        <SelectField
          id="jobLevel"
          name="jobLevel"
          label="Poziom stanowiska"
          options={JOB_LEVEL_OPTIONS}
          defaultValue={
            defaultValues?.jobLevel
          }
        />

        <SelectField
          id="jobFunction"
          name="jobFunction"
          label="Obszar funkcjonalny"
          options={JOB_FUNCTION_OPTIONS}
          defaultValue={
            defaultValues?.jobFunction
          }
        />

        <SelectField
          id="organizationSize"
          name="organizationSize"
          label="Wielkość organizacji"
          options={ORGANIZATION_SIZE_OPTIONS}
          defaultValue={
            defaultValues?.organizationSize
          }
        />

        <SelectField
          id="employmentSector"
          name="employmentSector"
          label="Sektor"
          options={EMPLOYMENT_SECTOR_OPTIONS}
          defaultValue={
            defaultValues?.employmentSector
          }
        />
      </>
    ) : (
      <>
        <input
          type="hidden"
          name="industryCode"
          value="not_applicable"
        />

        <input
          type="hidden"
          name="jobLevel"
          value="not_applicable"
        />

        <input
          type="hidden"
          name="jobFunction"
          value="not_applicable"
        />

        <input
          type="hidden"
          name="organizationSize"
          value="not_applicable"
        />

        <input
          type="hidden"
          name="employmentSector"
          value="not_applicable"
        />

        <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground md:col-span-2">
          Pozostałe pytania zawodowe zostały pominięte i zapisane jako „Nie dotyczy”.
        </div>
      </>
    )}
  </div>
</section>

          <section className="rounded-xl border bg-muted/30 p-4">
            <div className="flex gap-3">
              <input
                id="consentAccepted"
                name="consentAccepted"
                type="checkbox"
                required
                defaultChecked={
                  defaultValues?.consentAccepted ??
                  false
                }
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <div className="space-y-2">
                <Label
                  htmlFor="consentAccepted"
                  className="leading-6"
                >
                  Wyrażam dobrowolną zgodę na wykorzystanie podanych danych statystycznych oraz wyników powiązanych sesji do analiz naukowych, walidacji narzędzi i tworzenia norm psychometrycznych HUMANET.
                </Label>
                <p className="text-xs leading-5 text-muted-foreground">
                  Dane źródłowe pozostaną powiązane z Twoim profilem i sesjami w celu kontroli poprawności, audytowalności oraz obsługi ewentualnego wycofania zgody.
                </p>
              </div>
            </div>
          </section>

          {state.status === "error" ? (
            <Alert variant="destructive">
              <AlertTitle>
                Nie udało się zapisać danych
              </AlertTitle>
              <AlertDescription>
                {state.message}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <LockKeyhole className="h-4 w-4" />
              Dane są zapisywane w kontrolowanym powiązaniu z Twoim profilem i sesjami.
            </div>

            <div className="flex gap-2">
              {completed ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setIsEditing(
                      false,
                    )
                  }
                >
                  Anuluj
                </Button>
              ) : null}

              <Button
                type="submit"
                disabled={pending}
                className="sm:min-w-48"
              >
                {pending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : completed ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Gift className="mr-2 h-4 w-4" />
                )}
                {pending
                  ? "Zapisywanie…"
                  : completed
                    ? "Zapisz poprawione dane"
                    : "Zapisz i odbierz rabat"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function MultiSelectField({
  id,
  name,
  label,
  options,
  defaultValue = [],
  placeholder = "Wybierz odpowiedzi",
}: {
  id: string;
  name: string;
  label: string;
  options: readonly {
    value: string;
    label: string;
  }[];
  defaultValue?: string[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [selectedValues, setSelectedValues] =
    useState<string[]>(defaultValue);

  const rootRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedValues(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent,
    ) {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );
    };
  }, []);

  function toggleValue(value: string) {
    setSelectedValues((current) =>
      current.includes(value)
        ? current.filter(
            (item) => item !== value,
          )
        : [...current, value],
    );
  }

  const selectedLabels = options
    .filter((option) =>
      selectedValues.includes(
        option.value,
      ),
    )
    .map((option) => option.label);

  const displayValue =
    selectedLabels.length > 0
      ? selectedLabels.join(", ")
      : placeholder;

  return (
    <div
      ref={rootRef}
      className="relative space-y-2"
    >
      <Label htmlFor={id}>
        {label}
      </Label>

      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() =>
          setIsOpen((current) => !current)
        }
        className={[
          selectClassName,
          "h-auto min-h-10 justify-between gap-2 text-left",
        ].join(" ")}
      >
        <span
          className={[
            "min-w-0 flex-1 truncate",
            selectedLabels.length === 0
              ? "text-muted-foreground"
              : "",
          ].join(" ")}
        >
          {displayValue}
        </span>

        <ChevronDown
          className={[
            "h-4 w-4 shrink-0 transition-transform",
            isOpen
              ? "rotate-180"
              : "",
          ].join(" ")}
        />
      </button>

      {isOpen ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-input bg-popover p-1 text-popover-foreground shadow-md"
        >
          {options.map((option) => {
            const selected =
              selectedValues.includes(
                option.value,
              );

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() =>
                  toggleValue(
                    option.value,
                  )
                }
                className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary">
                  {selected ? (
                    <Check className="h-3 w-3" />
                  ) : null}
                </span>

                <span>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedValues.map((value) => (
        <input
          key={value}
          type="hidden"
          name={name}
          value={value}
        />
      ))}

      <input
        type="text"
        tabIndex={-1}
        required
        value={
          selectedValues.length > 0
            ? "selected"
            : ""
        }
        onChange={() => undefined}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
      />

      <p className="text-xs text-muted-foreground">
        Możesz wybrać więcej niż jedną dziedzinę.
      </p>
    </div>
  );
}