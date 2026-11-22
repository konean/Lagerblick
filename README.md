# Lagerblick

Interne Webanwendung für Gerloff & Frerk. Lagerblick zeigt Materialbestände übersichtlich, dokumentiert Lagerbewegungen nachvollziehbar und ermöglicht Materialreservierungen für Projekte. Die genaue Projektbeschreibung steht in `HANDOFF.md`.

## Erster nutzbarer Ablauf

- **Ablauf** — Benutzer meldet sich an, legt einen Artikel an, bucht einen Wareneingang und sieht den aktualisierten Bestand.
- **Fertig, wenn** — Nach dem Wareneingang zeigt die Materialliste den erhöhten Bestand. Ein direkter Schreibzugriff auf die Buchungstabelle ohne die vorgesehene Datenbankfunktion wird verweigert.

## Starten und prüfen

- **Einrichtung und Start** — Node.js 24 oder neuer. `npm install`, dann `.env.example` nach `.env.local` kopieren und die Werte des Supabase-Entwicklungsprojekts eintragen. Start mit `npm run dev`, die App läuft unter <http://localhost:3000>. Datenbankmigrationen liegen in `supabase/migrations/` und werden mit der Supabase-CLI (`npx supabase db push --remote`) eingespielt. Danach die Typen mit `npm run db:types` neu erzeugen. Für die DB-Tests `.env.test.example` nach `.env.test.local` kopieren und die Zugangsdaten der synthetischen Testbenutzer eintragen. Ohne diese Datei werden die DB-Tests übersprungen.
- **Lokale Prüfung** — `npm run check` führt nacheinander Lint (`npm run lint`), Typprüfung (`npm run typecheck`), Tests (`npm run test`) und Produktions-Build (`npm run build`) aus. Alle Schritte müssen fehlerfrei durchlaufen.

## Entscheidungen

Halte hier Entscheidungen fest, die später erklärt werden müssen, etwa die Wahl des Tech-Stacks oder eine bewusst verworfene Alternative. Eine Zeile pro Entscheidung genügt.

- 2026-11-22 — Next.js (App Router, TypeScript, Tailwind) mit Supabase (PostgreSQL, Auth, RLS), Hosting auf Vercel. Grund: ein Projekt ohne separates Backend, Berechtigungen direkt in der Datenbank. Verworfen: eigenes API-Backend, weil es für den Umfang unnötige Komplexität bringt.
- 2026-11-22 — `agentRules: false` in `next.config.ts`. Grund: `next dev` würde sonst einen eigenen Block in `AGENTS.md` schreiben. Verworfen: Block übernehmen, weil `AGENTS.md` die verbindlichen Projektregeln enthält.
- 2026-11-22 — Bestand als Summe vorzeichenbehafteter, unveränderlicher Bewegungen (View `material_bestand`), Buchen nur über Datenbankfunktionen mit Zeilensperre. Grund: Historie und Bestand können nicht auseinanderlaufen, parallele Buchungen bleiben konsistent. Verworfen: gespeicherte Bestandsspalte, weil sie doppelt gepflegt werden müsste.

## Kundenauslieferung

- [ ] Der vereinbarte Ablauf funktioniert in der vorgesehenen Umgebung. Offene Punkte sind für die Abnahme dokumentiert.
- [ ] Zuständigkeiten für Betrieb, Updates und Support sind geklärt. Bei riskanten Änderungen an bestehenden Daten wurde die Wiederherstellung in einer Testumgebung geprüft.
- [ ] Nach dem Deployment ist der ausgelieferte Stand festgehalten und der wichtigste Ablauf wurde geprüft.

Bei Bedarf verlinke hier die Anleitung für Auslieferung und Betrieb.
