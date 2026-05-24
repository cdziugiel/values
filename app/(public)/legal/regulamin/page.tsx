// app/regulamin/page.tsx

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";

import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    FileText,
    LockKeyhole,
    Mail,
    Scale,
    ShieldCheck,
    Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";


export const metadata = {
    title: "Regulamin | HUMANET VALUES",
    description: "Regulamin świadczenia usług drogą elektroniczną HUMANET VALUES.",
};

type TermsSection = {
    id: string;
    number: string;
    title: string;
    content: string;
};

function getTermsText() {
    const filePath = path.join(process.cwd(), "content/legal/regulamin.md");

    return readFileSync(filePath, "utf8");
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getDocumentTitle(text: string) {
    const normalized = text.replace(/\r\n/g, "\n").trim();
    const firstHeading = normalized.match(/^#\s+(.+)$/m);

    return firstHeading?.[1]?.trim() ?? "Regulamin";
}

function parseTermsSections(text: string): TermsSection[] {
    const normalized = text.replace(/\r\n/g, "\n").trim();

    const matches = Array.from(
        normalized.matchAll(/^##\s+(\d+)\.\s+(.+?)\s*$/gm),
    );

    return matches.map((match, index) => {
        const number = match[1] ?? String(index + 1);
        const title = (match[2] ?? "Sekcja").trim();
        const start = (match.index ?? 0) + match[0].length;
        const end = matches[index + 1]?.index ?? normalized.length;
        const content = normalized.slice(start, end).trim();

        return {
            id: `${number}-${slugify(title)}`,
            number,
            title,
            content,
        };
    });
}

function splitMarkdownBlocks(content: string) {
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const blocks: string[] = [];
    let current: string[] = [];

    function flush() {
        const block = current.join("\n").trim();

        if (block) {
            blocks.push(block);
        }

        current = [];
    }

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
            flush();
            continue;
        }

        const startsNewStandaloneBlock =
            trimmed.startsWith("### ") ||
            trimmed.startsWith("#### ");

        if (startsNewStandaloneBlock) {
            flush();
            current.push(trimmed);
            flush();
            continue;
        }

        current.push(line);
    }

    flush();

    return blocks;
}

function parseListLine(line: string) {
    const trimmed = line.trim();

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);

    if (numberedMatch) {
        return {
            type: "numbered" as const,
            number: numberedMatch[1] ?? "",
            content: numberedMatch[2]?.trim() ?? "",
        };
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);

    if (bulletMatch) {
        return {
            type: "bullet" as const,
            number: null,
            content: bulletMatch[1]?.trim() ?? "",
        };
    }

    return {
        type: "plain" as const,
        number: null,
        content: trimmed,
    };
}

function stripListMarker(line: string) {
    return parseListLine(line).content;
}

function isBulletListBlock(block: string) {
    const lines = block.split("\n").filter((line) => line.trim());

    return lines.length > 0 && lines.every((line) => /^\s*[-*]\s+/.test(line));
}

function isNumberedListBlock(block: string) {
    const lines = block.split("\n").filter((line) => line.trim());

    return lines.length > 0 && lines.every((line) => /^\s*\d+\.\s+/.test(line));
}

function isDefinitionListBlock(block: string) {
    const lines = block.split("\n").filter((line) => line.trim());

    return (
        lines.length > 0 &&
        lines.every((line) =>
            /^\s*[-*]\s+\*\*[^*]+:\*\*\s+/.test(line.trim()),
        )
    );
}

function parseDefinitionLine(line: string) {
    const normalized = stripListMarker(line);
    const match = normalized.match(/^\*\*(.+?):\*\*\s*(.+)$/);

    if (!match) {
        return null;
    }

    return {
        label: match[1]?.trim() ?? "",
        value: match[2]?.trim() ?? "",
    };
}

function renderInlineMarkdown(value: string) {
    const parts = value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

    return parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return (
                <strong key={`${part}-${index}`} className="font-semibold text-[#171717]">
                    {part.slice(2, -2)}
                </strong>
            );
        }

        const urlMatch = part.match(/(https?:\/\/[^\s]+)/);

        if (urlMatch?.[1]) {
            const url = urlMatch[1];
            const [before, after] = part.split(url);

            return (
                <span key={`${part}-${index}`}>
                    {before}
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#0f766e] underline underline-offset-4"
                    >
                        {url}
                    </a>
                    {after}
                </span>
            );
        }

        return <span key={`${part}-${index}`}>{part}</span>;
    });
}

