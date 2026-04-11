# Leif OS – Datenmodell

---

## 0. Zweck dieses Dokuments

Diese Datei beschreibt das technische Datenmodell von Leif OS: Tabellen, Felder, Datentypen, Constraints, Statuswerte, Relationen und Indizes.

Das Datenmodell setzt das Objektmodell (→ Objektmodell.md) in konkrete Supabase-/PostgreSQL-Strukturen um. Jede Tabelle und jedes Feld muss auf eine fachliche Grundlage im Objektmodell zurückführbar sein.

**Leitfrage:** *Wie werden die fachlichen Objekte in der Datenbank abgebildet?*

**Gehört nicht hierher:** Fachliche Rollen und Beziehungslogik der Objekte (→ Objektmodell.md), Seiten, Routen, Navigation (→ Route-Map.md), Komponenten, Actions, Queries (→ Implementation-Map.md), Produktvision, Scope-Entscheidungen (→ Produkt-Anforderung.md, V1-Scope.md).

---

## 1. Allgemeine Konventionen

- **Namensgebung:** `snake_case` für Tabellen und Spalten.
- **Primärschlüssel:** `id uuid DEFAULT gen_random_uuid() PRIMARY KEY` (überall einheitlich).
- **Timestamps:** Jede Tabelle hat `created_at timestamptz DEFAULT now()` und `updated_at timestamptz DEFAULT now()`. Update-Trigger setzt `updated_at` automatisch.
- **Soft Delete:** Nicht vorgesehen in V1. Gelöschte Datensätze werden hart gelöscht. Ausnahme: Tasks mit Status `canceled` und Inbox-Items mit Status `discarded` bleiben als Datensatz erhalten.
- **Enums:** Status- und Typwerte werden als PostgreSQL-`text`-Spalten mit CHECK-Constraints abgebildet, nicht als Enum-Types (flexibler bei Migrationen).
- **User-Kontext:** Alle Tabellen erhalten `user_id uuid REFERENCES auth.users(id)` für RLS (Row Level Security). Leif OS ist ein Single-User-System, aber RLS wird trotzdem gesetzt.

---

## 2. Tabellen

### 2.1 `areas` (Bereiche)

Feste Kontexträume, nicht frei anlegbar.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | |
| `name` | `text` | NOT NULL, UNIQUE per `user_id` | z.B. „Hausverwaltung" |
| `slug` | `text` | NOT NULL, UNIQUE per `user_id` | URL-tauglicher Kurzname |
| `description` | `text` | | Optionale Beschreibung |
| `sort_order` | `integer` | NOT NULL, DEFAULT 0 | Reihenfolge in der Navigation |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Seed-Daten (V1):** Hausverwaltung, Finanzen Firma, Finanzen Privat, Familie/Privat, Gesundheit/Sport.

---

### 2.2 `projects` (Projekte / Themencontainer)

Untergeordnete Sammelpunkte innerhalb eines Bereichs.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | |
| `area_id` | `uuid` | FK → `areas(id)`, NOT NULL | Genau ein Bereich |
| `title` | `text` | NOT NULL | |
| `description` | `text` | | |
| `status` | `text` | NOT NULL, DEFAULT `'active'`, CHECK `IN ('active', 'completed')` | Zwei Statuswerte |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Index:** `(user_id, area_id, status)`

---

### 2.3 `tasks` (Aufgaben)

Operatives Arbeitsobjekt mit schlankem Statusmodell.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | |
| `area_id` | `uuid` | FK → `areas(id)`, NOT NULL | Genau ein Hauptbereich |
| `project_id` | `uuid` | FK → `projects(id)`, NULL | Optional: Projekt/Themencontainer |
| `title` | `text` | NOT NULL | |
| `description` | `text` | | |
| `status` | `text` | NOT NULL, DEFAULT `'open'`, CHECK `IN ('inbox', 'open', 'planned', 'done', 'canceled')` | |
| `priority` | `text` | NOT NULL, DEFAULT `'medium'`, CHECK `IN ('high', 'medium', 'low')` | |
| `due_date` | `date` | | Fälligkeit (macht allein keinen Task `planned`) |
| `planned_date` | `date` | | Bewusst geplanter Tag |
| `estimated_minutes` | `integer` | | Geschätzte Dauer in Minuten |
| `source_inbox_item_id` | `uuid` | FK → `inbox_items(id)`, NULL | Herkunfts-Inbox-Item |
| `source_sparring_chat_id` | `uuid` | FK → `sparring_chats(id)`, NULL | Herkunfts-Sparring |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Indizes:**
- `(user_id, status)`
- `(user_id, area_id, status)`
- `(user_id, planned_date)` WHERE `status = 'planned'`

