# Leif OS – Produkt-Anforderung

## 0. Zweck dieses Dokuments

Diese Datei beschreibt die **fachlichen Anforderungen** für Leif OS – vor konkreter Technik, Dateipfaden, Ordnern oder UI-Komponenten.  
Sie ist die Grundlage für technische Doku (Route Map, Implementation Map, Datenmodell, Änderungsprotokoll), Repo-Struktur und Roadmap.

Technikentscheidungen (Next.js, Supabase, Anbindungen) bleiben gültig, sind hier aber bewusst **nicht** der Fokus.

---

## 1. Zielbild Leif OS (fachlich)

### 1.1 Rolle von Leif OS

1. Leif OS ist ein **persönliches Strategie-, Planungs- und Entscheidungs-OS** mit eigenem UI: kein Bot-only-System, keine lose Tool-Sammlung.

2. Der Schwerpunkt liegt auf **Überblick, Priorisierung, Planung, Kapazitätssteuerung, strategischem Denken** und auf der **Verknüpfung von Themen, Bereichen und Erkenntnissen** – sowie auf der **Übersetzung von Input in konkrete Entscheidungen und Planung**.

3. Leif OS ist **ausdrücklich kein** operatives All-in-one-System, **kein** Dateimanager, **kein** Mailclient und **kein** Ort für die vollständige operative Abarbeitung externer Kommunikation. Externe Kanäle (z. B. E-Mail-Clients, Bank-Portale) bleiben die Orte der Ausführung; Leif OS ist der Ort für **Einordnen, Bewerten, Planen, Entscheiden und Verknüpfen**.

4. V1 bleibt bewusst klein, robust und testbar. Das Zielbild beschreibt den Endrahmen, nicht den sofortigen Build-Umfang.

### 1.2 Was Leif OS ausdrücklich nicht ist

- **Kein** universelles Ticketsystem und **kein** Ersatz für Fachanwendungen (Buchhaltung, CRM, klassische Projektmanagement-Suites).
- **Kein** Archiv für unbegrenzte Rohkommunikation; Chatverläufe und Postfächer sind nicht die Wahrheit des Systems.
- **Kein** starres Ordnersystem: Inhalte werden als **Objekte mit Verknüpfungen** (u. a. zu Lebensbereichen und Unterthemen) gedacht, nicht als verschachtelte Dateibäume.

### 1.3 Leitlogik: drei Systemebenen

Die App soll entlang von **drei Ebenen** verstanden und strukturiert werden. Sie hängen zusammen, dürfen aber **nicht vermischt** werden:

| Ebene | Name (fachlich) | Funktion | Beispiele im Produkt |
|---|---|---|---|
| **A** | **Input** | Alles, was neu ins System kommt und noch Klärung braucht | Inbox, Schnellerfassung, bewusst weitergeleitete Information aus E-Mail-Kanälen |
| **B** | **Thinking** | Nachdenken, Einordnen, Reflektieren, Entscheiden, Verknüpfen | KI (Sparring), Lebensbereiche, Gedächtnis, Notizen, strategische Themen, Sparring-Ausgänge |
| **C** | **Planning** | Konkrete zeitliche und kapazitative Verortung | Tasks, Kalender, Tages- und Wochenplanung, nächster sinnvoller Schritt |

**Leitplanken:** Nicht alles ist ein Task. Nicht alles gehört in den Kalender. Nicht alles aus der Inbox wird direkt geplant. Strategie (Thinking) und operative Planung (Planning) gehören zusammen, bleiben aber fachlich unterscheidbar.

### 1.4 Hauptaufgaben von Leif OS

Leif OS soll:

1. **Input fassen und klären:** Eingänge aus definierten Quellen aufnehmen, sichten, bewerten und – nach Review – in passende Zielobjekte überführen oder verwerfen bzw. zurückstellen (siehe Inbox, Abschnitt 5 und 6).

2. **Denken und Entscheiden unterstützen:** KI-gestütztes Sparring als **Denkpartner** (nicht als bloßes Chatfenster), gebündelt mit Lebensbereichen, Gedächtnis (strukturierte Ergebnisse) und Notizen.

3. **Planen und steuern:** Tages- und Wochensteuerung, Aufgaben, Termine und Kapazität so verbinden, dass der **nächste sinnvolle Schritt** sichtbar wird – insbesondere durch eine **empfohlene nächste Aufgabe**.

