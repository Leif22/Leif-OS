# Leif OS – Produkt-Anforderung

## 0. Zweck dieses Dokuments

Diese Datei beschreibt die **fachlichen Anforderungen** für den Parallel-Neustart von Leif OS – vor konkreter Technik, Pfaden, Ordnern oder UI-Komponenten.  
Sie ist die Grundlage für:

- die technische Doku (Route Map, Implementation Map, Datenmodell-Doku, Änderungsprotokoll),
- die neue Projekt-/Repo-Struktur,
- die Roadmap des Neustarts. 

Technikentscheidungen (Next.js, Supabase, n8n etc.) bleiben gültig, sind hier aber bewusst **nicht** der Fokus. 

---

## 1. Zielbild Leif OS (Endfassung fachlich)

### 1.1 Rolle von Leif OS

1. Leif OS ist ein zentrales persönliches Arbeits-, Planungs- und Assistenzsystem mit eigenem UI; kein Bot-only-System, keine lose Tool-Sammlung.   
2. Das System bündelt Informationen, Aufgaben, Termine, Kommunikation, bereichsbezogene Kontexte und KI-gestütztes Sparring in einem zusammenhängenden, strukturierten System.   
3. V1 bleibt bewusst klein, robust und testbar. Das Zielbild beschreibt den Endrahmen, nicht den sofortigen Build-Umfang. 

### 1.2 Hauptaufgaben von Leif OS

Leif OS soll:

1. Eingänge aus verschiedenen Quellen (Telegram, Kalender, später To Do, E-Mail etc.) aufnehmen, strukturieren, bewerten und in Folgeobjekte überführen (Tasks, Ergebnisse, Termine, Entwürfe etc.). 

2. Tagessteuerung ermöglichen: Aufgaben, Termine und Kapazität so verbinden, dass nicht nur der „nächste sinnvolle Schritt“ sichtbar wird, sondern die Priorisierung operativ spürbar abgenommen wird.  
   Ein zentraler Nutzen des Systems besteht darin, aus allen offenen Aufgaben die aktuell **empfohlene nächste Aufgabe** sichtbar zu machen. 

3. Arbeit sowohl über **globale Funktionsseiten** als auch über **fachliche Bereiche** organisieren, wobei Bereiche echte Kontexträume sind – keine reinen Tags oder Filter. 

4. Sparring als zentralen Arbeitsmodus bereitstellen, der Analyse, Klärung, Entscheidungsfindung, Schreiben und Ableitung von Folgeaktionen unterstützt. 

5. Dauerhafte Ergebnisse (Erkenntnisse, Entscheidungen) strukturiert speichern und später als Grundlage für Memory und Priorisierung nutzen. 

6. Einen kompakten finanziellen Tagesüberblick ermöglichen, insbesondere über Gesamtvermögen und einfache Portfolio-Sichten. Historische Wertentwicklung und Performance-Logiken sind ein späterer Ausbauschritt. 

7. Kalender und Aufgaben so zusammenführen, dass zeitlich geplante Tasks im Kalender sichtbar werden und einfache Terminsetzung in den relevanten Kalenderkontexten möglich ist.  
   Die sinnvolle Nutzung von Tages- und Wochenkapazität ist dabei ein zentraler fachlicher Anwendungsfall. 

### 1.3 Memory- und KI-Philosophie

1. Memory wird **nicht** blind aus kompletten Chats gespeist, sondern gezielt aus strukturierten Ergebnissen wie Erkenntnissen, Entscheidungen, verdichteten Notizen oder bestätigten Zusammenfassungen.   
2. KI-Unterstützung (Sparring, Priorisierung, Entwürfe) soll **strukturierte Assistenz** liefern, keine ungefilterten Freitext-„Blobs“.   
3. Spätere KI-Funktionen (Priorisierung, Fokus-Ansicht, KI-Sparring an Kontextpunkten) bauen auf klaren, fachlich modellierten Objekten und Ergebnissen auf. 

