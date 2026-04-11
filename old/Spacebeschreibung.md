# Leif OS – Parallel-Neustart Anforderungsdoku (V1.0 Entwurf)

## 0. Zweck dieses Dokuments

Diese Datei beschreibt die **fachlichen Anforderungen** für den Parallel-Neustart von Leif OS – vor konkreter Technik, Pfaden, Ordnern oder UI-Komponenten.  
Sie ist die Grundlage für:

- die technische Doku (Route Map, Implementation Map, Datenmodell-Doku, Änderungsprotokoll),  
- die neue Projekt-/Repo-Struktur,  
- die Roadmap des Neustarts.  

Technikentscheidungen (Next.js, Supabase, n8n etc.) bleiben gültig, sind hier aber bewusst **nicht** der Fokus. [file:5]

---

## 1. Zielbild Leif OS (Endfassung fachlich)

### 1.1 Rolle von Leif OS

1. Leif OS ist ein zentrales persönliches Arbeits-, Planungs- und Assistenzsystem mit eigenem UI; kein Bot-only-System, keine lose Tool-Sammlung. [file:5]  
2. Das System bündelt Informationen, Aufgaben, Termine, Kommunikation, bereichsbezogene Kontexte und KI-gestütztes Sparring in einem zusammenhängenden, strukturierten System. [file:5]  
3. V1 bleibt bewusst klein, robust und testbar. Das Zielbild beschreibt den Endrahmen, nicht den sofortigen Build-Umfang. [file:5]

### 1.2 Hauptaufgaben von Leif OS

Leif OS soll:

1. Eingänge aus verschiedenen Quellen (Telegram, Kalender, später To Do, E-Mail etc.) aufnehmen, strukturieren, bewerten und in Folgeobjekte überführen (Tasks, Ergebnisse, Termine, Entwürfe etc.). [file:5]  
2. Tagessteuerung ermöglichen: Aufgaben, Termine und Kapazität so verbinden, dass der „nächste sinnvolle Schritt“ sichtbar wird. [file:5]  
3. Arbeit sowohl über **globale Funktionsseiten** als auch über **fachliche Bereiche** organisieren, wobei Bereiche echte Kontexträume sind – keine reinen Tags oder Filter. [file:5]  
4. Sparring als zentralen Arbeitsmodus bereitstellen, der Analyse, Klärung, Entscheidungsfindung, Schreiben und Ableitung von Folgeaktionen unterstützt. [file:5]  
5. Dauerhafte Ergebnisse (Erkenntnisse, Entscheidungen) strukturiert speichern und später als Grundlage für Memory und Priorisierung nutzen. [file:5]

### 1.3 Memory- und KI-Philosophie

1. Memory wird **nicht** blind aus kompletten Chats gespeist, sondern gezielt aus strukturierten Ergebnissen wie Erkenntnissen, Entscheidungen, verdichteten Notizen oder bestätigten Zusammenfassungen. [file:5]  
2. KI-Unterstützung (Sparring, Priorisierung, Entwürfe) soll **strukturierte Assistenz** liefern, keine ungefilterten Freitext-„Blobs“. [file:5]  
3. Spätere KI-Funktionen (Priorisierung, Fokus-Ansicht, KI-Sparring an Kontextpunkten) bauen auf klaren, fachlich modellierten Objekten und Ergebnissen auf. [file:5]

---

## 2. Globale Maintabs (Endbild Navigation)

### 2.1 Verbindliche Maintabs

Folgende Maintabs sind im Zielbild gesetzt:

1. **Dashboard**  
   Zentrale Start- und Steuerungsseite für Tageslage, Fokus, relevante Eingänge, Termine, Kapazität und den nächsten sinnvollen Schritt. [file:5]

2. **Bereiche**  
   Einstieg in die fachlichen Kontexträume (Hausverwaltung, Finanzen, Familie etc.). Von hier aus gelangt man in die Bereichsseiten. [file:5]

3. **Sparring**  
   Zentraler Ort für freies und übergreifendes Sparring, Übersicht über Sparring-Kontexte und Einstieg in Chats ohne direkten Objekt- oder Bereichskontext. [file:5]

