// app/page.tsx

export const dynamic = "force-dynamic";
export const revalidate = 0;


import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HeartHandshake,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const paths = [
  {
    icon: <UserRound size={18} />,
    title: "Ty i Twój sposób działania",
    description:
      "Zobacz, co jest dla Ciebie ważne w pracy, decyzjach, relacjach i codziennym funkcjonowaniu.",
  },
  {
    icon: <HeartHandshake size={18} />,
    title: "Współpraca z innymi",
    description:
  "Lepiej zrozum, jak budujesz relacje, komunikujesz się i jakiego środowiska współpracy potrzebujesz.",
  },
  {
    icon: <RefreshCw size={18} />,
    title: "Zmiana i adaptacja",
    description:
      "Sprawdź, co pomaga Ci przechodzić przez zmianę, a co może powodować napięcie lub zatrzymanie.",
  },
  {
    icon: <Users size={18} />,
    title: "Organizacja i środowisko pracy",
    description:
      "Zobacz, jak Twoje doświadczenie wpisuje się w kulturę, zasady i dynamikę organizacji.",
  },
];

const assurances = [
  "Wypełniasz badanie online, w swoim tempie",
  "System prowadzi Cię krok po kroku",
  "Odpowiedzi są zapisywane podczas pracy",
  "Możesz wrócić do kwestionariusza po przerwie",
  "Po zakończeniu możesz otrzymać szczegółowy raport opisowy",
  "Twoje odpowiedzi są częścią uporządkowanego procesu badawczego",
];

function BrandPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
      {children}
    </div>
  );
}

function PathCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)] sm:rounded-[2rem] sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(45,212,191,0.14)] text-[#0f766e] sm:h-11 sm:w-11 sm:rounded-2xl">
        {icon}
      </div>

      <h3 className="mt-4 text-base font-semibold tracking-[-0.025em] text-[#171717] sm:mt-5 sm:text-lg sm:tracking-[-0.03em]">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-[#6b7280]">{description}</p>
    </article>
  );
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  const isLoggedIn = Boolean(session?.user?.id);

  const primaryHref = isLoggedIn ? "/my/assessment" : "/login";
  const primaryLabel = isLoggedIn ? "Twoje badania" : "Zaloguj się";
  const heroCtaLabel = isLoggedIn ? "Przejdź do swoich badań" : "Rozpocznij lub kontynuuj";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f7f7f8_48%,#eef1f3_100%)] px-3 pb-4 text-[#171717] sm:px-6 sm:pb-6 lg:px-8">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
<header className="sticky top-2 z-50 pt-2 sm:top-3 sm:pt-3">
  <div className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-black/10 bg-white/85 px-3 py-2.5 shadow-sm backdrop-blur-xl sm:rounded-full sm:px-4 sm:py-3">
    <Link href="/" className="flex min-w-0 items-center">
      <Image
        src="/logo.svg"
        alt="HUMANET"
        width={132}
        height={32}
        priority
        className="h-7 w-auto max-w-[120px] sm:h-8 sm:max-w-none"
      />
    </Link>

    <Button
      asChild
      size="sm"
      className="h-9 shrink-0 rounded-full bg-[#171717] px-3 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] sm:h-10 sm:px-4"
    >
      <Link href={primaryHref}>
        <span className="sm:hidden">
          {isLoggedIn ? "Badania" : "Logowanie"}
        </span>

        <span className="hidden sm:inline">{primaryLabel}</span>

        <ArrowRight size={15} className="shrink-0" />
      </Link>
    </Button>
  </div>
</header>

<section className="grid flex-1 items-start gap-10 py-10 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:py-20">
  <div className="min-w-0 max-w-4xl">
            <BrandPill>
              <Sparkles size={14} />
              HUMANET VALUES
            </BrandPill>

            <h1 className="mt-5 max-w-4xl text-[2.15rem] font-semibold leading-[1.06] tracking-[-0.045em] text-[#171717] [overflow-wrap:anywhere] sm:mt-6 sm:text-5xl sm:leading-[1.03] md:text-6xl lg:text-7xl lg:tracking-[-0.06em]">
              Poznaj swój sposób działania, współpracy i reagowania na zmianę.
            </h1>

<p className="mt-5 max-w-2xl text-[0.95rem] leading-7 text-[#6b7280] sm:mt-6 sm:text-base sm:leading-8 md:text-lg">
  HUMANET VALUES pomaga lepiej zrozumieć Twoje wartości, styl pracy,
  relacje,
              podejście do zmiany oraz doświadczenie organizacji.
            </p>

<div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
  <Button
    asChild
    className="h-12 w-full rounded-full bg-[#171717] px-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] sm:w-auto sm:px-6"
  >
  <Link href={primaryHref}>
    {heroCtaLabel}
    <ArrowRight size={17} />
  </Link>
</Button>

            </div>

<div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-3">
  <div className="rounded-[1.25rem] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur sm:rounded-[1.5rem]">
    <div className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl sm:tracking-[-0.05em]">
      Indywidualnie
    </div>
    <p className="mt-1.5 text-sm leading-5 text-[#6b7280] sm:text-xs">
      Odpowiadasz na pytania dotyczące Twojego sposobu działania.
    </p>
  </div>

  <div className="rounded-[1.25rem] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur sm:rounded-[1.5rem]">
    <div className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl sm:tracking-[-0.05em]">
      Refleksyjnie
    </div>
    <p className="mt-1.5 text-sm leading-5 text-[#6b7280] sm:text-xs">
      Nie ma dobrych ani złych odpowiedzi — ważna jest szczerość.
    </p>
  </div>

  <div className="rounded-[1.25rem] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur sm:rounded-[1.5rem]">
    <div className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl sm:tracking-[-0.05em]">
      Rozwojowo
    </div>
    <p className="mt-1.5 text-sm leading-5 text-[#6b7280] sm:text-xs">
      Wynik pomaga lepiej zrozumieć siebie i swoje środowisko.
    </p>
  </div>
</div>
          </div>

<div className="relative min-w-0">
  <div className="absolute -inset-3 rounded-[2rem] bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.22),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(23,23,23,0.08),transparent_42%)] blur-2xl sm:-inset-6 sm:rounded-[3rem]" />

  <div className="relative min-w-0 overflow-hidden rounded-[1.75rem] border border-black/10 bg-white/80 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:rounded-[2.5rem] sm:p-5">
    <div className="min-w-0 rounded-[1.4rem] border border-black/10 bg-[#f7f7f8] p-3 sm:rounded-[2rem] sm:p-4">
<div className="flex items-start justify-between gap-3">
  <div className="min-w-0">
    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#6b7280] sm:text-xs sm:tracking-[0.2em]">
      Twoje badanie
    </p>

    <h2 className="mt-1 break-words text-lg font-semibold tracking-[-0.035em] sm:text-xl sm:tracking-[-0.04em]">
      Wartości i zmiana
    </h2>
  </div>

  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(45,212,191,0.14)] text-[#0f766e] sm:h-11 sm:w-11 sm:rounded-2xl">
    <ShieldCheck size={20} />
  </div>
</div>

                <div className="mt-5 rounded-[1.5rem] border border-black/10 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="font-medium">Przykładowy postęp</span>
                    <span className="font-semibold text-[#0f766e]">72%</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
                    <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#171717] to-[#2dd4bf]" />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {[
                    ["Kwestionariusz indywidualny", "W trakcie"],
                    ["Współpraca i relacje", "Do uzupełnienia"],
                    ["Zmiana i adaptacja", "Do uzupełnienia"],
                    ["Organizacja i środowisko pracy", "Gotowe"],
                  ].map(([title, status]) => (
<div
  key={title}
  className="flex min-w-0 flex-col items-start gap-2 rounded-[1rem] border border-black/10 bg-white px-3 py-3 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between min-[390px]:gap-3 sm:rounded-[1.25rem] sm:px-4"
>
  <div className="flex min-w-0 w-full items-center gap-3 min-[390px]:w-auto">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f3f4f6]">
      <ClipboardCheck size={15} className="text-[#0f766e]" />
    </div>

    <span className="min-w-0 break-words text-sm font-medium min-[390px]:truncate">
      {title}
    </span>
  </div>

  <span className="ml-11 shrink-0 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-2.5 py-1 text-[0.7rem] font-medium text-[#0f766e] min-[390px]:ml-0 sm:text-xs">
    {status}
  </span>
</div>
                  ))}
                </div>

                <div className="mt-4 rounded-[1.5rem] border border-black/10 bg-white p-4">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                      <BrainCircuit size={17} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-[#171717]">
                        Po zakończeniu
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                        Raport, który pomaga
                        uporządkować refleksję nad sobą, współpracą i zmianą.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-10 md:grid-cols-2 xl:grid-cols-4">
          {paths.map((path) => (
            <PathCard
              key={path.title}
              icon={path.icon}
              title={path.title}
              description={path.description}
            />
          ))}
        </section>

        <section className="mb-5 overflow-hidden rounded-[1.5rem] border border-black/10 bg-[#171717] p-5 text-white shadow-[0_18px_48px_rgba(15,23,42,0.18)] sm:mb-8 sm:rounded-[2rem] sm:p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                <FileText size={14} />
                Jak to działa
              </div>

<h2 className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.04em] sm:text-3xl md:text-4xl md:tracking-[-0.05em]">
  Wypełniasz kwestionariusz. System porządkuje wynik. Zyskujesz
  materiał do refleksji.
</h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-white/65">
                Kwestionariusze HUMANET nie oceniają Cię w prostych kategoriach.
                Pomagają uchwycić wzorce działania, napięcia, preferencje i
                warunki, które mogą wspierać Twój rozwój.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {assurances.map((item) => (
<div
  key={item}
  className="flex items-start gap-3 rounded-[1rem] border border-white/10 bg-white/[0.06] px-3.5 py-3 text-sm leading-5 text-white/80 sm:items-center sm:rounded-[1.25rem] sm:px-4"
>
  <CheckCircle2
    size={15}
    className="mt-0.5 shrink-0 text-[#2dd4bf] sm:mt-0"
  />
  <span>{item}</span>
</div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}