### 1.4 V1-Fokus und Scope

1. V1 konzentriert sich auf einen alltagstauglichen, schlanken Kern aus **Dashboard, Inbox, Tasks, Sparring, Kalender** sowie einfachen **Bereichs- und Personenfunktionen**. 

2. Bereiche und Personen sollen in V1 bereits fachlich sauber angelegt sein, aber noch nicht den Vollausbau des Endbilds erhalten. 

3. Der finanzielle Überblick im Dashboard ist fachlich wichtig, soll in V1 jedoch bewusst schlank bleiben: Gesamtvermögen und einfache Aggregationen stehen vor historischer Entwicklung, Performance-Logik und tiefer Analyse. 

4. Die Priorisierungsunterstützung gehört bereits in V1 zum Kernnutzen des Systems.  
   Insbesondere soll Leif OS eine **empfohlene nächste Aufgabe** sichtbar machen, statt die tägliche Priorisierungsarbeit vollständig dem Nutzer zu überlassen. 

5. Der Kalender gehört in V1 nicht nur als Anzeige, sondern bereits als einfacher operativer Planungskontext zum Kern.  
   Dazu zählen mindestens Tagesansicht, einfache Wochenansicht, Sicht auf Vergangenheit/Gegenwart/Zukunft, Sichtbarkeit geplanter Tasks im Kalender sowie einfache Termin-Erstellung im Outlook-Kalender. 

6. Einstellungen gehören weiterhin zum Zielbild, sind aber **kein priorisierter V1-Baustein** des Neustarts. 

---

## 2. Globale Maintabs (Endbild Navigation)

### 2.1 Verbindliche Maintabs

Folgende Maintabs sind im Zielbild gesetzt:

1. **Dashboard**  
   Zentrale Start- und Steuerungsseite für Tageslage, Priorisierung, relevante Eingänge, Termine, Kapazität und die aktuell empfohlene nächste Aufgabe.  
   Zusätzlich ist das Dashboard ein zentraler Ort für einen kompakten finanziellen Überblick, insbesondere Gesamtvermögen und einfache Portfolio-Sichten. 

2. **Bereiche**  
   Einstieg in die fachlichen Kontexträume (Hausverwaltung, Finanzen, Familie etc.). Von hier aus gelangt man in die Bereichsseiten. 

3. **Sparring**  
   Zentraler Ort für freies und übergreifendes Sparring, Übersicht über Sparring-Kontexte und Einstieg in Chats ohne direkten Objekt- oder Bereichskontext. 

4. **Inbox**  
   Zentrale Fläche für neue ungeklärte Eingänge aus Telegram und später Kalender, To Do, E-Mail etc. Hier passiert Klärung, Zuordnung und Umwandlung in Tasks, Sparring, Ergebnisse, Entwürfe oder Verwerfen. 

5. **Tasks**  
   Globale Arbeitsfläche für Aufgaben, Priorisierung, Statusführung, Bearbeitung, Planung, Sortierung und Filterung. 

6. **Kalender**  
   Operative Kalender- und Planungssicht für Termine, geplante Tasks, Zeitkontext und Kapazitätssteuerung.  
   Der Kalender verbindet Outlook-/Graph-Daten mit der eigenen Tages- und Wochenplanung in Leif OS. 

7. **Personen**  
   Globale Sicht auf relevante Personen und ihre Stammdaten sowie ihre späteren Bezüge zu Bereichen, Aufgaben, Terminen, Dateien und Kommunikation.  
   Im V1-Fokus steht zunächst eine einfache, alltagstaugliche Personenverwaltung inklusive Geburtstags- und Erinnerungslogik. 

8. **Einstellungen**  
   Einstellungen sind im Zielbild grundsätzlich vorgesehen, gehören aber nicht zum aktiven V1-Fokus und müssen im Neustart nicht als eigener priorisierter Maintab umgesetzt werden. 

