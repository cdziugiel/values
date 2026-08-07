# HUMANET VALUES — minimal composite print auth fix

Ta poprawka **nie dotyka wspólnego renderera PDF**.

Zakłada, że lokalnie masz:

```env
REPORT_RENDER_BASE_URL=http://localhost:3020
```

i standardowe raporty drukują się poprawnie.

## Problem

Po recovery composite `/pdf` i `/print` wróciły do starego:

```ts
getPersonalCompositeReport(...)
```

Ta ścieżka wymaga tenant context/member i może przekierować zwykłego respondenta.

Działający ekran composite używa natomiast:

```ts
getMyPersonalCompositeReportByGrantForCurrentUser(...)
```

Poprawka zmienia wyłącznie:

- `app/(protected)/my/reports/composite/grants/[grantId]/pdf/route.ts`
- `app/(protected)/my/reports/composite/grants/[grantId]/print/route.ts`

PDF nadal korzysta z istniejącego `renderReportPdfFromUrl()`.

## Zastosowanie

```bash
node humanet-values-composite-print-auth-fix/fix-composite-print-auth.mjs --apply
```

## Test ręczny przed PDF

Najpierw otwórz w zalogowanej przeglądarce:

```text
http://localhost:3020/my/reports/composite/grants/<GRANT_ID>/print?tenant=humanet
```

Powinien pojawić się sam dokument raportu, a nie ekran logowania.

Dopiero potem kliknij „Pobierz PDF”.

## Rollback

```bash
node humanet-values-composite-print-auth-fix/fix-composite-print-auth.mjs --rollback
```
