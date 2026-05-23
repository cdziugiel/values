"use client";

import { useActionState, useRef } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  TriangleAlert,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import {
  importClientUnitsCsvAction,
  type ImportClientUnitsCsvActionState,
} from "../api/client-unit-import.actions";

type ClientUnitImportExportDialogProps = {
  tenantSlug: string;
  canImport: boolean;
};

const initialState: ImportClientUnitsCsvActionState = {
  status: "idle",
  message: "",
  errors: [],
  importedCount: 0,
};

export function ClientUnitImportExportDialog({
  tenantSlug,
  canImport,
}: ClientUnitImportExportDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState(
    importClientUnitsCsvAction,
    initialState,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <FileSpreadsheet size={16} />
          Import / Export
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl rounded-[1.75rem] border-black/10 bg-white/95 p-0 shadow-[0_24px_72px_rgba(15,23,42,0.18)] backdrop-blur">
        <div className="border-b border-black/10 px-6 py-5">
          <DialogHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
              Jednostki organizacyjne
            </p>

            <DialogTitle className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
              Import i export jednostek
            </DialogTitle>

            <DialogDescription className="text-sm leading-6 text-[#6b7280]">
              Import działa transakcyjnie. Jeżeli plik zawiera błędy, żadna
              jednostka nie zostanie zapisana.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-5">
          <section className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#171717]">
                  Export CSV
                </h3>

                <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                  Pobierz aktualną strukturę jednostek organizacyjnych w
                  formacie CSV UTF-8.
                </p>
              </div>

              <Button
                asChild
                variant="outline"
                className="rounded-full border-black/10 bg-white"
              >
                <a href={`/t/${tenantSlug}/client-units/export`}>
                  <Download size={15} />
                  Pobierz CSV
                </a>
              </Button>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
            <div>
              <h3 className="text-sm font-semibold text-[#171717]">
                Import CSV
              </h3>

              <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                Wymagane kolumny:{" "}
                <span className="font-mono text-xs text-[#171717]">
                  clientOrganizationName, name, type, parentName
                </span>
                . Typ musi być jednym z:{" "}
                <span className="font-mono text-xs text-[#171717]">
                  organization, division, department, team, other
                </span>
                .
              </p>
            </div>

            {canImport ? (
              <form
                ref={formRef}
                action={async (formData) => {
                  await formAction(formData);
                  formRef.current?.reset();
                }}
                className="mt-4 space-y-4"
              >
                <input type="hidden" name="tenantSlug" value={tenantSlug} />

                <Input
                  name="file"
                  type="file"
                  accept=".csv,text/csv"
                  required
                  className="rounded-2xl border-black/10 bg-white"
                />

                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
                >
                  <Upload size={15} />
                  {isPending ? "Importowanie..." : "Importuj jednostki"}
                </Button>
              </form>
            ) : (
              <div className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                Nie masz uprawnienia do importu jednostek organizacyjnych.
              </div>
            )}

            {state.status !== "idle" ? (
              <div
                className={[
                  "mt-4 rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
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

                  <div>
                    <p>{state.message}</p>

                    {state.errors.length > 0 ? (
                      <ul className="mt-3 max-h-56 space-y-1 overflow-auto rounded-xl bg-white/60 p-3 font-mono text-xs">
                        {state.errors.slice(0, 80).map((error, index) => (
                          <li key={`${error.row}-${index}`}>
                            Wiersz {error.row}: {error.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-[1.25rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4 text-sm leading-6 text-[#0f766e]">
            Jeśli jednostka o tej samej nazwie istnieje już w danej organizacji,
            import zaktualizuje jej typ oraz jednostkę nadrzędną.
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}