4. **Inbox**  
   Zentrale Fläche für neue ungeklärte Eingänge aus Telegram und später Kalender, To Do, E-Mail etc. Hier passiert Klärung, Zuordnung, Umwandlung in Tasks, Sparring, Ergebnisse. [file:5]

5. **Tasks**  
   Globale Arbeitsfläche für Aufgaben, Statusführung, Bearbeitung, Planung, Filter (z.B. Status, Bereich) und spätere Kalenderkopplung. [file:5]

6. **Kalender**  
   Operative Kalenderansicht, deren Daten u.a. aus Outlook/Graph kommen und die Tagessteuerung, Vorbereitungslogik und Task-Planung unterstützt. [file:5]

7. **Personen** (wahrscheinlicher Maintab, noch nicht technisch ausgearbeitet)  
   Globale Sicht auf relevante Personen und ihre Bezüge zu Bereichen, Aufgaben, Terminen, Dateien und Kommunikation. [file:5]

8. **Einstellungen**  
   Systemweite Konfigurationen, Integrationsparameter (z.B. Outlook, Telegram), Kapazitätsparameter, Default-Regeln und ggf. KI-Einstellungen. [file:5]

### 2.2 Globale Funktionen ohne eigenen Maintab (vorerst)

- **Kapazität**:  
  Fachlich zentrale Logik (Bruttozeit minus Tasks minus Termine, Ampel, Netto-Verfügbarkeit), aber primär als Dashboard- und Tasks-Perspektive statt eigener Haupttab. [file:5]

---

## 3. Bereiche

### 3.1 Bereichsdefinition

Ein Bereich ist ein **dauerhafter Kontextraum** einer klaren Lebens- oder Arbeitsdomäne. Er bündelt Aufgaben, Projekte, Ergebnisse, Personen, Dateien, Termine, Sparring und Querverweise, die zu dieser Domäne gehören. [file:5]

Bereiche sind:

- keine Projektordner,  
- keine Sammelcontainer für „alles Mögliche“,  
- keine isolierten Sandboxes – sie bleiben mit dem Gesamtsystem verbunden. [file:5]

### 3.2 Festgelegte Hauptbereiche

Im Zielbild existieren diese Hauptbereiche:

1. **Hausverwaltung** – operativ, kaufmännisch, organisatorisch. [file:5]  
2. **Finanzen Firma** – betriebliche Finanzthemen, Liquidität, Verpflichtungen, Planung, Auswertungen. [file:5]  
3. **Finanzen Privat** – private Finanzen, Verpflichtungen, Vermögen, Routinen, persönliche finanzielle Übersicht. [file:5]  
4. **Familie / Privat** – private Organisation, familiäre Themen, Alltagskoordination, nicht-finanzielle Privatkontexte. [file:5]  
5. **Gesundheit / Sport** – körperliche Gesundheit, medizinische Themen, Training, Routinen, Termine. [file:5]

Der früher gedachte Bereich „Lebensplanung“ wurde verworfen, da zu schwammig und mit hohem Risiko, zum Auffangbecken zu werden. Langfristige oder strategische Themen sollen über Projekte/Themencontainer, Ergebnisse und bereichsübergreifende Ansichten getragen werden, nicht über einen eigenen „Lebensplanung“-Bereich. [file:5]

### 3.3 Bereichslogik

- Jeder Bereich hat eine eigene **Bereichsseite** mit:  
  - Überblick,  
  - Projekten/Themencontainern,  
  - bereichsspezifischen Tasks,  
  - Ergebnissen (Erkenntnisse/Entscheidungen),  
  - Sparring-Historie,  
  - relevanten Personen/Dateien,  
  - Querverbindungen zu anderen Bereichen. [file:5]  
- Bereiche können Querverknüpfungen haben (z.B. Finanzentscheidung Hausverwaltung ↔ Finanzen Firma). [file:5]  
- Globale Objekte (Tasks, Personen, Dateien, Ergebnisse) können einem oder mehreren Bereichen zugeordnet sein. [file:5]

