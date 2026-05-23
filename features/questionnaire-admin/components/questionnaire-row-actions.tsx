"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Pencil, Save, Settings2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  updateQuestionnaireAction,
  type QuestionnaireAdminActionState,
} from "../api/questionnaire-admin.actions";
import type { QuestionnaireAdminListItem } from "../types/questionnaire-admin.types";

type QuestionnaireRowActionsProps = {
  questionnaire: QuestionnaireAdminListItem;
};

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
};

const questionnaireStatusOptions = [
  { value: "draft", label: "Roboczy" },
  { value: "active", label: "Aktywny" },
  { value: "archived", label: "Archiwalny" },
];

export function QuestionnaireRowActions({
  questionnaire,
}: QuestionnaireRowActionsProps) {
  const [open, setOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    updateQuestionnaireAction,
    initialState,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <Settings2 size={14} />
          Ustawienia
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(calc(100vw-2rem),460px)] rounded-[1.5rem] border-black/10 bg-white/95 p-0 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur"
      >
        <form action={formAction} className="space-y-5 p-5">
          <input
            type="hidden"
            name="questionnaireId"
            value={questionnaire.id}
          />

          <input type="hidden" name="code" value={questionnaire.code} />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                <Pencil size={13} />
                Kwestionariusz
              </div>

              <h3 className="truncate text-lg font-semibold tracking-[-0.03em] text-[#171717]">
                Ustawienia kwestionariusza
              </h3>

              <p className="mt-1 font-mono text-xs text-[#6b7280]">
                {questionnaire.code}
              </p>
            </div>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-full text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#171717]"
              onClick={() => setOpen(false)}
            >
              <XCircle size={16} />
              <span className="sr-only">Zamknij</span>
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor={`questionnaire-name-${questionnaire.id}`}
                className="text-sm font-medium text-[#171717]"
              >
                Nazwa
              </label>

              <Input
                id={`questionnaire-name-${questionnaire.id}`}
                name="name"
                defaultValue={questionnaire.name}
                minLength={2}
                maxLength={180}
                required
                placeholder="Nazwa kwestionariusza"
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`questionnaire-status-${questionnaire.id}`}
                className="text-sm font-medium text-[#171717]"
              >
                Status
              </label>

              <select
                id={`questionnaire-status-${questionnaire.id}`}
                name="status"
                defaultValue={questionnaire.status}
                className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              >
                {questionnaireStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`questionnaire-description-${questionnaire.id}`}
                className="text-sm font-medium text-[#171717]"
              >
                Opis
              </label>

              <textarea
                id={`questionnaire-description-${questionnaire.id}`}
                name="description"
                defaultValue={questionnaire.description ?? ""}
                maxLength={2000}
                className="min-h-28 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                placeholder="Opis kwestionariusza"
              />
            </div>
          </div>

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
                ) : null}

                <span>{state.message}</span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-black/10 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-black/10 bg-white/70 text-[#171717]"
              onClick={() => setOpen(false)}
            >
              Anuluj
            </Button>

            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
            >
              <Save size={14} />
              {isPending ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}