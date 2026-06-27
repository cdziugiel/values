import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/shared/ui";
import type { NormativeProfilesAdminFilters, NormativeProfilesAdminPageDto } from "../types/normative-admin.types";

function href(filters: NormativeProfilesAdminFilters, page: number) {
  const p = new URLSearchParams();
  if (filters.query) p.set("query", filters.query);
  if (filters.consentStatus && filters.consentStatus !== "all") p.set("consentStatus", filters.consentStatus);
  if (filters.rewardStatus && filters.rewardStatus !== "all") p.set("rewardStatus", filters.rewardStatus);
  p.set("page", String(page));
  return `/dashboard/normative-data?${p.toString()}`;
}

export function NormativeProfilesAdminPage({ data, filters }: { data: NormativeProfilesAdminPageDto; filters: NormativeProfilesAdminFilters }) {
  return <div className="space-y-6">
    <PageHeader title="Dane normatywne" description="Globalny rejestr profili statystycznych użytkowników ze wszystkich tenantów. Dostęp wyłącznie dla SUPER_ADMIN." />
    <Card>
      <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><CardTitle>Profile użytkowników</CardTitle><p className="mt-1 text-sm text-muted-foreground">Łącznie: {data.total}</p></div>
        <Button asChild variant="outline"><a href="/dashboard/normative-data/export">Eksport CSV</a></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <Input name="query" defaultValue={filters.query ?? ""} placeholder="E-mail, nazwa, ID profilu lub użytkownika" />
          <select name="consentStatus" defaultValue={filters.consentStatus ?? "all"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">Wszystkie zgody</option><option value="active">Zgoda aktywna</option><option value="withdrawn">Zgoda wycofana</option>
          </select>
          <select name="rewardStatus" defaultValue={filters.rewardStatus ?? "all"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">Wszystkie nagrody</option><option value="pending">Oczekuje</option><option value="issued">Wydana</option><option value="redeemed">Wykorzystana</option><option value="expired">Wygasła</option><option value="revoked">Cofnięta</option>
          </select>
          <Button type="submit">Filtruj</Button>
        </form>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/50 text-left"><tr><th className="px-4 py-3">Użytkownik</th><th className="px-4 py-3">Profil</th><th className="px-4 py-3">Demografia</th><th className="px-4 py-3">Sesje</th><th className="px-4 py-3">Zgoda</th><th className="px-4 py-3">Rabat</th><th /></tr></thead>
            <tbody>{data.rows.map(row => <tr key={row.profileId} className="border-t align-top">
              <td className="px-4 py-3"><div className="font-medium">{row.ownerName ?? "—"}</div><div className="text-muted-foreground">{row.ownerEmail}</div></td>
              <td className="px-4 py-3"><div className="font-mono text-xs">{row.profileId}</div><div className="text-xs text-muted-foreground">rew. {row.revision}</div></td>
              <td className="px-4 py-3"><div>{row.ageAtAssessment ?? "—"} lat</div><div className="text-muted-foreground">{row.sex} / {row.voivodeshipCode ?? "—"}</div></td>
              <td className="px-4 py-3">{row.sessionCount} sesji<br/><span className="text-muted-foreground">{row.tenantCount} tenantów</span></td>
              <td className="px-4 py-3">{row.consentWithdrawnAt ? <Badge variant="destructive">Wycofana</Badge> : <Badge>Aktywna</Badge>}</td>
              <td className="px-4 py-3">{row.rewardStatus ? <><Badge variant="outline">{row.rewardStatus}</Badge><div className="mt-1 font-mono text-xs">{row.discountCodePreview ?? "—"}</div></> : "—"}</td>
              <td className="px-4 py-3 text-right"><Button asChild size="sm" variant="outline"><Link href={`/dashboard/normative-data/${row.profileId}`}>Szczegóły</Link></Button></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="flex justify-between"><Button asChild variant="outline" disabled={data.page <= 1}><Link href={href(filters, Math.max(1, data.page - 1))}>Poprzednia</Link></Button><span className="text-sm text-muted-foreground">Strona {data.page} z {data.pageCount}</span><Button asChild variant="outline" disabled={data.page >= data.pageCount}><Link href={href(filters, Math.min(data.pageCount, data.page + 1))}>Następna</Link></Button></div>
      </CardContent>
    </Card>
  </div>;
}