---

## 4. Sparring

### 4.1 Rolle von Sparring

Sparring ist ein **zentraler Arbeitsmodus** von Leif OS und gleichzeitig:

- Funktion (Arbeitsmodus),  
- Maintab (globaler Ort),  
- Datentyp (Sparring-Chat plus strukturierte Ergebnisse). [file:5]

Sparring dient:

- Analyse und Klärung,  
- Entscheidungsfindung,  
- Strukturierung,  
- Schreibarbeit (Texte, Mails, Konzepte),  
- Ableitung von Tasks, Ergebnissen, Entwürfen. [file:5]

### 4.2 Typen von Sparring

1. **Freies Sparring**  
   - Start aus dem Sparring-Maintab ohne festen Kontext.  
   - Geeignet für offene Fragen, generelle Klärungen, Brainstorming, Textarbeit. [file:5]

2. **Kontext-Sparring**  
   - Start aus einem bestehenden Objekt (Task, Inbox-Item, Kalendertermin, Bereich etc.).  
   - Kontext wird mitgegeben (z.B. Task-Titel, Termin, Bereich), um das Gespräch fokusiert zu halten. [file:5]

3. **Projekt-/Themen-Sparring**  
   - Eingebettet in einen Projekt/Themencontainer innerhalb eines Bereichs.  
   - Mehrere Sparring-Chats können zu demselben Vorhaben/Case existieren. [file:5]

### 4.3 Outputs aus Sparring

Outputs aus Sparring sind **nicht** primär der Chatverlauf, sondern:

- strukturierte Ergebnisse (Erkenntnisse, Entscheidungen),  
- Aufgaben (z.B. über ein vorausgefülltes Aufgabenformular aus Sparring heraus),  
- Entwürfe (z.B. E-Mail-Text, Brief, Nachricht),  
- ggf. strukturierte Notizen. [file:5]

Aus Sparring kann per Button ein vorausgefülltes Aufgabenformular geöffnet werden mit Feldern wie:

- Titel,  
- Beschreibung,  
- Bereich,  
- Person,  
- Fälligkeit,  
- Dauer.  

Alle Felder sind vor Bestätigung editierbar. Der Task landet danach in der zentralen Taskliste; Fälligkeit führt **nicht automatisch** zum Status „planned“. [file:5]

### 4.4 Sparring und Memory

- Memory wird aus Sparring **nur** über strukturierte Ergebnisse gespeist (Erkenntnisse, Entscheidungen, bestätigte Zusammenfassungen). [file:5]  
- Roh-Chatverläufe werden nicht blind in den Memory-Speicher gekippt. [file:5]

---

## 5. Kernobjekte

### 5.1 Primärobjekte

Folgende Primärobjekte sind fachlich gesetzt:

1. **Bereich**  
   - Dauerhafte Domäne (siehe oben). [file:5]

2. **Projekt / Themencontainer**  
   - Untergeordneter fachlicher Sammelpunkt in einem Bereich für ein Vorhaben, einen Fall oder ein Thema.  
   - Bündelt: Tasks, Ergebnisse, Sparring-Chats, Personen, Dateien, Termine, Querverweise. [file:5]

3. **Sparring-Chat**  
   - Eine konkrete Gesprächsinstanz (frei, kontextbezogen oder projektbezogen). [file:5]

4. **Task (Aufgabe)**  
   - Operatives Arbeitsobjekt mit Status, optionaler Planung, ggf. Kalenderbezug, Bereichszuordnung und Personenzuordnung. [file:5]

5. **Ergebnis (Oberklasse)**  
   - Dauerhaft relevantes, strukturiertes Resultat.  
   - **Untertypen:**  
     - **Erkenntnis** – Was haben wir verstanden?  
     - **Entscheidung** – Was wurde verbindlich festgelegt? [file:5]

6. **Notiz**  
   - Kurzlebige, vorläufige oder nicht verdichtete Information.  
   - Dient als Merker oder Zwischenstand; nicht zwingend auf Dauer relevant. [file:5]