function DefinitionList({ block }: { block: string }) {
    const definitions = block
        .split("\n")
        .map(parseDefinitionLine)
        .filter((item): item is { label: string; value: string } => Boolean(item));

    return (
        <div className="grid gap-3">
            {definitions.map((definition) => (
                <div
                    key={definition.label}
                    className="rounded-[1.25rem] border border-black/10 bg-white/70 p-4 text-sm leading-7 text-[#5f6670] shadow-sm"
                >
                    <div className="mb-1 font-semibold text-[#171717]">
                        {definition.label}
                    </div>

                    <div>{renderInlineMarkdown(definition.value)}</div>
                </div>
            ))}
        </div>
    );
}

function BulletList({ block }: { block: string }) {
    const items = block
        .split("\n")
        .map((line) => parseListLine(line))
        .filter((item) => item.type === "bullet" && item.content);

    return (
        <ul className="space-y-2 ml-4">
            {items.map((item, index) => (
                <li
                    key={`${item.content}-${index}`}
                    className="flex gap-3 rounded-[1.1rem] border border-black/10 bg-white/55 px-4 py-3 text-sm leading-6 text-[#5f6670]"
                >
                    <CheckCircle2
                        size={15}
                        className="mt-0.5 shrink-0 text-[#0f766e]"
                    />

                    <span>{renderInlineMarkdown(item.content)}</span>
                </li>
            ))}
        </ul>
    );
}
function NumberedList({ block }: { block: string }) {
    const items = block
        .split("\n")
        .map((line) => parseListLine(line))
        .filter((item) => item.type === "numbered" && item.content);

    return (
        <ol className="space-y-2">
            {items.map((item, index) => (
                <li
                    key={`${item.number}-${item.content}-${index}`}
                    className="grid grid-cols-[2rem_1fr] gap-3 rounded-[1.1rem] border border-black/10 bg-white/55 px-4 py-3 text-sm leading-6 text-[#5f6670]"
                >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(45,212,191,0.14)] text-xs font-semibold text-[#0f766e]">
                        {item.number}
                    </span>

                    <span className="pt-1">{renderInlineMarkdown(item.content)}</span>
                </li>
            ))}
        </ol>
    );
}

