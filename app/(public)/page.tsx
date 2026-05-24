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
      "Lepiej zrozum, jak budujesz relacje, komunikujesz się i jakie preferujesz w środowisko.",
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
    <article className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em] text-[#171717]">
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f7f7f8_48%,#eef1f3_100%)] px-4 pb-6 text-[#171717] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
        <header className="sticky top-3 z-50 pt-3">
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

            <div className="flex items-center gap-2">
<Button
  asChild
  className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
>
  <Link href={primaryHref}>
    {primaryLabel}
    <ArrowRight size={16} />
  </Link>
</Button>
            </div>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="max-w-4xl">
            <BrandPill>
              <Sparkles size={14} />
              HUMANET VALUES
            </BrandPill>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.06em] text-[#171717] sm:text-5xl md:text-6xl lg:text-7xl">
              Poznaj swój sposób działania, współpracy i reagowania na zmianę.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#6b7280] md:text-lg">
              HUMANET VALUES
              pomaga lepiej zrozumieć Twoje wartości, styl pracy, relacje,
              podejście do zmiany oraz doświadczenie organizacji.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
<Button
  asChild
  className="h-12 rounded-full bg-[#171717] px-6 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
>
  <Link href={primaryHref}>
    {heroCtaLabel}
    <ArrowRight size={17} />
  </Link>
</Button>

            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
                <div className="text-2xl font-semibold tracking-[-0.05em]">
                  Indywidualnie
                </div>
                <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                  Odpowiadasz na pytania dotyczące Twojego sposobu działania.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
                <div className="text-2xl font-semibold tracking-[-0.05em]">
                  Refleksyjnie
                </div>
                <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                  Nie ma dobrych ani złych odpowiedzi — ważna jest szczerość.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
                <div className="text-2xl font-semibold tracking-[-0.05em]">
                  Rozwojowo
                </div>
                <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                  Wynik pomaga lepiej zrozumieć siebie i swoje środowisko.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[3rem] bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.22),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(23,23,23,0.08),transparent_42%)] blur-2xl" />

            <div className="relative overflow-hidden rounded-[2.5rem] border border-black/10 bg-white/80 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur">
              <div className="rounded-[2rem] border border-black/10 bg-[#f7f7f8] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
                      Twoje badanie
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">
                      Wartości i zmiana
                    </h2>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
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
                      className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-black/10 bg-white px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f3f4f6]">
                          <ClipboardCheck
                            size={15}
                            className="text-[#0f766e]"
                          />
                        </div>

                        <span className="truncate text-sm font-medium">
                          {title}
                        </span>
                      </div>

                      <span className="shrink-0 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-2.5 py-1 text-xs font-medium text-[#0f766e]">
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

        <section className="mb-8 overflow-hidden rounded-[2rem] border border-black/10 bg-[#171717] p-6 text-white shadow-[0_18px_48px_rgba(15,23,42,0.18)] md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                <FileText size={14} />
                Jak to działa
              </div>

              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] md:text-4xl">
                Wypełniasz kwestionariusz. System porządkuje wynik. Zyskujesz materiał do
                refleksji.
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
                  className="flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/80"
                >
                  <CheckCircle2 size={15} className="shrink-0 text-[#2dd4bf]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}