import { redirect } from "next/navigation";

import { resolvePostLoginRedirect } from "@/features/auth";
import { requireSession } from "@/server/auth/require-session";

export default async function PostLoginPage() {
  const session = await requireSession();

  const result = await resolvePostLoginRedirect({
    userId: session.user.id,
  });

  redirect(result.href);
}