### 2.2 Globale Funktionen ohne eigenen Maintab (vorerst)

- **Kapazität**:  
  Fachlich zentrale Logik (Bruttozeit minus belegte Zeit, Einordnung freier Zeitfenster, Ampel, Netto-Verfügbarkeit), aber primär als Dashboard- und Kalender-/Tasks-Perspektive statt eigener Haupttab. 

---

## 3. Bereiche

### 3.1 Bereichsdefinition

Ein Bereich ist ein **dauerhafter Kontextraum** einer klaren Lebens- oder Arbeitsdomäne. Er bündelt Aufgaben, Projekte, Ergebnisse, Personen, Dateien, Termine, Sparring und Querverweise, die zu dieser Domäne gehören. 

Bereiche sind:

- keine Projektordner,
- keine Sammelcontainer für „alles Mögliche“,
- keine isolierten Sandboxes – sie bleiben mit dem Gesamtsystem verbunden. 

### 3.2 Festgelegte Hauptbereiche

Im Zielbild existieren diese Hauptbereiche:

1. **Hausverwaltung** – operativ, kaufmännisch, organisatorisch.   
2. **Finanzen Firma** – betriebliche Finanzthemen, Liquidität, Verpflichtungen, Planung, Auswertungen sowie betrieblicher Vermögens- und Portfolioüberblick.   
3. **Finanzen Privat** – private Finanzen, Verpflichtungen, Vermögen, Routinen, persönlicher finanzieller Überblick sowie privater Portfolioüberblick.   
4. **Familie / Privat** – private Organisation, familiäre Themen, Alltagskoordination, nicht-finanzielle Privatkontexte.   
5. **Gesundheit / Sport** – körperliche Gesundheit, medizinische Themen, Training, Routinen, Termine. 

Der tägliche Blick auf Vermögen und Portfolio ist fachlich ein wichtiger Anwendungsfall, der insbesondere in den Bereichen **Finanzen Firma** und **Finanzen Privat** verankert ist und zusätzlich in verdichteter Form auf dem Dashboard sichtbar werden soll. Historische Wertentwicklung und Performance-Auswertungen sind ein späterer Ausbauschritt. 

Der früher gedachte Bereich „Lebensplanung“ wurde verworfen, da zu schwammig und mit hohem Risiko, zum Auffangbecken zu werden. Langfristige oder strategische Themen sollen über Projekte/Themencontainer, Ergebnisse und bereichsübergreifende Ansichten getragen werden, nicht über einen eigenen „Lebensplanung“-Bereich. 

### 3.3 Bereichslogik

- Jeder Bereich hat eine eigene **Bereichsseite** mit:  
  - Überblick,  
  - Projekten/Themencontainern,  
  - bereichsspezifischen Tasks,  
  - Ergebnissen (Erkenntnisse/Entscheidungen),  
  - Sparring-Historie,  
  - relevanten Personen/Dateien,  
  - Querverbindungen zu anderen Bereichen.   
- Bereiche können Querverknüpfungen haben (z.B. Finanzentscheidung Hausverwaltung ↔ Finanzen Firma).   
- Globale Objekte (Tasks, Personen, Dateien, Ergebnisse) können einem oder mehreren Bereichen zugeordnet sein. 

---

## 4. Sparring

### 4.1 Rolle von Sparring

Sparring ist ein **zentraler Arbeitsmodus** von Leif OS und gleichzeitig:

- Funktion (Arbeitsmodus),
- Maintab (globaler Ort),
- Datentyp (Sparring-Chat plus strukturierte Ergebnisse). 

Sparring dient:

- Analyse und Klärung,
- Entscheidungsfindung,
- Strukturierung,
- Schreibarbeit (Texte, Mails, Konzepte),
- Ableitung von Tasks, Ergebnissen, Entwürfen. 

### 4.2 Typen von Sparring