---

### 2.4 `task_tags` (Task-Tags, Zuordnungstabelle)

Frei kombinierbare Tags für Tasks (n:m über Tag-Name).

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | |
| `task_id` | `uuid` | FK → `tasks(id)` ON DELETE CASCADE, NOT NULL | |
| `tag` | `text` | NOT NULL | Freitext-Tag |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Unique Constraint:** `(task_id, tag)` – kein doppeltes Tag pro Task.
**Index:** `(user_id, tag)` für globale Tag-Suche.

---

### 2.5 `task_persons` (Task-Personen-Zuordnung)

n:m-Zuordnung von Personen zu Tasks.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `task_id` | `uuid` | FK → `tasks(id)` ON DELETE CASCADE, NOT NULL | |
| `person_id` | `uuid` | FK → `persons(id)` ON DELETE CASCADE, NOT NULL | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Unique Constraint:** `(task_id, person_id)`

---

### 2.6 `sparring_chats` (Sparring-Chats)

Gesprächsinstanzen für Sparring.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | |
| `title` | `text` | | Automatisch oder manuell gesetzt |
| `type` | `text` | NOT NULL, DEFAULT `'free'`, CHECK `IN ('free', 'context', 'project')` | Sparring-Typ |
| `area_id` | `uuid` | FK → `areas(id)`, NULL | Optional: Bereichsbezug |
| `project_id` | `uuid` | FK → `projects(id)`, NULL | Optional: Projektbezug |
| `context_task_id` | `uuid` | FK → `tasks(id)`, NULL | Optional: Task-Kontext |
| `context_inbox_item_id` | `uuid` | FK → `inbox_items(id)`, NULL | Optional: Inbox-Kontext |
| `is_open` | `boolean` | NOT NULL, DEFAULT `true` | Offen oder abgeschlossen |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Index:** `(user_id, is_open, updated_at DESC)`

---

### 2.7 `sparring_messages` (Sparring-Nachrichten)

Einzelne Nachrichten innerhalb eines Sparring-Chats.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `chat_id` | `uuid` | FK → `sparring_chats(id)` ON DELETE CASCADE, NOT NULL | |
| `role` | `text` | NOT NULL, CHECK `IN ('user', 'assistant', 'system')` | |
| `content` | `text` | NOT NULL | Nachrichteninhalt |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Index:** `(chat_id, created_at)`

**Hinweis zu `role = 'system'`:** System-Messages werden beim Chat-Start als initiales System-Prompt eingefügt (Rollenanweisung, Kontext-Informationen). Sie werden nicht in der Chat-UI angezeigt, sondern nur an die KI-API mitgesendet. Siehe Implementation-Map Section 5.3.

---

### 2.8 `inbox_items` (Inbox-Einträge)

Ungeklärte Eingänge aus externen Quellen.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | |
| `content` | `text` | NOT NULL | Eingangsinhalt |
| `source` | `text` | NOT NULL, DEFAULT `'telegram'` | Quellkanal |
| `source_ref` | `text` | | Externe Referenz-ID (z.B. Telegram-Message-ID) |
| `is_read` | `boolean` | NOT NULL, DEFAULT `false` | Gelesen/Ungelesen |
| `status` | `text` | NOT NULL, DEFAULT `'pending'`, CHECK `IN ('pending', 'processed', 'discarded')` | Verarbeitungsstatus |
| `processed_as` | `text` | CHECK `IN ('task', 'sparring', 'result', 'draft', 'discarded')` | Was wurde daraus? |
| `processed_ref_id` | `uuid` | | ID des erzeugten Folgeobjekts (Task, Sparring-Chat, Ergebnis oder Notiz) |
| `metadata` | `jsonb` | DEFAULT `'{}'` | Zusätzliche Quell-Metadaten |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Indizes:**
- `(user_id, status)` WHERE `status = 'pending'`
- `(user_id, is_read)` WHERE `status = 'pending'`

