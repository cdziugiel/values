"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  Globe2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  publishQuestionnaireVersionAction,
  unpublishQuestionnaireVersionAction,
  type QuestionnaireAdminActionState,
} from "../api/questionnaire-admin.actions";

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
};

type QuestionnaireVersionPublishPanelProps = {
  versionId: string;
  status: string;
};

function ActionMessage({
  status,
  message,
}: {
  status: "idle" | "success" | "error";
  message: string;
}) {
  if (status === "idle") return null;

  return (
    <div
      className={[
        "mt-5 rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
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

        <span className="whitespace-pre-wrap">{message}</span>
      </div>
    </div>
  );
}

export function QuestionnaireVersionPublishPanel({
  versionId,
  status,
}: QuestionnaireVersionPublishPanelProps) {
  const [publishState, publishAction, isPublishing] = useActionState(
    publishQuestionnaireVersionAction,
    initialState,
  );

  const [unpublishState, unpublishAction, isUnpublishing] = useActionState(
    unpublishQuestionnaireVersionAction,
    initialState,
  );

  const isDraft = status === "draft";
  const isPublished = status === "active";

  const state =
    publishState.status !== "idle" ? publishState : unpublishState;

  return (
    <section className="group relative overflow-hidden rounded-[2rem] hv-brand-card p-6 transition duration-300 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
            <Globe2 size={13} />
            Publikacja
          </div>

          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
            Status publikacji wersji
          </h2>

          {isDraft ? (
            <p className="mt-3 text-sm leading-6 text-[#6b7280]">
              Ta wersja jest robocza. Możesz ją edytować, importować dane,
              sprawdzić podgląd, a następnie opublikować jako stabilną wersję
              badawczą.
            </p>
          ) : isPublished ? (
            <div className="mt-3 space-y-2 text-sm leading-6 text-[#6b7280]">
              <p>
                Ta wersja jest opublikowana. Standardowo opublikowane wersje
                powinny być traktowane jako niemutowalne.
              </p>
              <p>
                Cofnięcie publikacji traktuj jako operację developerską, nie
                jako standardowy proces pracy na danych produkcyjnych.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[#6b7280]">
              Ta wersja nie jest robocza. Publikowanie jest dostępne tylko dla
              wersji o statusie draft.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <Button
            asChild
            variant="outline"
            className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
          >
            <Link href={`/dashboard/questionnaires/preview/${versionId}`}>
              <Eye size={16} />
              Podgląd
            </Link>
          </Button>

          {isDraft ? (
            <form
              action={publishAction}
              onSubmit={(event) => {
                const confirmed = window.confirm(
                  "Opublikować tę wersję kwestionariusza? Po publikacji wersja powinna być traktowana jako stabilna.",
                );

                if (!confirmed) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="versionId" value={versionId} />

              <Button
                type="submit"
                disabled={isPublishing}
                className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
              >
                <Sparkles size={16} />
                {isPublishing ? "Publikowanie..." : "Opublikuj wersję"}
              </Button>
            </form>
          ) : null}

          {isPublished ? (
            <form
              action={unpublishAction}
              onSubmit={(event) => {
                const confirmed = window.confirm(
                  [
                    "Cofnąć publikację tej wersji?",
                    "",
                    "Wersja wróci do statusu draft, zostanie zdjęta z publicznego dostępu i będzie ponownie edytowalna.",
                    "",
                    "To jest operacja developerska — nie powinna być używana dla wersji, na których oparto już właściwe badania produkcyjne.",
                  ].join("\n"),
                );

                if (!confirmed) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="versionId" value={versionId} />

              <Button
                type="submit"
                variant="outline"
                disabled={isUnpublishing}
                className="rounded-full border-amber-200 bg-amber-50 text-amber-800 shadow-sm hover:bg-amber-100"
              >
                <RotateCcw size={14} />
                {isUnpublishing ? "Cofanie..." : "Cofnij publikację"}
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-black/10 bg-white/60 p-4 text-sm leading-6 text-[#6b7280]">
        <div className="mb-1 flex items-center gap-2 font-semibold text-[#171717]">
          <ShieldCheck size={15} />
          Zasada bezpieczeństwa wersji
        </div>
        Opublikowana wersja powinna pozostać stabilna, aby zachować
        odtwarzalność historycznych badań i raportów.
      </div>

      <ActionMessage status={state.status} message={state.message} />
    </section>
  );
}