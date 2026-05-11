# HUMANET VALUES v2 — instrukcje dla agenta kodującego

Ten katalog zawiera zestaw instrukcji dla agenta AI lub zespołu programistycznego budującego nową wersję systemu HUMANET VALUES.

System ma być budowany jako aplikacja klasy enterprise do obsługi psychometrii, diagnozy wartości, projektów badawczych, raportów i pracy wielu tenantów/partnerów.

## Główne założenia

1. System ma być oparty na najnowszej stabilnej wersji Next.js z App Routerem.
2. Backend i warstwa danych mają korzystać z PostgreSQL oraz Drizzle ORM.
3. UI ma być oparty na shadcn/ui, Tailwind CSS i własnym design systemie.
4. Architektura ma być feature-oriented.
5. Dane tenantów mają być silnie izolowane, preferencyjnie przez osobne bazy danych per tenant.
6. System przetwarza dane poufne i psychometryczne, dlatego bezpieczeństwo, audytowalność i kontrola dostępu są wymaganiami pierwszej klasy.
7. Kod ma być wysokiej jakości, typowany, testowalny, modularny i gotowy na rozwój enterprise.

## Zalecana kolejność czytania

1. `01-architecture-principles.md`
2. `02-folder-structure.md`
3. `03-multi-tenant-database-architecture.md`
4. `04-security-and-access-control.md`
5. `05-drizzle-and-schema-standards.md`
6. `06-feature-oriented-development.md`
7. `07-domain-model-v1.md`
8. `08-ui-ux-standards.md`
9. `09-api-server-actions-and-data-access.md`
10. `10-implementation-roadmap.md`
11. `11-quality-checklists.md`
12. `12-agent-operating-rules.md`

## Najważniejsza zasada

Agent nie ma tworzyć szybkiego prototypu kosztem architektury. Każdy element systemu powinien być tworzony tak, aby mógł wejść do aplikacji produkcyjnej obsługującej poufne dane firm, pracowników i respondentów.