7. **Person**  
   - Natürliche oder organisatorische Bezugseinheit (z.B. Mieter, Dienstleister, Geschäftspartner, Familienmitglied). [file:5]

8. **Datei**  
   - Dokument oder Anhang, das Bereichen, Projekten, Tasks, Ergebnissen oder Sparring-Kontexten zugeordnet werden kann. [file:5]

9. **Kalendertermin**  
   - Zeitbezogenes Ereignis; Quelle u.a. Outlook/Graph.  
   - Grundlage für Tagessteuerung, Kapazität, Vorbereitungslogik, Task-Planung. [file:5]

10. **Inbox-Item**  
    - Ungeklärter Eingang aus einer Quelle (Telegram, Kalender, To Do, E-Mail).  
    - Muss in Task, Ergebnis, Sparring, Entwurf oder „Verwerfen“ überführt werden. [file:5]

### 5.2 Zentrale Beziehungslogik

- Bereich → Projekt/Themencontainer → Sparring-Chats, Tasks, Ergebnisse, Notizen, Dateien, Personen, Termine. [file:5]  
- Inbox-Item → (Task | Sparring-Chat | Ergebnis | Entwurf | Verwerfen). [file:5]  
- Kalendertermin ↔ Tasks (Planung, Vorbereitung, Kapazität). [file:5]  
- Ergebnisse (Erkenntnisse/Entscheidungen) ↔ Memory, Bereich(e), Projekte. [file:5]

---

## 6. Seitenarchitektur (fachlich)

### 6.1 Ebenen der Seiten

1. **Globale Seiten** (Maintabs)  
   - Dashboard, Bereiche, Sparring, Inbox, Tasks, Kalender, Personen, Einstellungen. [file:5]

2. **Bereichsseiten**  
   - Je Bereich eine eigene Hauptseite mit bereichsspezifischen Teilansichten. [file:5]

3. **Objekt-/Detailseiten**  
   - Projekte/Themencontainer, Sparring-Chats, Tasks (Detail ggf.), Personen, ggf. Termin-/Inbox-Details. [file:5]

### 6.2 Globale Seiten – Zwecke

- **Dashboard:**  
  Tagesfokus, Kapazität, relevante Eingänge, zentrale Kacheln (z.B. „Heute“, „Kapazität heute“, „Dein nächster Schritt“). [file:5]

- **Bereiche:**  
  Liste/Übersicht der Bereiche; Zugang zu den Bereichsseiten. [file:5]

- **Sparring:**  
  Übersicht über freie und globale Sparring-Kontexte, Start neuer freier Sparrings. [file:5]

- **Inbox:**  
  Verarbeitungsliste aller aktuellen Eingänge (Telegram, später Kalender, To Do, E-Mail etc.). [file:5]

- **Tasks:**  
  Globale Taskliste mit Filter-/Sortierlogik (Status, Bereich, Fälligkeit), Statuswechsel, Bearbeitung und Planung. [file:5]

- **Kalender:**  
  Kalenderansichten (mind. Tagesansicht), Anzeige von Outlook-Terminen, später geplanten Tasks und Kapazitätsindikatoren. [file:5]

- **Personen:**  
  Liste und Detailzugang zu Personen (optional als späterer Ausbau). [file:5]

- **Einstellungen:**  
  Integrationen, Kapazitäts-Defaults, ggf. Berechtigungen, Systemregeln. [file:5]

### 6.3 Bereichsseiten – Grundstruktur

Pro Bereich mindestens:

- **Überblick:**  
  Wichtigste offene Punkte, Kennzahlen, zentrale Verlinkungen.

- **Projekte / Themencontainer:**  
  Liste der Projekte/Fälle/Topics im Bereich.

- **Tasks (bereichsgefiltert):**  
  Sicht auf alle Aufgaben dieses Bereichs.

- **Ergebnisse:**  
  Erkenntnisse und Entscheidungen des Bereichs.

- **Sparring:**  
  Sparring-Historie und Startpunkt für neues bereichsbezogenes Sparring.

