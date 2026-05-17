// server/auth/get-session.ts

import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";

export function getCurrentSession() {
  return getServerSession(authOptions);
}