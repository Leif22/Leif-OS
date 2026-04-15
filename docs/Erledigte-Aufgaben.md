# Leif OS – Erledigte Aufgaben (Umsetzungsstand)

Diese Datei fasst **bereits umgesetzte** Arbeiten aus Entwicklung und begleitender Doku zusammen. Sie ersetzt keine fachliche Spezifikation (`V1-Scope.md`, `Produkt-Anforderung.md`); sie dient der Orientierung im Team.

**Letzte inhaltliche Abstimmung:** 12.04.2026 (Abgleich mit Repo; Mail-UI entfernt, Microsoft nur Kalender)

---

## 1. Datenbank (Supabase)

- **Kern:** Bereiche, Tasks, Tags, Aufgaben-Personen-Bezüge (`20260411120000_core_tasks_areas.sql` und Folgemigrationen im gleichen Themenbereich, soweit im Repo vorhanden).
- **Inbox:** `inbox_items` inkl. Status- und Leselogik (`20260412120000_inbox_items.sql`).
- **Kalender:** `calendar_events` (`20260413120000_calendar_events.sql`).
- **Portfolio / Parqet:** OAuth- und Portfolio-Grundlagen (`20260414100000_parqet_oauth.sql`, `20260413130000_portfolio.sql`).
- **Microsoft Outlook:** OAuth-Anbindung (`20260415120000_microsoft_outlook_oauth.sql`).
- **Sparring:** Chats, Nachrichten, Trigger; FK Task → Sparring; Soft-Delete `deleted_at` (`20260416120000_sparring.sql`, `20260416130100_sparring_deleted_at.sql`).
- **Ergebnisse:** `results`, `result_areas` (`20260417100000_results.sql`).
- **Personen:** `persons`, `person_areas` (`20260418120000_persons.sql`).
- **Notizen:** `notes` inkl. Typen, optionalen Bezügen, RLS, Indizes (`20260419120000_notes.sql`).

---

## 2. Globaler App-Rahmen

- **Layout:** `AppShell` mit linker Navigation, Kopfzeile (Titel), globaler Suche und Plus-Menü.
- **Navigation:** u. a. Dashboard, Bereiche, Sparring, Inbox, Tasks, Kalender, Personen, Ergebnisse, Notizen (kein Mail-/Posteingang).
- **Globale Suche:** Textsuche über Tasks, Bereiche, Inbox-Inhalte, Kalendertermine, Notizen, Ergebnisse, Personen, Sparring-Chats; Navigation zu den Zielobjekten (inkl. `?person=…`, Ergebnis-Fragment, Sparring-Route).
- **Plus-Menü:** Schnellzugriffe: Task, Sparring, Person, Notiz, Ergebnis (fünf Einträge).

---

## 3. Dashboard

- **Empfohlene nächste Aufgabe:** Scoring (Gewichte wie in `docs/Implementation-Map.md`), Anzeige und Aktionen inkl. Feedback in `recommendation_log`.
- **Dashboard-Inbox:** ungelesene, ausstehende Inbox-Items.
- **Rechte Spalte:** heutige Termine, heute geplante Tasks, einfache **Kapazitäts-/Ampel-Logik** (8h-Tagesbudget), Portfolio-Hinweise / Parqet-Verbindung wo umgesetzt.

---

## 4. Tasks

- Globale Taskliste mit Filter/Sortiment, empfohlener Block oben (wie Dashboard).
- Task-Dialoge, Statusaktionen, Anbindung **Sparring → Task** (u. a. per Query-Parameter / Draft).
- Server Actions inkl. `updateTask`, `updateTaskStatus`, `logRecommendationFeedback`.

---

## 5. Inbox

- **Inbox-Seite** (`/inbox`) für Eingangsklärung; keine separate Mail-/Outlook-Posteingangs-Route mehr.
- Inbox-Workflows: u. a. Task, Sparring, Ergebnis, Verarbeitung — gemäß den im Repo umgesetzten Actions und UI (kein Outlook-E-Mail-Entwurf aus der Inbox).

