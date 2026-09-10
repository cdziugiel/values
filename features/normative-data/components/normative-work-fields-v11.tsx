"use client";

// @humanet-normative-profile-v1_1_1
import { useMemo, useState, type ChangeEvent } from "react";

import { Label } from "@/components/ui/label";
import {
  EMPLOYMENT_FORM_OPTIONS,
  INDUSTRY_SECTION_OPTIONS,
  JOB_FUNCTION_OPTIONS,
  JOB_LEVEL_OPTIONS,
  MANAGES_PEOPLE_OPTIONS,
  OCCUPATION_MAJOR_GROUP_OPTIONS,
  ORGANIZATION_SIZE_OPTIONS,
  ORGANIZATION_TENURE_OPTIONS,
  OWNERSHIP_SECTOR_OPTIONS,
  WORK_SITUATION_OPTIONS,
  WORK_TIME_OPTIONS,
} from "../lib/normative-profile-options";
import { resolveIsWorkingForNormsFromSituation } from "../lib/normative-profile-derived";
import type { NormativeProfileFormValues } from "../types/normative-profile-action.types";
// @humanet-normative-work-situation-v1_2-form

const selectClassName =
  "mt-auto flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

type Option = Readonly<{ value: string; label: string }>;

function withoutNotApplicable(options: readonly Option[]) {
  return options.filter((option) => option.value !== "not_applicable");
}

function SelectFieldV111({
  id,
  name,
  label,
  helper,
  options,
  defaultValue,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  helper?: string;
  options: readonly Option[];
  defaultValue?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  const safeDefault =
    defaultValue === "not_applicable" ? "" : (defaultValue ?? "");

  return (
    <div className="flex h-full min-w-0 flex-col gap-2">
      <div className="space-y-1">
        <Label htmlFor={id} className="block text-sm font-medium leading-5">
          {label}
        </Label>
        {helper ? (
          <p className="text-xs leading-4 text-muted-foreground">{helper}</p>
        ) : null}
      </div>

      <select
        id={id}
        name={name}
        required
        defaultValue={safeDefault}
        onChange={onChange}
        className={selectClassName}
      >
        <option value="" disabled>
          Wybierz odpowiedź
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function NormativeWorkFieldsV11({
  defaultValues,
}: {
  defaultValues?: NormativeProfileFormValues;
}) {
  const [workSituation, setWorkSituation] = useState(
    defaultValues?.workSituation ?? "",
  );

  const isWorking = useMemo(
    () => resolveIsWorkingForNormsFromSituation(workSituation),
    [workSituation],
  );

  const situationSelected = workSituation.length > 0;

  return (
    <section className="space-y-5">
      <div>
        <h3 className="font-semibold">Sytuacja zawodowa</h3>
      </div>

      <SelectFieldV111
        id="workSituation"
        name="workSituation"
        label="Która odpowiedź najlepiej opisuje Twoją obecną sytuację?"
        options={WORK_SITUATION_OPTIONS}
        defaultValue={workSituation}
        onChange={(event) => setWorkSituation(event.target.value)}
      />

      {situationSelected && isWorking ? (
        <>
          <div className="border-t pt-4">
            <p className="text-sm font-semibold">Główna praca</p>
            <p className="mt-1 text-xs leading-4 text-muted-foreground">
              Jeśli masz kilka prac, odpowiedz dla głównej.
            </p>
          </div>

          <div className="grid items-stretch gap-x-6 gap-y-5 md:grid-cols-2">
            <SelectFieldV111
              id="employmentForm"
              name="employmentForm"
              label="Forma pracy"
              options={withoutNotApplicable(EMPLOYMENT_FORM_OPTIONS)}
              defaultValue={defaultValues?.employmentForm}
            />
            <SelectFieldV111
              id="workTime"
              name="workTime"
              label="Wymiar pracy"
              options={withoutNotApplicable(WORK_TIME_OPTIONS)}
              defaultValue={defaultValues?.workTime}
            />
            <SelectFieldV111
              id="industrySection"
              name="industrySection"
              label="Branża"
              options={withoutNotApplicable(INDUSTRY_SECTION_OPTIONS)}
              defaultValue={defaultValues?.industrySection}
            />
            <SelectFieldV111
              id="occupationMajorGroup"
              name="occupationMajorGroup"
              label="Grupa zawodowa"
              options={withoutNotApplicable(OCCUPATION_MAJOR_GROUP_OPTIONS)}
              defaultValue={defaultValues?.occupationMajorGroup}
            />
            <SelectFieldV111
              id="jobLevel"
              name="jobLevel"
              label="Poziom stanowiska"
              options={withoutNotApplicable(JOB_LEVEL_OPTIONS)}
              defaultValue={defaultValues?.jobLevel}
            />
            <SelectFieldV111
              id="jobFunction"
              name="jobFunction"
              label="Obszar funkcjonalny"
              options={withoutNotApplicable(JOB_FUNCTION_OPTIONS)}
              defaultValue={defaultValues?.jobFunction}
            />
            <SelectFieldV111
              id="managesPeople"
              name="managesPeople"
              label="Czy zarządzasz ludźmi?"
              options={withoutNotApplicable(MANAGES_PEOPLE_OPTIONS)}
              defaultValue={defaultValues?.managesPeople}
            />
            <SelectFieldV111
              id="organizationSize"
              name="organizationSize"
              label="Wielkość organizacji"
              options={withoutNotApplicable(ORGANIZATION_SIZE_OPTIONS)}
              defaultValue={defaultValues?.organizationSize}
            />
            <SelectFieldV111
              id="ownershipSector"
              name="ownershipSector"
              label="Sektor własności"
              options={withoutNotApplicable(OWNERSHIP_SECTOR_OPTIONS)}
              defaultValue={defaultValues?.ownershipSector}
            />
            <SelectFieldV111
              id="organizationTenure"
              name="organizationTenure"
              label="Staż w obecnej pracy"
              options={withoutNotApplicable(ORGANIZATION_TENURE_OPTIONS)}
              defaultValue={defaultValues?.organizationTenure}
            />
          </div>
        </>
      ) : situationSelected ? (
        <>
          <input type="hidden" name="employmentForm" value="not_applicable" />
          <input type="hidden" name="workTime" value="not_applicable" />
          <input type="hidden" name="industrySection" value="not_applicable" />
          <input type="hidden" name="occupationMajorGroup" value="not_applicable" />
          <input type="hidden" name="jobLevel" value="not_applicable" />
          <input type="hidden" name="jobFunction" value="not_applicable" />
          <input type="hidden" name="managesPeople" value="not_applicable" />
          <input type="hidden" name="organizationSize" value="not_applicable" />
          <input type="hidden" name="ownershipSector" value="not_applicable" />
          <input type="hidden" name="organizationTenure" value="not_applicable" />
          <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
            Pytania o obecną pracę zostały pominięte.
          </div>
        </>
      ) : null}
    </section>
  );
}
