// features/my-assessment/api/assert-my-assessment-session-access.ts
// features/my-assessment/api/assert-my-assessment-session-access.ts

import { and, eq, isNull, sql } from "drizzle-orm";

import {
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant";

type AssertMyAssessmentSessionAccessInput = {
  db: any;
  userEmail: string;
  assessmentSessionId: string;
};

export async function assertMyAssessmentSessionAccess({
  db,
  userEmail,
  assessmentSessionId,
}: AssertMyAssessmentSessionAccessInput) {
  const normalizedEmail = userEmail.trim().toLowerCase();

  const [row] = await db
    .select({
      assessmentSessionId: assessmentSessions.id,
      respondentId: assessmentSessions.respondentId,
      email: respondentIdentities.email,
      status: assessmentSessions.status,
    })
    .from(assessmentSessions)
    .innerJoin(
      respondents,
      eq(respondents.id, assessmentSessions.respondentId),
    )
    .innerJoin(
      respondentIdentities,
      eq(respondentIdentities.respondentId, respondents.id),
    )
    .where(
      and(
        eq(assessmentSessions.id, assessmentSessionId),
        sql`lower(${respondentIdentities.email}) = ${normalizedEmail}`,
        isNull(assessmentSessions.deletedAt),
        isNull(respondents.deletedAt),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new Error("Brak dostępu do tej sesji badania.");
  }

  return row;
}