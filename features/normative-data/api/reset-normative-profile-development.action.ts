"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import {
  normativeProfileSessionLinks,
  normativeProfiles,
} from "@/drizzle/schema/control";
import { assertMyAssessmentSessionAccess } from "@/features/my-assessment/api/assert-my-assessment-session-access";
import { getMyAssessmentTenantDbBySlug } from "@/features/my-assessment/api/my-assessment-tenant-db";
import { writeSystemAuditLog } from "@/server/audit/write-system-audit-log";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";

export async function resetNormativeProfileDevelopmentAction(
  formData: FormData,
) {
  /**
   * Podwójne zabezpieczenie:
   * przycisk nie będzie renderowany na produkcji,
   * ale również sama akcja odrzuci bezpośrednie wywołanie.
   */
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Reset danych normalizacyjnych jest niedostępny na produkcji.",
    );
  }

  const tenantSlug = String(
    formData.get("tenantSlug") ?? "",
  ).trim();

  const assessmentSessionId = String(
    formData.get("assessmentSessionId") ?? "",
  ).trim();

  if (!tenantSlug || !assessmentSessionId) {
    throw new Error(
      "Brakuje danych wymaganych do resetu profilu.",
    );
  }

  const authSession = await requireSession();

  if (
    !authSession.user?.id ||
    !authSession.user.email
  ) {
    throw new Error(
      "Nie udało się potwierdzić użytkownika.",
    );
  }

  const tenantContext =
    await getMyAssessmentTenantDbBySlug(
      tenantSlug,
    );

  if (!tenantContext) {
    throw new Error(
      "Nie udało się odnaleźć środowiska badania.",
    );
  }

  /**
   * Potwierdzamy, że zalogowany użytkownik ma dostęp
   * do wskazanej sesji. Nie opieramy bezpieczeństwa
   * wyłącznie na ownerUserId profilu.
   */
  await assertMyAssessmentSessionAccess({
    db: tenantContext.db,
    userEmail: authSession.user.email,
    assessmentSessionId,
  });

  const [profile] = await controlDb
    .select({
      id: normativeProfiles.id,
    })
    .from(normativeProfiles)
    .where(
      and(
        eq(
          normativeProfiles.ownerUserId,
          authSession.user.id,
        ),
        isNull(normativeProfiles.deletedAt),
      ),
    )
    .limit(1);

  if (!profile) {
    revalidatePath(
      `/my/assessment/sessions/${assessmentSessionId}/completed`,
    );

    return;
  }

  const now = new Date();

  await controlDb.transaction(
    async (transaction) => {
      /**
       * Usuwamy powiązania sesji, aby stary profil
       * nie blokował ponownego utworzenia snapshotu
       * dla nowego profilu testowego.
       */
      await transaction
        .delete(normativeProfileSessionLinks)
        .where(
          eq(
            normativeProfileSessionLinks
              .statisticalProfileId,
            profile.id,
          ),
        );

      /**
       * Profil oznaczamy jako usunięty zamiast fizycznego
       * kasowania. Zachowujemy historyczne zgody,
       * rewardy i możliwość audytu.
       */
      await transaction
        .update(normativeProfiles)
        .set({
          deletedAt: now,
          updatedAt: now,
          updatedBy: authSession.user.id,
        })
        .where(
          eq(normativeProfiles.id, profile.id),
        );
    },
  );



  revalidatePath(
    `/my/assessment/sessions/${assessmentSessionId}/completed`,
  );

  revalidatePath("/my/assessment");
}