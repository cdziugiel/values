// features/auth/components/login-form.tsx

"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
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
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
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

    if (!privacyAccepted) {
      setError("Aby wysłać link dostępowy, zaakceptuj politykę prywatności.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await signIn("email", {
          email: normalizedEmail,
          callbackUrl,
          redirect: false,
        });

        if (result?.error) {
          setError("Nie udało się wysłać linku dostępowego. Spróbuj ponownie.");
          return;
        }

        setSubmittedEmail(normalizedEmail);
      } catch {
        setError("Nie udało się wysłać linku dostępowego. Spróbuj ponownie.");
      }
    });
  }

  const submitDisabled = isPending || !privacyAccepted;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-[#171717]">
          Adres email
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
            className="h-12 rounded-2xl border-black/10 bg-white pl-9 text-base shadow-sm"
          />
        </div>

        <p className="text-xs leading-5 text-[#6b7280]">
          Użyj adresu email, na który otrzymałaś/otrzymałeś zaproszenie do
          badania.
        </p>
      </div>

      <label
        htmlFor="privacyAccepted"
        className={[
          "flex cursor-pointer gap-3 rounded-[1.25rem] border px-4 py-3 text-sm leading-6 transition",
          privacyAccepted
            ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
            : "border-black/10 bg-white/60 text-[#6b7280] hover:bg-white",
        ].join(" ")}
      >
        <input
          id="privacyAccepted"
          name="privacyAccepted"
          type="checkbox"
          checked={privacyAccepted}
          onChange={(event) => setPrivacyAccepted(event.currentTarget.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-black/20 accent-[#0f766e]"
          required
        />

        <span>
          Wyrażam zgodę na przetwarzanie danych zgodnie z{" "}
          <Link
            href="/polityka-prywatnosci"
            className="font-semibold text-[#171717] underline underline-offset-4 transition hover:text-[#0f766e]"
            target="_blank"
          >
            polityką prywatności
          </Link>
          .
        </span>
      </label>

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
              <span className="font-semibold">{submittedEmail}</span>. Sprawdź
              skrzynkę odbiorczą.
            </span>
          </div>
        </div>
      ) : null}

      <Button
        type="submit"
        className="h-12 w-full rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:bg-[#171717] disabled:hover:shadow-sm"
        disabled={submitDisabled}
        title={
          !privacyAccepted
            ? "Zaakceptuj politykę prywatności, aby wysłać link dostępowy."
            : undefined
        }
      >
        {isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <LogIn size={16} />
        )}

        {isPending ? "Wysyłanie linku..." : "Wyślij link dostępowy"}
      </Button>

      {!privacyAccepted ? (
        <p className="text-center text-xs leading-5 text-[#8b9099]">
          Przycisk będzie aktywny po zaakceptowaniu polityki prywatności.
        </p>
      ) : null}

      <div className="rounded-[1.25rem] border border-black/10 bg-white/60 px-4 py-3 text-xs leading-5 text-[#6b7280]">
        <div className="mb-1 flex items-center gap-2 font-semibold text-[#171717]">
          <ShieldCheck size={14} />
          Logowanie bez hasła
        </div>
        Nie tworzymy tutaj hasła. Jednorazowy link dostępowy pozwoli Ci wejść
        bezpośrednio do właściwego panelu.
      </div>

      <div className="flex flex-wrap items-center justify-end gap-4 text-sm text-[#6b7280]">
        <Link href="/legal/regulamin" className="transition hover:text-[#171717]">
          Regulamin
        </Link>

        <Link
          href="/legal/polityka-prywatnosci"
          className="transition hover:text-[#171717]"
        >
          Polityka prywatności
        </Link>
      </div>
    </form>
  );
}