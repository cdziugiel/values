import { getMyAssessmentTenantDbBySlug } from "@/features/my-assessment/api/my-assessment-tenant-db";
import { requireSession } from "@/server/auth/require-session";

import { ensureNormativeProfileLinkedToSession } from "./normative-profile.mutations";
import { getNormativeProfileStatus } from "./normative-profile.queries";

export async function resolveMyNormativeProfile({
  tenantSlug,
  assessmentSessionId,
}: {
  tenantSlug: string;
  assessmentSessionId: string;
}) {
  const session = await requireSession();
  if (!session.user?.id || !session.user.email) throw new Error("Nie udało się potwierdzić użytkownika.");

  const tenantContext = await getMyAssessmentTenantDbBySlug(tenantSlug);
  if (!tenantContext) throw new Error("Nie udało się odnaleźć aktywnego środowiska badania.");

  await ensureNormativeProfileLinkedToSession({
    db: tenantContext.db,
    tenantId: tenantContext.tenantId,
    userId: session.user.id,
    userEmail: session.user.email,
    assessmentSessionId,
  });

  return getNormativeProfileStatus({
    ownerUserId: session.user.id,
    tenantId: tenantContext.tenantId,
    assessmentSessionId,
  });
}
