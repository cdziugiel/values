"use client";

import type { ReactNode } from "react";

import {
  FileText,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ReportDocumentPreviewFrameProps = {
  html: string;

  sidebar?: ReactNode;
  sidebarOpen?: boolean;

  onSidebarOpenChange?: (
    open: boolean,
  ) => void;
};

type ReportFrameMessage =
  | {
      type: "HUMANET_REPORT_READY";
    }
  | {
      type: "HUMANET_REPORT_SCROLL";
      x: number;
      y: number;
    }
  | {
      type: "HUMANET_REPORT_SCROLL_RESTORED";
      x: number;
      y: number;
    };

function injectReportBridge(
  sourceHtml: string,
) {
  const bridgeScript = `
<script>
(function () {
  var restoreCompleted = false;

  function sendMessage(payload) {
    window.parent.postMessage(payload, "*");
  }

  function sendScrollPosition() {
    if (!restoreCompleted) {
      return;
    }

    sendMessage({
      type: "HUMANET_REPORT_SCROLL",
      x: window.scrollX || 0,
      y: window.scrollY || 0
    });
  }

  function announceReady() {
    sendMessage({
      type: "HUMANET_REPORT_READY"
    });
  }

  window.addEventListener(
    "scroll",
    sendScrollPosition,
    { passive: true }
  );

  window.addEventListener(
    "message",
    function (event) {
      var data = event.data;

      if (
        !data ||
        data.type !==
          "HUMANET_REPORT_RESTORE_SCROLL"
      ) {
        return;
      }

      var targetX =
        typeof data.x === "number"
          ? data.x
          : 0;

      var targetY =
        typeof data.y === "number"
          ? data.y
          : 0;

      function restoreScroll() {
        window.scrollTo({
          left: targetX,
          top: targetY,
          behavior: "instant"
        });
      }

      /**
       * Raport może jeszcze zmieniać układ po:
       * - załadowaniu fontów,
       * - wykonaniu global JS,
       * - renderowaniu wykresów.
       *
       * Dlatego przywracamy scroll kilka razy,
       * zanim zaczniemy raportować aktualną pozycję.
       */
      restoreScroll();

      window.requestAnimationFrame(function () {
        restoreScroll();

        window.setTimeout(function () {
          restoreScroll();

          window.setTimeout(function () {
            restoreScroll();

            restoreCompleted = true;

            sendMessage({
              type:
                "HUMANET_REPORT_SCROLL_RESTORED",
              x: window.scrollX || 0,
              y: window.scrollY || 0
            });
          }, 120);
        }, 40);
      });
    }
  );

  window.addEventListener(
    "load",
    function () {
      announceReady();

      window.setTimeout(
        announceReady,
        50
      );

      window.setTimeout(
        announceReady,
        250
      );
    }
  );

  /**
   * srcDoc może być już załadowany zanim listener
   * load zostanie wykonany.
   */
  if (
    document.readyState === "interactive" ||
    document.readyState === "complete"
  ) {
    announceReady();
  }
})();
</script>
`;

  if (sourceHtml.includes("</body>")) {
    return sourceHtml.replace(
      "</body>",
      `${bridgeScript}</body>`,
    );
  }

  return `${sourceHtml}${bridgeScript}`;
}

export function ReportDocumentPreviewFrame({
  html,
  sidebar,
  sidebarOpen = false,
  onSidebarOpenChange,
}: ReportDocumentPreviewFrameProps) {
  const [isFullscreen, setIsFullscreen] =
    useState(false);

  const fullscreenRef =
    useRef<HTMLElement | null>(null);

  const iframeRef =
    useRef<HTMLIFrameElement | null>(null);

  /**
   * Ostatnia prawidłowa pozycja raportu.
   *
   * Nie jest resetowana po zmianie html.
   */
  const reportScrollPositionRef = useRef({
    x: 0,
    y: 0,
  });

  /**
   * Podczas przeładowania iframe ignorujemy zwykłe
   * komunikaty scrolla. Dzięki temu nowy dokument
   * nie nadpisze pozycji wartością 0.
   */
  const isRestoringScrollRef =
    useRef(false);

  const htmlWithBridge = useMemo(
    () => injectReportBridge(html),
    [html],
  );

  /**
   * Każda zmiana HTML oznacza przeładowanie iframe.
   * Od tej chwili czekamy na handshake READY.
   */
  useEffect(() => {
    isRestoringScrollRef.current = true;
  }, [htmlWithBridge]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(
        document.fullscreenElement ===
          fullscreenRef.current,
      );
    }

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange,
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  useEffect(() => {
    function restoreReportScroll() {
      const iframeWindow =
        iframeRef.current?.contentWindow;

      if (!iframeWindow) {
        return;
      }

      const position =
        reportScrollPositionRef.current;

      iframeWindow.postMessage(
        {
          type:
            "HUMANET_REPORT_RESTORE_SCROLL",
          x: position.x,
          y: position.y,
        },
        "*",
      );
    }

    function handleMessage(
      event: MessageEvent<ReportFrameMessage>,
    ) {
      if (
        event.source !==
        iframeRef.current?.contentWindow
      ) {
        return;
      }

      const data = event.data;

      if (!data) {
        return;
      }

      if (
        data.type ===
        "HUMANET_REPORT_READY"
      ) {
        isRestoringScrollRef.current = true;

        restoreReportScroll();

        return;
      }

      if (
        data.type ===
        "HUMANET_REPORT_SCROLL_RESTORED"
      ) {
        reportScrollPositionRef.current = {
          x:
            typeof data.x === "number"
              ? data.x
              : reportScrollPositionRef
                  .current.x,

          y:
            typeof data.y === "number"
              ? data.y
              : reportScrollPositionRef
                  .current.y,
        };

        isRestoringScrollRef.current = false;

        return;
      }

      if (
        data.type ===
        "HUMANET_REPORT_SCROLL"
      ) {
        /**
         * Nowy iframe zaczyna od 0,0.
         * Nie pozwalamy mu nadpisać zapamiętanej
         * pozycji podczas przywracania.
         */
        if (
          isRestoringScrollRef.current
        ) {
          return;
        }

        reportScrollPositionRef.current = {
          x:
            typeof data.x === "number"
              ? data.x
              : 0,

          y:
            typeof data.y === "number"
              ? data.y
              : 0,
        };
      }
    }

    window.addEventListener(
      "message",
      handleMessage,
    );

    return () => {
      window.removeEventListener(
        "message",
        handleMessage,
      );
    };
  }, []);

  async function enterFullscreen() {
    const element = fullscreenRef.current;

    if (!element) {
      return;
    }

    try {
      await element.requestFullscreen();
    } catch (error) {
      console.error(
        "Nie udało się otworzyć pełnego ekranu:",
        error,
      );
    }
  }

  async function exitFullscreen() {
    if (!document.fullscreenElement) {
      return;
    }

    try {
      await document.exitFullscreen();
    } catch (error) {
      console.error(
        "Nie udało się zamknąć pełnego ekranu:",
        error,
      );
    }
  }

  async function toggleFullscreen() {
    if (isFullscreen) {
      await exitFullscreen();
      return;
    }

    await enterFullscreen();
  }

  return (
    <section
      ref={fullscreenRef}
      className={[
        "flex min-h-0 flex-col overflow-hidden",
        "border border-black/10 bg-white/80",
        "shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur",

        isFullscreen
          ? [
              "fixed inset-0 z-[9999]",
              "h-screen w-screen",
              "rounded-none border-0",
              "bg-[#f3f4f6]",
            ].join(" ")
          : [
              "h-[85vh]",
              "min-h-[640px]",
              "max-h-screen",
              "rounded-[2rem]",
            ].join(" "),
      ].join(" ")}
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-black/10 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <FileText size={18} />
          </div>

          <div>
            <div className="text-sm font-semibold text-[#171717]">
              Podgląd dokumentu raportu
            </div>

            <div className="mt-0.5 text-xs text-[#6b7280]">
              {isFullscreen
                ? "Widok pełnoekranowy"
                : "Renderowany HTML z aktualnej konfiguracji"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSidebarOpenChange ? (
            <button
              type="button"
              onClick={() =>
                onSidebarOpenChange(
                  !sidebarOpen,
                )
              }
              className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 text-xs font-medium text-[#6b7280] transition hover:bg-white hover:text-[#171717]"
            >
              {sidebarOpen ? (
                <PanelLeftClose size={14} />
              ) : (
                <PanelLeftOpen size={14} />
              )}

              {sidebarOpen
                ? "Ukryj dane"
                : "Edytuj dane"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 text-xs font-medium text-[#6b7280] transition hover:bg-white hover:text-[#171717]"
          >
            {isFullscreen ? (
              <Minimize2 size={13} />
            ) : (
              <Maximize2 size={13} />
            )}

            {isFullscreen
              ? "Zminimalizuj"
              : "Preview"}
          </button>

          {isFullscreen ? (
            <button
              type="button"
              onClick={exitFullscreen}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/80 text-[#6b7280] transition hover:bg-white hover:text-[#171717]"
              title="Zamknij pełny ekran"
            >
              <X size={15} />

              <span className="sr-only">
                Zamknij pełny ekran
              </span>
            </button>
          ) : null}
        </div>
      </div>

<div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
  {/* Raport zawsze zajmuje całą szerokość */}
  <div className="absolute inset-0 min-h-0 min-w-0 overflow-hidden bg-[#f3f4f6] p-3 sm:p-5">
    <div className="h-full min-h-0 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-inner">
      <iframe
        ref={iframeRef}
        title="Podgląd raportu"
        srcDoc={htmlWithBridge}
        sandbox="allow-scripts"
        className="h-full w-full bg-[#f3f4f6]"
      />
    </div>
  </div>

  {/* Panel nakłada się na raport zamiast go zwężać */}
  {sidebarOpen && sidebar ? (
    <>
      <button
        type="button"
        aria-label="Zamknij panel danych"
        onClick={() =>
          onSidebarOpenChange?.(false)
        }
        className="absolute inset-0 z-20 hidden bg-black/5 lg:block"
      />

      <div
        className={[
          "absolute inset-y-0 left-0 z-30",
          "h-full min-h-0",
          "w-[390px] max-w-[92vw]",
          "overflow-y-auto overscroll-contain",
          "border-r border-black/10 bg-white",
          "shadow-[18px_0_40px_rgba(15,23,42,0.16)]",
        ].join(" ")}
      >
        {sidebar}
      </div>
    </>
  ) : null}
</div>
    </section>
  );
}