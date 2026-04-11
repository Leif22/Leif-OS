# Leif OS – Implementation Map

---

## 0. Zweck dieses Dokuments

Diese Datei beschreibt die geplante technische Verortung jeder V1-Funktion: Auf welcher Seite lebt sie, welche Serveraktionen / Queries sind vorgesehen, welche Tabellen werden dabei angefasst und welcher Workflow gilt.

Die Implementation Map ist ein **Stub** – sie plant die Verortung, enthält aber keinen konkreten Code, keine Dateipfade und keine Komponentenbäume. Sie dient als Brücke zwischen fachlicher Doku (Produkt-Anforderung, Route-Map, Objektmodell, Datenmodell) und der späteren Umsetzung.

**Leitfrage:** *Welche Funktion wird wo gebaut, was braucht sie serverseitig, und welche Tabellen und Abläufe greifen?*

**Gehört nicht hierher:** Fachliche Anforderungen (→ Produkt-Anforderung.md), fachliche Seitenstruktur (→ Route-Map.md), Objektrollen und Beziehungen (→ Objektmodell.md), Tabellenstrukturen (→ Datenmodell.md), konkreter Code, Dateipfade, Komponentennamen.

---

## 1. Globaler App-Rahmen

### 1.1 Linke Navigation (Maintabs)

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Layout-Rahmen (auf jeder Seite sichtbar) |
| **Queries** | Keine eigenen Daten-Queries – rein statische Navigation |
| **Tabellen** | Keine |
| **Workflow** | Statische Link-Liste: Dashboard, Bereiche, Sparring, Inbox, Tasks, Kalender, Personen. Aktiver Tab wird visuell hervorgehoben. |

### 1.2 Globale Kopfzeile

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Layout-Rahmen (auf jeder Seite sichtbar) |
| **Bereiche** | Links: Produktkennung „Leif OS". Mitte: dynamischer Seitentitel. Rechts: Globale Suche + Plus-Button. |
| **Queries** | Seitentitel: aus Routing-Kontext abgeleitet, keine DB-Query |
| **Tabellen** | Keine |

### 1.3 Globale Suche

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Kopfzeile (rechter Bereich), öffnet Overlay/Dropdown |
| **Queries** | `searchGlobal(query)` – Volltextsuche über `tasks`, `results`, `notes`, `persons`, `sparring_chats`, `projects` |
| **Tabellen** | `tasks`, `results`, `notes`, `persons`, `sparring_chats`, `projects` (nur Lese-Zugriff) |
| **Workflow** | Eingabe → Debounced Query → Ergebnisliste mit Typ-Icon und Titel/Snippet → Klick navigiert zum Zielobjekt. **Notizen haben keinen Titel** – sie werden mit Content-Snippet (erste ~60 Zeichen) angezeigt. V1 bewusst schlank: Textsuche, kein Befehls- oder KI-Feld. |

### 1.4 Globaler Plus-Button (Schnellanlage)

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Kopfzeile (rechter Bereich), öffnet kleines Menü |
| **Aktionen** | `createTask(data)`, `createSparringChat(data)`, `createPerson(data)`, `createNote(data)`, `createResult(data)` |
| **Tabellen** | `tasks`, `sparring_chats`, `persons`, `notes`, `results`, `task_tags`, `result_areas` |
| **Workflow** | Klick auf Plus → Menü mit 5 Einträgen (Task anlegen, Sparring starten, Person anlegen, Notiz anlegen, Ergebnis anlegen) → Eintrag öffnet jeweils ein Dialog-/Sheet-Formular → Speichern schreibt Datensatz → Bestätigung/Navigation. |

---

## 2. Dashboard

### 2.1 Empfohlene nächste Aufgabe

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Dashboard – mittlere Hauptspalte, oberster Block |
| **Queries** | `getRecommendedTask(userId)` – liest alle Tasks mit `status IN ('open', 'planned')`, berechnet pro Task einen Score und liefert den Task mit dem höchsten Score zurück |
| **Tabellen (Lese)** | `tasks`, `areas` |
| **Aktionen** | Dieselben Task-Aktionen wie auf der Tasks-Seite: `updateTaskStatus(id, status)`, `updateTask(id, data)`. Zusätzlich: `logRecommendationFeedback(data)` – schreibt Nutzerreaktion auf die Empfehlung (siehe Feedback-Logging). |
| **Tabellen (Schreib)** | `tasks`, `task_tags`, `recommendation_log` |
| **Workflow** | Seite lädt → Query berechnet Score pro Task → Task mit höchstem Score wird als Fokusblock angezeigt (Titel, Bereich, Priorität, Fälligkeit) → Inline-Aktionen: Status ändern, bearbeiten → Nutzerreaktion wird in `recommendation_log` protokolliert. Kein Task vorhanden → leerer Zustand mit Hinweis. |

