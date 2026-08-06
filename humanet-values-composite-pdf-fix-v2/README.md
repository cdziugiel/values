# HUMANET VALUES — poprawka PDF raportu composite v2

## Co faktycznie powodowało błąd

Log wskazuje na timeout dokładnie w:

```ts
page.goto(url, {
  waitUntil: "networkidle",
  timeout: 30_000,
});
```

`networkidle` nie jest właściwym sygnałem gotowości dokumentu raportu. Wystarczy jedno długo trwające połączenie lub zasób, aby Playwright czekał do pełnego timeoutu mimo gotowego HTML.

Dodatkowo endpoint PDF wykonywał kosztowną operację dwa razy:

1. `/pdf` pobierał i scalał dane raportu composite.
2. Playwright otwierał `/print`.
3. `/print` ponownie pobierał i scalał te same dane.

Poprawka renderuje raport composite bezpośrednio z już przygotowanego HTML. Nie wykonuje drugiego requestu do aplikacji i nie przechodzi przez publiczną domenę ani Traefik.

## Dlaczego pierwsza paczka przerwała instalację

Błędy:

```txt
.next/dev/types/validator.ts
.next/types/validator.ts
```

pochodziły z przestarzałych plików generowanych przez Next.js. Nadal wskazywały na wcześniej istniejące `page.tsx`. Potwierdza to także trzeci, niezwiązany z poprawką wpis:

```txt
app/(protected)/t/[tenantSlug]/reports/page.js
```

Nowy instalator usuwa `.next` przed `tsc`. Kod aplikacji nie jest przez to usuwany; Next.js generuje katalog ponownie.

## Zmieniane pliki

```txt
features/report-builder/lib/render-report-pdf.ts

app/(protected)/my/reports/composite/grants/[grantId]/pdf/route.ts
```

Nie usuwa ani nie zamienia tras `print/page.tsx`.

## Instalacja

Rozpakuj ZIP w katalogu głównym repozytorium. Następnie uruchom:

```bash
node humanet-values-composite-pdf-fix-v2/fix-composite-report-pdf.mjs --apply --with-tests
```

Pełna walidacja z buildem:

```bash
node humanet-values-composite-pdf-fix-v2/fix-composite-report-pdf.mjs --apply --with-tests --with-build
```

Sprawdzenie:

```bash
node humanet-values-composite-pdf-fix-v2/fix-composite-report-pdf.mjs --check
```

Rollback:

```bash
node humanet-values-composite-pdf-fix-v2/fix-composite-report-pdf.mjs --rollback
```

## Produkcja

Kontener aplikacji działa na porcie `3020`. Dla pozostałych raportów, które nadal korzystają z renderowania przez URL, zalecane jest dodanie do `.env.production`:

```env
REPORT_RENDER_BASE_URL=http://127.0.0.1:3020
```

Po zmianie środowiska trzeba przebudować i uruchomić kontener ponownie.

Raport composite po tej poprawce nie potrzebuje już drugiego wejścia HTTP do `/print`, ale ustawienie pozostaje korzystne dla pozostałych endpointów PDF.

## Co sprawdzić

1. Pobranie pełnego raportu composite.
2. Poprawność wszystkich stron A4.
3. Wykresy SVG.
4. Polskie znaki.
5. Obrazy i logo.
6. Brak pustej strony na końcu.
7. Brak ponownego wpisu `PCR_HIT` podczas jednego eksportu PDF.
8. Czas odpowiedzi endpointu `/pdf`.
