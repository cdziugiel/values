// app/login/page.tsx

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { authOptions } from "@/auth";
import { LoginForm } from "@/features/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const loginBenefits = [
  "kontynuować rozpoczęte badanie",
  "zobaczyć ukończone kwestionariusze",
  "uzyskać dostęp do raportu, jeśli został odblokowany",
];

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect("/my/assessment");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f7f7f8_48%,#eef1f3_100%)] px-4 py-6 text-[#171717] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col">
        <header className="sticky top-3 z-50">
          <div className="flex items-center justify-between rounded-full border border-black/10 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="HUMANET"
                width={132}
                height={32}
                priority
                className="h-8 w-auto"
              />
            </Link>

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-[#171717] shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
            >
              <ArrowLeft size={15} />
              Strona główna
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1fr_0.88fr] lg:py-20">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
              <Sparkles size={14} />
              HUMANET VALUES
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.06em] text-[#171717] sm:text-5xl md:text-6xl">
              Wejdź do swojego badania.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#6b7280] md:text-lg">
              Podaj adres email. Wyślemy Ci
              jednorazowy link dostępowy.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <ClipboardCheck size={18} />
                </div>

                <h2 className="mt-4 font-semibold tracking-[-0.02em]">
                  Badania
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                  Wypełniaj przypisane kwestionariusze i wracaj do nich, gdy
                  potrzebujesz przerwy.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <Mail size={18} />
                </div>

                <h2 className="mt-4 font-semibold tracking-[-0.02em]">
                  Bezpieczeństwo
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                  Nie musisz pamiętać hasła. Dostęp potwierdzasz linkiem
                  wysłanym na email.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <ShieldCheck size={18} />
                </div>

                <h2 className="mt-4 font-semibold tracking-[-0.02em]">
                  Prywatność
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                  Dostęp jest przypisany do Twojego adresu email.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[2rem] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
                  <LockKeyhole size={19} />
                </div>

                <div>
                  <h2 className="font-semibold tracking-[-0.02em] text-[#171717]">
                    Po zalogowaniu możesz:
                  </h2>

                  <div className="mt-3 grid gap-2">
                    {loginBenefits.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-sm leading-6 text-[#6b7280]"
                      >
                        <CheckCircle2
                          size={15}
                          className="shrink-0 text-[#0f766e]"
                        />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="relative">
            <div className="absolute -inset-6 rounded-[3rem] bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.22),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(23,23,23,0.08),transparent_42%)] blur-2xl" />

            <div className="relative overflow-hidden rounded-[2.5rem] border border-black/10 bg-white/80 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur">
              <div className="rounded-[2rem] border border-black/10 bg-[#f7f7f8] p-5">
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                    <LockKeyhole size={13} />
                    Bezpieczne logowanie
                  </div>

                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
                    Wyślij link dostępowy
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                    Wpisz email, a następnie sprawdź skrzynkę odbiorczą.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-sm">
                  <Suspense fallback={null}>
                    <LoginForm />
                  </Suspense>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}