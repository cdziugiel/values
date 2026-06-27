import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/shared/ui";
import type { NormativeProfileAdminDetailDto } from "../types/normative-admin.types";

function Row({ label, value }: { label: string; value: React.ReactNode }) { return <div className="grid gap-1 border-b py-3 sm:grid-cols-[220px_1fr]"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-sm font-medium">{value ?? "—"}</dd></div>; }

export function NormativeProfileAdminDetail({ profile }: { profile: NormativeProfileAdminDetailDto }) {
  return <div className="space-y-6">
    <PageHeader title="Profil normatywny" description="Globalny profil użytkownika i jego powiązania ze wszystkimi tenantami." actions={<Button asChild variant="outline"><Link href="/dashboard/normative-data">Wróć</Link></Button>} />
    <Card><CardHeader><CardTitle>Użytkownik i profil</CardTitle></CardHeader><CardContent><dl>
      <Row label="Użytkownik" value={`${profile.ownerName ?? "—"} (${profile.ownerEmail})`} />
      <Row label="ID użytkownika" value={<span className="font-mono text-xs">{profile.ownerUserId}</span>} />
      <Row label="ID profilu" value={<span className="font-mono text-xs">{profile.profileId}</span>} />
      <Row label="Rewizja" value={profile.revision} /><Row label="Sesje / tenanty" value={`${profile.sessionCount} / ${profile.tenantCount}`} />
    </dl></CardContent></Card>
    <Card><CardHeader><CardTitle>Dane statystyczne</CardTitle></CardHeader><CardContent><dl>
      <Row label="Data urodzenia" value={profile.dateOfBirth} /><Row label="Płeć" value={profile.sex} /><Row label="Kraj / województwo" value={`${profile.countryCode} / ${profile.voivodeshipCode ?? "—"}`} />
      <Row label="Miejscowość" value={profile.localitySize} /><Row label="Wykształcenie" value={profile.educationLevel} /><Row label="Dziedziny" value={profile.educationFields.join(", ")} />
      <Row label="Status zawodowy" value={profile.employmentStatus} /><Row label="Branża" value={profile.industryCode} /><Row label="Poziom stanowiska" value={profile.jobLevel} /><Row label="Funkcja" value={profile.jobFunction} /><Row label="Wielkość organizacji" value={profile.organizationSize} /><Row label="Sektor" value={profile.employmentSector} />
    </dl></CardContent></Card>
    <Card><CardHeader><CardTitle>Zgoda i nagroda</CardTitle></CardHeader><CardContent><dl>
      <Row label="Zgoda" value={profile.consentWithdrawnAt ? "Wycofana" : "Aktywna"} /><Row label="Wersja zgody" value={profile.consentVersion} /><Row label="Status nagrody" value={profile.rewardStatus} /><Row label="Kod" value={profile.discountCodePreview} />
    </dl></CardContent></Card>
  </div>;
}
