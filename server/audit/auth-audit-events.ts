import { writeSystemAuditLog } from "./write-system-audit-log";

type AuditAuthSignInInput = {
  userId?: string | null;
  email?: string | null;
  provider?: string | null;
  isNewUser?: boolean;
};

type AuditAuthSignOutInput = {
  userId?: string | null;
};

export async function auditAuthSignIn(input: AuditAuthSignInInput) {
  try {
    await writeSystemAuditLog({
      actorUserId: input.userId ?? null,
      actorRole: null,
      action: "login_success",
      entityType: "user",
      entityId: input.userId ?? input.email ?? null,
      after: {
        provider: input.provider ?? null,
        isNewUser: Boolean(input.isNewUser),
      },
    });
  } catch (error) {
    console.error("Failed to write login_success audit log", {
      userId: input.userId ?? null,
      provider: input.provider ?? null,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export async function auditAuthSignOut(input: AuditAuthSignOutInput) {
  try {
    await writeSystemAuditLog({
      actorUserId: input.userId ?? null,
      actorRole: null,
      action: "logout",
      entityType: "user",
      entityId: input.userId ?? null,
    });
  } catch (error) {
    console.error("Failed to write logout audit log", {
      userId: input.userId ?? null,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}