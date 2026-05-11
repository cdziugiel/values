# 06 — Standard feature-oriented development

## Cel

Każdy feature ma być względnie samodzielnym modułem domenowym. Feature zawiera własne UI, typy, walidacje, zapytania, mutacje i helpery.

## Struktura feature’a

```txt
features/<feature-name>/
  api/
    <feature>.queries.ts
    <feature>.mutations.ts
  components/
  forms/
  lib/
  types/
  hooks/
  index.ts
```

Przykład:

```txt
features/assessment-projects/
  api/
    assessment-project.queries.ts
    assessment-project.mutations.ts
  components/
    AssessmentProjectList.tsx
    AssessmentProjectCard.tsx
    AssessmentProjectDetails.tsx
    AssessmentProjectStatusBadge.tsx
  forms/
    assessment-project.schema.ts
    AssessmentProjectForm.tsx
  lib/
    assessment-project-status.ts
    assessment-project-permissions.ts
  types/
    assessment-project.types.ts
  index.ts
```

## Public API feature’a

Każdy feature powinien eksportować publiczne elementy przez `index.ts`.

Nie importować głęboko bez potrzeby:

```ts
// Unikać
import { X } from '@/features/assessment-projects/components/X';
```

Preferować:

```ts
import { AssessmentProjectsPage } from '@/features/assessment-projects';
```

## Granice feature’ów

Feature nie powinien bezpośrednio importować prywatnych plików innego feature’a.

Jeśli dwa feature’y współdzielą logikę:

1. sprawdzić, czy rzeczywiście jest wspólna,
2. przenieść do `shared/` albo `server/`,
3. ewentualnie udostępnić przez public API feature’a.

## Komponenty

Komponenty dzielić na:

```txt
page components — kompletne ekrany domenowe
section components — większe części strony
entity components — karta, lista, szczegóły encji
form components — formularze
primitive components — tylko jeśli nie należą do shared/ui
```

## Formularze

Każdy formularz powinien mieć:

```txt
Zod schema
TypeScript input type
server-side validation
clear error display
loading state
success/failure handling
```

Przykład:

```txt
forms/
  assessment-project.schema.ts
  AssessmentProjectForm.tsx
```

## Query i mutation

Rozdzielać odczyty i zapisy.

```txt
api/
  respondent.queries.ts
  respondent.mutations.ts
```

Każda mutacja musi zawierać:

```txt
permission check
input validation
business validation
audit log
```

## Hooki

Hooki w feature mogą dotyczyć tylko logiki UI tego feature’a.

Nie umieszczać w hookach krytycznej logiki bezpieczeństwa.

## Typy

Typy domenowe trzymać w `types/`.

Typy czysto formularzowe mogą być inferowane z Zod schema.

## Antywzorce

Unikać:

```txt
jeden wielki components/ dla całej aplikacji
jeden wielki lib/utils.ts
jeden wielki api.ts
feature importujący prywatne pliki innego feature’a
logika uprawnień w komponencie UI
logika scoringu w komponencie React
bezpośrednie zapytania DB w page.tsx
```

## Zasada przenoszenia do shared

Kod trafia do `shared/`, jeśli:

- jest używany przez co najmniej dwa/trzy feature’y,
- nie zawiera logiki domenowej jednego feature’a,
- ma stabilny kontrakt,
- jego nazwa i API są ogólne.
