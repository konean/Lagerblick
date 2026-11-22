# Lagerblick

Interne Webanwendung für Gerloff & Frerk. Lagerblick zeigt Materialbestände übersichtlich, dokumentiert Lagerbewegungen nachvollziehbar und ermöglicht Materialreservierungen für Projekte. Die genaue Projektbeschreibung steht in `HANDOFF.md`.

## Erster nutzbarer Ablauf

- **Ablauf** — Benutzer meldet sich an, legt einen Artikel an, bucht einen Wareneingang und sieht den aktualisierten Bestand.
- **Fertig, wenn** — Nach dem Wareneingang zeigt die Materialliste den erhöhten Bestand. Ein direkter Schreibzugriff auf die Buchungstabelle ohne die vorgesehene Datenbankfunktion wird verweigert.

## Starten und prüfen

- **Einrichtung und Start** — Node.js 24. `npm install`, dann `.env.example` nach `.env.local` kopieren und die Werte des Supabase-Entwicklungsprojekts eintragen. Start mit `npm run dev`, die App läuft unter <http://localhost:3000>. Datenbankmigrationen liegen in `supabase/migrations/` und werden mit der Supabase-CLI (`npx supabase db push --remote`) eingespielt. Danach die Typen mit `npm run db:types` neu erzeugen. Für die DB-Tests `.env.test.example` nach `.env.test.local` kopieren und die Zugangsdaten der synthetischen Testbenutzer eintragen. Ohne diese Datei werden die DB-Tests übersprungen.
- **Lokale Prüfung** — `npm run check` führt nacheinander Lint (`npm run lint`), Typprüfung (`npm run typecheck`), Tests (`npm run test`) und Produktions-Build (`npm run build`) aus. Alle Schritte müssen fehlerfrei durchlaufen.

## Entscheidungen

Halte hier Entscheidungen fest, die später erklärt werden müssen, etwa die Wahl des Tech-Stacks oder eine bewusst verworfene Alternative. Eine Zeile pro Entscheidung genügt.

- 2026-11-22 — Next.js (App Router, TypeScript, Tailwind) mit Supabase (PostgreSQL, Auth, RLS), Hosting auf Vercel. Grund: ein Projekt ohne separates Backend, Berechtigungen direkt in der Datenbank. Verworfen: eigenes API-Backend, weil es für den Umfang unnötige Komplexität bringt.
- 2026-11-22 — `agentRules: false` in `next.config.ts`. Grund: `next dev` würde sonst einen eigenen Block in `AGENTS.md` schreiben. Verworfen: Block übernehmen, weil `AGENTS.md` die verbindlichen Projektregeln enthält.
- 2026-11-22 — Bestand als Summe vorzeichenbehafteter, unveränderlicher Bewegungen (View `material_bestand`), Buchen nur über Datenbankfunktionen mit Zeilensperre. Grund: Historie und Bestand können nicht auseinanderlaufen, parallele Buchungen bleiben konsistent. Verworfen: gespeicherte Bestandsspalte, weil sie doppelt gepflegt werden müsste.
- 2026-11-22 — Storno als Gegenbuchung mit Verweis `storno_von` (eindeutig, also höchstens einmal pro Bewegung); Korrektur als gezählter Bestand, gebucht wird die Differenz. Entnahme dürfen alle, Korrektur und Storno nur Admins, jeweils mit Pflicht-Grund. Grund: Bewegungen bleiben unveränderlich, doppelte Stornos sind auch bei gleichzeitigen Klicks ausgeschlossen. Verworfen: Statusspalte „storniert“ an der Originalbuchung, weil sie die Unveränderlichkeit aufbrechen würde.
- 2026-11-22 — Reservierung als veränderliche Gesamtmenge je Material und Projekt (Tabelle `reservierungen`, nur über `setze_reservierung` und `buche_entnahme` schreibbar, beide mit derselben Zeilensperre wie die Buchungen). Entnahme ohne Projekt nur aus der freien Menge, mit Projekt zuerst aus dessen Reservierung. Korrektur und Storno durch Admins dürfen unter die reservierte Menge gehen („überreserviert“). Abschließen und Archivieren sind bei offenen Reservierungen gesperrt. Grund: Überreservierung durch normale Abläufe ist ausgeschlossen, die Inventur bleibt trotzdem möglich. Verworfen: Reservierungen als eigene Buchungsart mit Historie, weil der Verbrauch bereits über die Entnahmen mit Projektbezug nachvollziehbar ist.
- 2026-11-22 — Übersicht ohne eigene Datenbank-View: „knapp“ (unter Mindestbestand oder überreserviert) wird in `knappeMaterialien` berechnet und von Übersicht und Materialfilter gemeinsam genutzt, gemeinsame Abfragen pro Aufruf mit `cache()` dedupliziert. Grund: eine Regel an einer Stelle, testbar ohne Datenbank. Verworfen: View für knappe Artikel, weil sie die Regel in SQL doppeln würde und bei der aktuellen Datenmenge keinen Vorteil bringt.
- 2026-11-22 — Wischnavigation mit Touch Events am Dokument, ohne Bibliothek: Richtung nach 10 px festgelegt, nur waagerechte Gesten werden übernommen, scrollbare Tabellen haben Vorrang bis zum Rand. Grund: Die Geste geht überall, Scrollen schaltet nie versehentlich um. Verworfen: Pointer Events, weil der Browser sie beim Scrollen abbricht, und eine Gesten-Bibliothek, weil sie für eine einzige Geste unnötig ist.

## Kundenauslieferung

- [x] Der vereinbarte Ablauf funktioniert in der vorgesehenen Umgebung. Offene Punkte sind für die Abnahme dokumentiert.
  - 2026-11-22 Abnahme auf <https://lagerblick-iota.vercel.app> (`lagerblick-prod`) nach `docs/betrieb.md`: Anmeldung beider Rollen, Wareneingang mit Bestand, Mitarbeiter ohne Korrektur und Storno, Storno und Archivieren, Registrierung abgewiesen, dev-Konto abgewiesen. Preview-Deployment läuft gegen `lagerblick-dev`.
  - Offen: Bedienhilfe in der App. Free-Tarif ohne Backups und mit Pausieren bei Inaktivität (siehe `docs/betrieb.md`, „Laufender Betrieb“).
- [ ] Zuständigkeiten für Betrieb, Updates und Support sind geklärt. Bei riskanten Änderungen an bestehenden Daten wurde die Wiederherstellung in einer Testumgebung geprüft.
- [x] Nach dem Deployment ist der ausgelieferte Stand festgehalten und der wichtigste Ablauf wurde geprüft.
  - Erste Auslieferung 2026-11-22: Stand `main` nach Merge von PR #9. Der ausgelieferte Commit steht in Vercel beim Deployment mit der Markierung „Current“.

Anleitung für Einrichtung, Migrationen, Deployment und Abnahme: [`docs/betrieb.md`](docs/betrieb.md).
