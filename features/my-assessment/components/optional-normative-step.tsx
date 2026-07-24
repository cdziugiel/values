"use client";

import {
  ChevronDown,
  ChevronUp,
  SkipForward,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type OptionalNormativeStepProps = {
  formSlot: ReactNode;
  revealedContentSlot: ReactNode;
};

export function OptionalNormativeStep({
  formSlot,
  revealedContentSlot,
}: OptionalNormativeStepProps) {
  const [wasSkipped, setWasSkipped] =
    useState(false);

  const reportAreaRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wasSkipped) {
      return;
    }

    const frameId =
      window.requestAnimationFrame(() => {
        reportAreaRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [wasSkipped]);

  if (wasSkipped) {
    return (
      <>
        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#171717]">
                  Dane do analiz normalizacyjnych
                </p>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-[#6b7280] sm:text-sm sm:leading-6">
                  Uzupełnienie tych informacji jest
                  dobrowolne. Możesz pominąć ten krok
                  i przejść bezpośrednio do informacji
                  o pełnym raporcie. Bez uzupełnienia
                  danych podstawowa informacja zwrotna
                  nie będzie dostępna.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setWasSkipped(false);
                }}
                className={[
                  "inline-flex min-h-10 shrink-0 items-center justify-center gap-2",
                  "rounded-full border border-black/10 bg-white px-4",
                  "text-sm font-semibold text-[#171717]",
                  "transition hover:bg-[#f7f7f7]",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-[#2dd4bf]/50",
                ].join(" ")}
              >
                <ChevronDown className="h-4 w-4" />
                Uzupełnij dane
              </button>
            </div>
          </div>
        </section>

        <div
          ref={reportAreaRef}
          className="scroll-mt-28 space-y-6"
        >
          {revealedContentSlot}
        </div>
      </>
    );
  }

  return (
    <section className="space-y-4">
      {formSlot}

      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/45 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#171717]">
              Wolisz przejść dalej bez uzupełniania danych?
            </p>

            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#6b7280] sm:text-sm sm:leading-6">
              Uzupełnienie tych informacji jest
              dobrowolne. Możesz pominąć ten krok
              i przejść bezpośrednio do informacji
              o pełnym raporcie. Bez uzupełnienia danych
              podstawowa informacja zwrotna nie będzie
              dostępna.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setWasSkipped(true);
            }}
            className={[
              "inline-flex min-h-11 shrink-0 items-center justify-center gap-2",
              "rounded-full border border-black/10 bg-white px-5",
              "text-sm font-semibold text-[#171717]",
              "shadow-sm transition hover:-translate-y-0.5",
              "hover:bg-[#f7f7f7]",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-[#2dd4bf]/50",
            ].join(" ")}
          >
            <SkipForward className="h-4 w-4" />
            Pomiń ten krok
          </button>
        </div>
      </div>
    </section>
  );
}