#### Scoring-Logik (V1)

Die Query `getRecommendedTask` berechnet pro offenem/geplantem Task einen deterministischen Score aus vier Faktoren mit festen Gewichten:

| Faktor | Gewicht | Eingabe | Normalisierung |
|---|---|---|---|
| **Priorität** | 0,40 | `priority` (high / medium / low) | high = 1,0 · medium = 0,5 · low = 0,1 |
| **Fälligkeitsdruck** | 0,30 | `due_date` relativ zu heute | Überfällig = 1,0 · heute = 0,9 · morgen = 0,7 · 3 Tage = 0,5 · 7 Tage = 0,2 · > 14 Tage oder ohne = 0,0. Skalierung dazwischen linear. |
| **Heuteplanung** | 0,20 | `planned_date = today` | ja = 1,0 · nein = 0,0 |
| **Alter** | 0,10 | Tage seit `created_at` | Normalisiert: `min(age_days / 30, 1.0)` – nach 30 Tagen gedeckelt auf 1,0 |

**Score = 0,40 × Priorität + 0,30 × Fälligkeitsdruck + 0,20 × Heuteplanung + 0,10 × Alter**

Bei Score-Gleichstand entscheidet die höhere Prioritätsstufe, dann die nähere Fälligkeit, dann das höhere Alter.

Die Gewichte sind in V1 fest gesetzt und nicht durch den Nutzer konfigurierbar. Die Werte wurden so gewählt, dass manuelle Priorisierung (Priorität) dominiert, zeitlicher Druck (Fälligkeit) automatisch eskaliert und bewusste Tagesplanung belohnt wird. Das Alter wirkt als leichter Anti-Vergessens-Faktor.

#### Feedback-Logging (V1 – passiv)

Jede Empfehlung wird protokolliert, um später (Post-V1) lernende Gewichte zu ermöglichen:

| Aspekt | Beschreibung |
|---|---|
| **Aktion** | `logRecommendationFeedback(data)` → Insert `recommendation_log` |
| **Tabelle** | `recommendation_log` |
| **Felder** | `user_id`, `recommended_task_id`, `score` (Gesamtscore), `score_priority`, `score_due`, `score_today`, `score_age` (vier Teilscores), `action` (accepted / skipped / other_chosen), `chosen_task_id` (nullable), `created_at` |
| **Auslöser** | Nutzer nimmt empfohlenen Task an (Status ändern / bearbeiten → accepted), überspringt ihn (navigiert weg ohne Aktion → skipped), oder wählt einen anderen Task aus der Liste (→ other_chosen mit `chosen_task_id`). |
| **V1-Nutzung** | Nur Schreiben. Keine Auswertung, kein Einfluss auf Score-Berechnung. |
| **Post-V1** | Datenbasis für adaptive Gewichte: Regression über gesammelte Feedback-Daten → Gewichte (0,40 / 0,30 / 0,20 / 0,10) werden durch gelernte Werte ersetzt. Die vier Teilscores ermöglichen gezielte Analyse, welche Faktoren bei Ablehnungen dominiert haben. Zielgröße: ≥ 50–100 protokollierte Entscheidungen als Mindest-Trainingsgrundlage. |

### 2.2 Dashboard-Inbox (nur Ungelesene)

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Dashboard – mittlere Hauptspalte, unterhalb des Fokusblocks |
| **Queries** | `getUnreadInboxItems(userId)` – `inbox_items` WHERE `status = 'pending'` AND `is_read = false`, sortiert nach `created_at DESC` |
| **Tabellen** | `inbox_items` (Lese-Zugriff) |
| **Aktionen** | `markInboxItemRead(id)` – setzt `is_read = true` → Item verschwindet aus Dashboard, bleibt auf Inbox-Seite |
| **Tabellen (Schreib)** | `inbox_items` |
| **Workflow** | Seite lädt → Liste ungelesener Items → Pro Item: Inhalt, Quelle, Zeitpunkt → Aktion „Als gelesen markieren" → Item fällt aus der Liste. Weitere Verarbeitungsaktionen führen zur Inbox-Seite oder öffnen entsprechende Dialoge. |

### 2.3 Kapazität heute (rechte Spalte)

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Dashboard – rechte Infospalte, oberster Block |
| **Queries** | `getTodayCapacity(userId, date)` – kombiniert: Anzahl/Dauer heutiger Termine aus `calendar_events` + Anzahl/geschätzte Dauer geplanter Tasks aus `tasks` WHERE `planned_date = today` |
| **Tabellen** | `calendar_events`, `tasks` (Lese-Zugriff) |
| **Workflow** | Seite lädt → Query berechnet belegte Zeit vs. verfügbare Zeit → Anzeige als kompakte Bar oder Ampel-Logik (grün/gelb/rot). **V1-Default: Tageskontingent = 8 Stunden** als fester Wert. Post-V1 über Einstellungen konfigurierbar (individuelle Arbeitszeit, Wochentag-Differenzierung). |

