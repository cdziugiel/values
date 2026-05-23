// features/auth/components/login-form.tsx

"use client";

import { FormEvent, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  LogIn,
  Mail,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const callbackUrl = searchParams.get("callbackUrl") ?? "/post-login";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmittedEmail(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Podaj adres email.");
      return;
    }

    startTransition(async () => {
      try {
        await signIn("email", {
          email: normalizedEmail,
          callbackUrl,
          redirect: false,
        });

        setSubmittedEmail(normalizedEmail);
      } catch {
        setError("Nie udało się wysłać linku logującego. Spróbuj ponownie.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[#171717]">
          Email
        </Label>

        <div className="relative">
          <Mail
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9099]"
          />

          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="twoj@email.pl"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="h-11 rounded-2xl border-black/10 bg-white pl-9"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          <div className="flex gap-2">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      {submittedEmail ? (
        <div className="rounded-[1.25rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-4 py-3 text-sm leading-6 text-[#0f766e]">
          <div className="flex gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <span>
              Link dostępowy został wysłany na adres{" "}
              <span className="font-semibold">{submittedEmail}</span>.
            </span>
          </div>
        </div>
      ) : null}

      <Button
        type="submit"
        className="h-11 w-full rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
        disabled={isPending}
      >
        <LogIn size={16} />
        {isPending ? "Wysyłanie..." : "Wyślij link dostępowy"}
      </Button>

      <div className="rounded-[1.25rem] border border-black/10 bg-white/60 px-4 py-3 text-xs leading-5 text-[#6b7280]">
        <div className="mb-1 flex items-center gap-2 font-semibold text-[#171717]">
          <ShieldCheck size={14} />
          Logowanie bez hasła
        </div>
        Wyślemy jednorazowy link dostępowy na podany adres email.
      </div>
    </form>
  );
}