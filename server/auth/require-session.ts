import { redirect } from "next/navigation";

import { getCurrentSession } from "./get-session";

export async function requireSession() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session;
}