1. **Freies Sparring**  
   - Start aus dem Sparring-Maintab ohne festen Kontext.  
   - Geeignet für offene Fragen, generelle Klärungen, Brainstorming, Textarbeit. 

2. **Kontext-Sparring**  
   - Start aus einem bestehenden Objekt (Task, Inbox-Item, Kalendertermin, Bereich etc.).  
   - Kontext wird mitgegeben (z.B. Task-Titel, Termin, Bereich), um das Gespräch fokussiert zu halten. 

3. **Projekt-/Themen-Sparring**  
   - Eingebettet in einen Projekt/Themencontainer innerhalb eines Bereichs.  
   - Mehrere Sparring-Chats können zu demselben Vorhaben/Case existieren. 

### 4.3 Outputs aus Sparring

Outputs aus Sparring sind **nicht** primär der Chatverlauf, sondern:

- strukturierte Ergebnisse (Erkenntnisse, Entscheidungen),
- Aufgaben (z.B. über ein vorausgefülltes Aufgabenformular aus Sparring heraus),
- Entwürfe (z.B. E-Mail-Text, Brief, Nachricht),
- ggf. strukturierte Notizen. 

Aus Sparring kann per Button ein vorausgefülltes Aufgabenformular geöffnet werden mit Feldern wie:

- Titel,
- Beschreibung,
- Bereich,
- Tags,
- Priorität,
- Person,
- Fälligkeit,
- Dauer. 

Alle Felder sind vor Bestätigung editierbar. Der Task landet danach in der zentralen Taskliste; Fälligkeit führt **nicht automatisch** zum Status „planned“. 

### 4.4 Sparring und Memory

- Memory wird aus Sparring **nur** über strukturierte Ergebnisse gespeist (Erkenntnisse, Entscheidungen, bestätigte Zusammenfassungen).   
- Roh-Chatverläufe werden nicht blind in den Memory-Speicher gekippt. 

---

## 5. Kernobjekte

### 5.1 Primärobjekte

Folgende Primärobjekte sind fachlich gesetzt:

1. **Bereich**  
   - Dauerhafte Domäne (siehe oben). 

2. **Projekt / Themencontainer**  
   - Untergeordneter fachlicher Sammelpunkt in einem Bereich für ein Vorhaben, einen Fall oder ein Thema.  
   - Bündelt: Tasks, Ergebnisse, Sparring-Chats, Personen, Dateien, Termine, Verknüpfungen. 

3. **Sparring-Chat**  
   - Eine konkrete Gesprächsinstanz (frei, kontextbezogen oder projektbezogen). 

4. **Task (Aufgabe)**  
   - Operatives Arbeitsobjekt mit Status, optionaler Planung, Bereichszuordnung und ggf. Personenzuordnung oder Terminbezug.  
   - Zusätzlich können Tasks fachliche Merkmale wie **Priorität** und **Tags** tragen, um Priorisierung, Sortierung und zusätzliche Kontextverknüpfungen zu unterstützen. 

5. **Ergebnis (Oberklasse)**  
   - Dauerhaft relevantes, strukturiertes Resultat.  
   - **Untertypen:**  
     - **Erkenntnis** – Was haben wir verstanden?  
     - **Entscheidung** – Was wurde verbindlich festgelegt? 

6. **Notiz**  
   - Kurzlebige, vorläufige oder nicht verdichtete Information.  
   - Dient als Merker oder Zwischenstand; nicht zwingend auf Dauer relevant. 

7. **Person**  
   - Natürliche oder organisatorische Bezugseinheit (z.B. Mieter, Dienstleister, Geschäftspartner, Familienmitglied).  
   - In V1 zunächst als einfache Personenbasis mit Stammdaten und Erinnerungsbezug, insbesondere für Geburtstage und optionale Geschenk-Vorerinnerungen. 

8. **Datei**  
   - Dokument oder Anhang, das Bereichen, Projekten, Tasks, Ergebnissen oder Sparring-Kontexten zugeordnet werden kann. 

