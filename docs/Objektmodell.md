# Leif OS – Objektmodell

---

## 0. Zweck dieses Dokuments

Diese Datei beschreibt das fachliche Objektmodell von Leif OS: Welche Objekttypen es gibt, welche Rolle jeder Typ im System spielt, und wie die Objekte zueinander in Beziehung stehen.

Das Objektmodell ist die Brücke zwischen `Produkt-Anforderung.md` (fachliches Zielbild) und Datenmodell (Tabellen, Felder, Relationen). Es sorgt dafür, dass kein Feld, keine Tabelle und keine Relation „aus dem Bauch" entsteht, sondern auf einer fachlich definierten Grundlage steht.

**Leitfrage:** *Welche fachlichen Bausteine existieren in Leif OS, was ist ihre Aufgabe, und wie hängen sie zusammen?*

**Gehört nicht hierher:** Tabellen, Felder, Constraints (→ Datenmodell.md), Seiten, Routen, Navigation (→ Route-Map.md), Komponenten, Actions, Queries (→ Implementation-Map.md), Produktvision, Scope-Entscheidungen (→ Produkt-Anforderung.md, V1-Scope.md).

---

## 0.1 Drei Systemebenen (Bezug zum Produkt)

Fachlich wird Leif OS über **drei Ebenen** beschrieben (→ `Produkt-Anforderung.md`):

| Ebene | Typische Objekte / Orte |
|---|---|
| **Input** | Inbox-Item (Übergang), Schnellerfassung, bewusst eingespielte Kanal-Inhalte |
| **Thinking** | Sparring-Chat, Lebensbereich, Unterthema, Gedächtnis-Eintrag (Ergebnis), Notiz |
| **Planning** | Task, Kalendertermin, Tages-/Wochenplanung |

Objekte können zwischen Ebenen **wechseln** (z. B. Inbox-Item → Task), ohne dass die Ebenen in der UI oder im Denkmodell **vermischt** werden sollten.

---

## 1. Objektkategorien

Die Primärobjekte von Leif OS lassen sich in fünf Kategorien einteilen. Die Kategorie bestimmt, wie ein Objekt im System lebt und wie andere Objekte mit ihm umgehen.

