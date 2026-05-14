import Link from "next/link";

type PageProps = {
  params: Promise<{
    sessionId: string;
  }>;
  searchParams: Promise<{
    tenant?: string;
  }>;
};

export default async function MyAssessmentCompletedPage({
  params,
  searchParams,
}: PageProps) {
  const { sessionId } = await params;
  const { tenant } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <section className="rounded-2xl border bg-card p-8">
        <div className="text-sm font-medium text-muted-foreground">
          HUMANET VALUES
        </div>

        <h1 className="mt-4 text-3xl font-semibold">
          Badanie zostało zakończone
        </h1>

        <p className="mt-4 text-muted-foreground">
          Dziękujemy. Twoje odpowiedzi zostały zapisane i przeliczone.
        </p>

        <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
          <div>Sesja: {sessionId}</div>
          <div>Tenant: {tenant ?? "—"}</div>
        </div>

        <Link
          href="/my/assessment"
          className="mt-6 inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
        >
          Wróć do moich badań
        </Link>
      </section>
    </main>
  );
}