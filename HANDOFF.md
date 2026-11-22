# Lagerblick – Projekt-Handoff

## 1. Projektziel

Entwickle **Lagerblick**, eine leichtgewichtige Webanwendung zur internen Material- und Komponentenverwaltung für Gerloff & Frerk, ein Ingenieurbüro mit Schwerpunkt Photovoltaikanlagen.

Die Anwendung soll Materialbestände übersichtlich darstellen, Lagerbewegungen nachvollziehbar dokumentieren und Materialreservierungen für Projekte ermöglichen.

Lagerblick ist zunächst ein Lern- und Pilotprojekt. Neben einer funktionierenden Anwendung sollen insbesondere folgende Bereiche praktisch erlernt werden:

- Fullstack-Entwicklung mit Next.js und TypeScript
- Relationale Datenmodellierung mit PostgreSQL
- Authentifizierung und Zugriffskontrolle mit Supabase
- Datenbankmigrationen und sichere Transaktionen
- Deployment mit Vercel
- Nachvollziehbare KI-gestützte Softwareentwicklung

**Grundsatz:** Bürokratie, wo nötig – aber so wenig wie möglich.

Entwickle keine umfassende ERP-Lösung. Der Fokus liegt auf einer einfachen, wartbaren Anwendung mit echtem betrieblichem Nutzen.

## 2. Bestehende Projektvorlage

Das Projekt basiert auf einer vorhandenen Projektvorlage mit:

- `AGENTS.md`
- `README.md`
- `.gitignore`
- `.github/`
- `.vscode/`

Lies zunächst `AGENTS.md` und `README.md`.

Die `AGENTS.md` definiert verbindlich den Entwicklungsprozess einschließlich Planung, Freigaben, Git-Workflow, Prüfungen und Zusammenarbeit.

Wiederhole diese Regeln nicht und erstelle keine konkurrierenden Prozessdokumente.

Nutze die bestehende README-Struktur und fülle ihre Platzhalter projektspezifisch aus, sobald die entsprechenden Entscheidungen getroffen und freigegeben wurden.

Prüfe die vorhandene `.gitignore` und VS-Code-Konfiguration auf die Anforderungen des gewählten Tech-Stacks.

Ändere bestehende Vorlagendateien nur im Rahmen des vereinbarten Entwicklungsprozesses.

## 3. Technologie-Stack

Vorgesehener Stack:

| Bereich | Technologie |
| --- | --- |
| Framework | Next.js mit App Router |
| Sprache | TypeScript |
| Styling | Tailwind CSS |
| Datenbank | Supabase PostgreSQL |
| Authentifizierung | Supabase Auth |
| Berechtigungen | PostgreSQL Row Level Security (RLS) |
| Hosting | Vercel |
| Repository | GitHub |
| Paketverwaltung | npm |
| Entwicklungsumgebung | Windows 11, VS Code, PowerShell |

Verwende etablierte Funktionen des Frameworks und möglichst wenige zusätzliche Abhängigkeiten.

Schlage zusätzliche Bibliotheken nur vor, wenn sie einen nachvollziehbaren Mehrwert bieten.

Vermeide unnötige Architekturabstraktionen, Microservices und zusätzliche Backend-Systeme.

## 4. Funktionsumfang

### 4.1 Benutzer und Berechtigungen

Die Anwendung ist ausschließlich für interne Benutzer vorgesehen.

Anforderungen:

- Anmeldung und Abmeldung über Supabase Auth
- Keine öffentliche Registrierung
- Benutzer werden administrativ angelegt
- Zwei Rollen: Administrator und Mitarbeiter
- Administratoren verwalten Material- und Projektstammdaten
- Mitarbeiter können Material einsehen und erlaubte Buchungen durchführen
- Berechtigungen werden serverseitig und durch RLS durchgesetzt

Eine umfangreiche Benutzerverwaltung ist nicht Bestandteil des MVP.

### 4.2 Materialverwaltung

Jeder Artikel erhält folgende Eigenschaften:

- Eindeutige ID
- Artikelname
- Kategorie
- Hersteller
- Modell
- Optionale Artikelnummer / SKU
- Mengeneinheit, z. B. Stück oder Meter
- Mindestbestand
- Beschreibung (optional)
- Status: Aktiv / Archiviert

Beispielkategorien:

- PV-Module
- Wechselrichter
- Batteriespeicher
- Montagesysteme
- Elektromaterial
- Zubehör

Funktionen:

- Material anlegen
- Material bearbeiten
- Material suchen und filtern
- Artikel archivieren
- Aktuellen Bestand anzeigen

Artikel mit vorhandenen Buchungen dürfen nicht ersatzlos gelöscht werden.

### 4.3 Bestandsverwaltung

Ermögliche folgende Materialbewegungen:

