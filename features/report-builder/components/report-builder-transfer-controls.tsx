// HUMANET installer: report-builder-full-transfer-v1
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileJson2,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MAX_IMPORT_FILE_SIZE = 20 * 1024 * 1024;

type ImportResult =
  | {
      ok: true;
      message: string;
      importedPageCount: number;
      replacedPageCount: number;
    }
  | {
      ok: false;
      message: string;
      issues?: Array<{
        path: string;
        message: string;
      }>;
    };

export function ReportBuilderTransferControls({
  reportTemplateVersionId,
  status,
}: {
  reportTemplateVersionId: string;
  status: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const canImport = status === "draft";

  function resetDialog() {
    setFile(null);
    setConfirmed(false);
    setResult(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleImport() {
    if (!file) {
      setResult({
        ok: false,
        message: "Wybierz plik JSON wyeksportowany z HUMANET Report Builder.",
      });
      return;
    }

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      setResult({
        ok: false,
        message: "Plik jest zbyt duży. Maksymalny rozmiar importu to 20 MB.",
      });
      return;
    }

    if (!confirmed) {
      setResult({
        ok: false,
        message: "Potwierdź, że rozumiesz skutek pełnego importu.",
      });
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch(
        `/dashboard/report-builder/${reportTemplateVersionId}/import`,
        {
          method: "POST",
          body: formData,
          cache: "no-store",
        },
      );

      const body = (await response.json()) as ImportResult;

      if (!response.ok || !body.ok) {
        setResult(
          body.ok
            ? {
                ok: false,
                message: "Import nie został wykonany.",
              }
            : body,
        );
        return;
      }

      setResult(body);
      router.refresh();
    } catch {
      setResult({
        ok: false,
        message:
          "Nie udało się przesłać pliku importu. Spróbuj ponownie lub odśwież stronę.",
      });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline">
        <a
          href={`/dashboard/report-builder/${reportTemplateVersionId}/export`}
          download
        >
          <Download size={16} />
          Pełny eksport
        </a>
      </Button>

      {canImport ? (
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);

            if (!nextOpen) {
              resetDialog();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload size={16} />
              Pełny import
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Import całego raportu z buildera</DialogTitle>
              <DialogDescription>
                Import zastąpi globalny CSS, JS, Config JSON, Data bindings
                oraz wszystkie aktualne strony tej wersji roboczej.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex gap-3">
                  <TriangleAlert className="mt-0.5 shrink-0" size={18} />
                  <div>
                    <div className="font-medium">
                      Operacja zastępująca, wykonywana transakcyjnie
                    </div>
                    <p className="mt-1 leading-6">
                      Jeżeli walidacja lub zapis nie powiedzie się, transakcja
                      zostanie wycofana. Dla bezpieczeństwa przed importem możesz
                      pobrać bieżący pełny eksport.
                    </p>
                  </div>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Plik eksportu JSON</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setResult(null);
                  }}
                />
                <span className="block text-xs text-muted-foreground">
                  Maksymalnie 20 MB. Akceptowany jest wyłącznie format
                  HUMANET Report Builder v1.
                </span>
              </label>

              {file ? (
                <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-muted/30 p-3 text-sm">
                  <FileJson2 size={18} className="shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              ) : null}

              <label className="flex items-start gap-3 rounded-xl border border-black/10 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  Rozumiem, że import zastąpi zawartość tej wersji roboczej,
                  włącznie z kolejnością i kodem stron.
                </span>
              </label>

              {result ? (
                <div
                  className={[
                    "rounded-xl border p-3 text-sm",
                    result.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-red-200 bg-red-50 text-red-800",
                  ].join(" ")}
                >
                  <div className="flex gap-2">
                    {result.ok ? (
                      <ShieldCheck className="mt-0.5 shrink-0" size={17} />
                    ) : (
                      <TriangleAlert className="mt-0.5 shrink-0" size={17} />
                    )}
                    <div>
                      <div>{result.message}</div>
                      {!result.ok && result.issues?.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                          {result.issues.slice(0, 8).map((issue, index) => (
                            <li key={`${issue.path}-${index}`}>
                              {issue.path ? `${issue.path}: ` : ""}
                              {issue.message}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isImporting}
                onClick={() => setOpen(false)}
              >
                Zamknij
              </Button>
              <Button
                type="button"
                disabled={!file || !confirmed || isImporting}
                onClick={handleImport}
              >
                <Upload size={16} />
                {isImporting ? "Importowanie..." : "Importuj i zastąp"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled
          title="Import jest dozwolony tylko do wersji roboczej."
        >
          <Upload size={16} />
          Pełny import
        </Button>
      )}
    </div>
  );
}