function TermsBlock({ block }: { block: string }) {
    const trimmed = block.trim();

    if (trimmed.startsWith("### ")) {
        return (
            <h3 className="pt-2 text-lg font-semibold tracking-[-0.03em] text-[#171717]">
                {trimmed.replace(/^###\s+/, "")}
            </h3>
        );
    }

    if (trimmed.startsWith("#### ")) {
        return (
            <h4 className="pt-1 text-base font-semibold tracking-[-0.02em] text-[#171717]">
                {trimmed.replace(/^####\s+/, "")}
            </h4>
        );
    }

    if (isDefinitionListBlock(trimmed)) {
        return <DefinitionList block={trimmed} />;
    }

    if (isNumberedListBlock(trimmed)) {
        return <NumberedList block={trimmed} />;
    }

    if (isBulletListBlock(trimmed)) {
        return <BulletList block={trimmed} />;
    }

    return (
        <p className="whitespace-pre-wrap text-sm leading-7 text-[#5f6670]">
            {renderInlineMarkdown(trimmed)}
        </p>
    );
}

function BrandPill({ children }: { children: ReactNode }) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
            {children}
        </div>
    );
}

function InfoCard({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description: string;
}) {
    return (
        <article className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                {icon}
            </div>

            <h2 className="mt-4 font-semibold tracking-[-0.02em] text-[#171717]">
                {title}
            </h2>

            <p className="mt-1 text-xs leading-5 text-[#6b7280]">{description}</p>
        </article>
    );
}

export default async function TermsPage() {
  const session = await getServerSession(authOptions);

  const isLoggedIn = Boolean(session?.user?.id);
  const primaryHref = isLoggedIn ? "/my/assessment" : "/login";
  const primaryLabel = isLoggedIn ? "Twoje badania" : "Zaloguj się";

  const termsText = getTermsText();
  const documentTitle = getDocumentTitle(termsText);
  const sections = parseTermsSections(termsText);

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f7f7f8_48%,#eef1f3_100%)] px-4 pb-8 text-[#171717] sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">
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
  variant="outline"
  className="hidden rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white sm:inline-flex"
>
  <Link href={primaryHref}>{primaryLabel}</Link>
</Button>

                            <Button
                                asChild
                                className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                            >
                                <Link href="/">
                                    <ArrowLeft size={16} />
                                    Strona główna
                                </Link>
                            </Button>
                        </div>
                    </div>
                </header>

                <section className="grid gap-10 py-14 lg:grid-cols-[1fr_0.72fr] lg:items-center lg:py-20">
                    <div className="max-w-4xl">
                        <BrandPill>
                            <Scale size={14} />
                            Dokument prawny
                        </BrandPill>

                        <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.06em] text-[#171717] sm:text-5xl md:text-6xl">
                            {documentTitle}.
                        </h1>

                        <p className="mt-6 max-w-2xl text-base leading-8 text-[#6b7280] md:text-lg">
                            Poniżej znajduje się regulamin korzystania z serwisu i aplikacji.
                            Dokument określa zasady korzystania z usług, zamówień, płatności,
                            reklamacji, odpowiedzialności oraz ochrony danych osobowych.
                        </p>

                        <div className="mt-8 grid gap-3 sm:grid-cols-3">
                            <InfoCard
                                icon={<FileText size={18} />}
                                title="Zakres usług"
                                description="Badania, raporty, konsultacje, materiały cyfrowe i usługi realizowane w aplikacji."
                            />

                            <InfoCard
                                icon={<LockKeyhole size={18} />}
                                title="Dostęp i bezpieczeństwo"
                                description="Zasady korzystania z aplikacji, wymogi techniczne i obowiązki użytkownika."
                            />

                            <InfoCard
                                icon={<Mail size={18} />}
                                title="Reklamacje"
                                description="Tryb zgłaszania reklamacji oraz zasady rozpatrywania zgłoszeń."
                            />
                        </div>
                    </div>

                    <aside className="relative">
                        <div className="absolute -inset-6 rounded-[3rem] bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.22),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(23,23,23,0.08),transparent_42%)] blur-2xl" />

                        <div className="relative overflow-hidden rounded-[2.5rem] border border-black/10 bg-white/80 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur">
                            <div className="rounded-[2rem] border border-black/10 bg-[#f7f7f8] p-5">
                                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                                    <ShieldCheck size={13} />
                                    Ważne informacje
                                </div>

                                <div className="mt-5 space-y-3">
                                    {[
                                        "Przed rozpoczęciem korzystania z usług zapoznaj się z regulaminem.",
                                        "Korzystanie z aplikacji oznacza akceptację zasad opisanych w dokumencie.",
                                        "W sprawach ochrony danych zastosowanie ma polityka prywatności Humanet.",
                                        "W sprawach reklamacji dokument wskazuje wymagany zakres informacji.",
                                    ].map((item) => (
                                        <div
                                            key={item}
                                            className="flex items-start gap-3 rounded-[1.25rem] border border-black/10 bg-white px-4 py-3 text-sm leading-6 text-[#6b7280]"
                                        >
                                            <CheckCircle2
                                                size={16}
                                                className="mt-0.5 shrink-0 text-[#0f766e]"
                                            />
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>
                </section>

                <section className="grid gap-8 lg:grid-cols-[300px_1fr] lg:items-start">
                    <aside className="lg:sticky lg:top-28">
                        <nav className="rounded-[2rem] border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur">
                            <div className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
                                <Sparkles size={14} />
                                Spis treści
                            </div>

                            <div className="grid gap-1">
                                {sections.map((section) => (
                                    <a
                                        key={section.id}
                                        href={`#${section.id}`}
                                        className="rounded-[1rem] px-3 py-2 text-sm leading-5 text-[#6b7280] transition hover:bg-white hover:text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                                    >
                                        <span className="font-semibold text-[#171717]">
                                            {section.number}.
                                        </span>{" "}
                                        {section.title}
                                    </a>
                                ))}
                            </div>
                        </nav>
                    </aside>

                    <div className="space-y-5">
                        {sections.map((section) => (
                            <section
                                key={section.id}
                                id={section.id}
                                className="scroll-mt-28 rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur md:p-7"
                            >
                                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="mb-2 inline-flex rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-semibold text-[#0f766e]">
                                            Punkt {section.number}
                                        </div>

                                        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
                                            {section.title}
                                        </h2>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {splitMarkdownBlocks(section.content).map((block, index) => (
                                        <TermsBlock
                                            key={`${section.id}-${index}`}
                                            block={block}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </section>

                <section className="mt-8 overflow-hidden rounded-[2rem] border border-black/10 bg-[#171717] p-6 text-white shadow-[0_18px_48px_rgba(15,23,42,0.18)] md:p-8">
                    <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                                <FileText size={14} />
                                HUMANET VALUES
                            </div>

                            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] md:text-4xl">
                                Wróć do badania lub przejdź do logowania.
                            </h2>

                            <p className="mt-4 max-w-xl text-sm leading-7 text-white/65">
                                Jeśli regulamin jest dla Ciebie jasny, możesz wrócić do strony
                                głównej albo zalogować się, aby kontynuować swoje badanie.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
<Button
  asChild
  className="rounded-full bg-white text-[#171717] hover:bg-white/90"
>
  <Link href={primaryHref}>
    {primaryLabel}
    <ArrowRight size={16} />
  </Link>
</Button>

                            <Button
                                asChild
                                variant="outline"
                                className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15"
                            >
                                <Link href="/">Strona główna</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}