4. **Kontext halten:** Arbeit über **globale Funktionsseiten** und über **Lebensbereiche** organisieren. Lebensbereiche sind **strategische Kontexte** und Orientierungsebenen – keine Projektordner und keine Dateicontainer (siehe Abschnitt 3).

5. **Langzeitwissen aufbauen:** Dauerhaft relevante Erkenntnisse und Entscheidungen strukturiert im **Gedächtnis** halten; dieses Wissen bewusst aus Inbox, KI, Notizen oder Bereichsarbeit speisen – nicht durch blindes Einspeisen von Roh-Chats.

6. **Lage zeigen:** Dashboard als **Steuerzentrale** für die Frage: *Was ist heute und diese Woche wirklich relevant?* – inklusive kompakter Kennzahlen (z. B. Vermögen/Portfolio), ohne zum Finanzcockpit zu werden.

7. **Kalender und Aufgaben verbinden:** Geplante Tasks im Zeitkontext, Termine aus angebundenen Kalendern; Kapazität als einfacher Orientierungswert.

### 1.5 Memory- und KI-Philosophie

1. Das **Gedächtnis** wird nicht aus vollständigen Chats gespeist, sondern aus **strukturierten, bestätigten Inhalten** (Erkenntnisse, Entscheidungen, ggf. kuratierte Übernahmen).

2. **KI** liefert **strukturierte Assistenz** für Reflexion, Priorisierung, Entscheidungsvorbereitung und nächste Schritte – mit klarer Überführung in Tasks, Notizen, Gedächtnis oder Lebensbereichskontext.

3. Spätere KI-Funktionen bauen auf klar modellierten Objekten und Ergebnissen auf.

### 1.6 V1-Fokus und Scope

1. V1 konzentriert sich auf einen alltagstauglichen Kern aus **Dashboard, Inbox, Tasks, KI (Sparring), Kalender** sowie **Lebensbereichen, Kontakten, Notizen und Gedächtnis** (Ergebnisse).

2. Lebensbereiche und Kontakte sind in V1 fachlich sauber angelegt; der volle Ausbau von Unterthemen-Verknüpfungen und Querschnittsfiltern kann schrittweise folgen.

3. Der finanzielle Überblick im Dashboard bleibt in V1 schlank (Aggregat, einfache Portfolio-Sichten).

4. **Empfohlene nächste Aufgabe** und nutzbarer Kalender gehören zum V1-Kern.

5. **E-Mail:** keine vollwertige Mail-Inbox im Produktkern; höchstens **Input-Kanal** und technische Anbindung für **Entwürfe** (siehe Abschnitt 2.3 und Route Map).

6. **Einstellungen** sind im Zielbild vorgesehen, aber kein priorisierter V1-Schwerpunkt.

---

## 2. Globale Maintabs und Randkanäle

### 2.1 Kernbereiche (verbindlich im Zielbild)

Die folgenden Bereiche bilden den **Produktkern**:

1. **Dashboard** – Steuerzentrale für Relevanz heute/diese Woche (siehe Abschnitt 6.2).

2. **Inbox** – **Capture- und Review-Ort** für neuen, ungeklärten Input (siehe Abschnitt 5 und 6).

3. **KI** (Sparring) – Denkpartner für Klärung, Entscheidungsvorbereitung und Ableitung von Folgeschritten.

4. **Tasks** – globale Aufgabenführung und Planungsobjekte.

5. **Kalender** – zeitliche Verortung, Termine, Kapazitätssicht.

6. **Lebensbereiche** – strategische Kontexte; Einstieg in Bereichsseiten.

7. **Gedächtnis** (fachlich: strukturierte Ergebnisse) – Langzeitwissen des Systems.

8. **Notizen** – kurzlebige Merker und Entwürfe.

9. **Kontakte** – Personenbezüge und Stammdaten.

### 2.2 Weitere globale Funktionen

- **Kapazität:** zentrale Logik fachlich wichtig, in V1 primär als Dashboard- und Kalender-/Tasks-Perspektive, nicht zwingend als eigener Haupttab.

### 2.3 E-Mail (Zielbild, ohne Mail-UI)