**Hinweis zu `processed_ref_id`:** Wird bei jeder Inbox-Überführung mit der ID des erzeugten Folgeobjekts befüllt (siehe Implementation-Map Section 3.2). Kein FK-Constraint, da das Ziel je nach `processed_as` in verschiedenen Tabellen liegt.

---

### 2.9 `results` (Ergebnisse)

Strukturierte, dauerhaft relevante Resultate.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | |
| `title` | `text` | NOT NULL | |
| `content` | `text` | | Ausführlicher Inhalt |
| `type` | `text` | NOT NULL, CHECK `IN ('insight', 'decision')` | Erkenntnis oder Entscheidung |
| `project_id` | `uuid` | FK → `projects(id)`, NULL | Optional: Projektzuordnung |
| `source_sparring_chat_id` | `uuid` | FK → `sparring_chats(id)`, NULL | Herkunft: Sparring |
| `source_inbox_item_id` | `uuid` | FK → `inbox_items(id)`, NULL | Herkunft: Inbox |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Index:** `(user_id, type)`

---

### 2.10 `result_areas` (Ergebnis-Bereichs-Zuordnung)

n:m-Zuordnung von Ergebnissen zu Bereichen.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `result_id` | `uuid` | FK → `results(id)` ON DELETE CASCADE, NOT NULL | |
| `area_id` | `uuid` | FK → `areas(id)` ON DELETE CASCADE, NOT NULL | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Unique Constraint:** `(result_id, area_id)`

---

### 2.11 `notes` (Notizen inkl. Entwürfe)

Kurzlebige, vorläufige Informationen. Entwürfe als Untertyp.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | |
| `content` | `text` | NOT NULL | |
| `type` | `text` | NOT NULL, DEFAULT `'note'`, CHECK `IN ('note', 'draft')` | Notiz oder Entwurf |
| `area_id` | `uuid` | FK → `areas(id)`, NULL | Optional: Bereichszuordnung |
| `project_id` | `uuid` | FK → `projects(id)`, NULL | Optional: Projektzuordnung |
| `source_sparring_chat_id` | `uuid` | FK → `sparring_chats(id)`, NULL | Herkunft: Sparring |
| `source_inbox_item_id` | `uuid` | FK → `inbox_items(id)`, NULL | Herkunft: Inbox |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Index:** `(user_id, type)`

**Hinweis:** Notizen haben kein `title`-Feld. In der globalen Suche und in Listenansichten werden Notizen mit einem Content-Snippet (erste ~60 Zeichen) dargestellt. Siehe Implementation-Map Section 1.3.

---

### 2.12 `persons` (Personen)

Einfache Personenbasis mit Stammdaten und Erinnerungsbezug.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | |
| `first_name` | `text` | NOT NULL | |
| `last_name` | `text` | NOT NULL | |
| `category` | `text` | | z.B. „Mieter", „Dienstleister", „Familie" |
| `address` | `text` | | Optionale Anschrift |
| `birthday` | `date` | | Geburtstag für Erinnerungen |
| `birthday_reminder_days` | `integer` | DEFAULT 0 | Tage vor Geburtstag für Vorerinnerung |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Index:** `(user_id, last_name, first_name)`

---

### 2.13 `person_areas` (Personen-Bereichs-Zuordnung)

n:m-Zuordnung von Personen zu Bereichen.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `person_id` | `uuid` | FK → `persons(id)` ON DELETE CASCADE, NOT NULL | |
| `area_id` | `uuid` | FK → `areas(id)` ON DELETE CASCADE, NOT NULL | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Unique Constraint:** `(person_id, area_id)`

---

### 2.14 `files` (Dateien)

Dokumente und Anhänge mit mindestens einer Zuordnung.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | |
| `name` | `text` | NOT NULL | Dateiname |
| `mime_type` | `text` | | MIME-Typ |
| `storage_path` | `text` | NOT NULL | Pfad in Supabase Storage |
| `size_bytes` | `bigint` | | Dateigröße |
| `area_id` | `uuid` | FK → `areas(id)`, NULL | |
| `project_id` | `uuid` | FK → `projects(id)`, NULL | |
| `task_id` | `uuid` | FK → `tasks(id)`, NULL | |
| `result_id` | `uuid` | FK → `results(id)`, NULL | |
| `sparring_chat_id` | `uuid` | FK → `sparring_chats(id)`, NULL | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Index:** `(user_id)`

