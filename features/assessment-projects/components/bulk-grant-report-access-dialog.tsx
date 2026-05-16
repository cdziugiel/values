"use client";

import { useActionState, useMemo, useState } from "react";
import { UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  bulkGrantReportAccessToCompletedSessionsAction,
  type PartnerGrantReportAccessState,
} from "../api/partner-report-access.actions";

const initialState: PartnerGrantReportAccessState = {
  status: "idle",
  message: "",
};

type BulkGrantProduct = {
  id: string;
  code: string;
  name: string;
  availableCount?: number | string | null;
};

type BulkGrantSession = {
  sessionId: string;
  sessionStatus: string | null;
  sessionCompletedAt?: string | Date | null;
  respondentEmail?: string | null;
  grants: {
    reportTemplateId: string;
    reportTemplateVersionId: string;
    isCurrentlyActive: boolean;
  }[];
};

type BulkGrantReportAccessDialogProps = {
  tenantSlug: string;
  projectId: string;
  products: BulkGrantProduct[];
  sessions: BulkGrantSession[];
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getSessionTimestamp(session: BulkGrantSession) {
  const date = session.sessionCompletedAt
    ? new Date(String(session.sessionCompletedAt))
    : null;

  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

export function BulkGrantReportAccessDialog({
  tenantSlug,
  projectId,
  products,
  sessions,
}: BulkGrantReportAccessDialogProps) {
  const [state, formAction, isPending] = useActionState(
    bulkGrantReportAccessToCompletedSessionsAction,
    initialState,
  );

  const availableProducts = useMemo(
    () => products.filter((product) => numberValue(product.availableCount) > 0),
    [products],
  );

  const [selectedProductId, setSelectedProductId] = useState(
    availableProducts[0]?.id ?? "",
  );

  const selectedProduct = useMemo(
    () =>
      availableProducts.find((product) => product.id === selectedProductId) ??
      null,
    [availableProducts, selectedProductId],
  );

  const defaultSelectedSessionIds = useMemo(() => {
    if (!selectedProduct) {
      return new Set<string>();
    }

    /**
     * Docelowo filtrowanie można zrobić po reportTemplateId produktu.
     * Na teraz przyjmujemy: zakończona sesja bez jakiegokolwiek aktywnego grantu.
     */
    const latestSessionByEmail = new Map<string, BulkGrantSession>();

    for (const session of sessions) {
      if (session.sessionStatus !== "completed") {
        continue;
      }

      const hasActiveGrant = session.grants.some(
        (grant) => grant.isCurrentlyActive,
      );

      if (hasActiveGrant) {
        continue;
      }

      const key = session.respondentEmail ?? session.sessionId;
      const current = latestSessionByEmail.get(key);

      if (!current || getSessionTimestamp(session) > getSessionTimestamp(current)) {
        latestSessionByEmail.set(key, session);
      }
    }

    return new Set(
      Array.from(latestSessionByEmail.values()).map(
        (session) => session.sessionId,
      ),
    );
  }, [selectedProduct, sessions]);

  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(
    () => defaultSelectedSessionIds,
  );

  /**
   * Gdy użytkownik zmieni produkt, resetujemy wybór do domyślnej listy.
   */
  function handleProductChange(productId: string) {
    setSelectedProductId(productId);

    const latestSessionByEmail = new Map<string, BulkGrantSession>();

    for (const session of sessions) {
      if (session.sessionStatus !== "completed") {
        continue;
      }

      const hasActiveGrant = session.grants.some(
        (grant) => grant.isCurrentlyActive,
      );

      if (hasActiveGrant) {
        continue;
      }

      const key = session.respondentEmail ?? session.sessionId;
      const current = latestSessionByEmail.get(key);

      if (!current || getSessionTimestamp(session) > getSessionTimestamp(current)) {
        latestSessionByEmail.set(key, session);
      }
    }

    setSelectedSessionIds(
      new Set(
        Array.from(latestSessionByEmail.values()).map(
          (session) => session.sessionId,
        ),
      ),
    );
  }

  const candidateSessions = useMemo(() => {
    return sessions
      .filter((session) => session.sessionStatus === "completed")
      .filter(
        (session) =>
          !session.grants.some((grant) => grant.isCurrentlyActive),
      )
      .sort((left, right) => {
        const emailDiff = String(left.respondentEmail ?? "").localeCompare(
          String(right.respondentEmail ?? ""),
          "pl",
          { sensitivity: "base", numeric: true },
        );

        if (emailDiff !== 0) {
          return emailDiff;
        }

        return getSessionTimestamp(right) - getSessionTimestamp(left);
      });
  }, [sessions]);

  const selectedCount = selectedSessionIds.size;
  const availableCount = selectedProduct
    ? numberValue(selectedProduct.availableCount)
    : 0;

  const hasTooManySelected = selectedCount > availableCount;

  function toggleSession(sessionId: string) {
    setSelectedSessionIds((previous) => {
      const next = new Set(previous);

      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }

      return next;
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <UsersRound size={16} />
          Nadaj dostęp zbiorczo
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[88vh]  w-[min(1100px,calc(100vw-32px))] min-w-[50vw] max-w-[1000px] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zbiorcze nadanie dostępu do raportu</DialogTitle>
          <DialogDescription>
            Domyślnie zaznaczona jest ostatnia zakończona sesja każdego
            respondenta bez aktywnego raportu. Możesz odznaczyć wybrane osoby
            przed zatwierdzeniem.
          </DialogDescription>
        </DialogHeader>

        {availableProducts.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Brak wolnych dostępów w puli. Najpierw kup albo wygeneruj dostęp dla
            tenanta.
          </div>
        ) : (
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="productId" value={selectedProduct?.id ?? ""} />

            {Array.from(selectedSessionIds).map((sessionId) => (
              <input
                key={sessionId}
                type="hidden"
                name="sessionIds"
                value={sessionId}
              />
            ))}

            <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Produkt / typ raportu
                </label>

                <select
                  value={selectedProductId}
                  onChange={(event) => handleProductChange(event.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                <div className="text-xs uppercase text-muted-foreground">
                  Bilans
                </div>

                <div className="mt-1 font-medium">
                  Zaznaczone: {selectedCount}
                </div>

                <div className="mt-1 text-muted-foreground">
                  Wolne w puli: {availableCount}
                </div>

                {hasTooManySelected ? (
                  <div className="mt-2 text-xs text-destructive">
                    Zaznaczono więcej sesji niż dostępnych kodów.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold">Sesje do nadania dostępu</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Lista zawiera zakończone sesje bez aktywnego dostępu do
                    raportu.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedSessionIds(
                        new Set(
                          candidateSessions.map((session) => session.sessionId),
                        ),
                      )
                    }
                  >
                    Zaznacz wszystkie
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSessionIds(new Set())}
                  >
                    Odznacz wszystkie
                  </Button>
                </div>
              </div>

              {candidateSessions.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Brak zakończonych sesji bez aktywnego dostępu.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="w-12 px-4 py-3 text-left"></th>
                        <th className="px-4 py-3 text-left font-medium">
                          Respondent
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Sesja
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Zakończono
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {candidateSessions.map((session) => {
                        const selected = selectedSessionIds.has(
                          session.sessionId,
                        );

                        return (
                          <tr key={session.sessionId} className="border-t">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleSession(session.sessionId)}
                              />
                            </td>

                            <td className="px-4 py-3">
                              <div className="font-medium">
                                {session.respondentEmail ?? "—"}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-muted-foreground">
                                {session.sessionId}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              {formatDateTime(session.sessionCompletedAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {state.status !== "idle" ? (
              <div
                className={
                  state.status === "success"
                    ? "rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                    : "rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                }
              >
                {state.message}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="submit"
                disabled={
                  isPending ||
                  selectedCount === 0 ||
                  !selectedProduct ||
                  hasTooManySelected
                }
              >
                {isPending
                  ? "Nadawanie..."
                  : `Nadaj dostęp (${selectedCount})`}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}