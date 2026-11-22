import type { Metadata } from "next";
import Link from "next/link";
import { BestandsHinweis, Seitenkopf, StorniertLabel, UeberreserviertLabel } from "@/components/ui";

export const metadata: Metadata = { title: "Hilfe · Lagerblick" };

// Bedienhilfe als eine statische Seite mit Sprungmarken.
// Kein Akkordeon, damit sich alles mit der Suche des Browsers finden lässt.
const ABSCHNITTE = [
  { id: "rollen", titel: "Rollen" },
  { id: "materialien", titel: "Materialien finden" },
  { id: "buchen", titel: "Eingang und Entnahme" },
  { id: "korrektur", titel: "Korrektur und Storno" },
  { id: "reservieren", titel: "Projekte und Reservierungen" },
  { id: "uebersicht", titel: "Übersicht und Historie" },
  { id: "stammdaten", titel: "Stammdaten pflegen" },
  { id: "smartphone", titel: "Auf dem Smartphone" },
  { id: "meldungen", titel: "Häufige Meldungen" },
] as const;

type AbschnittId = (typeof ABSCHNITTE)[number]["id"];

export default function HilfeSeite() {
  return (
    <div className="space-y-6">
      <Seitenkopf bereich="Hilfe" titel="Bedienhilfe" />
      <p className="max-w-prose text-sm leading-6 text-grau">
        Lagerblick zeigt, was im Lager liegt, was für Projekte reserviert ist und wer wann gebucht hat.
        Hier stehen die wichtigsten Abläufe. Bei Fragen oder Problemen hilft die Administration weiter.
      </p>

      <div className="grid gap-8 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-12">
        <nav aria-label="Inhalt der Hilfe" className="md:sticky md:top-6 md:self-start">
          <p className="font-mono text-[11px] tracking-wider text-grau uppercase">Inhalt</p>
          <ol className="mt-2 grid gap-x-4 text-sm sm:grid-cols-2 md:grid-cols-1">
            {ABSCHNITTE.map((a, i) => (
              <li key={a.id}>
                <a href={`#${a.id}`} className="flex gap-2 py-1 text-tinte hover:text-akzent">
                  <span className="font-mono text-xs leading-5 text-grau tabular-nums">{nummer(i)}</span>
                  {a.titel}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="max-w-prose divide-y divide-linie border-y border-linie">
          <Abschnitt id="rollen">
            <p>
              Es gibt zwei Rollen. Deine Rolle steht oben rechts neben dem Abmelden-Knopf. Benutzerkonten
              legt die Administration an, eine Registrierung gibt es nicht.
            </p>
            <div className="overflow-x-auto rounded-m border border-linie bg-flaeche" data-kein-wischen>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-linie font-mono text-[11px] tracking-wider text-grau uppercase">
                  <tr>
                    <th className="px-3 py-2 font-normal">Aufgabe</th>
                    <th className="px-3 py-2 text-center font-normal">Mitarbeiter</th>
                    <th className="px-3 py-2 text-center font-normal">Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linie">
                  <Recht aufgabe="Materialien, Projekte und Bewegungen ansehen" mitarbeiter />
                  <Recht aufgabe="Eingang und Entnahme buchen" mitarbeiter />
                  <Recht aufgabe="Reservieren, ändern und aufheben" mitarbeiter />
                  <Recht aufgabe="Bestand korrigieren, Buchung stornieren" />
                  <Recht aufgabe="Materialien, Kategorien und Projekte pflegen" />
                </tbody>
              </table>
            </div>
          </Abschnitt>

          <Abschnitt id="materialien">
            <p>
              Unter <Begriff>Materialien</Begriff> findest du alle Artikel. Die Suche durchsucht Name,
              Hersteller, Modell und Artikelnummer. Daneben filterst du nach Kategorie, Status (aktiv,
              archiviert, alle) und Bestand. <Begriff>Knapp</Begriff> zeigt nur Artikel, die Aufmerksamkeit
              brauchen.
            </p>
            <p>Ein Klick auf einen Artikel öffnet seine Seite mit drei Zahlen:</p>
            <dl className="grid gap-px overflow-hidden rounded-m border border-linie bg-linie sm:grid-cols-3">
              <Zahl begriff="Bestand">Was physisch im Lager liegt, berechnet aus allen Buchungen.</Zahl>
              <Zahl begriff="Reserviert">Für Projekte zurückgelegt, liegt aber noch im Lager.</Zahl>
              <Zahl begriff="Frei">Bestand minus Reserviert. Nur das ist ohne Projekt verfügbar.</Zahl>
            </dl>
          </Abschnitt>

          <Abschnitt id="buchen">
            <p>Gebucht wird auf der Seite des Artikels, im Formular neben dem Bestand.</p>
            <Schritte
              titel="Wareneingang"
              schritte={[
                "Artikel öffnen und „Eingang“ wählen.",
                "Menge eintragen, optional einen Kommentar wie die Lieferschein-Nummer.",
                "„Eingang buchen“ – der Bestand steigt sofort.",
              ]}
            />
            <Schritte
              titel="Entnahme"
              schritte={[
                "Artikel öffnen und „Entnahme“ wählen.",
                "Menge eintragen. Unter dem Feld steht, wie viel entnehmbar ist.",
                "Für ein Projekt: das Projekt auswählen. Dann wird zuerst dessen Reservierung verbraucht.",
                "„Entnahme buchen“.",
              ]}
            />
            <p>
              Ohne Projekt lässt sich nur die freie Menge entnehmen. Bei Stück, Rolle und Packung sind nur
              ganze Zahlen erlaubt, bei Meter und kg bis zu drei Nachkommastellen mit Komma.
            </p>
            <p>
              Buchungen lassen sich nicht bearbeiten oder löschen. Ist etwas falsch gebucht, wende dich an
              die Administration – sie storniert die Buchung.
            </p>
          </Abschnitt>

          <Abschnitt id="korrektur" nurAdmin>
            <Schritte
              titel="Bestand korrigieren (Inventur)"
              schritte={[
                "Artikel öffnen und „Korrektur“ wählen.",
                "Den gezählten Bestand eintragen, nicht die Differenz.",
                "Einen Grund angeben, etwa Inventur, Bruch oder Schwund.",
                "„Bestand korrigieren“ – Lagerblick bucht die Differenz.",
              ]}
            />
            <Schritte
              titel="Buchung stornieren"
              schritte={[
                "Die Buchung unter „Bewegungen“ oder bei den letzten Bewegungen des Artikels suchen.",
                "„Stornieren“ und einen Grund angeben.",
              ]}
            />
            <p>
              Das Storno ist eine Gegenbuchung. Die ursprüngliche Buchung bleibt sichtbar und trägt das Label{" "}
              <StorniertLabel />. Jede Buchung lässt sich nur einmal stornieren, ein Storno selbst nicht.
            </p>
            <p>
              Korrektur und Storno dürfen den Bestand unter die reservierte Menge drücken. Der Artikel ist
              dann <UeberreserviertLabel />, und die Reservierungen sollten angepasst werden.
            </p>
          </Abschnitt>

          <Abschnitt id="reservieren">
            <p>
              Eine Reservierung legt Material für ein Projekt zurück. Der Bestand bleibt gleich, nur die freie
              Menge sinkt. So kann niemand anderes das Material ohne Projekt entnehmen.
            </p>
            <Schritte
              titel="Reservieren"
              schritte={[
                "Artikel öffnen und unten bei „Reservierungen“ das Projekt wählen.",
                "Unter „Menge gesamt“ die Menge eintragen, die insgesamt für das Projekt reserviert sein soll.",
                "„Reservieren“.",
              ]}
            />
            <p>
              Zum Ändern einfach die neue Gesamtmenge eintragen. 0 oder „Aufheben“ entfernt die Reservierung.
              Reserviert werden kann nur aus der freien Menge und nur für aktive Projekte.
            </p>
            <p>
              Alle offenen Reservierungen stehen unter <Begriff>Reservierungen</Begriff>, die eines Projekts
              auf dessen Seite unter <Begriff>Projekte</Begriff>.
            </p>
          </Abschnitt>

          <Abschnitt id="uebersicht">
            <p>
              Die <Begriff>Übersicht</Begriff> zeigt die Zahl aktiver Artikel, knappe Artikel, offene
              Reservierungen und die letzten Bewegungen. Die Kacheln führen direkt in die passende Liste.
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              Zwei Hinweise markieren Handlungsbedarf: <BestandsHinweis /> und <UeberreserviertLabel />.
            </p>
            <p>
              Unter <Begriff>Bewegungen</Begriff> steht die vollständige Buchungshistorie mit Zeitpunkt und
              Benutzer. Filtern lässt sie sich nach Artikel, Art, Zeitraum und Projekt.
            </p>
          </Abschnitt>

          <Abschnitt id="stammdaten" nurAdmin>
            <ul className="list-disc space-y-2 pl-5 marker:text-linie-stark">
              <li>
                <Begriff>Material anlegen</Begriff> unter Materialien oder auf der Übersicht. Pflicht sind
                Name, Kategorie, Hersteller, Modell, Einheit und Mindestbestand. Die Einheit lässt sich nach der ersten Buchung nicht mehr ändern.
              </li>
              <li>
                <Begriff>Kategorien</Begriff> unter Materialien anlegen, umbenennen und löschen. Löschen geht
                nur, solange kein Material sie verwendet.
              </li>
              <li>
                <Begriff>Archivieren</Begriff> blendet ein Material aus der Standardliste aus und sperrt
                Buchungen, die Historie bleibt. Das geht nur ohne offene Reservierungen. „Reaktivieren“ macht
                es rückgängig.
              </li>
              <li>
                <Begriff>Projekte</Begriff> anlegen, bearbeiten und abschließen. Abschließen geht nur ohne
                offene Reservierungen, „Wieder öffnen“ macht es rückgängig.
              </li>
              <li>
                <Begriff>Löschen</Begriff> geht bei Materialien und Projekten nur, solange es keine Buchungen
                dazu gibt. Sonst archivieren bzw. abschließen.
              </li>
            </ul>
          </Abschnitt>

          <Abschnitt id="smartphone">
            <p>
              Die fünf Bereiche liegen in der Leiste unten. Auf den Hauptseiten der Bereiche wechselst du
              auch mit einer waagerechten Wischgeste zum nächsten oder vorigen Bereich, in der Reihenfolge der
              Leiste. Breite Tabellen scrollen zuerst bis zum Rand, erst dann wechselt die Seite.
            </p>
            <p>Diese Hilfe erreichst du über das Fragezeichen oben rechts.</p>
          </Abschnitt>

          <Abschnitt id="meldungen">
            <dl className="space-y-4">
              <Meldung text="Nicht genug Bestand für diese Entnahme.">
                Es liegt weniger im Lager als angegeben. Menge prüfen – vielleicht fehlt noch ein Eingang.
              </Meldung>
              <Meldung text="Ein Teil des Bestands ist reserviert. Bitte das Projekt angeben oder weniger entnehmen.">
                Ohne Projekt ist nur die freie Menge entnehmbar. Das Projekt wählen, für das reserviert ist.
              </Meldung>
              <Meldung text="Ein Teil des Bestands ist für andere Projekte reserviert.">
                Das Material ist für andere Projekte zurückgelegt. Mit den Verantwortlichen klären und die
                Reservierung anpassen.
              </Meldung>
              <Meldung text="Nicht genug freie Menge für diese Reservierung.">
                Weniger reservieren oder zuerst einen Wareneingang buchen.
              </Meldung>
              <Meldung text="Auf archiviertes Material kann nicht gebucht werden.">
                Die Administration kann das Material reaktivieren.
              </Meldung>
              <Meldung text="… noch offene Reservierungen. Bitte diese zuerst aufheben.">
                Archivieren und Abschließen gehen erst, wenn keine Reservierung mehr offen ist.
              </Meldung>
              <Meldung text="Zu viele Versuche. Bitte kurz warten und erneut versuchen.">
                Nach mehreren Anmeldeversuchen kurz warten. Passwort vergessen? Die Administration hilft.
              </Meldung>
              <Meldung text="Anmeldung fehlgeschlagen. Bitte später erneut versuchen.">
                Ein technisches Problem. Tritt es länger auf, die Administration informieren.
              </Meldung>
            </dl>
          </Abschnitt>
        </div>
      </div>

      <p className="text-sm text-grau">
        <Link href="/" className="hover:text-tinte hover:underline">
          Zurück zur Übersicht
        </Link>
      </p>
    </div>
  );
}

function nummer(index: number) {
  return String(index + 1).padStart(2, "0");
}

function Abschnitt({ id, nurAdmin = false, children }: { id: AbschnittId; nurAdmin?: boolean; children: React.ReactNode }) {
  const index = ABSCHNITTE.findIndex((a) => a.id === id);
  return (
    <section id={id} aria-labelledby={`${id}-titel`} className="scroll-mt-6 py-6">
      <p className="font-mono text-[11px] tracking-wider text-grau uppercase">{nummer(index)}</p>
      <h2 id={`${id}-titel`} className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold">
        {ABSCHNITTE[index].titel}
        {nurAdmin && (
          <span className="rounded-s bg-akzent-hell px-1.5 py-0.5 font-mono text-[11px] font-normal tracking-wider text-akzent uppercase">
            Nur Admin
          </span>
        )}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-6">{children}</div>
    </section>
  );
}

function Begriff({ children }: { children: React.ReactNode }) {
  return <span className="font-medium">{children}</span>;
}

function Recht({ aufgabe, mitarbeiter = false }: { aufgabe: string; mitarbeiter?: boolean }) {
  return (
    <tr>
      <td className="px-3 py-2">{aufgabe}</td>
      <td className="px-3 py-2 text-center font-mono text-xs">
        {mitarbeiter ? <span className="text-ok">Ja</span> : <span className="text-grau">–</span>}
      </td>
      <td className="px-3 py-2 text-center font-mono text-xs text-ok">Ja</td>
    </tr>
  );
}

function Zahl({ begriff, children }: { begriff: string; children: React.ReactNode }) {
  return (
    <div className="bg-flaeche px-3 py-2.5">
      <dt className="font-mono text-[11px] tracking-wider text-grau uppercase">{begriff}</dt>
      <dd className="mt-1 text-sm leading-5">{children}</dd>
    </div>
  );
}

function Schritte({ titel, schritte }: { titel: string; schritte: string[] }) {
  return (
    <div>
      <h3 className="font-medium">{titel}</h3>
      <ol className="mt-2 space-y-1.5">
        {schritte.map((schritt, i) => (
          <li key={schritt} className="flex gap-3">
            <span className="font-mono text-xs leading-6 text-grau tabular-nums">{i + 1}.</span>
            <span>{schritt}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Meldung({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-linie-stark pl-3">
      <dt className="font-medium">„{text}“</dt>
      <dd className="mt-0.5 text-grau">{children}</dd>
    </div>
  );
}