**Hinweis Mindest-Zuordnung:** Fachliche Regel aus Objektmodell: „Eine Datei existiert nie losgelöst – jede Datei braucht mindestens eine Zuordnung." Diese Regel wird auf **Application-Level** durchgesetzt (Pre-Insert-Check), nicht per DB-Constraint. Ein CHECK über mehrere nullable FK-Spalten (`COALESCE(area_id, project_id, task_id, result_id, sparring_chat_id) IS NOT NULL`) wäre technisch möglich, aber fragil bei Migrationen und schwer wartbar. Die Application-Level-Validierung ist robuster und gibt bessere Fehlermeldungen.

**Hinweis V1-Kardinalität:** Die FK-Spalten bilden n:1-Zuordnungen ab (eine Datei gehört zu genau einem Bereich, einem Task etc.). Das Objektmodell beschreibt im Endbild n:m; für V1 ist n:1 ausreichend. Post-V1 kann bei Bedarf auf Junction-Tables erweitert werden.

---

### 2.15 `calendar_events` (Kalendertermine)

Zeitbezogene Ereignisse aus Outlook/Graph oder eigene Anlage.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | |
| `title` | `text` | NOT NULL | |
| `description` | `text` | | |
| `start_time` | `timestamptz` | NOT NULL | |
| `end_time` | `timestamptz` | NOT NULL | |
| `is_all_day` | `boolean` | NOT NULL, DEFAULT `false` | |
| `source` | `text` | NOT NULL, DEFAULT `'leifos'`, CHECK `IN ('outlook', 'leifos')` | |
| `outlook_event_id` | `text` | | Externe ID für Sync |
| `area_id` | `uuid` | FK → `areas(id)`, NULL | Optional: Bereichsbezug |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Indizes:**
- `(user_id, start_time, end_time)`
- `(outlook_event_id)` WHERE `source = 'outlook'` (Upsert-Logik)

**Hinweis V1-Kardinalität:** `area_id` bildet eine n:1-Zuordnung ab (ein Termin gehört zu genau einem Bereich). Post-V1 kann bei Bedarf auf n:m über eine Junction-Table erweitert werden.

---

### 2.16 `portfolio_snapshots` (Portfolio-Snapshots)