### 2.4 Heute-Block (rechte Spalte)

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Dashboard – rechte Infospalte, mittlerer Block |
| **Queries** | `getTodayEvents(userId, date)` – Termine aus `calendar_events` WHERE heute. `getTodayPlannedTasks(userId, date)` – Tasks aus `tasks` WHERE `planned_date = today` AND `status IN ('planned', 'open')` |
| **Tabellen** | `calendar_events`, `tasks` (Lese-Zugriff) |
| **Workflow** | Seite lädt → Zwei Listen: Termine (chronologisch) + geplante Tasks → kompakte Darstellung jeweils mit Titel und Zeitinfo. |

### 2.5 Finanzblick / Portfolio-Blick (rechte Spalte)

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Dashboard – rechte Infospalte, unterer Block |
| **Queries** | `getPortfolioOverview(userId)` – alle `portfolio_snapshots` des Users → Summe `total_value` als Gesamtvermögen + Liste pro Portfolio mit Name und Wert |
| **Aktionen** | `refreshPortfolios(userId)` – ruft Parqet Connect API ab, Upsert in `portfolio_snapshots`, Delete+Insert in `portfolio_positions` |
| **Tabellen** | `portfolio_snapshots`, `portfolio_positions` |
| **Workflow** | Seite lädt → Cached Snapshots anzeigen → Gesamtvermögen + Aufgliederung pro Portfolio → Manueller Refresh-Button → API-Call → Upsert → UI aktualisiert. Kein automatischer periodischer Refresh in V1. |

---

## 3. Inbox

### 3.1 Inbox-Liste (Hauptansicht)

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Inbox |
| **Queries** | `getPendingInboxItems(userId)` – `inbox_items` WHERE `status = 'pending'`, sortiert nach `created_at DESC`. Optional: `getProcessedInboxItems(userId)` für einblendbare verarbeitete Items. |
| **Tabellen** | `inbox_items` (Lese-Zugriff) |
| **Workflow** | Standardansicht zeigt alle ungeklärten Items unabhängig vom Gelesen-Status. Toggle für verarbeitete Items (ausgeblendet per Default). Pro Item: Inhalt, Quelle, Metadaten, Gelesen-Status, Aktions-Buttons. |

### 3.2 Inbox-Item-Aktionen

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Inbox (pro Item) |
| **Aktionen** | |
| → Als Task anlegen | `createTaskFromInbox(inboxItemId, taskData)` → Insert `tasks` (status=**inbox**, source_inbox_item_id) + `task_tags` → Update `inbox_items` (status → processed, processed_as → task, **processed_ref_id → neue Task-ID**) |
| → In Sparring öffnen | `createSparringFromInbox(inboxItemId)` → Insert `sparring_chats` (type=context, context_inbox_item_id) → Update `inbox_items` (status → processed, processed_as → sparring, **processed_ref_id → neue Chat-ID**) |
| → Als Ergebnis übernehmen | `createResultFromInbox(inboxItemId, resultData)` → Insert `results` + `result_areas` → Update `inbox_items` (status → processed, processed_as → result, **processed_ref_id → neue Result-ID**) |
| → Als Entwurf erstellen | `createDraftFromInbox(inboxItemId, noteData)` → Insert `notes` (type=draft, source_inbox_item_id) → Update `inbox_items` (status → processed, processed_as → draft, **processed_ref_id → neue Note-ID**) |
| → Verwerfen | `discardInboxItem(inboxItemId)` → Update `inbox_items` (status → discarded, processed_as → discarded) |
| → Als gelesen markieren | `markInboxItemRead(id)` → Update `is_read = true` |
| **Tabellen (Schreib)** | `inbox_items`, `tasks`, `task_tags`, `sparring_chats`, `results`, `result_areas`, `notes` |
| **Workflow** | Nutzer sichtet Item → wählt Aktion → Dialog/Sheet mit vorausgefüllten Feldern → Bestätigung → Folgeobjekt wird erzeugt, `processed_ref_id` wird auf die ID des erzeugten Objekts gesetzt, Inbox-Item als verarbeitet markiert → Item fällt aus Standardansicht. |