9. **Kalendertermin**  
   - Zeitbezogenes Ereignis; Quelle u.a. Outlook/Graph oder direkte Anlage über Leif OS.  
   - Grundlage für Tagessteuerung, Wochensteuerung, Kapazität, Vorbereitungslogik und Zeitplanung. 

10. **Inbox-Item**  
    - Ungeklärter Eingang aus einer Quelle (Telegram, Kalender, To Do, E-Mail).  
    - Muss in Task, Ergebnis, Sparring, Entwurf oder „Verwerfen“ überführt werden. 

### 5.2 Task-Merkmale: Bereich, Status, Priorität, Tags

Für Tasks gelten vier klar getrennte fachliche Einordnungsdimensionen:

- **Bereich**  
  Der Bereich beschreibt den primären fachlichen Kontextraum, zu dem ein Task gehört, z.B. Hausverwaltung, Finanzen Privat oder Gesundheit/Sport.  
  Jeder Task gehört genau einem Hauptbereich an.  
  Der Bereich beantwortet die Frage: **„Wozu gehört dieser Task?“** 

- **Status**  
  Der Status beschreibt den Lebenszyklus bzw. Bearbeitungszustand des Tasks.  
  Erlaubte Statuswerte sind ausschließlich: `inbox`, `open`, `planned`, `done`, `canceled`.  
  Der Status beantwortet die Frage: **„Wo steht der Task im Arbeitsverlauf?“** 

- **Priorität**  
  Die Priorität beschreibt die relative Wichtigkeit eines Tasks im Verhältnis zu anderen offenen Tasks.  
  Für V1 genügen drei Stufen: `high`, `medium`, `low`.
  Die Priorität beantwortet die Frage: **„Wie wichtig ist dieser Task aktuell?“** 

- **Tags**  
  Tags sind frei kombinierbare Zusatzmarkierungen, mit denen Tasks weiter eingeordnet werden können.  
  Tags können fachliche Zusatzkontexte, Schlagworte oder Querbezüge abbilden und dürfen auch Begriffe enthalten, die Bereiche ergänzen oder mit ihnen zusammenhängen.  
  Tags ersetzen jedoch nicht die primäre Bereichszuordnung.  
  Tags beantworten die Frage: **„Welche zusätzlichen Kontexte oder Schlagworte passen zu diesem Task?“** 

Tags dürfen nicht verwendet werden, um Statuswerte zu ersetzen.  
Ebenso dürfen sie die primäre Bereichszuordnung nicht unklar machen oder auflösen. 

### 5.3 Zentrale Beziehungslogik

- Bereich → Projekt/Themencontainer → Sparring-Chats, Tasks, Ergebnisse, Notizen, Dateien, Personen, Termine.   
- Inbox-Item → (Task | Sparring-Chat | Ergebnis | Entwurf | Verwerfen).   
- Kalendertermin ↔ Tasks (Planung, Vorbereitung, Kapazität).   
- Ergebnisse (Erkenntnisse/Entscheidungen) ↔ Memory, Bereich(e), Projekte.   
- Personen ↔ Tasks, Bereiche, Projekte, Termine sowie später Erinnerungs- und Relevanzlogiken. 

### 5.4 Lebenszyklus & Statusregeln – Task

#### 5.4.1 Zweck des Task-Statusmodells

Das Task-Statusmodell soll die operative Arbeitssteuerung unterstützen, ohne ein Ticketsystem abzubilden.  
Es folgt dem Prinzip: „Ich plane, ich tue, fertig.“ und vermeidet unnötige Zwischenzustände. 

#### 5.4.2 Erlaubte Statuswerte

Ein Task kann ausschließlich folgende Statuswerte haben:

- **inbox**  
  Task wurde aus einem Eingang (z.B. Inbox-Item aus Telegram, später E-Mail etc.) erzeugt, ist aber fachlich noch nicht endgültig entschieden oder einsortiert. 