Gecachte Gesamtdaten eines Parqet-Portfolios.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | |
| `parqet_portfolio_id` | `text` | NOT NULL | Externe Parqet-ID |
| `name` | `text` | NOT NULL | Portfolio-Name (z.B. „Scalable") |
| `total_value` | `numeric(14,2)` | NOT NULL | Gesamtwert |
| `currency` | `text` | NOT NULL, DEFAULT `'EUR'` | |
| `total_gain_loss` | `numeric(14,2)` | | Unrealisierter Gewinn/Verlust |
| `total_gain_loss_pct` | `numeric(8,4)` | | In Prozent |
| `ttwror` | `numeric(8,4)` | | True Time-Weighted Rate of Return |
| `xirr` | `numeric(8,4)` | | Internal Rate of Return |
| `fetched_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Zeitpunkt des API-Abrufs |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Unique Constraint:** `(user_id, parqet_portfolio_id)` – Upsert-Logik: ein Snapshot pro Portfolio, wird bei Refresh überschrieben.
**Index:** `(user_id)`

---

### 2.17 `portfolio_positions` (Portfolio-Positionen)

Einzelpositionen innerhalb eines Portfolio-Snapshots.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `snapshot_id` | `uuid` | FK → `portfolio_snapshots(id)` ON DELETE CASCADE, NOT NULL | |
| `name` | `text` | NOT NULL | Positionsname |
| `isin` | `text` | | ISIN |
| `ticker` | `text` | | Ticker-Symbol |
| `shares` | `numeric(14,6)` | | Stückzahl |
| `current_value` | `numeric(14,2)` | NOT NULL | Aktueller Wert |
| `purchase_value` | `numeric(14,2)` | | Kaufwert |
| `gain_loss` | `numeric(14,2)` | | Absoluter Gewinn/Verlust |
| `gain_loss_pct` | `numeric(8,4)` | | Prozentualer Gewinn/Verlust |
| `weight_pct` | `numeric(8,4)` | | Anteil am Portfolio |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Index:** `(snapshot_id)`

---

### 2.18 `recommendation_log` (Empfehlungs-Feedback)

Protokolliert jede Empfehlung der „Empfohlenen nächsten Aufgabe" und die Nutzerreaktion darauf. Dient in V1 ausschließlich der Datensammlung; Auswertung und adaptive Gewichtung sind Post-V1.

| Spalte | Typ | Constraint | Beschreibung |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `auth.users(id)`, NOT NULL | |
| `recommended_task_id` | `uuid` | FK → `tasks(id)` ON DELETE SET NULL, NULL | Der empfohlene Task (SET NULL falls Task später gelöscht) |
| `score` | `numeric(6,4)` | NOT NULL | Berechneter Gesamtscore zum Zeitpunkt der Empfehlung |
| `score_priority` | `numeric(4,2)` | | Teilscore Priorität (Gewicht 0,40) |
| `score_due` | `numeric(4,2)` | | Teilscore Fälligkeitsdruck (Gewicht 0,30) |
| `score_today` | `numeric(4,2)` | | Teilscore Heuteplanung (Gewicht 0,20) |
| `score_age` | `numeric(4,2)` | | Teilscore Alter (Gewicht 0,10) |
| `action` | `text` | NOT NULL, CHECK `IN ('accepted', 'skipped', 'other_chosen')` | Nutzerreaktion auf die Empfehlung |
| `chosen_task_id` | `uuid` | FK → `tasks(id)` ON DELETE SET NULL, NULL | Nur bei `action = 'other_chosen'`: welcher Task stattdessen gewählt wurde |
| `created_at` | `timestamptz` | DEFAULT `now()` | Zeitpunkt der Empfehlung/Reaktion |

**Indizes:**
- `(user_id, created_at DESC)` – chronologische Auswertung
- `(user_id, action)` – Aggregation nach Reaktionstyp

**Hinweise:**
- `ON DELETE SET NULL` statt CASCADE: Auch wenn ein Task gelöscht wird, bleibt der Log-Eintrag als historische Datenbasis erhalten.
- Die `score_*`-Einzelwerte ermöglichen Post-V1 eine gezielte Analyse, welche Faktoren bei Ablehnungen/Überspringungen dominiert haben.
- In V1 wird nur geschrieben, nie gelesen. Keine UI, keine Auswertung, keine Dashboards auf dieser Tabelle.
- Kein `updated_at`: Log-Einträge sind immutable (Append-only).

---

## 3. Erlaubte Statuswerte – Zusammenfassung

| Tabelle | Spalte | Erlaubte Werte |
|---|---|---|
| `tasks` | `status` | `inbox`, `open`, `planned`, `done`, `canceled` |
| `tasks` | `priority` | `high`, `medium`, `low` |
| `projects` | `status` | `active`, `completed` |
| `sparring_chats` | `type` | `free`, `context`, `project` |
| `sparring_messages` | `role` | `user`, `assistant`, `system` |
| `inbox_items` | `status` | `pending`, `processed`, `discarded` |
| `inbox_items` | `processed_as` | `task`, `sparring`, `result`, `draft`, `discarded` |
| `results` | `type` | `insight`, `decision` |
| `notes` | `type` | `note`, `draft` |
| `calendar_events` | `source` | `outlook`, `leifos` |
| `recommendation_log` | `action` | `accepted`, `skipped`, `other_chosen` |

---

## 4. Row Level Security (RLS)

Für jede Tabelle mit eigenem `user_id`-Feld gilt:

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_isolation" ON <table>
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Tabellen mit eigenem `user_id`

`areas`, `projects`, `tasks`, `task_tags`, `inbox_items`, `sparring_chats`, `results`, `notes`, `persons`, `files`, `calendar_events`, `portfolio_snapshots`, `recommendation_log` – für diese Tabellen greift die Standard-Policy direkt.

### Tabellen ohne eigenes `user_id` (Junction-Tables und Kindtabellen)

Folgende Tabellen haben kein eigenes `user_id`-Feld. Die RLS-Isolation wird über JOINs auf die Elterntabelle sichergestellt:

| Tabelle | Elterntabelle für RLS-JOIN | Begründung |
|---|---|---|
| `sparring_messages` | `sparring_chats` (über `chat_id`) | Messages gehören immer zu einem Chat |
| `portfolio_positions` | `portfolio_snapshots` (über `snapshot_id`) | Positionen gehören immer zu einem Snapshot |
| `task_persons` | `tasks` (über `task_id`) | Zuordnung gehört zum Task |
| `result_areas` | `results` (über `result_id`) | Zuordnung gehört zum Ergebnis |
| `person_areas` | `persons` (über `person_id`) | Zuordnung gehört zur Person |

**Implementierungsoption:** Alternativ kann `user_id` in diese Tabellen denormalisiert werden, um einfache Policies ohne JOINs zu ermöglichen. Trade-off: Redundanz vs. Policy-Einfachheit. Entscheidung bei Implementierung.

---

## 5. Automatische Trigger

### 5.1 `updated_at`-Trigger

Für alle Tabellen mit `updated_at`-Spalte:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pro Tabelle:
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON <table>
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

**Ausnahme:** `recommendation_log` hat kein `updated_at` – Einträge sind immutable (Append-only).

---

## 6. Migrationshinweise

- Alle Status- und Typwerte als `text` mit CHECK-Constraint statt PostgreSQL ENUM → einfachere Migrationen.
- Portfolio-Tabellen verwenden Upsert-Logik (ON CONFLICT DO UPDATE) statt Insert+Delete.
- Inbox-Items mit Status `processed` oder `discarded` bleiben als Datensatz erhalten (kein Soft Delete, aber auch kein Hard Delete nach Verarbeitung).
- `processed_ref_id` auf `inbox_items` hat bewusst keinen FK-Constraint, da das Ziel je nach `processed_as` in verschiedenen Tabellen liegt (polymorphe Referenz).
- V1-Vereinfachung bei `files` und `calendar_events`: n:1-Zuordnungen über einfache FK-Spalten. Migration auf n:m (Junction-Tables) ist Post-V1 möglich, ohne bestehende Daten zu verlieren (FK-Spalten bleiben als Default-Zuordnung erhalten).

---

## Änderungsprotokoll

| Datum | Änderung | Grund |
|---|---|---|
| 2026-04-11 | RLS Section 4 erweitert: `task_persons`, `result_areas`, `person_areas` als Junction-Tables ohne `user_id` explizit aufgelistet, Isolation-Strategie dokumentiert | Konsistenz-Check: Diese Tabellen fehlten in der RLS-Ausnahmeliste. |
| 2026-04-11 | `files` Section 2.14: Hinweis zur Mindest-Zuordnung (Application-Level-Enforcement) und V1-Kardinalität (n:1) ergänzt | Abgleich mit Objektmodell: Regel „Datei existiert nie losgelöst" war undokumentiert; Kardinalität n:m→n:1 im Objektmodell korrigiert. |
| 2026-04-11 | `calendar_events` Section 2.15: Hinweis zur V1-Kardinalität (n:1 für area_id) ergänzt | Abgleich mit Objektmodell: Kardinalität n:m→n:1 korrigiert. |
| 2026-04-11 | `inbox_items` Section 2.8: Hinweis zu `processed_ref_id` Befüllung und fehlendem FK-Constraint ergänzt | Feld existierte, wurde aber nirgends beschrieben. Abgleich mit Implementation-Map Section 3.2. |
| 2026-04-11 | `sparring_messages` Section 2.7: Hinweis zu `role = 'system'` Verwendung ergänzt | Abgleich mit Implementation-Map Section 5.3. |
| 2026-04-11 | `notes` Section 2.11: Hinweis zu fehlendem `title`-Feld und Anzeige-Logik ergänzt | Abgleich mit Implementation-Map Section 1.3 (Globale Suche). |
| 2026-04-11 | Section 6 Migrationshinweise: Eintrag zu `processed_ref_id` (polymorphe Referenz) und V1-Vereinfachung files/calendar_events ergänzt | Dokumentation der bewussten Design-Entscheidungen für spätere Migrationsplanung. |