**Hinweis zum Start-Status bei Task-Erstellung aus Inbox:** Tasks, die über `createTaskFromInbox` erzeugt werden, starten mit Status `inbox` (nicht `open`). Damit wird signalisiert, dass der Task zwar aus dem Eingang erzeugt, aber noch nicht endgültig einsortiert/priorisiert ist. Manuell angelegte Tasks (über Plus-Button, Tasks-Seite, Bereich, Projekt) starten mit Status `open`. Quelle: Produkt-Anforderung 5.4.3.

---

## 4. Tasks

### 4.1 Empfohlene nächste Aufgabe

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Tasks – oberster Block (identische Logik wie Dashboard 2.1) |
| **Queries** | `getRecommendedTask(userId)` – wiederverwendet (Scoring-Logik und Gewichte siehe 2.1) |
| **Tabellen (Lese)** | `tasks`, `areas` |
| **Tabellen (Schreib)** | `recommendation_log` (Feedback-Logging wie in 2.1) |
| **Workflow** | Identisch zu Dashboard-Fokusblock, aber hier über der vollständigen Taskliste. Feedback-Logging greift auch hier: Nutzerreaktion auf Empfehlung vs. Auswahl aus Taskliste wird protokolliert. |

### 4.2 Globale Taskliste

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Tasks – Hauptinhalt |
| **Queries** | `getTasks(userId, filters, sort)` – `tasks` mit JOIN auf `areas`, optional `task_tags`, `task_persons`/`persons`. Filter: Status, Bereich, Priorität, Tags. Sortierung: Fälligkeit, geplanter Tag, Priorität, Status, Bereich. |
| **Tabellen** | `tasks`, `areas`, `task_tags`, `task_persons`, `persons` (Lese-Zugriff) |
| **Workflow** | Seite lädt → Taskliste mit Filter- und Sortier-Controls → Pro Task: Titel, Bereich, Status, Priorität, Fälligkeit, Tags → Inline-Aktionen + Klick auf Task öffnet Bearbeitungs-Dialog/Sheet. |

### 4.3 Task anlegen

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Tasks (auch über Plus-Button, Inbox, Sparring aufrufbar) |
| **Aktionen** | `createTask(data)` → Insert `tasks` + Insert `task_tags` (falls Tags) + Insert `task_persons` (falls Personen) |
| **Tabellen (Schreib)** | `tasks`, `task_tags`, `task_persons` |
| **Workflow** | Formular mit: Titel (pflicht), Beschreibung, Bereich (pflicht), Status (Default: open), Priorität (Default: medium), Tags, Fälligkeit, geplanter Tag, Dauer, Person(en), Projekt → Speichern → Task erscheint in Taskliste. |

### 4.4 Task bearbeiten

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Tasks (Dialog/Sheet) |
| **Aktionen** | `updateTask(id, data)` → Update `tasks` + Sync `task_tags` + Sync `task_persons` |
| **Tabellen (Schreib)** | `tasks`, `task_tags`, `task_persons` |
| **Workflow** | Klick auf Task → Dialog/Sheet mit allen editierbaren Feldern → Ändern → Speichern → Liste aktualisiert. |

### 4.5 Status ändern

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Tasks, Dashboard (überall wo Tasks angezeigt werden) |
| **Aktionen** | `updateTaskStatus(id, newStatus)` → Update `tasks.status` mit Validierung der erlaubten Übergänge |
| **Tabellen (Schreib)** | `tasks` |
| **Workflow** | Inline-Statuswechsel (Dropdown oder Buttons) → Validierung: nur erlaubte Übergänge (inbox→open/planned/canceled, open→planned/done/canceled, planned→done/canceled) → Speichern → UI aktualisiert. |

### 4.6 Task planen

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Tasks (auch Kalender) |
| **Aktionen** | `planTask(id, plannedDate)` → Update `tasks` SET `planned_date`, `status = 'planned'` |
| **Tabellen (Schreib)** | `tasks` |
| **Workflow** | Datepicker für geplanten Tag → Bestätigung → Status wechselt zu `planned`, Task erscheint im Kalender und im Heute-Block. |

---

## 5. Sparring

### 5.1 Sparring-Übersicht

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Sparring |
| **Queries** | `getSparringChats(userId)` – `sparring_chats` sortiert nach `updated_at DESC`, ggf. gefiltert auf `is_open = true` |
| **Tabellen** | `sparring_chats` (Lese-Zugriff) |
| **Workflow** | Seite zeigt: Einstiegspunkt für neues freies Sparring + Liste laufender Chats mit Titel, Typ, letzte Aktivität → Klick öffnet Chat. |

### 5.2 Freies Sparring starten

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Sparring (auch über Plus-Button) |
| **Aktionen** | `createSparringChat({ type: 'free' })` → Insert `sparring_chats` |
| **Tabellen (Schreib)** | `sparring_chats` |
| **Workflow** | Klick „Neues Sparring" → Chat wird angelegt → Weiterleitung in die Chat-Ansicht. |