- **open**  
  Akzeptierte Aufgabe ohne feste zeitliche Verankerung.  
  Der Task ist „auf der Liste“, aber nicht einem konkreten Tag/Slot/Termin zugeordnet. 

- **planned**  
  Aufgabe ist bewusst zeitlich verankert – z.B. einem Tag, einem Zeitfenster oder einem konkreten Termin zugeordnet.  
  Eine reine Fälligkeit ohne bewusste Planung reicht dafür nicht aus. 

- **done**  
  Aufgabe ist fachlich erledigt.  
  Es gibt keine weiteren Handlungen, die im Rahmen dieses Tasks notwendig sind. 

- **canceled**  
  Aufgabe wird nicht (mehr) verfolgt (z.B. obsolet, anderer Weg gewählt, Entscheidung gegen Umsetzung). 

#### 5.4.3 Entstehung und Start-Status

- Tasks, die aus einem **Inbox-Item** entstehen, starten in der Regel mit Status **inbox**, solange die Entscheidung über Art, Priorität oder Planung noch aussteht.   
- Tasks, die **manuell** (z.B. direkt in einem Bereich, Projekt/Themencontainer oder auf der Task-Seite) angelegt werden, starten in der Regel direkt als **open**. 

#### 5.4.4 Erlaubte Statuswechsel

Folgende Statuswechsel sind fachlich vorgesehen:

- inbox → open  
- inbox → planned  
- inbox → canceled

- open → planned  
- open → done  
- open → canceled

- planned → done  
- planned → canceled

- done → (kein weiterer Wechsel vorgesehen, Änderungen nur in begründeten Ausnahmefällen)  
- canceled → (kein weiterer Wechsel vorgesehen, Änderungen nur in begründeten Ausnahmefällen) 

Rückwärtswechsel (z.B. done → open) sind fachlich nicht vorgesehen und sollten, falls technisch möglich, seltene Sonderfälle bleiben (Fehleingaben, Korrekturen). 

#### 5.4.5 Nicht genutzte Statuskonzepte

Es gibt bewusst **keine** Statuswerte wie in_progress oder waiting.   
- „Ich arbeite daran“ ist ein Arbeitszustand, der über Fokus, Tagessteuerung oder Kalender, nicht über einen eigenen Statuswert, abgebildet wird.   
- „Ich warte auf etwas“ führt entweder dazu, dass der bestehende Task als **done** gilt (z.B. „Mail gesendet, jetzt warten“) und bei Eintreffen der Antwort ein neuer Task für die Anschlussaktion entsteht, oder der Task bleibt **open/planned**, bis klar ist, dass keine weitere Aktion notwendig ist. 

Damit bleibt das Statusmodell schlank und alltagstauglich, ohne dass Leif OS in Richtung Ticketsystem driftet. 

---

## 6. Seitenarchitektur (fachlich)

### 6.1 Ebenen der Seiten

1. **Globale Seiten** (Maintabs)  
   - Dashboard, Bereiche, Sparring, Inbox, Tasks, Kalender, Personen, Einstellungen. 

2. **Bereichsseiten**  
   - Je Bereich eine eigene Hauptseite mit bereichsspezifischen Teilansichten. 

3. **Objekt-/Detailseiten**  
   - Projekte/Themencontainer, Sparring-Chats, Tasks (Detail ggf.), Personen, ggf. Termin-/Inbox-Details. 

### 6.2 Globale Seiten – Zwecke

- **Dashboard:**  
  Zentrale Start- und Steuerungsseite für den aktuellen Tag.  
  Im Mittelpunkt stehen eine **empfohlene nächste Aufgabe** als verdichtete Priorisierungshilfe, die Sicht auf neue ungeklärte Eingänge, eine kompakte Tagesanzeige für heute, eine einfache Kapazitätssicht sowie ein kompakter Finanzüberblick. 

  Das Dashboard ist bewusst keine vollständige Task- oder Inbox-Seite.  
  Es dient der fokussierten Tagessteuerung: Mitte = priorisierte Handlung, rechts = Lage und Tageskontext. 

