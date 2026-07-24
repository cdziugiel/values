"use client";

import { useEffect } from "react";

const BASIC_FEEDBACK_HASH =
  "#basic-feedback";

export function BasicFeedbackAnchor() {
  useEffect(() => {
    if (
      window.location.hash !==
      BASIC_FEEDBACK_HASH
    ) {
      return;
    }

    let timeoutId: number | null = null;
    let firstFrameId: number | null = null;
    let secondFrameId: number | null = null;

    const scrollToAnchor = () => {
      const target =
        document.getElementById(
          "basic-feedback",
        );

      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    };

    /**
     * Natywna kotwica działa przy wczytaniu dokumentu.
     * Powtarzamy ją po zakończeniu pierwszego layoutu Reacta,
     * ponieważ klientowy wrapper może zmienić wysokość
     * elementów znajdujących się nad sekcją wyniku.
     */
    firstFrameId =
      window.requestAnimationFrame(() => {
        secondFrameId =
          window.requestAnimationFrame(() => {
            scrollToAnchor();

            /**
             * Ostatnia korekta po zakończeniu hydratacji
             * komponentów shadcn i załadowaniu fontów.
             */
            timeoutId = window.setTimeout(
              scrollToAnchor,
              180,
            );
          });
      });

    return () => {
      if (firstFrameId !== null) {
        window.cancelAnimationFrame(
          firstFrameId,
        );
      }

      if (secondFrameId !== null) {
        window.cancelAnimationFrame(
          secondFrameId,
        );
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return null;
}