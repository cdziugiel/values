// features/auth/components/logout-card.tsx

"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LogOut,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LogoutCard() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    setError(null);

    startTransition(async () => {
      try {
        await signOut({
          callbackUrl: "/",
        });
      } catch {
        setError("Nie udało się wylogować. Spróbuj ponownie.");
      }
    });
  }

  return (
    <div className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-sm">
      <div className="rounded-[1.25rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-4 py-3 text-sm leading-6 text-[#0f766e]">
        <div className="flex gap-2">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" />

          <span>
            Wylogowanie zakończy bieżącą sesję, ale nie usuwa zapisanych
            odpowiedzi ani raportów.
          </span>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          <div className="flex gap-2">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        <Button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          className="h-12 w-full rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
        >
          {isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LogOut size={16} />
          )}

          {isPending ? "Wylogowywanie..." : "Wyloguj mnie"}
        </Button>

        <Button
          asChild
          variant="outline"
          className="h-12 w-full rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <Link href="/post-login">
            <ArrowLeft size={16} />
            Wróć do panelu
          </Link>
        </Button>
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-black/10 bg-white/60 px-4 py-3 text-xs leading-5 text-[#6b7280]">
        <div className="mb-1 flex items-center gap-2 font-semibold text-[#171717]">
          <CheckCircle2 size={14} />
          Ponowny dostęp
        </div>
        Aby wejść ponownie, przejdź do logowania i wyślij nowy link dostępowy na
        swój adres email.
      </div>
    </div>
  );
}