### 5.3 Sparring-Chat-Ansicht

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Sparring → Chat-Detail |
| **Queries** | `getSparringMessages(chatId)` – `sparring_messages` WHERE `chat_id`, sortiert nach `created_at ASC`. `getChatOutputs(chatId)` – Tasks, Ergebnisse, Notizen WHERE `source_sparring_chat_id = chatId`. |
| **Aktionen** | `sendSparringMessage(chatId, content)` → Insert `sparring_messages` (role=user) → KI-Antwort → Insert `sparring_messages` (role=assistant) |
| **Tabellen** | `sparring_messages`, `tasks`, `results`, `notes` (Lese-Zugriff für Outputs) |
| **Tabellen (Schreib)** | `sparring_messages` |
| **Workflow** | Chat-Verlauf anzeigen → Nachricht senden → KI-Antwort empfangen → Nebenbereich oder Buttons für Output-Aktionen: „Task anlegen", „Ergebnis übernehmen", „Entwurf erstellen". |

**Hinweis zu `role = 'system'`:** System-Messages werden beim Chat-Start als initiales System-Prompt eingefügt (Rollenanweisung, Kontext-Informationen wie Bereich/Task/Inbox-Item-Inhalt). Sie werden nicht in der Chat-UI angezeigt, sondern nur an die KI-API mitgesendet. Bei Kontext-Sparring enthält das System-Prompt den relevanten Kontext des Quellobjekts.

### 5.4 Output-Aktionen aus Sparring

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Sparring → Chat-Detail (Buttons/Aktionen im Chat) |
| **Aktionen** | |
| → Task anlegen | `createTaskFromSparring(chatId, taskData)` → Insert `tasks` (source_sparring_chat_id) + `task_tags` |
| → Ergebnis übernehmen | `createResultFromSparring(chatId, resultData)` → Insert `results` (source_sparring_chat_id) + `result_areas` |
| → Entwurf erstellen | `createDraftFromSparring(chatId, noteData)` → Insert `notes` (type=draft, source_sparring_chat_id) |
| **Tabellen (Schreib)** | `tasks`, `task_tags`, `results`, `result_areas`, `notes` |
| **Workflow** | Button im Chat → Dialog mit vorausgefüllten Feldern (aus Chatkontext extrahiert) → Felder editierbar → Speichern → Folgeobjekt erzeugt, im Chat als Output sichtbar. |

### 5.5 Kontext-Sparring starten

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Task-Bearbeitung (4.4), Bereichsseite (7.2), Inbox-Item (3.2), Projekt-Detail (7.4) |
| **Aktionen** | `createContextSparring(contextData)` → Insert `sparring_chats` mit: `type = 'context'` + passendem Kontext-FK (`context_task_id`, `area_id`, `context_inbox_item_id`, `project_id`) + Insert `sparring_messages` (role=system, initiales System-Prompt mit Kontext-Informationen) |
| **Tabellen (Schreib)** | `sparring_chats`, `sparring_messages` |
| **Workflow** | „Sparring starten"-Button am Quellobjekt (Task, Bereich, Inbox-Item, Projekt) → Chat wird mit Typ `context` oder `project` angelegt → Kontext-FK wird gesetzt → System-Message mit relevantem Kontext wird als erste Nachricht eingefügt → Weiterleitung in Chat-Ansicht. |

**Kontext-Typen:**

| Quellobjekt | Sparring-Typ | Kontext-FK |
|---|---|---|
| Task | `context` | `context_task_id` |
| Inbox-Item | `context` | `context_inbox_item_id` |
| Bereich | `context` | `area_id` |
| Projekt/Themencontainer | `project` | `project_id` (+ `area_id` des Projekts) |

---

## 6. Kalender

### 6.1 Kalenderansicht (Tages-/Wochenansicht)

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Kalender |
| **Queries** | `getCalendarEvents(userId, startDate, endDate)` – `calendar_events` im Zeitraum. `getPlannedTasks(userId, startDate, endDate)` – `tasks` WHERE `planned_date` im Zeitraum AND `status IN ('planned', 'open')`. |
| **Tabellen** | `calendar_events`, `tasks` (Lese-Zugriff) |
| **Workflow** | Seite lädt Tages- oder Wochenansicht → Termine und geplante Tasks werden gemeinsam im Zeitraster angezeigt → Navigation zwischen Tagen/Wochen (Vergangenheit + Zukunft) → Kapazitätssicht als kompakte Dichte-/Ampellogik. |