- Wareneingang
- Materialentnahme
- Bestandskorrektur

Eine Buchung dokumentiert mindestens:

- Artikel
- Art der Bewegung
- Menge
- Zeitstempel
- Verantwortlichen Benutzer
- Optionalen Kommentar
- Optionalen Projektbezug

Fachliche Regeln:

- Bestände dürfen nicht negativ werden
- Buchungen müssen dauerhaft nachvollziehbar sein
- Fehlerhafte Buchungen werden über Gegenbuchungen korrigiert
- Bestehende Buchungen werden nicht nachträglich verändert
- Bestandsänderungen erfolgen atomar und konsistent
- Parallele Buchungen dürfen keine fehlerhaften Bestände erzeugen
- Der Bestand wird aus einer konsistenten Buchungsgrundlage ermittelt und nicht unabhängig von der Bewegungshistorie gepflegt

Die konkrete technische Umsetzung ist während der Architekturplanung festzulegen.

### 4.4 Projekte und Materialreservierungen

Materialien können internen Projekten zugeordnet werden.

Ein Projekt enthält:

- Eindeutige ID
- Projektname
- Optionale Projektnummer
- Optionalen Hinweis
- Status: Aktiv / Abgeschlossen

Funktionen:

- Projekte anlegen und bearbeiten
- Material für Projekte reservieren
- Reservierungen ändern oder aufheben
- Reserviertes Material entnehmen
- Frei verfügbaren Bestand anzeigen
- Reservierte Mengen anzeigen

Eine Reservierung reduziert die verfügbare Menge, nicht den physischen Lagerbestand.

Überreservierungen und konkurrierende fehlerhafte Buchungen müssen verhindert werden.

Keine zusätzliche Aufgaben-, Termin- oder Projektmanagementverwaltung entwickeln.

### 4.5 Dashboard

Die Startseite bietet eine kompakte Übersicht über:

- Anzahl aktiver Artikel
- Artikel unter Mindestbestand
- Aktuelle Reservierungen
- Letzte Materialbewegungen
- Schnelleinstieg zur Materialverwaltung

Priorität haben Übersichtlichkeit und Geschwindigkeit, nicht umfangreiche Auswertungen.

### 4.6 Buchungshistorie

Alle Materialbewegungen sind nachvollziehbar einsehbar.

Unterstütze eine einfache Filterung nach:

- Artikel
- Bewegungsart
- Zeitraum
- Projekt

Zeige den verantwortlichen Benutzer und den Zeitpunkt der Bewegung an.

## 5. Datenbank und Sicherheit

Entwirf ein möglichst einfaches relationales PostgreSQL-Datenmodell.

Voraussichtlich benötigte Entitäten:

- Benutzerprofile
- Materialien
- Kategorien
- Projekte
- Bestandsbewegungen
- Reservierungen

Die tatsächliche Tabellenstruktur soll aus den fachlichen Anforderungen abgeleitet werden.

Technische Anforderungen:

- SQL-Migrationen im Repository
- Primär- und Fremdschlüssel
- Geeignete Datenbank-Constraints
- Eindeutige fachliche Identifikatoren, wo erforderlich
- Geeignete Indizes
- Transaktionale Buchungsoperationen
- Sichere Behandlung gleichzeitiger Änderungen
- Serverseitige Eingabevalidierung
- RLS für alle relevanten betrieblichen Tabellen
- Autorisierung unabhängig von der Benutzeroberfläche
- Schutz vor eigenmächtigen Rollenänderungen
- Keine privilegierten Supabase-Schlüssel im Browser

Bestandsänderungen dürfen nicht über ungeschützte direkte Tabellenoperationen manipuliert werden können.

Nutze zu Entwicklungs- und Testzwecken ausschließlich synthetische Daten.

## 6. Benutzeroberfläche

Entwickle eine moderne, responsive und funktionale Business-Oberfläche.

Gestaltungsprinzipien:

- Klare Navigation
- Gute Lesbarkeit
- Desktop- und Smartphone-Unterstützung
- Einheitliche Formulare
- Verständliche Fehlermeldungen
- Gut erkennbare Bestands- und Reservierungszustände
- Möglichst wenige Klicks für häufige Aufgaben
- Keine unnötigen Animationen

Mögliche Navigation:

1. Übersicht
2. Materialien
3. Bewegungen
4. Reservierungen
5. Projekte

Eine separate Einstellungsseite nur ergänzen, wenn tatsächlich erforderlich.

## 7. Entwicklungsumgebungen und Deployment

Die Anwendung soll lokal entwickelt und später über Vercel bereitgestellt werden.

Berücksichtige:

