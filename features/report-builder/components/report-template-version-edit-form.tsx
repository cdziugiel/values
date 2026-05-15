"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  archiveReportTemplateVersionAction,
  publishReportTemplateVersionAction,
  updateReportTemplateVersionAction,
  type ReportTemplateAdminActionState,
} from "../api/report-template-admin.actions";

const initialState: ReportTemplateAdminActionState = {
  status: "idle",
  message: "",
};

function stringifyJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

type ReportTemplateVersionEditFormProps = {
  version: {
    reportTemplateVersionId: string;
    reportTemplateId: string;
    version: string;
    name: string;
    description: string | null;
    status: string;
    isDefault: boolean;
    globalCss: string | null;
    globalJs: string | null;
    pageSize: string;
    orientation: string;
    config: unknown;
    dataBindings: unknown;
  };
};

export function ReportTemplateVersionEditForm({
  version,
}: ReportTemplateVersionEditFormProps) {
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateReportTemplateVersionAction,
    initialState,
  );

  const [publishState, publishAction, isPublishPending] = useActionState(
    publishReportTemplateVersionAction,
    initialState,
  );

  const [archiveState, archiveAction, isArchivePending] = useActionState(
    archiveReportTemplateVersionAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      <form action={updateAction} className="space-y-5 rounded-2xl border bg-card p-5">
        <input
          type="hidden"
          name="reportTemplateVersionId"
          value={version.reportTemplateVersionId}
        />

        <div className="grid gap-4 md:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm font-medium">Numer wersji</span>
            <Input
              name="version"
              defaultValue={version.version}
              required
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Nazwa</span>
            <Input
              name="name"
              defaultValue={version.name}
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Status</span>
            <select
              name="status"
              defaultValue={version.status}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="draft">Roboczy</option>
              <option value="active">Aktywny</option>
              <option value="archived">Archiwalny</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isDefault"
            defaultChecked={version.isDefault}
          />
          Domyślna wersja dla tego template’u
        </label>

        <label className="space-y-2 block">
          <span className="text-sm font-medium">Opis</span>
          <textarea
            name="description"
            defaultValue={version.description ?? ""}
            className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Rozmiar strony</span>
            <select
              name="pageSize"
              defaultValue={version.pageSize}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="A4">A4</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Orientacja</span>
            <select
              name="orientation"
              defaultValue={version.orientation}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="portrait">Pionowa</option>
              <option value="landscape">Pozioma</option>
            </select>
          </label>
        </div>

        <label className="space-y-2 block">
          <span className="text-sm font-medium">Global CSS</span>
          <textarea
            name="globalCss"
            defaultValue={version.globalCss ?? ""}
            className="min-h-40 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
            placeholder={`.report-page {\n  font-family: Inter, sans-serif;\n}`}
          />
        </label>

        <label className="space-y-2 block">
          <span className="text-sm font-medium">Global JS</span>
          <textarea
            name="globalJs"
            defaultValue={version.globalJs ?? ""}
            className="min-h-40 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
            placeholder={`console.log("report sandbox");`}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 block">
            <span className="text-sm font-medium">Config JSON</span>
            <textarea
              name="configText"
              defaultValue={stringifyJson(version.config)}
              className="min-h-48 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
            />
          </label>

          <label className="space-y-2 block">
            <span className="text-sm font-medium">Data bindings JSON</span>
            <textarea
              name="dataBindingsText"
              defaultValue={stringifyJson(version.dataBindings)}
              className="min-h-48 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
            />
          </label>
        </div>

        {updateState.status !== "idle" ? (
          <p
            className={
              updateState.status === "success"
                ? "text-sm text-green-700"
                : "text-sm text-destructive"
            }
          >
            {updateState.message}
          </p>
        ) : null}

        <Button type="submit" disabled={isUpdatePending}>
          {isUpdatePending ? "Zapisywanie..." : "Zapisz wersję"}
        </Button>
      </form>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Publikacja i archiwizacja</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aktywna wersja może być przypinana do kwestionariuszy. Archiwizacja
            dezaktywuje jej istniejące przypięcia.
          </p>

          {publishState.status === "error" ? (
            <p className="mt-2 text-sm text-destructive">
              {publishState.message}
            </p>
          ) : null}

          {archiveState.status === "error" ? (
            <p className="mt-2 text-sm text-destructive">
              {archiveState.message}
            </p>
          ) : null}

          {publishState.status === "success" ? (
            <p className="mt-2 text-sm text-green-700">
              {publishState.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <form action={publishAction}>
            <input
              type="hidden"
              name="reportTemplateVersionId"
              value={version.reportTemplateVersionId}
            />

            <Button
              type="submit"
              disabled={isPublishPending || version.status === "active"}
            >
              {isPublishPending ? "Publikowanie..." : "Opublikuj"}
            </Button>
          </form>

          <form
            action={archiveAction}
            onSubmit={(event) => {
              const confirmed = window.confirm(
                `Zarchiwizować wersję raportu "${version.name}"? Aktywne przypięcia do kwestionariuszy zostaną dezaktywowane.`,
              );

              if (!confirmed) {
                event.preventDefault();
              }
            }}
          >
            <input
              type="hidden"
              name="reportTemplateVersionId"
              value={version.reportTemplateVersionId}
            />

            <Button
              type="submit"
              variant="destructive"
              disabled={isArchivePending}
            >
              {isArchivePending ? "Archiwizowanie..." : "Archiwizuj"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}