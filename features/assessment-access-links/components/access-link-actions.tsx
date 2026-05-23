"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  RefreshCcw,
  ShieldCheck,
  TriangleAlert,
  Unlink,
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

import {
  createAssessmentAccessLinkAction,
  revokeAssessmentAccessLinkAction,
  type AssessmentAccessLinkActionState,
} from "../api/assessment-access-link.actions";

type AccessLinkActionsProps = {
  tenantSlug: string;
  assessmentProjectId: string;
  projectRespondentId: string;
  activeAccessLinkId?: string | null;
  activeAccessUrl?: string | null;
  canManage: boolean;
};

const initialState: AssessmentAccessLinkActionState = {
  status: "idle",
  message: "",
};

function ActionMessage({
  status,
  message,
}: {
  status: "idle" | "success" | "error";
  message: string;
}) {
  if (status === "idle" || !message) {
    return null;
  }

  return (
    <div
      className={[
        "rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
        status === "success"
          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      <div className="flex gap-2">
        {status === "success" ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        ) : (
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        )}

        <span>{message}</span>
      </div>
    </div>
  );
}

function LinkBox({ url }: { url: string }) {
  return (
    <div className="rounded-[1.25rem] border border-black/10 bg-white/75 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
        <Link2 size={13} />
        Link do badania
      </div>

      <div className="break-all rounded-xl bg-[#f7f4ef] px-3 py-2 font-mono text-xs leading-5 text-[#171717]">
        {url}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
          }}
        >
          <Copy size={14} />
          Kopiuj link
        </Button>

        <Button
          asChild
          size="sm"
          variant="outline"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />
            Otwórz
          </a>
        </Button>
      </div>
    </div>
  );
}

export function AccessLinkActions({
  tenantSlug,
  assessmentProjectId,
  projectRespondentId,
  activeAccessLinkId,
  activeAccessUrl,
  canManage,
}: AccessLinkActionsProps) {
  const [open, setOpen] = useState(false);

  const [createState, createAction, isCreating] = useActionState(
    createAssessmentAccessLinkAction,
    initialState,
  );

  const [revokeState, revokeAction, isRevoking] = useActionState(
    revokeAssessmentAccessLinkAction,
    initialState,
  );

  const visibleUrl = useMemo(() => {
    if (createState.status === "success" && createState.url) {
      return createState.url;
    }

    return activeAccessUrl ?? null;
  }, [activeAccessUrl, createState.status, createState.url]);

  if (!canManage) {
    return null;
  }

  const hasActiveLink = Boolean(activeAccessLinkId);
  

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={hasActiveLink ? "outline" : "default"}
          className={[
            "rounded-full shadow-sm transition hover:-translate-y-0.5",
            hasActiveLink
              ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e] hover:bg-[rgba(45,212,191,0.22)]"
              : "bg-[#171717] text-white hover:bg-[#2a2a2a]",
          ].join(" ")}
        >
          {hasActiveLink ? <ShieldCheck size={14} /> : <Link2 size={14} />}
          {hasActiveLink ? "Aktywny link" : "Wygeneruj link"}
        </Button>
      </DialogTrigger>

      <DialogContent className="md:min-w-[500px] rounded-[1.75rem] border-black/10 bg-white/95 p-0 shadow-[0_24px_72px_rgba(15,23,42,0.18)] backdrop-blur">
        <div className="border-b border-black/10 px-6 py-5">
          <DialogHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
              Link respondenta
            </p>

            <DialogTitle className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
              Dostęp do badania
            </DialogTitle>

            <DialogDescription className="text-sm leading-6 text-[#6b7280]">
              Wygeneruj, skopiuj albo unieważnij indywidualny link do badania
              dla tego respondenta.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-5">
          {hasActiveLink ? (
            <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4">
              <div className="flex gap-3">
                <ShieldCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-[#0f766e]"
                />

                <div>
                  <p className="text-sm font-semibold text-[#0f766e]">
                    Aktywny link istnieje
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[#0f766e]">
                    Możesz go skopiować, otworzyć, wygenerować nowy link albo
                    unieważnić obecny dostęp respondenta.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
              <div className="flex gap-3">
                <Link2 size={18} className="mt-0.5 shrink-0 text-[#6b7280]" />

                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    Brak aktywnego linku
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                    Wygeneruj indywidualny link, aby respondent mógł rozpocząć
                    lub kontynuować badanie.
                  </p>
                </div>
              </div>
            </div>
          )}

{visibleUrl ? <LinkBox url={visibleUrl} /> : null}

{hasActiveLink && !visibleUrl ? (
  <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
    Aktywny link istnieje, ale pełny adres nie jest przechowywany w systemie.
    Możesz wygenerować nowy link — po wygenerowaniu będzie dostępny do
    skopiowania w tym oknie.
  </div>
) : null}

          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-black/10 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#171717]">
                {hasActiveLink ? "Odśwież dostęp" : "Utwórz dostęp"}
              </p>

              <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                Wygenerowanie nowego linku powinno być traktowane jako
                odświeżenie dostępu dla respondenta.
              </p>
            </div>

            <form action={createAction}>
              <input type="hidden" name="tenantSlug" value={tenantSlug} />

              <input
                type="hidden"
                name="assessmentProjectId"
                value={assessmentProjectId}
              />

              <input
                type="hidden"
                name="projectRespondentId"
                value={projectRespondentId}
              />

              <Button
                type="submit"
                size="sm"
                disabled={isCreating}
                className="rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
              >
                {hasActiveLink ? <RefreshCcw size={14} /> : <Link2 size={14} />}
                {isCreating
                  ? "Generowanie..."
                  : hasActiveLink
                    ? "Wygeneruj nowy"
                    : "Wygeneruj link"}
              </Button>
            </form>
          </div>

          {hasActiveLink ? (
            <div className="rounded-[1.5rem] border border-red-100 bg-red-50/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-900">
                    Unieważnienie linku
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-800/80">
                    Po unieważnieniu respondent nie powinien móc korzystać z
                    obecnego linku.
                  </p>
                </div>

                <form
                  action={revokeAction}
                  onSubmit={(event) => {
                    const confirmed = window.confirm(
                      "Unieważnić aktywny link do badania?",
                    );

                    if (!confirmed) {
                      event.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="tenantSlug" value={tenantSlug} />

                  <input
                    type="hidden"
                    name="assessmentProjectId"
                    value={assessmentProjectId}
                  />

                  <input
                    type="hidden"
                    name="accessLinkId"
                    value={activeAccessLinkId ?? ""}
                  />

                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    disabled={isRevoking}
                    className="rounded-full px-3 text-red-700 hover:bg-red-100 hover:text-red-900"
                  >
                    <Unlink size={14} />
                    {isRevoking ? "Unieważnianie..." : "Unieważnij"}
                  </Button>
                </form>
              </div>
            </div>
          ) : null}

          <ActionMessage
            status={createState.status}
            message={createState.message}
          />

          <ActionMessage
            status={revokeState.status}
            message={revokeState.message}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}