| Kategorie | Rolle im System | Objekte |
|---|---|---|
| **Kontext-Container** | Dauerhafte fachliche Räume bzw. Strukturdimensionen, die Orientierung geben – **keine** Ordnerhierarchie. | Lebensbereich (Bereich), Unterthema (technisch: Projekt/Themencontainer) |
| **Arbeitsobjekte** | Einheiten mit aktivem Lebenszyklus an der Schnittstelle von Input, Denken oder Planung. | Task, Sparring-Chat, Inbox-Item |
| **Ergebnisobjekte** | Strukturierte, dauerhaft relevante Resultate – **Langzeitwissen** („Gedächtnis"). | Ergebnis (Erkenntnis, Entscheidung) |
| **Zwischenobjekte** | Kurzlebige, vorläufige Informationen ohne Anspruch auf dauerhafte Relevanz. | Notiz (inkl. Entwurf) |
| **Ressourcen** | Bezugseinheiten und Referenzobjekte, die anderen Objekten zugeordnet werden. | Person, Datei, Kalendertermin |
| **Externe Daten** | Gecachte Daten aus angebundenen externen Systemen, die nicht in Leif OS gepflegt, sondern periodisch synchronisiert werden. | Portfolio-Snapshot, Portfolio-Position |

---

## 2. Objekttypen im Detail

### 2.1 Bereich (Lebensbereich)

- **Rolle:** **Strategischer Kontext** einer Lebens- oder Arbeitsdomäne – Orientierungsebene, Filter, Denkraum. Objekte sind **global** und werden im Bereich **sichtbar gemacht**, nicht „physisch abgelegt".
- **Beispiele:** Hausverwaltung, Finanzen Firma, Finanzen Privat, Familie/Privat, Gesundheit/Sport (Referenzliste; konkrete Namen können an die Nutzerrealität angepasst werden, sofern das Datenmodell es erlaubt).
- **Abgrenzung:** Kein Projektordner, kein Dateisystem-Ordner, kein Sammelcontainer für beliebige Lose-Information und keine isolierte Sandbox. Verbindung zum Gesamtsystem bleibt bestehen.
- **Lebenszyklus:** Kein fachlicher Status – Lebensbereiche sind persistente Kontexte.

### 2.2 Unterthema (Projekt / Themencontainer)

- **Produktsprache:** **Unterthema** – thematische Strukturdimension **innerhalb** eines Lebensbereichs (Kategorie, Themencluster).
- **Technische Abbildung:** Tabelle `projects` („Projekt / Themencontainer") – der Begriff „Projekt" ist historisch; fachlich ist dies **kein** klassisches PM-Projekt und **kein** Ordner.
- **Rolle:** Bündelt Sicht und Verknüpfungen zu Tasks, Gedächtnis-Einträgen, Sparring-Chats, Personen, Dateien, Terminen und Notizen **in diesem Kontext**.
- **Beispiele:** Im Bereich „Firma": Personal, Marketing, Strategie, Finanzen.
- **Abgrenzung:** Genau ein übergeordneter Lebensbereich. Keine verschachtelte „Ordner > Unterordner > Datei"-Logik: Zuordnung lautet *Objekt gehört zu Bereich X und Unterthema Y*.
- **Lebenszyklus:** Zwei Statuswerte: `active` (Default bei Anlage) und `completed`. Keine weiteren Zwischenstufen.

### 2.3 Task (Aufgabe)

- **Rolle:** Objekt des **Planning Layer**: konkrete Handlung mit Status, optionaler Planung, Lebensbereich und ggf. Personenzuordnung oder Terminbezug.
- **Beispiele:** „Nebenkostenabrechnung prüfen", „Arzttermin vereinbaren", „Angebot an Mieter senden".
- **Abgrenzung:** Ein Task ist kein Ticket, kein Kommunikationsobjekt und kein Ergebnis. Er beschreibt eine zu erledigende Handlung.
- **Lebenszyklus:** Fünf Statuswerte: `inbox`, `open`, `planned`, `done`, `canceled`. Kein `in_progress`, kein `waiting`. Erlaubte Statuswechsel siehe Section 2.3.1.
- **Merkmale:** Bereich (genau einer), Status, Priorität (high/medium/low), Tags (frei kombinierbar), optional: Fälligkeit, geplanter Tag, Dauer, Beschreibung, Person, Projekt/Themencontainer.

#### 2.3.1 Erlaubte Statuswechsel (Task)

| Von | Erlaubte Ziele |
|---|---|
| `inbox` | `open`, `planned`, `canceled` |
| `open` | `planned`, `done`, `canceled` |
| `planned` | `done`, `canceled` |
| `done` | (kein regulärer Wechsel) |
| `canceled` | (kein regulärer Wechsel) |

**Entstehung:** Tasks aus Inbox-Überführung starten mit Status `inbox`. Manuell angelegte Tasks starten mit Status `open`.

**Hinweis:** Rückwärtswechsel (z.B. `done` → `open`) sind fachlich nicht vorgesehen und sollten seltene Sonderfälle (Fehleingaben, Korrekturen) bleiben.

### 2.4 Sparring-Chat (KI-Gespräch)

- **Rolle:** Konkrete Gesprächsinstanz im **Thinking Layer** – **Denkpartner** für Analyse, Klärung, Entscheidungsfindung, Strukturierung, Priorisierung oder Ableitung von Folgeaktionen (nicht primär „unterhaltendes Chatfenster").
- **Typen:** Freies Sparring (ohne Kontext), Kontext-Sparring (gestartet aus Task, Inbox-Item, Bereich etc.), Projekt-/Themen-Sparring (innerhalb eines Projekt/Themencontainers).
- **Abgrenzung:** Der Chatverlauf ist Arbeitsweg, nicht primärer Speicherort. Die eigentlichen Werte sind die strukturierten Outputs (Ergebnisse, Tasks, Entwürfe).
- **Lebenszyklus:** Kein formales Statusmodell – ein Sparring-Chat kann offen oder abgeschlossen sein.

### 2.5 Inbox-Item

- **Rolle:** Ungeklärter Eingang im **Input Layer** (z. B. Telegram; perspektivisch weitere Quellen). **Capture- und Review-Objekt:** kurz im System, bis eine **Review-Entscheidung** getroffen wurde.
- **Abgrenzung:** Kein Mailpostfach, kein Task-Eingangs-Archiv, kein Arbeitsboard und kein dauerhafter Endzustand. Kein Ersatz für einen E-Mail-Client.
- **Lebenszyklus:** Eingang → **Sichten und bewerten** → Überführung in Task, Sparring, Gedächtnis-Eintrag, Notiz/Entwurf, Kontakt (wenn vorgesehen), Verwerfen/Archivieren oder spätere Sichtung (sobald fachlich unterstützt). Zusätzlich: **gelesen/ungelesen** nur als Aufmerksamkeitsmerkmal, ersetzt keine inhaltliche Entscheidung.

### 2.6 Ergebnis (Oberklasse) / Gedächtnis-Eintrag

- **Rolle:** Dauerhaft relevantes, strukturiertes Resultat aus Arbeit oder Sparring – **Langzeitwissen** des Systems („Gedächtnis" in der UI).
- **Untertypen:**
  - **Erkenntnis** – Was haben wir verstanden?
  - **Entscheidung** – Was wurde verbindlich festgelegt?
- **Abgrenzung:** Ergebnisse sind keine Notizen (die sind kurzlebig) und keine Chatverlauf-Auszüge (die sind unstrukturiert). Ergebnisse sind die Basis für Memory.
- **Lebenszyklus:** Ergebnisse sind im Grundsatz dauerhaft; sie können nachträglich präzisiert oder ersetzt werden.

### 2.7 Notiz (inkl. Entwurf)

- **Kategorie:** Zwischenobjekt (nicht Ergebnisobjekt).
- **Rolle:** Kurzlebige, vorläufige oder nicht verdichtete Information. Dient als Merker oder Zwischenstand.
- **Untertypen über Typ-Feld:**
  - **Notiz** (Default) – allgemeiner Merker oder Zwischenstand.
  - **Entwurf** – Textentwurf z.B. für E-Mail, Brief, Nachricht. Entsteht typischerweise aus Sparring oder Inbox-Verarbeitung.
- **Abgrenzung:** Eine Notiz ist nicht zwingend auf Dauer relevant. Sie ist kein Ergebnis (nicht strukturiert genug) und kein Task (keine Handlungsaufforderung). Ein Entwurf ist kein eigener Primärobjekttyp, sondern eine Notiz mit Typ-Markierung.
- **Lebenszyklus:** Keine formale Statuslogik.

### 2.8 Person

- **Rolle:** Natürliche oder organisatorische Bezugseinheit (Mieter, Dienstleister, Geschäftspartner, Familienmitglied). Eigenständiges Objekt, keine bloße Eigenschaft anderer Objekte.
- **Abgrenzung:** Personen sind in V1 keine vollwertigen CRM-Kontakte, sondern eine einfache Personenbasis mit Stammdaten und Erinnerungsbezug.
- **Lebenszyklus:** Kein Status – Personen bestehen dauerhaft.

### 2.9 Datei

- **Rolle:** Dokument oder Anhang, das verschiedenen Objekten zugeordnet werden kann.
- **Abgrenzung:** Eine Datei existiert nicht losgelöst, sondern ist immer mindestens einem anderen Objekt zugeordnet (Bereich, Projekt, Task, Ergebnis, Sparring-Chat). Diese Regel wird auf Application-Level durchgesetzt, nicht per DB-Constraint (da CHECK über mehrere nullable FKs fragil ist).
- **Lebenszyklus:** Kein formaler Status.

### 2.10 Kalendertermin

- **Rolle:** Zeitbezogenes Ereignis. Quelle u.a. Outlook/Graph oder direkte Anlage über Leif OS. Grundlage für Tagessteuerung, Wochensteuerung, Kapazität, Vorbereitungslogik und Zeitplanung.
- **Abgrenzung:** Ein Kalendertermin ist kein Task. Geplante Tasks können im Kalender sichtbar sein, sind aber eigene Objekte.
- **Lebenszyklus:** Zeitgebunden – vergangene Termine bleiben als Referenz, zukünftige Termine sind planungsrelevant.

### 2.11 Portfolio-Snapshot

- **Rolle:** Gecachter Zustandsabzug eines externen Portfolios aus Parqet. Enthält die Gesamtbewertung, Renditekennzahlen und Metadaten eines einzelnen Portfolios zu einem bestimmten Zeitpunkt.
- **Datenquelle:** Parqet Connect API (nur Lese-Zugriff). Leif OS ist Anzeige- und Cache-Schicht, nicht Datenpflege-Ort.
- **Abgrenzung:** Ein Portfolio-Snapshot ist kein Finanzkonto, kein Buchungsobjekt und kein manuell gepflegter Vermögenswert. Er ist ein automatisch befüllter Cache, der bei Dashboard-Start geladen und per manuellem Refresh aktualisiert wird.
- **Lebenszyklus:** Kein fachlicher Status. Snapshots werden bei jedem Refresh überschrieben (Upsert-Logik auf Portfolio-Ebene). Es wird kein Verlauf gespeichert – jeder Snapshot zeigt den letzten bekannten Stand.
- **Portfolios (V1):** Scalable, comdirect, Bitpanda, Immobilien, Rohstoffe (5 Portfolios, Zuordnung über Parqet-Portfolio-ID).

### 2.12 Portfolio-Position

- **Rolle:** Einzelposition innerhalb eines Portfolio-Snapshots. Enthält ISIN/Ticker, Stückzahl, aktuellen Wert, Gewinn/Verlust und Rendite einer einzelnen Anlage.
- **Datenquelle:** Parqet Connect API, als Teil des Portfolio-Abrufs mitgeliefert.
- **Abgrenzung:** Positionen werden nicht manuell gepflegt. Sie existieren nur als gecachte Detaildaten zu einem Snapshot und werden beim Refresh vollständig ersetzt (Delete + Insert pro Portfolio).
- **Lebenszyklus:** Kein eigener Status. Lebensdauer ist an den zugehörigen Snapshot gebunden.

---

## 3. Beziehungsregeln

Dieser Abschnitt beschreibt die fachlichen Beziehungen zwischen den Objekttypen. „1:n" bedeutet: ein Objekt der linken Seite kann viele der rechten Seite haben; „n:m" bedeutet: beide Seiten können viele haben; „n:1" bedeutet: viele der linken Seite gehören zu genau einem der rechten Seite.

### 3.1 Containment (Enthaltensein)

| Elternobjekt | Kindobjekt | Kardinalität | Regel |
|---|---|---|---|
| Bereich | Projekt/Themencontainer | 1:n | Ein Projekt gehört zu genau einem Bereich. |
| Projekt/Themencontainer | Task | 1:n (optional) | Ein Task *kann* einem Projekt zugeordnet sein, muss aber nicht. |
| Projekt/Themencontainer | Sparring-Chat | 1:n (optional) | Mehrere Sparring-Chats können zu einem Projekt gehören. |
| Projekt/Themencontainer | Ergebnis | 1:n (optional) | Ergebnisse können einem Projekt zugeordnet sein. |
| Projekt/Themencontainer | Datei | 1:n (optional) | Dateien können einem Projekt zugeordnet sein. |
| Projekt/Themencontainer | Notiz | 1:n (optional) | Notizen (inkl. Entwürfe) können einem Projekt zugeordnet sein. |
| Portfolio-Snapshot | Portfolio-Position | 1:n | Jede Position gehört zu genau einem Snapshot. |

### 3.2 Zuordnungen (Zugehörigkeit ohne striktes Containment)

| Objekt | Zugeordnet zu | Kardinalität | Regel |
|---|---|---|---|
| Task | Bereich | n:1 (pflicht) | Jeder Task gehört genau einem Hauptbereich. |
| Task | Person | n:m (optional) | Ein Task kann einer oder mehreren Personen zugeordnet sein. |
| Task | Kalendertermin | n:m (optional) | Ein Task kann einen Terminbezug haben (geplant auf Tag/Slot). |
| Task | Projekt/Themencontainer | n:1 (optional) | Ein Task kann zusätzlich einem Projekt zugeordnet sein. |
| Ergebnis | Bereich | n:m | Ein Ergebnis kann einem oder mehreren Bereichen zugeordnet sein. |
| Ergebnis | Projekt/Themencontainer | n:1 (optional) | Ein Ergebnis kann einem Projekt zugeordnet sein. |
| Ergebnis | Sparring-Chat | n:1 (optional) | Ein Ergebnis kann aus einem Sparring-Chat hervorgehen. |
| Sparring-Chat | Bereich | n:1 (optional) | Kontext-Sparring kann an einen Bereich gebunden sein. |
| Sparring-Chat | Task | n:1 (optional) | Kontext-Sparring kann an einen Task gebunden sein. |
| Sparring-Chat | Inbox-Item | n:1 (optional) | Ein Sparring kann aus einem Inbox-Item heraus gestartet werden. |
| Person | Bereich | n:m (optional) | Eine Person kann mehreren Bereichen zugeordnet sein. |
| Datei | Bereich | n:1 (optional) | Eine Datei kann einem Bereich zugeordnet sein. V1-Vereinfachung; Post-V1 ggf. n:m über Junction-Table. |
| Datei | Task | n:1 (optional) | Eine Datei kann einem Task zugeordnet sein. V1-Vereinfachung; Post-V1 ggf. n:m über Junction-Table. |
| Datei | Ergebnis | n:1 (optional) | Eine Datei kann einem Ergebnis zugeordnet sein. V1-Vereinfachung; Post-V1 ggf. n:m über Junction-Table. |
| Datei | Sparring-Chat | n:1 (optional) | Eine Datei kann einem Sparring-Chat zugeordnet sein. V1-Vereinfachung; Post-V1 ggf. n:m über Junction-Table. |
| Kalendertermin | Bereich | n:1 (optional) | Ein Termin kann einem Bereich zugeordnet sein. V1-Vereinfachung; Post-V1 ggf. n:m über Junction-Table. |
| Notiz | Bereich | n:1 (optional) | Eine Notiz kann einem Bereich zugeordnet sein. |
| Notiz | Projekt/Themencontainer | n:1 (optional) | Eine Notiz kann einem Projekt zugeordnet sein. |

**Hinweis zu V1-Vereinfachungen bei Datei und Kalendertermin:** Das Datenmodell bildet diese Zuordnungen in V1 als einfache FK-Spalten (n:1) ab. Sollte sich Post-V1 herausstellen, dass echte n:m-Zuordnungen benötigt werden, können Junction-Tables nachgezogen werden. Die Produkt-Anforderung beschreibt im Endbild n:m – V1 vereinfacht bewusst.

**Hinweis zu Portfolio-Objekten:** Portfolio-Snapshots und Portfolio-Positionen haben keine Zuordnungen zu Bereichen, Projekten oder anderen Primärobjekten. Sie existieren als eigenständiger, externer Daten-Cache und werden ausschließlich im Dashboard-Finanzblick angezeigt. Eine fachliche Zuordnung einzelner Portfolios zu den Bereichen „Finanzen Firma" / „Finanzen Privat" erfolgt ggf. über Konfiguration (Mapping Portfolio-ID → Bereich), nicht über eine FK-Beziehung im Datenmodell.

### 3.3 Überführungsbeziehungen (Entstehung)

Diese Beziehungen beschreiben, wie ein Objekt aus einem anderen entsteht. Sie sind gerichtet und einmalig.

| Quelle | Ziel | Beschreibung |
|---|---|---|
| Inbox-Item | Task | Eingang wird als Aufgabe übernommen. |
| Inbox-Item | Sparring-Chat | Eingang wird im Sparring geklärt. |
| Inbox-Item | Ergebnis | Eingang wird direkt als Erkenntnis/Entscheidung übernommen. |
| Inbox-Item | Notiz (Entwurf) | Eingang wird in einen Textentwurf überführt. |
| Inbox-Item | (Verwerfen) | Eingang wird als nicht relevant geschlossen. |
| Sparring-Chat | Task | Aus Sparring wird ein Task abgeleitet (vorausgefülltes Formular). |
| Sparring-Chat | Ergebnis | Aus Sparring wird ein Ergebnis (Erkenntnis/Entscheidung) übernommen. |
| Sparring-Chat | Notiz (Entwurf) | Aus Sparring wird ein Textentwurf erstellt. |

### 3.4 Querverbindungen zwischen Bereichen

Bestimmte Objekte (insbesondere Ergebnisse und Tasks) können fachlich bereichsübergreifende Relevanz haben. Beispiel: Eine Finanzentscheidung betrifft sowohl Hausverwaltung als auch Finanzen Firma.

- Ergebnisse können n:m zu Bereichen zugeordnet sein → explizite Querverbindung.
- Tasks haben genau einen Hauptbereich, können aber über Tags oder Projekt-Querverweise zusätzlichen Kontext tragen.
- Bereiche selbst können über ihre enthaltenen Objekte implizit miteinander verbunden sein.

---

## 4. Objekteigenschaften – Übersicht

Dieser Abschnitt listet pro Objekttyp die wichtigsten fachlichen Eigenschaften, die für das Verständnis des Modells relevant sind. Konkrete Feldnamen und Datentypen gehören ins Datenmodell.

| Objekttyp | Wichtige fachliche Eigenschaften |
|---|---|
| Bereich | Name, Beschreibung, feste Liste (nicht frei anlegbar) |
| Projekt/Themencontainer | Titel, Beschreibung, Bereichszuordnung, Status (`active`/`completed`) |
| Task | Titel, Beschreibung, Bereich, Status, Priorität, Tags, Fälligkeit, geplanter Tag, Dauer, Person(en), Projekt (optional) |
| Sparring-Chat | Titel/Thema, Typ (frei/kontext/projekt), Kontext-Referenz, Erstellungszeitpunkt |
| Inbox-Item | Inhalt, Quelle, Metadaten, gelesen/ungelesen, Verarbeitungsstatus, Referenz auf erzeugtes Folgeobjekt |
| Ergebnis | Titel, Inhalt, Untertyp (Erkenntnis/Entscheidung), Bereich(e), Projekt (optional), Herkunft (Sparring/Inbox/manuell) |
| Notiz | Inhalt, Typ (notiz/entwurf), Bereich (optional), Projekt (optional), Herkunft (Sparring/Inbox/manuell), Erstellungszeitpunkt |
| Person | Vorname, Nachname, Kategorie, Anschrift (optional), Geburtstag, Vorerinnerung (Tage vor Geburtstag), Bereich(e) |
| Datei | Name, Typ, Zuordnung (Bereich, Projekt, Task, Ergebnis oder Sparring-Chat; mindestens eine) |
| Kalendertermin | Titel, Start, Ende, Quelle (Outlook/Leif OS), Bereich (optional) |
| Portfolio-Snapshot | Parqet-Portfolio-ID, Portfolio-Name, Gesamtwert, Währung, Rendite (TTWROR, XIRR), unrealisierter Gewinn/Verlust, Abrufzeitpunkt |
| Portfolio-Position | Snapshot-Referenz, Name/Titel, ISIN/Ticker, Stückzahl, aktueller Wert, Kaufwert, Gewinn/Verlust (absolut + prozentual), Anteil am Portfolio |

---

## 5. Konsequenzen für nachgelagerte Dokumente

Aus dem Objektmodell ergeben sich direkte Leitplanken für die weitere Arbeit:

1. **Inbox-Item ist immer Übergangsobjekt.** Es darf in keinem Datenmodell oder UI-Konzept als dauerhafter Ruhezustand modelliert werden.
2. **Ergebnisse sind die Memory-Basis.** Nur strukturierte Ergebnisse (Erkenntnis, Entscheidung) speisen später Memory – niemals Roh-Chatverläufe.
3. **Tasks haben genau einen Bereich.** Bereichsübergreifende Bezüge werden über Ergebnisse (n:m) oder Tags gelöst, nicht über mehrere Bereichszuordnungen am Task.
4. **Projekte leben in genau einem Bereich.** Bereichsübergreifende Themen werden über Querverbindungen auf Ergebnis- oder Task-Ebene gelöst, nicht durch Projekte in mehreren Bereichen. Projekte haben zwei Statuswerte: `active` und `completed`.
5. **Entwurf ist kein eigener Primärobjekttyp.** Entwürfe werden als Notiz mit Typ-Markierung (`draft`) geführt. Eine eigene Tabelle ist nicht nötig.
6. **Datei existiert nie losgelöst.** Jede Datei braucht mindestens eine Zuordnung zu einem anderen Objekt. Durchsetzung auf Application-Level.
7. **Sparring-Chat ist Arbeitsweg, nicht Ergebnisspeicher.** Die UI- und Datenmodellierung muss Outputs (Ergebnisse, Tasks, Entwürfe) als eigenständige Objekte behandeln, nicht als Chat-Anhängsel.
8. **Portfolio-Daten sind externer Cache, keine Primärobjekte.** Portfolio-Snapshots und -Positionen werden nicht manuell gepflegt, sondern ausschließlich über die Parqet-API befüllt. Sie haben keine Beziehungen zu Tasks, Ergebnissen oder Sparring-Chats. Ihre einzige Aufgabe ist die Anzeige im Dashboard-Finanzblick und ggf. in den Bereichsseiten Finanzen Firma / Finanzen Privat.
9. **Notiz ist kein Ergebnisobjekt.** Notizen (inkl. Entwürfe) sind kurzlebige Zwischenobjekte. Sie haben weder die Strukturierungstiefe noch den Dauerhaftigkeitsanspruch von Ergebnissen und speisen nicht Memory.
10. **Datei- und Kalendertermin-Zuordnungen sind in V1 n:1.** Das Datenmodell bildet diese als einfache FK-Spalten ab. Post-V1 kann bei Bedarf auf n:m (Junction-Tables) erweitert werden.

---

## Änderungsprotokoll

| Datum | Änderung | Grund |
|---|---|---|
| 2026-04-11 | Notiz von „Ergebnisobjekte" in neue Kategorie „Zwischenobjekte" verschoben | Fachliche Trennung: Notizen sind kurzlebig, Ergebnisse dauerhaft. Vermeidung Kategorie-Widerspruch. |
| 2026-04-11 | Projekt-Status von `aktiv`/`abgeschlossen` auf `active`/`completed` geändert | Konsistenz mit Datenmodell und allen anderen Enums (durchgehend Englisch). |
| 2026-04-11 | Task-Lebenszyklus: lineare Kette durch explizite Statuswechsel-Matrix ersetzt (Section 2.3.1) | Klarstellung: Direktsprünge (z.B. `inbox` → `canceled`) waren erlaubt, aber nicht sichtbar. Quelle: Produkt-Anforderung 5.4.4. |
| 2026-04-11 | Datei-Zuordnungen von n:m auf n:1 korrigiert (V1-Vereinfachung) | Abgleich mit Datenmodell: `files`-Tabelle hat einfache FK-Spalten, keine Junction-Tables. Post-V1-Hinweis ergänzt. |
| 2026-04-11 | Kalendertermin↔Bereich von n:m auf n:1 korrigiert (V1-Vereinfachung) | Abgleich mit Datenmodell: `calendar_events` hat ein einzelnes `area_id`-FK. Post-V1-Hinweis ergänzt. |
| 2026-04-11 | Person: „Vorerinnerung (Tage vor Geburtstag)" als Eigenschaft ergänzt (Section 4) | Abgleich mit Datenmodell: `birthday_reminder_days` existiert in der `persons`-Tabelle, fehlte im Objektmodell. |
| 2026-04-11 | Datei-Mindest-Zuordnung: Enforcement-Strategie (Application-Level) explizit dokumentiert | Klarstellung, dass kein DB-Constraint verwendet wird (CHECK über mehrere nullable FKs ist fragil in PostgreSQL). |
| 2026-04-11 | Inbox-Item: „Referenz auf erzeugtes Folgeobjekt" als Eigenschaft ergänzt (Section 4) | Abgleich mit Datenmodell: `processed_ref_id` existiert in `inbox_items`, fehlte im Objektmodell. |
| 2026-04-12 | Section 0.1 (drei Ebenen), Kategorien-Tabelle, Bereich/Unterthema/Inbox/KI/Ergebnis-Texte an geschärfte Produktlogik angepasst | Strategie-/Planungs-OS, Input/Thinking/Planning, Mail nicht Kern, Unterthema statt Ordner. |
