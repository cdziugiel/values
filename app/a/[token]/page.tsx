import { and, eq, isNull } from "drizzle-orm";

import {
  assessmentAccessLinks,
  assessmentProjects,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import { getTenantDb } from "@/server/db/tenant-db";
import { hashAssessmentAccessToken } from "@/server/security/assessment-token";

type AssessmentAccessPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function AssessmentAccessPage({
  params,
}: AssessmentAccessPageProps) {
  const { token } = await params;
  const tokenHash = hashAssessmentAccessToken(token);

  const connections = await controlDb.query.tenantDatabaseConnections.findMany({
    where: isNull(controlDb.query.tenantDatabaseConnections as never),
  } as never);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold">Link do badania</h1>
      <p className="mt-4 text-muted-foreground">
        Publiczny resolver linków wymaga jeszcze funkcji wyszukiwania tokena po
        bazach tenantów. Dodamy ją w następnym kroku jako bezpieczny serwis
        systemowy.
      </p>
      <pre className="mt-6 overflow-auto rounded-xl border bg-muted p-4 text-xs">
        {JSON.stringify({ tokenHashPreview: tokenHash.slice(0, 12) }, null, 2)}
      </pre>
    </main>
  );
}