- **Bereiche:**  
  Liste/Übersicht der Bereiche; Zugang zu den Bereichsseiten. 

- **Sparring:**  
  Übersicht über freie und globale Sparring-Kontexte, Start neuer freier Sparrings. 

- **Inbox:**  
  Verarbeitungsliste aller aktuellen Eingänge (Telegram, später Kalender, To Do, E-Mail etc.).  
  Die Inbox dient der Klärung, Einordnung und Überführung von Eingängen in passende Folgeobjekte. 

- **Tasks:**  
  Globale Arbeitsfläche für Aufgaben mit Priorisierungsfunktion, Statusführung, Bearbeitung, Planung, Sortierung und Filterung.  
  Die Seite bündelt die vollständige globale Sicht auf Aufgaben; zusätzlich kann sie eine **empfohlene nächste Aufgabe** als priorisierten Einstieg anzeigen. 

- **Kalender:**  
  Operative Kalender- und Planungssicht mit mindestens Tages- und einfacher Wochenansicht.  
  Anzeige von Outlook-/Graph-Terminen, Sichtbarkeit geplanter Tasks im Zeitkontext sowie einfache Termin-Erstellung im Outlook-Kalender.  
  Der Kalender unterstützt damit Tages- und Wochensteuerung sowie die Einordnung verfügbarer Kapazität. 

- **Personen:**  
  Liste und Detailzugang zu Personen.  
  Im V1-Fokus steht eine einfache Personenliste mit Vorname, Nachname, Kategorie sowie optional Anschrift und Geburtstag.  
  Zusätzlich sollen Geburtstags-Erinnerungen und optional vorgelagerte Erinnerungen für Geschenkvorbereitung unterstützt werden. 

- **Einstellungen:**  
  Einstellungen bleiben Teil des Zielbilds, stehen im V1 des Neustarts aber nicht im Vordergrund und können zunächst ohne eigenen ausgebauten Maintab zurückgestellt werden. 

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
  Explizite Verknüpfungen zu anderen Bereichen (z.B. Finanzentscheidungen mit Auswirkung auf Hausverwaltung und Finanzen Firma). 

### 6.4 Objektseiten

- **Projekt-/Themencontainer-Seite:**  
  Sammelansicht aller zugehörigen Tasks, Ergebnisse, Sparring-Chats, Personen, Dateien, Termine, Verknüpfungen. 

- **Sparring-Chat-Seite:**  
  Chatverlauf + strukturierte Ergebnisablage + Buttons für „als Ergebnis übernehmen“, „Task aus Sparring anlegen“, „Entwurf erstellen“. 

- **Task-Detailseite (optional):**  
  Falls Bearbeitung/Planung mehr Raum braucht als reine Dialoge/Sheets.

- **Person-Detail:**  
  Relevante Informationen, zugeordnete Aufgaben, Termine, Bereiche sowie perspektivisch Erinnerungslogiken. 

---

## 7. Neustart-Vorgehen (Parallel-Neustart)

### 7.1 Grundprinzip

- Der Neustart erfolgt als **Parallel-Projekt**, nicht als Hard Reset.  
- Bestehende Umsetzung und Roadmap bleiben Referenz; der neue Pfad wird sauberer strukturiert, besser dokumentiert und mit klarer Verantwortungs- und Pfadlogik aufgebaut. 

### 7.2 Schritte vor dem ersten Code im Neustart

1. **Anforderungsdoku fertigstellen**  
   - Dieses Dokument finalisieren und als zentrale fachliche Referenz einfrieren.