- **Querverbindungen:**  
  Explizite Verknüpfungen zu anderen Bereichen (z.B. Finanzentscheidungen mit Auswirkung auf Hausverwaltung und Finanzen Firma). [file:5]

### 6.4 Objektseiten

- **Projekt-/Themencontainer-Seite:**  
  Sammelansicht aller zugehörigen Tasks, Ergebnisse, Sparring-Chats, Personen, Dateien, Termine, Verknüpfungen. [file:5]

- **Sparring-Chat-Seite:**  
  Chatverlauf + strukturierte Ergebnisablage + Buttons für „als Ergebnis übernehmen“, „Task aus Sparring anlegen“, „Entwurf erstellen“. [file:5]

- **Task-Detailseite (optional):**  
  Falls Bearbeitung/Planung mehr Raum braucht als reine Dialoge/Sheets.

- **Person-Detail:**  
  Relevante Informationen, zugeordnete Aufgaben, Termine, Bereiche. [file:5]

---

## 7. Neustart-Vorgehen (Parallel-Neustart)

### 7.1 Grundprinzip

- Der Neustart erfolgt als **Parallel-Projekt**, nicht als Hard Reset.  
- Bestehende Umsetzung und Roadmap bleiben Referenz; der neue Pfad wird sauberer strukturiert, besser dokumentiert und mit klarer Verantwortungs- und Pfadlogik aufgebaut. [file:5]  

### 7.2 Schritte vor dem ersten Code im Neustart

1. **Anforderungsdoku fertigstellen**  
   - Dieses Dokument finalisieren und als zentrale fachliche Referenz einfrieren.  

2. **Technische Doku-Struktur definieren**  
   - Dokumenttypen:  
     - Produkt-Anforderungen (dieses Dokument),  
     - Route Map (Seiten und Zuständigkeiten),  
     - Implementation Map (für jede Funktion: Route, Page-Datei, Komponenten, Actions/Queries, Tabellen, Workflows),  
     - Datenmodell-Doku (Tabellen, Felder, Constraints, Statuswerte, Relationen),  
     - Änderungsprotokoll (jede strukturelle Änderung an Pfaden, Zuständigkeiten oder Datenmodell). [file:5]  

3. **Route Map entwerfen (ohne konkrete Dateipfade)**  
   - Pro Seite: Zweck, Objekte, Aktionen, global vs. Bereich vs. Objekt.  
   - Explizit festhalten: Welche Routen sind global, welche hängen unter einem Bereichskontext, wo werden Dinge erstellt, bearbeitet, kontextbezogen angezeigt. [file:5]

4. **Objektmodell verfeinern**  
   - Beziehungen zwischen Bereich, Projekt, Sparring, Tasks, Ergebnissen, Inbox-Items, Personen, Dateien, Terminen auf fachlicher Ebene in einer kompakten Modellskizze festhalten.  
   - Erst danach konkrete Tabellen/Spalten definieren. [file:5]

5. **Datenmodell-Doku (erste Version)**  
   - Tabellen + Felder + Statuswerte + Relationen grob beschreiben, PASST zum Objektmodell (kein Blind-Refactoring). [file:5]

6. **Implementation Map (Stub)**  
   - Noch ohne konkreten Code, aber mit geplanter Verortung:  
     - Welche Funktion gehört auf welche Seite,  
     - welche Serveraktionen / Queries sind vorgesehen,  
     - welche Tabellen und Workflows greifen wo. [file:5]

7. **Neuer Projektpfad + Repo-Struktur definieren**  
   - Erst wenn Anforderungen, Objektmodell und Route Map stehen.  
   - Kein abstraktes Ordner-Gebirge, sondern nur Strukturen, die durch Anforderungen gedeckt sind. [file:5]

8. **UI-Konzept konkretisieren**  
   - Layout-System, Navigation (Maintabs + Bereichsnavigation), Container-/Projektansichten, globale vs. lokale Aktionen, important Flows (z.B. Sparring → Task). [file:5]