**Hinweis zum Task-Filter `status IN ('planned', 'open')`:** Der Filter schließt `open` ein, weil ein Task theoretisch ein `planned_date` gesetzt haben kann, ohne dass der Statuswechsel zu `planned` bereits erfolgt ist (Edge-Case bei manueller Datumsänderung ohne bewusste Planung). Dadurch werden keine Tasks mit Datumsbezug „unsichtbar" im Kalender.

### 6.2 Termin anlegen (in Outlook)

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Kalender |
| **Aktionen** | `createCalendarEvent(data)` → Microsoft Graph API Call (Event erstellen) + Insert `calendar_events` (source=leifos) als lokale Referenz |
| **Tabellen (Schreib)** | `calendar_events` |
| **Externer Call** | Microsoft Graph API: `POST /me/events` |
| **Workflow** | „Neuer Termin"-Button → Formular: Titel, Start, Ende, Ganztägig, Bereich (optional) → Speichern → Graph-API-Call → Lokaler Cache-Eintrag → Termin erscheint in Ansicht. |

### 6.3 Outlook-Sync

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Kalender (implizit bei Seitenaufruf oder manuellem Refresh) |
| **Aktionen** | `syncOutlookEvents(userId, startDate, endDate)` → Microsoft Graph API: `GET /me/calendarView` → Upsert in `calendar_events` auf Basis `outlook_event_id` |
| **Tabellen (Schreib)** | `calendar_events` |
| **Externer Call** | Microsoft Graph API: `GET /me/calendarView?startDateTime=…&endDateTime=…` |
| **Workflow** | Seitenaufruf oder Refresh-Button → API-Abruf für relevanten Zeitraum → Upsert bestehender Termine, neue Termine anlegen, gelöschte markieren → Ansicht aktualisiert. |

---

## 7. Bereiche

### 7.1 Bereiche-Übersicht

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Bereiche |
| **Queries** | `getAreas(userId)` – `areas` sortiert nach `sort_order`. Optional: pro Bereich aggregierte Kennzahlen (Anzahl offene Tasks, aktive Projekte). |
| **Tabellen** | `areas`, ggf. `tasks`, `projects` (Lese-Zugriff für Aggregation) |
| **Workflow** | Seite zeigt Liste der festen Bereiche → Pro Bereich: Name, ggf. Kurzinfo/Kennzahl → Klick navigiert zur Bereichsseite. |

### 7.2 Bereichsseite (Detail)

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Bereiche → Einzelner Bereich |
| **Queries** | `getAreaDetail(areaId)` – Area + `getProjectsByArea(areaId)` + `getTasksByArea(areaId)` + `getResultsByArea(areaId)` + `getSparringChatsByArea(areaId)` + `getPersonsByArea(areaId)` + `getNotesByArea(areaId)` |
| **Tabellen** | `areas`, `projects`, `tasks`, `task_tags`, `results`, `result_areas`, `sparring_chats`, `persons`, `person_areas`, `notes`, `files` (Lese-Zugriff) |
| **Workflow** | Seite lädt Bereichsdaten → Tabs oder Abschnitte: Überblick (offene Punkte, Kennzahlen), Projekte, Tasks (bereichsgefiltert), Ergebnisse, Sparring-Historie, Personen, Notizen → Querverbindungen zu anderen Bereichen über Ergebnisse (n:m). Anlage von Tasks, Ergebnissen, Sparring, Notizen direkt im Bereichskontext möglich (area_id wird vorbelegt). |

### 7.3 Projekt/Themencontainer verwalten

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Bereichsseite → Projekte-Abschnitt |
| **Aktionen** | `createProject(data)` → Insert `projects`. `updateProject(id, data)` → Update `projects`. `completeProject(id)` → Update `projects.status = 'completed'`. |
| **Tabellen (Schreib)** | `projects` |
| **Workflow** | „Neues Projekt"-Button → Formular: Titel, Beschreibung, Bereich (vorbefüllt) → Speichern. Status-Toggle active/completed. Abgeschlossene Projekte werden ausgegraut oder ausgeblendet. |

### 7.4 Projekt-Detailseite

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Bereich → Projekt |
| **Queries** | `getProjectDetail(projectId)` – Projekt + zugehörige Tasks, Ergebnisse, Sparring-Chats, Notizen, Dateien |
| **Tabellen** | `projects`, `tasks`, `results`, `sparring_chats`, `notes`, `files` (Lese-Zugriff) |
| **Aktionen** | Anlage von Tasks, Ergebnissen, Sparring, Notizen direkt im Projektkontext (project_id wird vorbelegt). |
| **Tabellen (Schreib)** | `tasks`, `task_tags`, `results`, `result_areas`, `sparring_chats`, `sparring_messages`, `notes` |
| **Workflow** | Seite zeigt Projektdaten + alle zugeordneten Objekte in Abschnitten → Anlage von Tasks, Ergebnissen, Sparring, Notizen direkt im Projektkontext möglich (project_id wird vorbelegt). |