2. **Technische Doku-Struktur definieren**  
   - Dokumenttypen:  
     - Produkt-Anforderungen (dieses Dokument),  
     - Route Map (Seiten und Zuständigkeiten),  
     - Implementation Map (für jede Funktion: Route, Page-Datei, Komponenten, Actions/Queries, Tabellen, Workflows),  
     - Datenmodell-Doku (Tabellen, Felder, Constraints, Statuswerte, Relationen),  
     - Änderungsprotokoll (jede strukturelle Änderung an Pfaden, Zuständigkeiten oder Datenmodell). 

3. **Route Map entwerfen (ohne konkrete Dateipfade)**  
   - Pro Seite: Zweck, Objekte, Aktionen, global vs. Bereich vs. Objekt.  
   - Explizit festhalten: Welche Routen sind global, welche hängen unter einem Bereichskontext, wo werden Dinge erstellt, bearbeitet, kontextbezogen angezeigt. 

4. **Objektmodell verfeinern**  
   - Beziehungen zwischen Bereich, Projekt, Sparring, Tasks, Ergebnissen, Inbox-Items, Personen, Dateien und Terminen auf fachlicher Ebene in einer kompakten Modellskizze festhalten.  
   - Erst danach konkrete Tabellen/Spalten definieren. 

5. **Datenmodell-Doku (erste Version)**  
   - Tabellen + Felder + Statuswerte + Relationen grob beschreiben, passend zum Objektmodell (kein Blind-Refactoring). 

6. **Implementation Map (Stub)**  
   - Noch ohne konkreten Code, aber mit geplanter Verortung:  
     - Welche Funktion gehört auf welche Seite,  
     - welche Serveraktionen / Queries sind vorgesehen,  
     - welche Tabellen und Workflows greifen wo. 

7. **Neuer Projektpfad + Repo-Struktur definieren**  
   - Erst wenn Anforderungen, Objektmodell und Route Map stehen.  
   - Kein abstraktes Ordner-Gebirge, sondern nur Strukturen, die durch Anforderungen gedeckt sind. 

8. **UI-Konzept konkretisieren**  
   - Layout-System, Navigation (Maintabs + Bereichsnavigation), Container-/Projektansichten, globale vs. lokale Aktionen, wichtige Flows (z.B. Sparring → Task, Inbox → Task, Finanzüberblick Dashboard). 

9. **Erst dann: neues Projekt initialisieren**  
   - Neues Repo / Ordner, neues Next.js-Gerüst, initiale Doku-Dateien, erster Umsetzungsblock. 

### 7.3 Disziplin für den Neustart

- Keine Implementierung ohne Verortung in Produkt-Anforderungen + Route Map + Implementation Map.   
- Keine Felder, Statuswerte, Variablen, Pfade, Komponenten oder Tabellen „aus dem Bauch heraus“.   
- Zuerst immer fachliche Anforderungen und dokumentierte Zuständigkeiten, dann Umsetzung. 

---

## 8. Nächste konkrete Schritte im neuen Space

1. **Diese Produkt-Anforderung als Startpunkt übernehmen und ggf. minimal nachschärfen.**  
2. **Neuen Block im neuen Space definieren:**  
   - Block: *Technische Doku-Struktur & Route Map Neustart*  
3. **Dann: Route Map + Implementation Map-Layout erarbeiten**, bevor eine einzige neue Datei im neuen Repo angelegt wird.   
4. **V1-Scope bewusst eng halten**  
   - Der V1-Fokus liegt auf Dashboard, Inbox, Tasks, Sparring, Kalender sowie einer einfachen Bereichs- und Personenlogik.  
   - Einstellungen sind im Zielbild weiterhin vorgesehen, gehören aber nicht zum priorisierten Kern des Neustarts.  
   - Der finanzielle Dashboard-Überblick (Gesamtvermögen, einfache Portfolio-Sichten) ist fachlich wichtig, soll jedoch in V1 bewusst schlank und ohne historische Performance-Logik umgesetzt werden.  
   - Die Priorisierungsfunktion über die **empfohlene nächste Aufgabe** sowie ein einfach operativ nutzbarer Kalender gehören zum V1-Kern. 