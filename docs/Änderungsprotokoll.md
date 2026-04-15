# Leif OS – Änderungsprotokoll

---

## 0. Zweck dieses Dokuments

Dieses Protokoll dokumentiert alle strukturellen Änderungen an den eingefrorenen Doku-Dateien von Leif OS, die **nach Abschluss der Baseline** (Stand: 11. April 2026) vorgenommen werden.

**Gehört hierher:** Jede nachträgliche Änderung an Datenmodell, Objektmodell, Implementation Map, Route Map, V1-Scope oder Produkt-Anforderung – mit Datum, betroffenem Dokument, Beschreibung der Änderung und Begründung.

**Gehört nicht hierher:** Die Entstehungsgeschichte der Dokumente selbst. Die ist durch die Dokumente abgedeckt.

---

## 1. Baseline-Dokumente

| Dokument | Stand | Status |
|---|---|---|
| Produkt-Anforderung.md | 11.04.2026 | eingefroren |
| V1-Scope.md | 11.04.2026 | eingefroren |
| Route-Map.md | 11.04.2026 | eingefroren |
| Objektmodell.md | 11.04.2026 | eingefroren |
| Datenmodell.md | 11.04.2026 | eingefroren |
| Implementation-Map.md | 11.04.2026 | eingefroren |
| Doku-Übersicht.md | 11.04.2026 | eingefroren |

---

## 2. Änderungen

| # | Datum | Dokument(e) | Änderung | Begründung |
|---|---|---|---|---|
| 1 | 11.04.2026 | `Implementation-Map.md`, `Route-Map.md`, `Doku-Übersicht.md`, `Datenmodell.md`, `Produkt-Anforderung.md` (§7.2) | Globale Suche und Plus-Menü an den Repo-Stand angepasst (Tabellen, Navigation, sechs Plus-Einträge inkl. Posteingang); Navigationsliste in der Impl.-Map; Route-Map §1.2/1.4/1.5; Doku-Übersicht: Impl.-Map darf kurze Repo-Anker enthalten; Datenmodell §2.11 Verweis auf Impl.-Map §1.3 präzisiert; Produkt §7.2: Impl.-Map ohne „Stub"-Pflicht auf Page-/Komponentenlisten. | Doku wich von der Implementierung ab (Suche um Ergebnisse/Personen/Sparring, weitere Maintabs). |
| 2 | 11.04.2026 | `Erledigte-Aufgaben.md` (neu), `Doku-Übersicht.md` | Neue Datei `Erledigte-Aufgaben.md` mit kumulativem Umsetzungsüberblick; Doku-Übersicht um Zeile und Änderungsnotiz ergänzt. | Nachvollziehbarkeit erledigter Arbeiten unabhängig von der fachlichen Spezifikation. |
| 3 | 11.04.2026 | `Route-Map.md` | Hauptnavigation, globale Suche und Plus-Menü an die verbindliche UI-Begriffswelt angepasst (u. a. Lebensbereiche, KI, Kontakte, Gedächtnis; technische Routen unverändert). | Eine einheitliche Produktbezeichnung im UI und in der fachlichen Routen-Doku. |
| 4 | 12.04.2026 | `Produkt-Anforderung.md`, `Objektmodell.md`, `Route-Map.md`, `V1-Scope.md`, `Datenmodell.md`, `Implementation-Map.md`, `Doku-Übersicht.md` | Produktlogik geschärft: Strategie-/Planungs-/Entscheidungs-OS; Ebenen Input / Thinking / Planning; Inbox als Capture/Review; Lebensbereiche und Unterthemen; KI- und Gedächtnisrollen; Dashboard als Steuerzentrale; E-Mail/Posteingang als Randkanal (kein Mailclient); `areas`/`projects` in der Datenmodell-Doku sprachlich eingeordnet; Route Map um Abschnitt Posteingang und Ist-Navigation ergänzt; Doku-Übersicht Dateiname `Produkt-Anforderung.md` korrigiert. | Fachliche Zielrichtung dokumentieren und Doku konsistent zur geschärften Leitidee machen — **ohne** Code- oder Migrationsänderungen in diesem Schritt. |
| 5 | 12.04.2026 | Repo (Next.js), `lib/microsoft/constants.ts`, `docs/Produkt-Anforderung.md`, `Route-Map.md`, `Implementation-Map.md`, `V1-Scope.md`, `Erledigte-Aufgaben.md` | **Mail-Client entfernt:** Route `/posteingang`, Posteingang-UI, `graph-mail`, Mail-Fetch, Outlook-Entwürfe aus Inbox und KI-Sparring; Plus-Menü und Sidebar ohne Mail; OAuth-Scope nur noch `Calendars.ReadWrite` (Kalender + Geburtstags-Serien); KI-Mail-Prompt-Funktionen in `openai-enrich` entfernt. Doku: E-Mail nur noch als späterer Inbox-Input beschrieben; V1-Tabelle Posteingang-Zeile entfernt. | Produktentscheid: kein Mailclient; Microsoft nur Kalender. |

---

## 3. Regeln

- Jede Änderung erhält eine laufende Nummer.
- Änderungen an mehreren Dokumenten gleichzeitig (z.B. neues Feld in Datenmodell + Anpassung Implementation Map) werden als **ein Eintrag** mit allen betroffenen Dokumenten geführt.
- Reine Tippfehler-Korrekturen ohne fachliche Auswirkung müssen nicht protokolliert werden.
- Vor jeder Änderung: kurz prüfen, ob andere Dokumente betroffen sind (Konsistenz).
