"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, CopyPlus, PlusCircle, Save, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  createQuestionnaireVersionAction,
  type QuestionnaireAdminActionState,
} from "../api/questionnaire-admin.actions";

type CreateQuestionnaireVersionFormProps = {
  questionnaireId: string;
};

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
};

export function CreateQuestionnaireVersionForm({
  questionnaireId,
}: CreateQuestionnaireVersionFormProps) {
  const [open, setOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    createQuestionnaireVersionAction,
    initialState,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <PlusCircle size={14} />
          Dodaj wersję
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(calc(100vw-2rem),460px)] rounded-[1.5rem] border-black/10 bg-white/95 p-0 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur"
      >
        <form action={formAction} className="space-y-5 p-5">
          <input type="hidden" name="questionnaireId" value={questionnaireId} />

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                <CopyPlus size={13} />
                Nowa wersja
              </div>

              <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#171717]">
                Utwórz wersję kwestionariusza
              </h3>

              <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                Wersja robocza pozwala dodawać strony, itemy i scoring przed
                publikacją.
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

          <div className="grid gap-4 md:grid-cols-[140px_1fr]">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#171717]">
                Wersja
              </label>

              <Input
                name="version"
                placeholder="v1"
                required
                className="rounded-2xl border-black/10 bg-white font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#171717]">
                Nazwa wersji
              </label>

              <Input
                name="name"
                placeholder="Nazwa wersji"
                required
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#171717]">Opis</label>

            <textarea
              name="description"
              className="min-h-24 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              placeholder="Opis wersji"
            />
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
              {isPending ? "Tworzenie..." : "Utwórz wersję"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}