- **Leif OS ist kein Mailclient.** Es gibt **keine** Postfach-Ansicht, **keine** Outlook-Inbox-Liste und **keine** Funktion zum Anlegen von E-Mail-Entwürfen in Outlook aus der App.

- **Microsoft / Outlook** im Produkt dient **ausschließlich dem Kalender** (OAuth-Scope nur `Calendars.ReadWrite`), z. B. Sync, Termine schreiben, Geburtstags-Serien — nicht der Mail-API.

- **E-Mail als Input** für die fachliche **Inbox** (z. B. Weiterleitung, strukturierte Nutzlast in `inbox_items.metadata`) ist ein **separater** Integrations-Schritt und derzeit **nicht** als Endnutzer-Flow umgesetzt.

---

## 3. Lebensbereiche und Unterthemen

### 3.1 Lebensbereich (fachlich)

Ein **Lebensbereich** ist ein **strategischer Kontext** einer Lebens- oder Arbeitsdomäne: Orientierungsebene, Filter, Denkraum – **kein** Projektordner, **kein** Dateicontainer und **kein** starres Archiv.

Lebensbereiche bündeln **Sicht** auf verknüpfte Objekte (Tasks, Termine, Notizen, Gedächtniseinträge, KI-Sparrings, Kontakte, Dateien …), die **global** existieren und im Bereich nur **kontextuell** sichtbar gemacht werden.

### 3.2 Festgelegte vs. freie Lebensbereiche

Im **Zielbild** können Lebensbereiche anwendungsseitig an die Nutzerrealität angepasst werden (Benennung, Reihenfolge), solange die fachliche Rolle „strategischer Kontext“ gewahrt bleibt. Referenzbeispiele aus dem bisherigen Modell: Hausverwaltung, Finanzen Firma, Finanzen Privat, Familie/Privat, Gesundheit/Sport – ohne Zwang zur exakten Namensliste, sofern das Datenmodell Anpassungen erlaubt.

Der frühere Gedanke eines eigenen Bereichs „Lebensplanung“ bleibt verworfen (Gefahr des Auffangbeckens). Langfristige oder strategische Themen werden über **Unterthemen**, Gedächtnis, KI und Querverweise getragen.

### 3.3 Unterthemen innerhalb eines Lebensbereichs

Innerhalb eines Lebensbereichs gibt es **Unterthemen** – **Kategorien / Themencluster**, keine verschachtelte Ordnerlogik.

- Fachliche Formulierung: *Objekt X gehört zu Lebensbereich Y und zu Unterthema Z.*

- Im **bestehenden Datenmodell** entspricht diese Rolle primär der Entität **Projekt / Themencontainer** (`projects`): ein **Unterthema** ist kein Ordner, sondern eine **zusätzliche Strukturdimension** für Verknüpfungen.

### 3.4 Bereichsseite (fachlich)

Jeder Lebensbereich hat eine **Bereichsseite**. Sie zeigt **keine Baumnavigation wie ein Dateisystem**, sondern einen **Querschnitt** durch verknüpfte Objekte – optional gefiltert oder gruppiert nach Unterthema.

Mindestinhalt (Zielbild, an V1 anpassbar):

- Überblick (offene Punkte, Kennzahlen),
- Unterthemen (Themencontainer),
- Tasks, Gedächtnis-Einträge, KI-Sparrings, Notizen, relevante Kontakte, Termine, Dateien,
- Querverbindungen zu anderen Bereichen (z. B. über mehrsprachig verknüpfte Ergebnisse).

---

## 4. KI (Sparring)

### 4.1 Rolle

Die **KI** ist kein generisches Chatfenster, sondern ein Arbeitsmodus für **Sparring, Reflexion, Entscheidungsfindung, Priorisierung, Planerstellung** und für die **Überführung von Erkenntnissen** in Tasks, Notizen, Gedächtnis und Lebensbereiche.

### 4.2 Typen von Sparring

1. **Freies Sparring** – ohne festen Objektkontext.  
2. **Kontext-Sparring** – ausgehend von Task, Inbox-Item, Lebensbereich o. Ä.  
3. **Unterthemen-Sparring** – eingebunden in ein Unterthema (Themencontainer) innerhalb eines Lebensbereichs.

### 4.3 Outputs aus Sparring