---

## 8. Personen

### 8.1 Personen-Liste

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Personen |
| **Queries** | `getPersons(userId)` – `persons` mit JOIN auf `person_areas`/`areas`, sortiert nach Nachname |
| **Tabellen** | `persons`, `person_areas`, `areas` (Lese-Zugriff) |
| **Workflow** | Seite zeigt Personenliste → Pro Person: Vorname, Nachname, Kategorie, Bereiche → Klick öffnet Detail. |

### 8.2 Person anlegen/bearbeiten

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Personen (auch über Plus-Button) |
| **Aktionen** | `createPerson(data)` → Insert `persons` + Insert `person_areas`. `updatePerson(id, data)` → Update `persons` + Sync `person_areas`. |
| **Tabellen (Schreib)** | `persons`, `person_areas` |
| **Workflow** | Formular: Vorname (pflicht), Nachname (pflicht), Kategorie, Anschrift, Geburtstag, Vorerinnerung (Tage), Bereiche → Speichern. |

### 8.3 Geburtstags-Erinnerung

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Hintergrund-Job / Dashboard-Hinweis |
| **Queries** | `getUpcomingBirthdays(userId, withinDays)` – `persons` WHERE Geburtstag innerhalb der nächsten N Tage (unter Berücksichtigung von `birthday_reminder_days`) |
| **Tabellen** | `persons` (Lese-Zugriff) |
| **Workflow** | Täglicher Check (beim Dashboard-Laden oder als Hintergrund-Job via n8n): Prüfe Geburtstage → Bei Treffer: Inbox-Item erzeugen oder Hinweis auf Dashboard anzeigen. V1: einfache Logik, kein komplexes Benachrichtigungssystem. |

---

## 9. Inbox-Eingangsverarbeitung (n8n → Supabase)

### 9.1 Telegram → Inbox

| Aspekt | Beschreibung |
|---|---|
| **Seite** | Keine UI-Seite – Hintergrund-Workflow |
| **Externer Trigger** | n8n Webhook: Telegram Bot empfängt Nachricht |
| **Aktionen** | `insertInboxItem(data)` → Insert `inbox_items` (source=telegram, content, source_ref, metadata) |
| **Tabellen (Schreib)** | `inbox_items` |
| **Workflow** | Telegram-Nachricht → n8n Webhook → Nachrichteninhalt + Metadaten extrahieren → Insert in `inbox_items` → Item erscheint auf Inbox-Seite und als ungelesen auf Dashboard. |

---

## 10. Querverweise und offene Punkte

### 10.1 Gemeinsame Serveraktionen

Einige Serveraktionen werden an mehreren Stellen wiederverwendet:

| Aktion | Verwendet in |
|---|---|
| `getRecommendedTask` | Dashboard (2.1), Tasks (4.1) |
| `createTask` | Plus-Button (1.4), Tasks (4.3), Inbox (3.2), Sparring (5.4) |
| `updateTaskStatus` | Dashboard (2.1), Tasks (4.5), Kalender (implizit) |
| `markInboxItemRead` | Dashboard (2.2), Inbox (3.2) |
| `createSparringChat` | Plus-Button (1.4), Inbox (3.2), Sparring (5.2) |
| `createContextSparring` | Task-Bearbeitung (4.4), Bereichsseite (7.2), Inbox (3.2), Projekt-Detail (7.4) |
| `createResult` | Plus-Button (1.4), Inbox (3.2), Sparring (5.4) |
| `createNote` / `createDraft` | Plus-Button (1.4), Inbox (3.2), Sparring (5.4) |
| `logRecommendationFeedback` | Dashboard (2.1), Tasks (4.1) |

### 10.2 Noch nicht im Stub verortet (Post-V1 oder spätere Verfeinerung)

- **Kapazitätslogik:** V1 zeigt einfache Summierung im Dashboard und Kalender mit festem 8-Stunden-Tageskontingent. Fortgeschrittene Netto-Kapazitätsberechnung, individuelle Arbeitszeiten und Wochentag-Differenzierung sind Post-V1.
- **Lernende Priorisierungsgewichte:** V1 nutzt feste Score-Gewichte (0,40 / 0,30 / 0,20 / 0,10). Post-V1 können die gesammelten `recommendation_log`-Daten (inkl. Teilscores) genutzt werden, um Gewichte adaptiv aus dem tatsächlichen Nutzerverhalten abzuleiten (Regression / einfaches ML). Voraussetzung: ≥ 50–100 protokollierte Entscheidungen.
- **Memory-Feeding:** Ergebnisse als Memory-Quelle ist fachlich gesetzt, die technische Verortung (Vektor-DB, Embedding-Pipeline) wird separat geplant.
- **Einstellungen:** Kein priorisierter V1-Baustein. Später eigene Seite + eigene Tabelle(n).
- **Datei-Upload/-Verwaltung:** Tabelle `files` existiert, Upload-UI und Storage-Integration werden separat verortet.
- **Batch-Aktionen auf Inbox oder Tasks:** Bewusst nicht in V1.

