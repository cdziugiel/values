"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pl">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            background: "#ffffff",
            color: "#111827",
          }}
        >
          <section
            style={{
              width: "100%",
              maxWidth: "640px",
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              padding: "32px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#6b7280",
              }}
            >
              HUMANET VALUES
            </div>

            <h1
              style={{
                marginTop: "16px",
                fontSize: "28px",
                lineHeight: 1.2,
                fontWeight: 700,
              }}
            >
              Wystąpił błąd aplikacji
            </h1>

            <p
              style={{
                marginTop: "12px",
                fontSize: "15px",
                lineHeight: 1.6,
                color: "#4b5563",
              }}
            >
              Nie udało się poprawnie załadować tej części systemu.
            </p>

            {error?.digest ? (
              <p
                style={{
                  marginTop: "12px",
                  fontSize: "12px",
                  color: "#6b7280",
                }}
              >
                Kod błędu: {error.digest}
              </p>
            ) : null}

            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "24px",
                height: "40px",
                borderRadius: "8px",
                border: "1px solid #111827",
                background: "#111827",
                color: "#ffffff",
                padding: "0 16px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Spróbuj ponownie
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}