- Lokale Next.js-Entwicklung
- Supabase-Projekt für Entwicklung und Tests
- Separates Supabase-Projekt für Produktion
- Vercel Preview Deployments
- Vercel Production Deployment
- Umgebungsspezifische Konfiguration
- Versionierte SQL-Migrationen

Preview-Umgebungen dürfen keine unbeabsichtigten Schreibzugriffe auf die Produktionsdatenbank erhalten.

Produktive Datenbankmigrationen müssen kontrolliert ausgeführt werden.

Die Freigabe- und Deployment-Verantwortung richtet sich nach `AGENTS.md`.

## 8. Projektspezifische Qualitätsanforderungen

Berücksichtige insbesondere folgende Prüffälle:

- Ungültige Materialdaten werden abgewiesen
- Materialzugänge erhöhen den Bestand korrekt
- Entnahmen reduzieren den Bestand korrekt
- Negative Bestände werden verhindert
- Reservierungen reduzieren die freie Menge
- Überreservierungen werden verhindert
- Gleichzeitige Buchungen bleiben konsistent
- Buchungshistorien bleiben nachvollziehbar
- Nicht autorisierte Aktionen werden verweigert
- RLS schützt vor Zugriffen außerhalb der Berechtigungen

Schlage eine angemessene, schlanke Teststrategie vor.

Bevorzuge automatisierte Tests für kritische Geschäftslogik und Berechtigungen.

## 9. Abgrenzung des MVP

Folgende Funktionen sind zunächst nicht vorgesehen:

- Einkauf und Bestellwesen
- Lieferantenverwaltung
- Rechnungsstellung
- Preiskalkulation
- Barcode-Scanning
- Mehrlagerverwaltung
- ERP-Schnittstellen
- Offline-Betrieb
- Native Smartphone-App
- Umfangreiche Benutzeradministration
- KI-Funktionen
- Komplexe Reportings
- Mandantenfähigkeit

Diese Funktionen dürfen nicht ohne ausdrückliche Entscheidung in die Planung oder Umsetzung aufgenommen werden.

## 10. Vorgehensweise und Lernziel

Der Auftraggeber besitzt technische Grundkenntnisse und nutzt das Projekt, um moderne Softwareentwicklung mit KI-Unterstützung praktisch zu erlernen.

Erkläre wesentliche technische Entscheidungen verständlich, insbesondere bei:

- Datenbanktabellen und Beziehungen
- SQL-Migrationen
- Row Level Security
- Datenbanktransaktionen
- Next.js Server- und Client-Komponenten
- Authentifizierung und Autorisierung
- Vercel- und Supabase-Konfiguration

Vermeide unnötig lange theoretische Erklärungen.

Konzentriere dich auf die tatsächlich umgesetzten Änderungen und deren Auswirkungen.

Die operativen Regeln für die Zusammenarbeit stehen in `AGENTS.md`.

## 11. Erster Auftrag: Planung

Beginne mit der Planung. Noch keine Anwendungsfunktionen implementieren.

1. Prüfe die bestehende Projektvorlage.
2. Analysiere die Anforderungen auf technische Risiken, Unklarheiten und unnötige Komplexität.
3. Schlage eine einfache Architektur vor.
4. Entwerfe ein vorläufiges Datenbankschema mit den wichtigsten Beziehungen.
5. Erläutere das Berechtigungsmodell und die wesentlichen RLS-Regeln.
6. Beschreibe, wie Bestandsbuchungen und Reservierungen konsistent umgesetzt werden können.
7. Plane die lokale Entwicklung sowie die Anbindung an Supabase und Vercel.
8. Teile das MVP in kleine, einzeln überprüfbare Entwicklungsphasen.

### Priorisierung

Beginne mit einem möglichst kleinen, durchgängigen Ablauf:

**Benutzer meldet sich an → legt einen Artikel an → bucht einen Wareneingang → sieht den aktualisierten Bestand.**

Erweitere die Anwendung anschließend um Entnahmen, Buchungshistorie, Projekte, Reservierungen und Dashboard.

Jede Phase soll ein überprüfbares Ergebnis liefern.

### Erwartete Ausgabe

Liefere:

- Eine knappe Einschätzung der Anforderungen
- Einen Architekturvorschlag
- Ein vorläufiges relationales Datenmodell
- Einen Vorschlag für die Sicherheitsarchitektur
- Einen phasenweisen Umsetzungsplan mit Akzeptanzkriterien
- Die wichtigsten offenen Entscheidungen
- Den nächsten Git-Schritt entsprechend `AGENTS.md`

Nutze für die Planung die bestehende README-Struktur. Umfangreichere Dokumentation nur dann vorschlagen, wenn sie einen konkreten Mehrwert bietet.

**Schließe mit einer konkreten Empfehlung für die erste Implementierungsphase und hole die Freigabe gemäß `AGENTS.md` ein.*