9. **Erst dann: neues Projekt initialisieren**  
   - Neues Repo / Ordner, neues Next.js-Gerüst, initiale Doku-Dateien, erster Umsetzungsblock. [file:5]

### 7.3 Disziplin für den Neustart

- Keine Implementierung ohne Verortung in Produkt-Anforderungen + Route Map + Implementation Map. [file:5]  
- Keine Felder, Statuswerte, Variablen, Pfade, Komponenten oder Tabellen „aus dem Bauch heraus“. [file:5]  
- Zuerst immer fachliche Anforderungen und dokumentierte Zuständigkeiten, dann Umsetzung. [file:5]  

---

## 8. Kontextlänge und Folgechats

- Der Agent erinnert mich aktiv, sobald der aktuelle Chat so lang wird, dass Kontextverlust droht.
- In diesem Moment schlägt der Agent explizit einen neuen Chat vor.
- Bevor wir den neuen Chat starten, fasst der Agent knapp zusammen:
  - wo wir fachlich stehen (aktueller Block, erreichte Ergebnisse),
  - was der nächste konkrete Schritt ist,
  - mit welchem Startauftrag der neue Chat beginnen soll.
- Diese Anweisung für den Folgechat soll so formuliert sein, dass ich sie 1:1 als erste Nachricht im neuen Chat verwenden kann.
- Ziel: kein Gedanke und keine wichtige Zwischenerkenntnis gehen beim Wechsel in einen neuen Chat verloren.

---

### 9. Arbeitsmodus für Dokus & Dateien

1. **Eigene Datei pro sinnvollem Thema**  
   Fachliche Themen werden, wo immer sinnvoll, in eigenen Dateien geführt (z.B. `Anforderung.md`, `V1-Scope.md`, später `Route-Map.md`, `Implementation-Map.md`, `Datenmodell.md`).  
   Ziel ist, dass jede Datei einen klaren Zweck und eine klar umrissene inhaltliche Verantwortung hat und nicht zu einer unscharfen Sammelstelle wird.

2. **Aktualisierung immer blockweise, nicht in Schnipseln**  
   Am Ende eines Arbeitsblocks in diesem Space sollen Dokumente nicht „stückweise“ angepasst werden, sondern jeweils als **ganzer, konsolidierter Textblock** von der KI geliefert werden.  
   Leif übernimmt diesen Block dann als Ganzes in die entsprechende Datei (Copy & Paste), statt einzelne Stellen manuell zusammenzusuchen.  
   Dadurch sinkt das Risiko von Inkonsistenzen, übersehenen Stellen und Merge-Fehlern.

3. **KI-Rolle beim Aktualisieren**  
   Wenn ein Dokument angepasst werden muss, liefert die KI nach Möglichkeit:  
   - entweder eine **vollständig konsolidierte neue Fassung** der Datei, oder  
   - klar markierte, in sich geschlossene Ersatzblöcke (Abschnitt X komplett neu).  
   Die KI soll bewusst darauf verzichten, den Nutzer mit vielen kleinen, schwer nachzuvollziehenden Diff-Schnipseln zu belasten.

4. **Korrelation zwischen Dateien**  
   Wo Themen in mehreren Dateien vorkommen (z.B. V1-Fokus in `Anforderung.md` und `V1-Scope.md`), muss die KI darauf achten, dass Aussagen konsistent bleiben und sich nur in der Flughöhe unterscheiden (Endbild vs. V1-Ausschnitt).  
   Konsistenzprüfung zwischen vorhandenen Dateien ist explizit Teil des Arbeitsauftrags in diesem Space.

---

## 10. Nächste konkrete Schritte im neuen Space

1. **Diese Anforderungsdoku als Startpunkt übernehmen und ggf. minimal nachschärfen.**  
2. **Neuen Block im neuen Space definieren:**  
   - Block: *Technische Doku-Struktur & Route Map Neustart*  
3. **Dann: Route Map + Implementation Map-Layout erarbeiten**, bevor eine einzige neue Datei im neuen Repo angelegt wird. [file:5]

---