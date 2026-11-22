# Auslieferung und Betrieb

Lagerblick läuft auf Vercel und nutzt zwei getrennte Supabase-Projekte.

| Umgebung | Next.js | Supabase-Projekt |
| --- | --- | --- |
| Lokal (`npm run dev`) | `.env.local` | `lagerblick-dev` |
| Vercel Preview (jeder Branch außer `main`) | Vercel-Variablen „Preview“ | `lagerblick-dev` |
| Vercel Production (`main`), <https://lagerblick-iota.vercel.app> | Vercel-Variablen „Production“ | `lagerblick-prod` |

Die Werte für `lagerblick-prod` stehen ausschließlich in den Production-Variablen von Vercel. Preview-Deployments kennen sie nicht und können deshalb nicht in die Produktionsdatenbank schreiben.

Die App braucht nur zwei Variablen, beide öffentlich (siehe `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Den Secret- oder `service_role`-Key niemals in Vercel oder im Repo eintragen.

## Ersteinrichtung

### 1. Supabase-Projekt für Produktion

1. Unter <https://supabase.com/dashboard> ein neues Projekt `lagerblick-prod` anlegen. Region wie beim Entwicklungsprojekt (EU). Das Datenbankpasswort im Passwortmanager ablegen.
2. **Authentication → Sign In / Providers:** „Allow new users to sign up“ ausschalten. „Confirm email“ kann an bleiben, Benutzer werden ohnehin bestätigt angelegt.
3. **Authentication → URL Configuration:** Site URL auf die Production-Adresse setzen, `https://lagerblick-iota.vercel.app`. Die Anmeldung läuft per Passwort ohne E-Mail-Links, der Wert wird erst für künftige E-Mails (Passwort zurücksetzen) gebraucht.
4. **Project Settings → API Keys:** Project URL und Publishable Key notieren (für Vercel, Schritt 3).
5. Migrationen einspielen, siehe [Migrationen auf Produktion](#migrationen-auf-produktion).
6. Ersten Admin anlegen, siehe [Benutzer anlegen](#benutzer-anlegen).

### 2. Vercel-Projekt

1. Unter <https://vercel.com> mit dem GitHub-Konto anmelden und **Add New → Project** wählen. Das Repository `lagerblick` importieren. Framework-Erkennung (Next.js) und Build-Einstellungen unverändert lassen.
2. Vor dem ersten Deployment die Umgebungsvariablen setzen (Schritt 3). Ohne sie schlagen Build oder Seitenaufrufe fehl.
3. Die Node.js-Version kommt aus `engines` in `package.json` (24.x).

### 3. Umgebungsvariablen in Vercel

Unter **Project → Settings → Environment Variables** beide Variablen je zweimal anlegen:

- Umgebung **Production**: Werte von `lagerblick-prod`.
- Umgebung **Preview**: Werte von `lagerblick-dev`.

Die URL endet auf `.supabase.co` (nicht `.supabase.com`, das ist das Dashboard). Vercel warnt beim Speichern wegen des Präfixes `NEXT_PUBLIC_`. Beide Werte sind bewusst öffentlich, als Typ deshalb **Config** wählen und den Präfix behalten.

Die Umgebung „Development“ bleibt leer, lokal gilt `.env.local`. Nach Änderungen an Variablen muss neu deployt werden (**Deployments → … → Redeploy**).

Preview-Deployments sind standardmäßig durch Vercel Authentication geschützt (**Settings → Deployment Protection**). Das so lassen.

## Migrationen auf Produktion

Migrationen gehen immer erst auf `lagerblick-dev`, werden dort mit `npm run check` geprüft und erst danach auf Produktion eingespielt. Das Einspielen auf Produktion geschieht von Hand, **bevor** der zugehörige Code auf `main` gemergt wird. Sonst läuft neuer Code kurzzeitig gegen das alte Schema.

Die Supabase-CLI ist immer mit genau einem Projekt verknüpft. Deshalb vor jedem Schritt prüfen, welches das ist.

```powershell
# Project-Refs beider Projekte anzeigen
npx supabase projects list

# Auf Produktion umstellen (fragt nach dem Datenbankpasswort von lagerblick-prod)
npx supabase link --project-ref <prod-ref>

# Zeigt nur an, welche Migrationen eingespielt würden
npx supabase db push --remote --dry-run

# Einspielen, wenn die Liste stimmt
npx supabase db push --remote

# Zurück auf Entwicklung, damit db:types und weitere Pushes wieder dev treffen
npx supabase link --project-ref <dev-ref>
```

In `projects list` markiert ein Punkt das gerade verknüpfte Projekt.

**Rückweg:** Migrationen sind nicht automatisch umkehrbar. Vor riskanten Änderungen an bestehenden Daten (Spalten löschen, Daten umschreiben) die Umkehr-Migration vorher schreiben und auf `lagerblick-dev` testen. Der Free-Tarif hat keine Point-in-Time-Recovery. Vor solchen Migrationen deshalb einen Dump ziehen: `npx supabase db dump --remote --data-only -f backup.sql` (verknüpftes Projekt, Datei nicht committen). Der Befehl nutzt intern `pg_dump`. Scheitert er ohne Docker, ersatzweise `pg_dump` mit dem Connection-String aus **Connect** im Dashboard verwenden (PostgreSQL-Client nötig).

## Benutzer anlegen

Es gibt keine öffentliche Registrierung. Benutzer legt ein Admin im Supabase-Dashboard an:

1. **Authentication → Users → Add user → Create new user**, E-Mail und Passwort eintragen, „Auto Confirm User“ anhaken.
2. Das Profil entsteht automatisch mit der Rolle `mitarbeiter`.
3. Für einen Admin im **SQL Editor** ausführen:

   ```sql
   update public.profiles set rolle = 'admin'
   where id = (select id from auth.users where email = '<e-mail>');
   ```

## Deployment

- **Preview:** Jeder Push auf einen anderen Branch als `main` erzeugt ein Preview-Deployment gegen `lagerblick-dev`. Die URL steht im Pull Request.
- **Production:** Ein Merge auf `main` löst das Production-Deployment aus. Vorher die nötigen Migrationen auf Produktion einspielen.
- **Zurückrollen:** In Vercel unter **Deployments** ein früheres Production-Deployment wählen und **Instant Rollback** ausführen. Das betrifft nur den Code, nicht die Datenbank.

## Abnahme nach dem Deployment

1. Mit einem Mitarbeiter-Konto anmelden. Die Übersicht lädt, unter Materialien fehlen die Admin-Aktionen.
2. Mit dem Admin-Konto ein Material `TEST Abnahme <Datum>` anlegen, einen Wareneingang über 5 Stück buchen. Die Materialliste zeigt Bestand 5.
3. Als Mitarbeiter das Material öffnen: Buchen lassen sich nur Wareneingang und Entnahme, Korrektur und Storno fehlen. Dass die Datenbank solche Aufrufe auch ohne Oberfläche verweigert, decken die DB-Tests gegen `lagerblick-dev` ab (gleiche Migrationen).
4. Den Wareneingang stornieren und das Material archivieren.
5. Registrierung prüfen: Ein Aufruf der Signup-API muss abgewiesen werden.

   ```powershell
   Invoke-RestMethod -Method Post -Uri "<NEXT_PUBLIC_SUPABASE_URL>/auth/v1/signup" `
     -Headers @{ apikey = "<publishable key>" } -ContentType "application/json" `
     -Body '{"email":"abnahme@lagerblick.test","password":"Test-123456"}'
   ```

   Erwartet: Fehler 422 mit dem Hinweis, dass Registrierungen abgeschaltet sind („Signups not allowed …“).

## Laufender Betrieb

- **Pausieren im Free-Tarif:** Supabase pausiert Free-Projekte nach etwa einer Woche ohne Aktivität. Ein pausiertes Projekt lässt sich im Dashboard mit **Restore project** wieder starten. Wenn Lagerblick täglich genutzt wird, passiert das nicht. Für den Dauerbetrieb den Pro-Tarif oder regelmäßige Aufrufe einplanen.
- **Datensicherung:** Der Free-Tarif hat keine herunterladbaren Backups. Regelmäßig einen Dump von Produktion ziehen (siehe [Migrationen auf Produktion](#migrationen-auf-produktion), einmal ohne `--data-only` für das Schema, einmal mit) und die Dateien außerhalb des Repos ablegen.
- **Updates:** Abhängigkeiten per Branch aktualisieren, mit `npm run check` und Preview-Deployment prüfen, dann mergen.