Primär sind nicht Chatverläufe die Wertschöpfung, sondern **strukturierte Outputs**: Gedächtnis-Einträge (Erkenntnis/Entscheidung), Tasks, Entwürfe (Notiz-Typ Entwurf).

Aus Sparring kann ein vorausgefülltes Aufgabenformular geöffnet werden; nach Bestätigung landet der Task in der globalen Taskliste.

### 4.4 KI und Gedächtnis

Das Gedächtnis wird aus KI-Arbeit **nur** über bestätigte strukturierte Übernahmen gespeist, nicht durch vollautomatisches Abspeichern ganzer Verläufe.

---

## 5. Kernobjekte

### 5.1 Primärobjekte

1. **Lebensbereich** – strategischer Kontext (siehe Abschnitt 3).

2. **Unterthema (Themencontainer)** – Strukturdimension innerhalb eines Lebensbereichs; im Datenmodell: **Projekt** (`projects`).

3. **Sparring-Chat (KI-Gespräch)** – Gesprächsinstanz mit Typ (frei, Kontext, Unterthema).

4. **Task** – Planungs- und Arbeitsobjekt im Planning Layer; kein Ersatz für die Inbox.

5. **Gedächtnis-Eintrag (Ergebnis)** – Oberklasse mit Untertypen **Erkenntnis**, **Entscheidung** – Langzeitwissen.

6. **Notiz** – kurzlebig / vorläufig; inkl. **Entwurf** (z. B. Text für Nachricht).

7. **Kontakt (Person)** – Bezugseinheit mit optionalen Lebensbereichs-Verknüpfungen.

8. **Datei** – Anhang/Dokument mit Mindest-Zuordnung zu einem anderen Objekt.

9. **Kalendertermin** – zeitbezogenes Ereignis (eigene Anlage oder Sync).

10. **Inbox-Item** – **Übergangsobjekt** im Input Layer: neu, ungeklärt, aus Quelle (z. B. Telegram; perspektivisch weitere Kanäle). Kein dauerhafter Endzustand.

### 5.2 Inbox-Item: Review und Zielobjekte

Die Inbox ist **kein** Task-Eingang und **kein** Mailpostfach, sondern **Capture- und Review-Ort**. Jedes Item soll einen **Review** mit klarer Folgeentscheidung durchlaufen.

**Mögliche Zielrichtungen** (an bestehende und geplante Aktionen anknüpfbar):

- in **Task** überführen (Planung später im Task/Kalender),
- in **Notiz** oder **Entwurf** überführen,
- in **Gedächtnis** übernehmen,
- **KI-Sparring** starten,
- **Kontakt** anlegen oder zuordnen (sobald fachlich/technisch vorgesehen),
- Lebensbereich und Unterthema zuordnen bzw. vormerken,
- **verwerfen** oder **archivieren**,
- **zurückstellen** / spätere Sichtung (fachlich wünschenswert; Umsetzung kann später erfolgen),
- **als gelesen markieren** (nur Aufmerksamkeit, keine fachliche Erledigung).

**Wichtig:** „Als gelesen markieren“ ersetzt keine Überführung in ein Zielobjekt, verschiebt aber die Dringlichkeit (z. B. im Dashboard).

### 5.3 Task-Merkmale: Lebensbereich, Status, Priorität, Tags

- **Lebensbereich** – primärer strategischer Kontext („Wozu gehört dieser Task?“). Jeder Task hat genau einen Lebensbereich.

- **Status** – Lebenszyklus im Planning Layer: `inbox`, `open`, `planned`, `done`, `canceled` (siehe 5.4).  
  *Hinweis:* Der Statuswert `inbox` am Task signalisiert „aus Eingang übernommen, noch nicht endgültig einsortiert“ – er ist **nicht** identisch mit der fachlichen Inbox-Seite.

- **Priorität** – `high`, `medium`, `low`.

- **Tags** – freie Zusatzmarkierungen; ersetzen weder Status noch Lebensbereich.

### 5.4 Lebenszyklus und Statusregeln – Task

#### 5.4.1 Zweck

Das Modell unterstützt operative Steuerung ohne Ticketsystem: *planen – tun – abschließen.*

#### 5.4.2 Erlaubte Statuswerte

`inbox`, `open`, `planned`, `done`, `canceled` – siehe bestehende Definitionen in V1-Scope und Objektmodell (keine `in_progress` / `waiting`).

