import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { ResearchStartPage } from "@/features/research-program";
import { reportTypeSchema } from "@/features/purchase-flow/forms/start-flow.schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;

const PASSTHROUGH_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
  "partner",
] as const;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const parsedReportType = reportTypeSchema.safeParse(first(raw.reportType));
  const session = await getServerSession(authOptions);

  const passthrough: Record<string, string> = {};
  for (const key of PASSTHROUGH_KEYS) {
    const value = first(raw[key])?.trim();
    if (value) passthrough[key] = value.slice(0, 255);
  }

  if (!passthrough.ref) {
    passthrough.ref = "research_program";
  }

  return (
    <ResearchStartPage
      isAuthenticated={Boolean(session?.user?.id)}
      reportType={parsedReportType.success ? parsedReportType.data : null}
      passthrough={passthrough}
    />
  );
}