---

## 11. Zusammenfassung Tabellenzugriffe pro Seite

| Seite | Lesend | Schreibend |
|---|---|---|
| **Dashboard** | `tasks`, `areas`, `inbox_items`, `calendar_events`, `portfolio_snapshots`, `portfolio_positions` | `tasks`, `task_tags`, `inbox_items`, `portfolio_snapshots`, `portfolio_positions`, `recommendation_log` |
| **Inbox** | `inbox_items` | `inbox_items`, `tasks`, `task_tags`, `sparring_chats`, `results`, `result_areas`, `notes` |
| **Tasks** | `tasks`, `areas`, `task_tags`, `task_persons`, `persons`, `projects` | `tasks`, `task_tags`, `task_persons`, `recommendation_log` |
| **Sparring** | `sparring_chats`, `sparring_messages`, `tasks`, `results`, `notes` | `sparring_chats`, `sparring_messages`, `tasks`, `task_tags`, `results`, `result_areas`, `notes` |
| **Kalender** | `calendar_events`, `tasks` | `calendar_events` |
| **Bereiche** | `areas`, `projects`, `tasks`, `task_tags`, `results`, `result_areas`, `sparring_chats`, `persons`, `person_areas`, `notes`, `files` | `projects`, `tasks`, `task_tags`, `sparring_chats`, `sparring_messages`, `results`, `result_areas`, `notes` |
| **Personen** | `persons`, `person_areas`, `areas` | `persons`, `person_areas` |

---

## Änderungsprotokoll

| Datum | Änderung | Grund |
|---|---|---|
| 2026-04-11 | `createTaskFromInbox` Start-Status auf `inbox` geändert (statt `open`) | Produkt-Anforderung 5.4.3: Tasks aus Inbox starten mit Status `inbox`. Hinweis-Block ergänzt (Section 3.2). |
| 2026-04-11 | `processed_ref_id` in alle Inbox-Folgeaktionen aufgenommen | Datenmodell hat das Feld, aber keine Aktion schrieb es. Jetzt wird bei jeder Überführung die ID des erzeugten Folgeobjekts gesetzt. |
| 2026-04-11 | Feedback-Logging: Teilscores `score_priority`, `score_due`, `score_today`, `score_age` aufgenommen | Datenmodell definiert vier Teilscore-Felder in `recommendation_log`, Impl.-Map nannte nur den Gesamtscore. |
| 2026-04-11 | Section 5.5 „Kontext-Sparring starten" neu hinzugefügt | Kontext-Sparring aus Task, Bereich, Inbox-Item und Projekt war im Objektmodell beschrieben, aber in der Impl.-Map nicht verortet. |
| 2026-04-11 | Globale Suche: Hinweis zu Notizen-Anzeige (Content-Snippet statt Titel) | Notizen haben kein `title`-Feld; Anzeige-Logik war unklar. |
| 2026-04-11 | Hinweis zu `sparring_messages.role = 'system'` ergänzt (Section 5.3) | Datenmodell erlaubt drei Rollen, aber Verwendung von `system` war nicht dokumentiert. |
| 2026-04-11 | Kalender-Query: Hinweis zum Defensiv-Filter `status IN ('planned', 'open')` (Section 6.1) | Edge-Case bei `planned_date` ohne Statuswechsel war undokumentiert. |
| 2026-04-11 | Kapazität: V1-Default 8 Stunden Tageskontingent definiert (Section 2.3) | „Verfügbare Zeit" war nirgends als Quelle/Wert spezifiziert. |
| 2026-04-11 | Section 11: Schreibtabellen für Bereiche vervollständigt | Fehlten: `tasks`, `task_tags`, `sparring_chats`, `sparring_messages`, `results`, `result_areas`, `notes` (Anlage im Bereichs-/Projektkontext). |
| 2026-04-11 | Section 7.4: Schreib-Aktionen und -Tabellen für Projekt-Detailseite ergänzt | Anlage von Tasks, Ergebnissen, Sparring, Notizen im Projektkontext war beschrieben, aber Schreib-Tabellen fehlten. |
| 2026-04-11 | `createContextSparring` in Tabelle gemeinsamer Serveraktionen aufgenommen (Section 10.1) | Neue Aktion aus Section 5.5 muss in der Übersicht erscheinen. |
