# Composite print like standard report

## Przyczyna

Standardowy raport ma `/print` jako:

`app/(print)/my/assessment/.../print/page.tsx`

więc jego HTML przechodzi przez root `app/layout.tsx`, `globals.css` i `next/font`.

Composite ma obecnie `/print` jako:

`app/(protected)/my/reports/composite/.../print/route.ts`

który zwraca surowy `rendered.html` jako `text/html`. Ta odpowiedź omija root layout Next.js.

PDF endpoint i Playwright są już wspólne i nie wymagają zmian.

## Zmiana

Usunięty zostaje:

`app/(protected)/my/reports/composite/grants/[grantId]/print/route.ts`

Tworzony jest:

`app/(print)/my/reports/composite/grants/[grantId]/print/page.tsx`

URL pozostaje identyczny:

`/my/reports/composite/grants/[grantId]/print?tenant=...`

Nowa strona używa tej samej struktury JSX co działający standardowy raport:

```tsx
<main
  className="report-print-root"
  dangerouslySetInnerHTML={{ __html: rendered.html }}
/>
```

Zachowana jest user-safe funkcja:

`getMyPersonalCompositeReportByGrantForCurrentUser()`.

## Instalacja

```bash
node humanet-values-composite-print-like-standard/apply.mjs --apply
```

Nie commituj backupu ani katalogu instalatora przez `git add .`.
Po teście dodaj do Git wyłącznie:

```bash
git add \
'app/(protected)/my/reports/composite/grants/[grantId]/print/route.ts' \
'app/(print)/my/reports/composite/grants/[grantId]/print/page.tsx'
```
