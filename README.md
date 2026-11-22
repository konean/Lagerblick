# {{PROJEKTNAME}}

{{WAS_DAS_PROJEKT_FÜR_WEN_LÖST}}

## Diese Vorlage nutzen

Kopiere den Inhalt der Vorlage samt `.gitignore`, `.github` und `.vscode` ins neue Projekt. Fülle die Platzhalter aus, sobald die Angaben feststehen. Aktiviere in `.vscode/extensions.json` den Block des Tech-Stacks und lösche die übrigen. Entferne danach diesen Abschnitt aus der Kopie.

Für den Start mit KI genügt ein Auftrag wie dieser.

> Lies AGENTS.md und README.md. Hilf mir, den ersten nutzbaren Ablauf zu planen. Sag mir, was du zuerst bauen und wie du es prüfen würdest. Zeig mir den nächsten Git-Schritt und erkläre kurz, wozu er dient.

Sobald der Tech-Stack feststeht, lass die KI die `.gitignore` gezielt um lokale Abhängigkeiten, Build-Ausgaben und Caches des Projekts ergänzen. Prüfe mit `git status --short`, welche Dateien Git für den ersten Commit sieht. Du legst den Commit selbst an. Danach arbeitest du pro Aufgabe in einem Branch.

## Erster nutzbarer Ablauf

- **Ablauf** — {{WAS_DIE_NUTZER_KÖNNEN_SOLLEN}}
- **Fertig, wenn** — {{BEOBACHTBARES_ERGEBNIS}}

## Starten und prüfen

- **Einrichtung und Start** — {{VORAUSSETZUNGEN_KONFIGURATION_UND_STARTBEFEHL}}
- **Lokale Prüfung** — {{PRÜFBEFEHL_ODER_MANUELLER_TEST}}

## Entscheidungen

Halte hier Entscheidungen fest, die später erklärt werden müssen, etwa die Wahl des Tech-Stacks oder eine bewusst verworfene Alternative. Eine Zeile pro Entscheidung genügt.

- {{DATUM}} — {{ENTSCHEIDUNG}}. Grund: {{WARUM}}. Verworfen: {{ALTERNATIVE_UND_GRUND}}.

## Kundenauslieferung

- [ ] Der vereinbarte Ablauf funktioniert in der vorgesehenen Umgebung. Offene Punkte sind für die Abnahme dokumentiert.
- [ ] Zuständigkeiten für Betrieb, Updates und Support sind geklärt. Bei riskanten Änderungen an bestehenden Daten wurde die Wiederherstellung in einer Testumgebung geprüft.
- [ ] Nach dem Deployment ist der ausgelieferte Stand festgehalten und der wichtigste Ablauf wurde geprüft.

Bei Bedarf verlinke hier die Anleitung für Auslieferung und Betrieb.