---

## 6. Kalender

- Monats-, Wochen- und Tageslogik (Anker-Datum, Bereichsfetch).
- Synchronisation / Anzeige **Outlook** (Microsoft Graph), lokale Speicherung in `calendar_events`.
- **Termin anlegen** inkl. optional **in Outlook schreiben** (`graphCreateEvent` / Rollback bei DB-Fehler).

---

## 7. Sparring

- Übersicht (Filter nach offen/aktiv/gelöscht), neues Sparring, Chat-Detailseite (`/sparring/[id]`).
- Nachrichten, Aktionen Richtung Task / Ergebnis / Notiz (wo im Code verdrahtet).

---

## 8. Bereiche

- Bereichsliste und **Bereichs-Detailseite** mit Querschnitt zu Tasks, Ergebnissen, Sparring, Notizen usw. (gemäß `fetch-area-detail` und zugehöriger UI).

---

## 9. Personen

- Listenansicht, Anlage/Bearbeiten/Löschen, Bereichs-Zuordnungen.
- **Deep-Link aus globaler Suche:** `?person=<uuid>` öffnet den Bearbeiten-Dialog.

---

## 10. Ergebnisse

- Übersichtsseite tabellarisch; Verknüpfung zu Sparring-Herkunft wo vorhanden.
- **Deep-Link aus globaler Suche:** Sprung per Fragment `#<id>` zur Tabellenzeile (`id` am `<tr>`).

---

## 11. Notizen

- eigene Route `/notizen`, CRUD, Typen Notiz/Entwurf, optionale Bezüge (Bereich, Sparring, Inbox).
- Einbindung in **globales Plus**, **globale Suche**, **Bereichsseite**.

---

## 12. Doku (im Ordner `docs/`)

- Pflege und Abgleich u. a. von `Implementation-Map.md`, `Route-Map.md`, `Doku-Übersicht.md`, `Datenmodell.md`, `Produkt-Anforderung.md` (§7.2), zentrales `Änderungsprotokoll.md` — siehe dort **Eintrag #1** vom 11.04.2026.
- **12.04.2026:** Fachliche Neuaufstellung der Produktlogik und Synchronisation der Kerndokus (Eintrag **#4** im `Änderungsprotokoll.md`) — ohne begleitende Code- oder Schemaänderung.
- **12.04.2026 (Code):** Mail-UI und Outlook-Mail-Graph entfernt; OAuth-Scope nur Kalender; Doku angepasst (siehe `Änderungsprotokoll.md` **#5**).
- Diese Datei **`Erledigte-Aufgaben.md`** als laufende Übersicht erledigter Umsetzungsschritte; Verweis in **`Doku-Übersicht.md`**; Eintrag im zentralen **`Änderungsprotokoll.md`** (#2).

---

## 13. Bewusst knapp gehalten / Grenzen

- Keine vollständige Auflistung jeder Komponente oder jedes Commits.
- **`projects`:** im fachlichen Zielbild und in Teilen der Doku erwähnt; **eigene Tabelle / volle Projekt-UI** kann im Repo noch fehlen oder unvollständig sein — gegen `supabase/migrations` und `app/(app)` prüfen.
- Nicht-Ziele und spätere Ausbaustufen bleiben in **`V1-Scope.md`** und **`Produkt-Anforderung.md`**.

---

## Änderungsprotokoll (diese Datei)

| Datum      | Änderung                          | Grund        |
|-----------|-----------------------------------|-------------|
| 11.04.2026 | Erstversion                      | Transparenz des Umsetzungsstands |
| 11.04.2026 | Verweis Doku-Übersicht + Änderungsprotokoll ergänzt | Auffindbarkeit und Protokollierung |
| 12.04.2026 | Nav/Plus-Menü ohne Mail; Abschnitt 5 Inbox; Sparring-Aktionen ohne Outlook-Entwurf; Abstimmungsdatum | Abgleich mit Mail-Entfernung (Änderungsprotokoll **#5**) |