#### 5.4.3 Entstehung

Tasks aus Inbox-Überführung starten in der Regel mit `inbox`; manuell angelegte Tasks mit `open`.

#### 5.4.4 Erlaubte Wechsel

Unverändert: `inbox` → `open` / `planned` / `canceled`; `open` → `planned` / `done` / `canceled`; `planned` → `done` / `canceled`; terminal `done` / `canceled`.

### 5.5 Zentrale Beziehungslogik (kurz)

- Lebensbereich → Unterthemen → verknüpfte Objekte (Sicht),  
- Inbox-Item → Review → Zielobjekt oder Abschluss,  
- Kalendertermin ↔ Tasks (Planung),  
- Gedächtnis-Einträge ↔ Lebensbereiche (n:m), optional Unterthema,  
- Kontakte ↔ Lebensbereiche, Tasks, Termine.

---

## 6. Seitenarchitektur (fachlich)

### 6.1 Ebenen

1. **Globale Seiten** (Maintabs) – Dashboard, Inbox, KI, Tasks, Kalender, Lebensbereiche, Gedächtnis, Notizen, Kontakte.

2. **Bereichsseiten** – Kontext- und Unterthemen-Sicht.

3. **Objekt-/Detailseiten** – Unterthemen, KI-Gespräche, Tasks, Kontakte, ggf. Termin- oder Inbox-Details.

### 6.2 Dashboard

Beantwortet: **Was ist heute und diese Woche wirklich relevant?**  
Steuerzentrale mit Fokus auf **einer empfohlenen nächsten Aufgabe**, kompakter Inbox-Sicht (neu/ungelesen), heutiger Lage (Termine, geplante Tasks), Kapazität und Finanz-Kurzblick – **nicht** als Ersatz für die vollständige Inbox- oder Taskseite.

### 6.3 Inbox

**Capture und Review** – nicht Arbeitsliste für alles und nicht Ablage. Volle Verarbeitung auf der Inbox-Seite; Dashboard nur als Einstieg.

### 6.4 Tasks und Kalender

Planning Layer: globale Taskführung; Kalender verbindet Termine und geplante Tasks mit Kapazitätssicht.

### 6.5 KI (Sparring)

Thinking Layer: Übersicht, neues Gespräch, Chat mit strukturierten Übernahmen.

### 6.6 Gedächtnis und Notizen

**Gedächtnis** – Langzeitwissen (Erkenntnisse, Entscheidungen).  
**Notizen** – kurzlebige Merker und Entwürfe; keine Ablösung des Gedächtnisses.

### 6.7 Kontakte

Globale Personenbasis; Verknüpfung zu Lebensbereichen; keine CRM-Vollsubstitution in V1.

### 6.8 Einstellungen

Zielbild: eigenständiger Bereich; V1: nicht priorisiert.

---

## 7. Neustart-Vorgehen (Parallel-Neustart)

### 7.1 Grundprinzip

Neustart als **Parallel-Projekt** ohne Hard Reset der fachlichen Idee; Umsetzung und Roadmap bleiben Referenz.

### 7.2 Schritte vor dem ersten Code im Neustart

1. Anforderungsdoku (dieses Dokument) und abhängige Doku konsistent halten.  
2. Route Map, Objektmodell, Datenmodell, Implementation Map abstimmen.  
3. Keine Felder, Statuswerte oder Tabellen „ohne Spur“ in der Doku.

### 7.3 Disziplin

Keine Implementierung ohne Verortung in Produkt-Anforderung + Route Map + Implementation Map.

---

## 8. Nächste konkrete Schritte

1. Diese Produkt-Anforderung als fachliche Referenz nutzen.  
2. UI und Datenmodell **schrittweise** an die geschärfte Leitlogik anbinden (ohne dass dieses Dokument einzelne Releases ersetzt).  
3. V1-Scope bei Abweichungen bewusst nachziehen.

---

## Änderungsprotokoll (Dokument intern)

| Datum | Änderung |
|---|---|
| 2026-04-12 | Neuaufstellung: Strategie-/Planungs-/Entscheidungs-OS; drei Ebenen Input/Thinking/Planning; Inbox als Capture/Review; Mail aus dem Kern; Lebensbereiche und Unterthemen; KI- und Gedächtnisrollen; Dashboard als Steuerzentrale. |
