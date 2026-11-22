# Zusammenarbeit mit KI

## Arbeitsablauf

Jede Aufgabe läuft in der Schleife Plan → Umsetzung → Prüfung → Commit. Bei größeren Aufgaben durchläufst du die Schleife pro Teilschritt. Der nächste Durchlauf beginnt erst, wenn ich den vorigen committet habe.

### 1. Plan

- Lies das README und prüfe vor Änderungen den Branch und das Arbeitsverzeichnis mit `git status --short --branch`, sofern Git bereits eingerichtet ist. Schlage kurz vor, was du ändern und wie du es prüfen willst. Beginne, sobald ich den Umfang freigegeben habe. Kläre nötige Erweiterungen und Konflikte mit meinen lokalen Änderungen mit mir.
- Halte den Plan extrem knapp. Die Grammatik darf der Kürze zum Opfer fallen. Beende jeden Plan mit einer Liste offener Fragen, falls es welche gibt.
- Teile größere Aufgaben in Teilschritte, die sich einzeln prüfen und committen lassen.
- Für Änderungen nutze ich einen Aufgaben-Branch. Schlage mir dafür einen kurzen Namen im Format `typ/kurzbeschreibung` und den passenden Befehl vor, etwa `fix/projektfilter`. Typen: `feat`, `fix`, `docs`, `refactor`, `design`, `ops`, `chore`. Wenn ich auf `main` bin, warte vor Dateiänderungen auf meinen Branch-Wechsel. Das freigegebene Grundgerüst eines neuen Projekts darf vor dem ersten Commit auf `main` entstehen.
- Hole meine Freigabe für Installationen, Änderungen an Datenbanken und Zugriffe auf externe Systeme ein, sofern ich die konkrete Aktion noch nicht freigegeben habe. Stimme zusätzliche Abhängigkeiten oder größere Umbauten vorab ab.
- Wenn Zugriffsrechte, bestehende Daten oder der Betrieb betroffen sind, benenne vorab das konkrete Risiko und den passenden Prüffall.

### 2. Umsetzung

- Setze nur den freigegebenen Umfang um. Halte die Änderung klein und nutze vorhandene Projektmuster.
- Halte Zugangsdaten und echte Kundendaten aus Repo, Chats und Testartefakten heraus. Lies `.env`-Dateien nur nach meiner Freigabe und gib ihre Werte nicht aus. Lege stattdessen Platzhalter in einer `.env.example` an. Wenn du auf Zugangsdaten stößt, sag mir Bescheid und lass sie nicht im Diff, in Logs oder in Commit-Nachrichten stehen.

### 3. Prüfung

- Prüfe den Diff gegen den Auftrag und führe die Prüfungen aus, die im README unter „Starten und prüfen“ stehen. Ist dort noch ein Platzhalter, schlage eine passende Prüfung vor und lass sie dir freigeben, bevor du sie als Maßstab nutzt. Bei einem reproduzierbaren Bug ist ein Regressionstest sinnvoll, wenn er sich mit vertretbarem Aufwand ergänzen lässt.
- Schlägt eine Prüfung fehl, behebe den Fehler und prüfe erneut, bevor du weitergehst. Liegt die Ursache außerhalb des freigegebenen Umfangs oder klappt es nach zwei Versuchen nicht, halte an und frag mich.
- Betrifft die Änderung Zugriffsrechte, prüfe sowohl erlaubte als auch verweigerte Zugriffe. Kläre bei riskanten Datenänderungen den Rückweg vor der Auslieferung.

### 4. Commit und Abschluss

Nach jedem Durchlauf:

- Erkläre bei Codeänderungen in zwei bis drei Sätzen, was sich geändert hat, warum und wie der Code es umsetzt. Nenne die zentrale Datei oder Funktion und beschreibe von dort den Ablauf.
- Nenne die tatsächlich ausgeführten Prüfungen und ihre Ergebnisse, begründe offene Prüfungen und gib mir einen konkreten Schritt, mit dem ich das Ergebnis selbst nachvollziehen kann.
- Ich bediene Git selbst, einschließlich Branch-Wechsel, Staging, Commit, Push, Pull Request und Merge. Nenne mir den nächsten passenden Befehl und erkläre in einem Satz, was er bewirkt. Gib beim Staging die konkreten Dateien an und schlage eine Commit-Nachricht vor. Sie beginnt mit dem Typ des Branches, gefolgt von einem deutschen Satz, etwa `fix: Projektfilter beim Datumswechsel korrigieren`.
- Git-Aktionen, die Änderungen verwerfen oder die Historie umschreiben, bleiben bei mir. Ich löse Deployments aus.

Am Ende der gesamten Aufgabe:

- Erkläre bei größeren Änderungen die entscheidende technische Abwägung und schlage mir dazu eine Zeile für den Abschnitt „Entscheidungen“ im README vor. Ich übernehme sie, wenn sie stimmt.
- Bereite auf Wunsch den Text für einen Pull Request anhand von `.github/pull_request_template.md` vor.
