# Route Map – Leif OS Neustart

## 1. Globaler App-Rahmen

### 1.1 Grundprinzip

Leif OS läuft in einem durchgehenden globalen App-Rahmen, der auf allen globalen Seiten bestehen bleibt.  
Dieser Rahmen dient der stabilen Orientierung und wird nicht pro Seite neu aufgebaut. 

### 1.2 Immer sichtbare Elemente

Auf jeder globalen Seite sind folgende Elemente dauerhaft sichtbar:

1. **Linke Navileiste**  
   Die linke Seite enthält die globale Hauptnavigation zu den **Kernbereichen** von Leif OS. **Aktueller Stand** (Gruppierung wie umgesetzt): **Dashboard**; **Lebensbereiche**; **Tasks** und **Kalender**; **Inbox**; **KI**; **Kontakte**; **Notizen** und **Gedächtnis** (technische Routen wie `/bereiche`, `/sparring`, `/personen`, `/ergebnisse` bleiben unverändert).  

   **Fachliche Leitidee** (vgl. `Produkt-Anforderung.md`): Die App denkt in den Ebenen **Input** (z. B. Inbox), **Thinking** (z. B. KI, Lebensbereiche, Gedächtnis, Notizen, Kontakte) und **Planning** (Tasks, Kalender). Es gibt **keine** Mail-UI und keinen Outlook-Posteingang im Produkt; Microsoft-Anbindung dient **nur dem Kalender** (siehe Kalender-Abschnitt).

   Die Navigation ist kein Teil des jeweiligen Seiteninhalts, sondern Teil des globalen Rahmens. 

2. **Obere durchgehende Kopfzeile**  
   Oberhalb der Inhaltsflächen liegt eine globale, durchgezogene Header-Zeile, die auf allen Seiten gleich bleibt.  
   Sie strukturiert die Anwendung in eine konstante obere Orientierungsebene. 

### 1.3 Aufbau der Kopfzeile

Die globale Kopfzeile ist in drei Zonen gegliedert:

1. **Links**  
   Anzeige der Produktkennung **„Leif OS“**.  
   Dieser Bereich liegt oberhalb bzw. im Kopfbereich der linken Navigation. 

2. **Mitte**  
   Anzeige des aktuellen Seiten- oder Kontexttitels.  
   Dieser Bereich liegt über der mittleren Hauptspalte und macht jederzeit sichtbar, in welcher globalen Seite bzw. in welchem Kontext gearbeitet wird. 

3. **Rechts**  
   Globale Textsuche sowie ein globaler Plus-Button für die schnelle Anlage zentraler Objekte.  
   Dieser Bereich ist auf allen Seiten verfügbar. 

### 1.4 Globale Suche

Die Suche ist als globale Textsuche im rechten Bereich der Kopfzeile verortet.  
Sie dient dem schnellen Auffinden relevanter Objekte über Seitenkontexte hinweg, statt nur innerhalb einzelner Seiten zu suchen. 

Für V1 wird die Suche bewusst schlank gehalten.  
Sie ist als globale Find-Funktion zu verstehen und nicht als bereits voll ausgebautes universelles Befehls-, KI- oder Workflow-Feld. 

Technisch umfasst die Suche u. a. **Tasks, Lebensbereiche (areas), Inbox-Items, Kalendertermine, Notizen, Gedächtnis-Einträge (results), Kontakte und KI-Sparrings (sparring_chats)** (Volltext über relevante Textfelder; Details und Navigation pro Treffertyp → `Implementation-Map.md`, Abschnitt Globale Suche). **Projekte** können aufgenommen werden, sobald die entsprechende Tabelle im Datenmodell produktiv genutzt wird.

### 1.5 Globaler Plus-Button

Neben der globalen Suche befindet sich ein Plus-Button als immer verfügbare Schnellanlage-Funktion.  
Der Plus-Button öffnet ein kleines Menü zur Anlage zentraler Objekte, die fachlich nicht nur an eine einzelne Seite gebunden sind. 

Für V1 soll der Plus-Button mindestens folgende Einträge enthalten:

- **Task anlegen** 
- **KI-Sparring starten** 
- **Kontakt anlegen** 
- **Notiz anlegen** 
- **Eintrag im Gedächtnis** 

Es gibt **keinen** Eintrag für E-Mail oder Outlook-Entwurf; Mail ist kein Bestandteil der Oberfläche (vgl. Produkt-Anforderung §2.3).

Der Eintrag **Eintrag im Gedächtnis** bezieht sich auf ein strukturiertes Ergebnisobjekt, insbesondere auf **Erkenntnis** oder **Entscheidung**. 

Kalendereinträge gehören fachlich zum Zielbild und sind in V1 bereits relevant, werden aber nicht als zwingender Standardbestandteil dieses globalen Schnellanlage-Menüs gesetzt, solange der Kalender primär über seine eigene Seite geführt wird. 

---

## 2. Dashboard

### 2.1 Rolle des Dashboards

Das Dashboard ist die zentrale **Start- und Steuerungsseite** von Leif OS.  
Es beantwortet vor allem: **Was ist heute und diese Woche wirklich relevant?** – und soll in V1 nicht als beliebige Kachelübersicht funktionieren, sondern als **priorisierte Lage- und Entscheidungsansicht** (nicht als zweite Inbox- oder Task-Hauptfläche). 

Ein zentraler Nutzen von Leif OS besteht darin, Priorisierung nicht ständig manuell leisten zu müssen.  
Das System soll helfen, aus allen offenen Aufgaben die aktuell sinnvollste Aufgabe sichtbar zu machen. 

Das Dashboard verbindet insbesondere:
- den priorisierten Arbeitseinstieg,
- die Sicht auf neue Eingänge,
- die heutige Tageslage,
- einen groben Kapazitätsblick,
- einen kompakten Finanz- und Portfolio-Überblick. 

### 2.2 Grundprinzip des Layouts

Das Dashboard folgt einer klaren Dreiteilung:

1. **Links:** globale Navigation  
2. **Mitte:** operative Hauptspalte mit Arbeitsfokus  
3. **Rechts:** periphere Info- und Anzeige-Spalte 

Die Mitte beantwortet vor allem die Frage **„Was ist jetzt meine sinnvollste nächste Handlung?“**  
Die rechte Spalte beantwortet vor allem die Frage **„Wie ist die Lage heute?“** 

### 2.3 Mittlere Hauptspalte

Die mittlere Spalte ist die zentrale Arbeitsachse des Dashboards.

Sie enthält in V1:

1. **Empfohlene nächste Aufgabe**  
   Am oberen Beginn der Hauptspalte steht ein verdichteter Fokusblock, der genau eine vom System priorisierte Aufgabe zeigt.  
   Diese Aufgabe ist die aktuell empfohlene nächste Aufgabe und bildet den zentralen Priorisierungsnutzen von Leif OS ab. 

   Die Funktion dient nicht nur der Anzeige, sondern der operativen Steuerung.  
   Für die empfohlene Aufgabe sollen dieselben relevanten Task-Aktionen ausführbar sein wie auf der Tasks-Seite, soweit sie für V1 vorgesehen sind. 

2. **Inbox**  
   Unterhalb der empfohlenen nächsten Aufgabe liegt die Inbox als zentrales operatives Werkzeug für neue Eingänge.  
   Im Dashboard zeigt sie ausschließlich **ungelesene bzw. noch nicht gesehene Inbox-Items**. 

Die Dashboard-Inbox dient damit als Startsignal für neue Aufmerksamkeit.  
Sie zeigt nur, was neu hereingekommen und noch nicht einmal gesichtet wurde. 

Wird ein Inbox-Item im Dashboard als **gelesen** markiert, verschwindet es aus der Dashboard-Anzeige.  
Es bleibt jedoch weiterhin auf der Inbox-Seite sichtbar, solange es fachlich noch nicht verarbeitet wurde. 

Das Dashboard enthält keine allgemeine Taskliste.  
Abgesehen von der **empfohlenen nächsten Aufgabe** sind Aufgaben dort nur dann sichtbar, wenn sie für den heutigen Tag geplant sind und im Block **Heute** erscheinen. 

### 2.4 Rechte Infospalte

Die rechte Spalte dient der kompakten Einordnung und Anzeige.  
Sie ist bewusst peripher gedacht und soll in V1 keine zweite Hauptarbeitsfläche werden. 

Sie enthält in V1 folgende Blöcke:

1. **Kapazität heute**  
   Ganz oben eine kurze Statusanzeige, vorzugsweise als kompakte Bar oder Ampel-artige Verdichtung.  
   Sie dient der schnellen Einordnung der Tagesbelastung und bleibt bewusst einfach. 

2. **Heute**  
   Kompakte Anzeige heutiger Termine sowie solcher Tasks, die bewusst für den heutigen Tag geplant sind.  
   Dieser Block dient dem Tagesüberblick, nicht der vollständigen Taskführung. 

3. **Finanzblick / Portfolio-Blick**  
   Kompakte Anzeige des aktuellen Gesamtvermögens sowie einfacher Portfolio-Sichten oder Aggregationen.  
   Historische Wertentwicklung, Performance-Analysen und detaillierte Zeitreihen sind ausdrücklich nicht Teil dieses V1-Blocks. 

### 2.5 Verhältnis zur Inbox-Seite

Das Dashboard zeigt nur die neue Eingangslage.  
Die vollständige Sicht auf ungeklärte Eingänge liegt auf der Inbox-Seite. 

Damit gilt:

- **Dashboard-Inbox** = nur ungelesene/ungesehene Eingänge  
- **Inbox-Seite** = alle ungeklärten Eingänge, unabhängig vom Gelesen-Status, sowie optional einblendbare bereits verarbeitete Eingänge 

### 2.6 Verhältnis zur Tasks-Seite

Das Dashboard zeigt keine allgemeine Taskübersicht.  
Die globale Sicht auf Aufgaben liegt auf der Tasks-Seite. 

Auf dem Dashboard erscheint nur:
- **eine empfohlene nächste Aufgabe** als priorisierte Einzelentscheidung,
- sowie im Block **Heute** nur solche Tasks, die für den heutigen Tag geplant sind. 

Die vollständige Aufgabenführung, Sortierung, Filterung, Bearbeitung und Planung liegt auf der Tasks-Seite. 

### 2.7 Abgrenzung für V1

Das Dashboard soll in V1 bewusst kein überladenes Widget- oder Kachel-System werden.  
Es folgt stattdessen einer klaren Hierarchie:

- **Mitte = priorisierte Handlung**
- **Rechts = Lage**
- **Links = Navigation** 

Nicht Ziel von V1 ist,
- das Dashboard zur vollständigen Inbox-Seite zu machen,
- das Dashboard zu einer allgemeinen Taskliste auszubauen,
- den Finanzblick zu einem eigenen Analyse-Cockpit auszubauen,
- die Kapazitätslogik zu einem komplexen Planungsmodul zu machen,
- Bearbeitungsverläufe oder ältere Inbox-Eingänge in die Dashboard-Inbox zu ziehen. 

Das Dashboard bleibt damit eine fokussierte Start- und Steuerungsseite für den Alltag.  
Sein zentraler Task-Nutzen liegt in der Anzeige genau **einer empfohlenen nächsten Aufgabe**. 

---

## 3. Inbox

### 3.1 Rolle der Inbox

Die Inbox ist der zentrale Ort im **Input Layer** für alles, was **neu**, **ungeklärt** oder **noch nicht eingeordnet** ist.  
Sie ist ein **Capture- und Review-Ort**: sichten, bewerten, entscheiden, zuordnen, in ein Zielobjekt überführen oder verwerfen – **nicht** der Ort für operative Endbearbeitung, **nicht** ein Mailpostfach und **keine** langfristige Ablage („kein Sammelchaos"). 

Die Inbox bündelt Eingänge aus verschiedenen Quellen.  
In V1 steht mindestens Telegram im Fokus; weitere Quellen wie Kalender, To Do oder E-Mail sind Teil des Zielbilds, aber nicht zwingend vollständig im ersten Ausbau enthalten. 

### 3.2 Zweck der Seite

Die Inbox beantwortet vor allem die Frage: **„Was ist neu, ungeklärt und braucht eine klare Review-Entscheidung?“**   
Sie ist die **vollständige Review-Seite** für Eingangsklärung (nicht die Arbeitsfläche für die spätere operative Erledigung).  
Im Unterschied zum Dashboard, auf dem die Inbox nur als **Aufmerksamkeits- und Einstiegsignal** erscheint, bildet die Inbox-Seite die zentrale Fläche für alle aktuellen ungeklärten Eingänge. 

### 3.3 Zentrale Objekte

Die Inbox-Seite arbeitet primär mit dem Objekt **Inbox-Item**.  
Ein Inbox-Item ist ein ungeklärter Eingang aus einer Quelle wie Telegram, später ggf. auch Kalender, To Do oder E-Mail. 

Ein Inbox-Item ist kein dauerhafter Zielzustand.  
Es muss fachlich in eine passende Richtung überführt werden, insbesondere in einen Task, ein Sparring, ein Ergebnis, einen Entwurf oder in das Verwerfen des Eingangs. 

Zusätzlich hat ein Inbox-Item ein **Aufmerksamkeitsmerkmal „gelesen/ungelesen“**.  
Dieses Merkmal beschreibt nur, ob ein Eingang bereits gesehen wurde – es ersetzt nicht die fachliche Entscheidung über seine weitere Behandlung. 

### 3.4 Hauptinhalt der Seite

Die Inbox-Seite besteht fachlich aus einer **Review-Ansicht** auf Inbox-Items mit zwei Ebenen:

1. **Standardansicht:** ungeklärte Inbox-Items, unabhängig davon, ob sie bereits gelesen wurden.  
2. **Optionale Einblendung:** bereits verarbeitete bzw. geklärte Inbox-Items, die standardmäßig ausgeblendet sind. 

Für jedes Inbox-Item sollen mindestens sichtbar sein:

- der eigentliche Inhalt bzw. Text des Eingangs,
- die Quelle,
- einfache Metadaten,
- der Gelesen-/Ungelesen-Status,
- ein klarer Satz an Minimalaktionen zur Weiterverarbeitung. 

Die Seite ist damit eine **Review- und Überführungsliste** und kein Vollarchiv.  
Tiefere Historisierung, komplexe Metadatenansichten oder aufwendige Batch-Mechaniken gehören nicht zum V1-Kern dieser Seite. 

### 3.5 Hauptaktionen pro Inbox-Item

Die Inbox-Seite stellt pro Item einen kleinen, klaren Satz fachlicher Entscheidungen bereit.  
Diese Aktionen dienen der Überführung des Eingangs in ein geeignetes Zielobjekt oder in einen Abschluss. 

Für V1 sind pro Inbox-Item mindestens folgende Aktionen vorgesehen:

- **Als Task anlegen** 
- **In Sparring öffnen** 
- **Als Ergebnis übernehmen** (Erkenntnis/Entscheidung) 
- **Als Entwurf erstellen** 
- **Verwerfen** 
- **Als gelesen markieren** 

Die Aktion **„Als gelesen markieren“** verändert ausschließlich das Aufmerksamkeitsmerkmal des Inbox-Items.  
Sie ist kein fachlicher Verarbeitungsstatus und ersetzt keine der oben genannten Folgeaktionen. 

Die Aktionslogik soll bewusst schlank bleiben.  
Die Inbox ist keine Ticketmaschine und soll nicht mit Workflow-Zuständen, Delegationslogik, Waiting-Status, Snooze-Mechaniken oder umfangreichen Massenaktionen überfrachtet werden. 

### 3.6 Verhältnis zum Dashboard

Die Inbox erscheint auch auf dem Dashboard als **kompakte Aufmerksamkeitsansicht** in der mittleren Hauptspalte.  
Dort ist sie ein **Startsignal** für neuen Input – nicht die vollständige Review-Oberfläche. 

Auf dem Dashboard werden **nur ungelesene bzw. noch nicht gesehene Inbox-Items** angezeigt.  
Sobald ein Item als gelesen markiert wurde, verschwindet es aus der Dashboard-Inbox, bleibt aber weiterhin auf der Inbox-Seite sichtbar, solange es fachlich noch nicht verarbeitet wurde. 

Die Rollenverteilung ist damit:

- **Dashboard-Inbox:** zeigt ausschließlich noch ungelesene/ungesehene Eingänge als Startsignal für neue Aufmerksamkeit.  
- **Inbox-Seite:** zeigt alle ungeklärten Eingänge, unabhängig davon, ob sie bereits gelesen wurden, sowie auf Wunsch auch verarbeitete/geklärte Eingänge. 

Die Dashboard-Inbox ersetzt damit nicht die vollständige Inbox-Seite, sondern ist ihre fokussierte Eingangsanzeige für neue, noch nicht einmal gesichtete Items. 

### 3.7 Abgrenzung zu anderen Seiten

Die Inbox ist nicht die globale Taskliste.  
Sobald aus einem Eingang ein Task wird, gehört dessen weitere operative Führung primär in die Task-Logik und auf die Tasks-Seite. 

Die Inbox ist auch nicht der globale Ort für Sparring, Ergebnisse oder Notizen.  
Sie darf diese Objekte auslösen oder erzeugen, ist aber nicht ihre Hauptverwaltungsseite. 

Ebenso ist die Inbox kein Kommunikationsarchiv.  
Ihr Zweck liegt in der Klärung neuer Eingänge und im nachvollziehbaren Übergang in Folgeobjekte – nicht in der vollständigen Dokumentation aller Kommunikationshistorien. 

### 3.8 V1-Abgrenzung

In V1 bleibt die Inbox bewusst einfach und alltagstauglich.  
Im Vordergrund steht ein klarer, schneller Prozess von Eingang zu Folgeobjekt oder Abschluss, ergänzt um eine leichte Gelesen-/Ungelesen-Logik für die Aufmerksamkeitssteuerung. 

Nicht Ziel von V1 ist,
- die Inbox zu einem vollständigen Multi-Channel-Control-Center auszubauen,
- komplexe Regeln für Automatisierung, Batch-Verarbeitung oder Wiedervorlage einzuführen,
- ein Ticketsystem mit vielen Zwischenzuständen und Prozesslogiken nachzubauen. 

Die Inbox bleibt damit in V1 eine fokussierte Klärungs- und Überführungsseite mit einfacher Gelesen-/Ungelesen-Logik. 

### 3.9 E-Mail als späterer Eingang (ohne Mail-UI)

Die frühere Route **`/posteingang`** (Outlook-Inbox-Liste, Entwürfe) ist **entfernt**. Microsoft OAuth und Graph werden **nur** für den **Kalender** (inkl. optionaler Geburtstags-Serien) genutzt, nicht für Mail.

Geplante Weiterleitung von E-Mails in die fachliche **Inbox** (z. B. als `inbox_items` mit strukturierten Daten in `metadata`) ist ein **separater** Integrations-Schritt ohne Mailclient in der UI.

---

## 4. Tasks

### 4.1 Rolle der Tasks-Seite

Die Tasks-Seite ist die globale Arbeitsfläche für Aufgaben in Leif OS.  
Sie dient der operativen Führung, Sichtung, Bearbeitung, Sortierung und Planung von Tasks über Bereiche und Kontexte hinweg. 

Während die Inbox Eingänge klärt und in Folgeobjekte überführt, ist die Tasks-Seite der Ort, an dem Aufgaben nach ihrer Entstehung weitergeführt werden.  
Sie ist damit die zentrale Seite für akzeptierte und laufend zu steuernde Arbeit. 

### 4.2 Zweck der Seite

Die Tasks-Seite beantwortet vor allem die Frage: **„Welche Aufgaben habe ich, wie sind sie einzuordnen, und was davon soll ich wann tun?“** 

Wie das Dashboard enthält auch die Tasks-Seite ganz oben die Funktion **„Empfohlene nächste Aufgabe“**.  
Sie übernimmt dort dieselbe Priorisierungslogik, steht aber über einer vollständigen globalen Taskliste statt über einem kompakten Tages-Dashboard. 

### 4.3 Zentrale Objekte

Die Tasks-Seite arbeitet primär mit dem Objekt **Task**.  
Ein Task ist das operative Arbeitsobjekt in Leif OS mit Status, optionaler Planung, Bereichszuordnung und ggf. weiteren Merkmalen wie Priorität, Tags, Person oder Terminbezug. 

Tasks können aus unterschiedlichen Kontexten entstehen, insbesondere:
- direkt manuell,
- aus einem Inbox-Item,
- aus Sparring heraus,
- später ggf. aus weiteren Kontexten. 

Die Tasks-Seite ist damit nicht nur eine Liste, sondern die zentrale Führungsansicht des Task-Objekts. 

### 4.4 Hauptinhalt der Seite

Die Tasks-Seite besteht fachlich aus zwei Ebenen:

1. **Empfohlene nächste Aufgabe** als priorisierter Fokusblock am oberen Seitenbeginn.  
2. **Globale Taskliste** für die vollständige operative Sicht auf Aufgaben. 

In der globalen Taskliste sollen in V1 insbesondere sichtbar und steuerbar sein:

- alle relevanten Tasks in einer globalen Liste,
- der aktuelle Status jedes Tasks,
- Bereichsbezug,
- Priorität,
- Tags,
- Fälligkeit bzw. zeitliche Einordnung, sofern vorhanden,
- geplanter Tag bzw. Planungsstatus, sofern vorhanden. 

Die Seite ist damit die zentrale operative Übersicht über Aufgaben und nicht nur ein Eingabeformular oder eine Detailansicht. 

### 4.5 Task-Merkmale in der Seite

Für die operative Führung auf der Tasks-Seite sind die Merkmale **Bereich**, **Status**, **Priorität** und **Tags** fachlich getrennt zu behandeln. 

Dabei gilt:

- **Bereich** = primärer fachlicher Kontextraum des Tasks  
- **Status** = Lebenszykluszustand des Tasks  
- **Priorität** = relative Wichtigkeit des Tasks  
- **Tags** = frei kombinierbare Zusatzmarkierungen für weitere Kontexte und Schlagworte 

Tags dürfen Bereichslogik ergänzen, aber nicht ersetzen.  
Die primäre Navigation, Bereichszuordnung und Bereichsfilterung bleiben am Bereich aufgehängt, nicht an den Tags. 

### 4.6 Statuslogik

Für Tasks gilt in Leif OS ein bewusst schlankes Statusmodell.  
Erlaubte Statuswerte sind ausschließlich:

- **inbox**
- **open**
- **planned**
- **done**
- **canceled** 

Die Tasks-Seite muss diese Status fachlich sichtbar machen und die vorgesehenen Statuswechsel unterstützen. 

Die Statuslogik dient der alltagstauglichen Arbeitssteuerung und soll ausdrücklich kein Ticketsystem nachbilden.  
Statuswerte wie `in_progress` oder `waiting` sind nicht vorgesehen. 

### 4.7 Hauptaktionen auf der Tasks-Seite

Die Tasks-Seite stellt die zentralen Arbeitsaktionen rund um das Task-Objekt bereit.  
Für V1 gehören dazu mindestens:

- **Task anlegen** 
- **Task bearbeiten** 
- **Status ändern** im Rahmen des festgelegten Statusmodells 
- **Task auf einen Tag bzw. in eine einfache Planung überführen** 

Diese Aktionen gelten auch für die jeweils angezeigte **empfohlene nächste Aufgabe**.  
Der Fokusblock ist daher keine reine Anzeige, sondern ein handlungsfähiger Einstieg in die operative Aufgabenführung. 

Wichtig ist dabei:  
Eine reine Fälligkeit macht einen Task noch nicht automatisch zu `planned`.  
Der Status `planned` steht nur für bewusst zeitlich verankerte Aufgaben. 

### 4.8 Sortierung und operative Sicht

Die globale Taskliste soll in V1 nicht nur filterbar, sondern auch sortierbar sein. 

Mindestens vorgesehen sind Sortierungen nach:
- **Fälligkeit**
- **geplantem Tag / zeitlicher Verankerung**
- **Priorität**
- **Status**
- **Bereich** 

Die Sortierung dient der manuellen operativen Sicht auf die Aufgabenliste.  
Sie ist nicht mit der Funktion **„Empfohlene nächste Aufgabe“** gleichzusetzen, da diese eine verdichtete Systemempfehlung bzw. Priorisierungsleistung darstellt. 

### 4.9 Verhältnis zur Inbox

Tasks und Inbox sind fachlich eng verbunden, aber klar voneinander getrennt. 

Die Inbox ist für die Klärung neuer Eingänge zuständig.  
Sobald aus einem Inbox-Item ein Task entsteht, wechselt die weitere operative Führung dieses Arbeitsgegenstands auf die Tasks-Seite. 

Die Tasks-Seite ist damit nicht der Ort für ungeklärte Kommunikationseingänge, sondern für Aufgaben, die als Arbeitsobjekte akzeptiert oder geplant wurden. 

### 4.10 Verhältnis zum Dashboard

Das Dashboard zeigt nur eine priorisierte Einzelaufgabe sowie heute geplante Tasks im Tagesblock **Heute**. 

Die vollständige globale Sicht auf Aufgaben liegt auf der Tasks-Seite.  
Dort werden Priorisierung, Statusführung, Sortierung, Bearbeitung und Planung zentral gebündelt. 

Damit gilt:

- **Dashboard** = empfohlene nächste Aufgabe + heutige geplante Tasks  
- **Tasks-Seite** = vollständige globale Arbeits- und Steuerungsseite für Aufgaben 

### 4.11 Abgrenzung zu anderen Seiten

Die Tasks-Seite ist keine Bereichsseite.  
Bereichsbezogene Aufgaben können dort gefiltert oder verortet sein, aber ihre globale Führung liegt auf der zentralen Tasks-Seite. 

Die Tasks-Seite ist auch nicht die Kalenderseite.  
Geplante Aufgaben können einen Zeitbezug haben, aber die eigentliche Darstellung von Tagesereignissen und Terminen liegt fachlich beim Kalender. 

Ebenso ist die Tasks-Seite kein Sparring-Ort.  
Sparring kann Tasks erzeugen oder vorbereiten, aber die spätere Aufgabenführung gehört in die Task-Logik. 

### 4.12 V1-Abgrenzung

In V1 bleibt die Tasks-Seite bewusst operativ und schlank.  
Im Zentrum stehen globale Übersicht, Priorisierung, Statusführung, Sortierung, einfache Bearbeitung und einfache Planung auf einen Tag. 

Nicht Ziel von V1 ist,
- ein komplexes Multi-Projekt-Tasksystem mit zahlreichen Ansichten aufzubauen,
- umfangreiche gespeicherte Views oder mehrdimensionale Filterlogik einzuführen,
- Drag-and-drop-Planung oder kapazitätsabhängige Automatik zu bauen,
- zusätzliche Ticketsystem-Status wie `waiting` oder `in_progress` einzuführen. 

Die Tasks-Seite bleibt damit in V1 die schlanke globale Führungsseite für Aufgaben mit zusätzlicher Priorisierungshilfe durch die **empfohlene nächste Aufgabe**. 

---

## 5. Sparring

### 5.1 Rolle der Sparring-Seite

Die Sparring-Seite ist der globale Einstieg in den Arbeitsmodus „Sparring“.  
Sparring ist in Leif OS sowohl Funktion (Arbeitsmodus), Maintab (globale Seite) als auch Datentyp (Sparring-Chat mit strukturierten Outputs). 

Sparring dient der Analyse, Klärung, Entscheidungsfindung, Strukturierung, Schreibarbeit und Ableitung von Folgeaktionen.  
Es ergänzt Tasks nicht, indem es neue To-dos produziert, sondern indem es schwierige oder unklare Themen fachlich aufbereitet. 

### 5.2 Zweck der Seite

Die Sparring-Seite beantwortet vor allem die Fragen:  
**„Mit welchem Thema möchte ich gerade arbeiten?“** und **„Welche Sparring-Kontexte habe ich laufend offen?“** 

Sie bietet:

- Start freier Sparrings ohne festen Kontext,
- Übersicht über bestehende Sparring-Chats, die nicht ausschließlich an einen konkreten Bereich oder ein einzelnes Objekt gebunden sind,
- Einstieg in laufende Sparring-Kontexte. 

Sie ist damit der zentrale Ort für globales, nicht objektgebundenes Sparring.  
Kontextgebundenes Sparring (z.B. aus einem Task, einer Inbox oder einem Bereich heraus) startet zwar an anderen Stellen, bleibt aber als Datentyp weiterhin Sparring. 

### 5.3 Zentrale Objekte

Die Sparring-Seite arbeitet hauptsächlich mit dem Objekt **Sparring-Chat**.  
Ein Sparring-Chat ist eine konkrete Gesprächsinstanz (frei, kontextbezogen oder projektbezogen). 

Sparring erzeugt keine „Sparring-Statuswerte“ im Sinne von Tickets, sondern führt zu verschiedenen Outputs, insbesondere:

- **Ergebnisse** (Erkenntnisse / Entscheidungen),
- **Tasks**,
- **Entwürfe** (z.B. Texte, Mails, Nachrichten),
- ggf. strukturierte Notizen. 

Diese Outputs sind fachlich wichtiger als der Chatverlauf selbst.  
Der Chat ist Arbeitsweg, nicht primärer Speicherort für Ergebnisse. 

### 5.4 Hauptinhalt der Seite

Die Sparring-Seite besteht in V1 aus:

1. **Bereich für freien Sparring-Start**  
   Ein einfacher Einstiegspunkt, um ein neues freies Sparring ohne festen Kontext zu beginnen. 

2. **Liste laufender bzw. relevanter Sparring-Chats**  
   Eine Übersicht über bestehende Sparring-Gespräche, die für weiteren Zugriff wichtig sind.  
   Diese Übersicht muss nicht alle historischen Sparrings abbilden, sondern die aktuell relevanten und ggf. markierten Kontexte. 

3. **Zugriff auf Outputs aus Sparring** (über den jeweiligen Chat)  
   Zu jedem Sparring-Chat gehört eine Sicht auf seine strukturierten Ergebnisse (Erkenntnisse/Entscheidungen), abgeleiteten Tasks und ggf. Entwürfe. 

Die Seite ist damit kein reiner Chatverlauf-Browser, sondern ein Einstiegspunkt in Sparring-Kontexte mit Sicht auf ihre fachlich relevanten Outputs. 

### 5.5 Hauptaktionen auf der Sparring-Seite

Die Sparring-Seite stellt in V1 insbesondere folgende Aktionen bereit:

- **Freies Sparring starten** (ohne festen Kontext) 
- **Bestehenden Sparring-Chat öffnen** 
- Im Kontext eines Sparring-Chats:  
  - **Ergebnis anlegen** (Erkenntnis/Entscheidung) aus dem Sparring heraus,  
  - **Task aus Sparring anlegen** mit vorausgefüllten Feldern,  
  - **Entwurf erstellen** (z.B. E-Mail-/Textentwurf). 

Die Anlage eines Tasks aus Sparring heraus öffnet ein vorausgefülltes Aufgabenformular mit Feldern wie Titel, Beschreibung, Bereich, Tags, Priorität, Person, Fälligkeit und Dauer, die vor Bestätigung bearbeitet werden können. 

### 5.6 Verhältnis zu anderen Seiten

Sparring ist bewusst **kein** Ersatz für die Tasks- oder Inbox-Seite. 

- Die **Tasks-Seite** ist für die operative Aufgabenführung zuständig. Tasks aus Sparring landen in der zentralen Taskliste und werden dort wie andere Aufgaben geführt. 
- Die **Inbox** ist für neue ungeklärte Eingänge zuständig. Sparring kann aus Inbox-Items heraus gestartet werden, bleibt aber ein eigener Arbeitsmodus mit eigenen Outputs. 
- **Bereichsseiten** können später eigene Einstiegspunkte für bereichsbezogenes Sparring haben; die Sparring-Seite bleibt der globale Einstieg. 

### 5.7 Rolle im V1-Kontext

In V1 ist Sparring bereits ein zentraler Arbeitsmodus, aber bewusst schlank umgesetzt. 

V1 umfasst insbesondere:

- Start freier Sparring-Chats ohne Kontext,
- einfache Übersicht laufender Sparring-Kontexte,
- Sparring-Chat-Verlauf pro Gespräch,
- Button „Task aus Sparring anlegen“ mit vorausgefüllten Feldern,
- Möglichkeit, kurze Zusammenfassungen oder Ergebnisse manuell zu übernehmen. 

Nicht Ziel von V1 ist,

- ein komplexes Sparring-Archiv mit umfangreicher Such- und Tagginglogik,
- automatisches und vollständiges Memory-Feeding aller Chatverläufe,
- umfangreiche Sparring-Vorlagen oder Profil-Management für Sparring-Kontexte. 

### 5.8 Sparring und Memory

Memory wird aus Sparring **nicht blind aus dem Chatverlauf** gespeist.   
Stattdessen fließen nur bewusst bestätigte, strukturierte Ergebnisse wie Erkenntnisse, Entscheidungen und verdichtete Zusammenfassungen in den Memory-Speicher. 

Die Sparring-Seite ist damit auch ein Kontrollpunkt:  
Was aus Sparring dauerhaft relevant ist, wird in Form von Ergebnissen und strukturierten Outputs übernommen, nicht als unstrukturiertes Chat-Protokoll. 

---

## 6. Kalender

### 6.1 Rolle der Kalender-Seite

Die Kalender-Seite ist die operative Kalender- und Planungssicht von Leif OS.  
Sie dient der Sicht auf Termine, der zeitlichen Einordnung geplanter Aufgaben und der aktiven Steuerung von Tages- und Wochenkapazität. 

Im V1-Kontext ist der Kalender damit nicht nur eine passive Anzeige, sondern ein zentraler Baustein der Tagessteuerung.  
Er verbindet externe Kalenderdaten, eigene Terminsetzung und die sichtbare Verankerung geplanter Tasks im Zeitkontext. 

### 6.2 Zweck der Seite

Die Kalender-Seite beantwortet vor allem die Fragen: **„Wie ist meine Zeit belegt?“**, **„Wo habe ich freie Kapazität?“** und **„Welche geplanten Aufgaben liegen wann?“** 

Sie ermöglicht damit nicht nur Orientierung, sondern auch einfache operative Planung.  
Gerade weil Leif OS die Nutzung der verfügbaren Tageskapazität verbessern soll, muss der Kalender in V1 bereits aktiv nutzbar sein. 

### 6.3 Zentrale Objekte

Die Kalender-Seite arbeitet primär mit dem Objekt **Kalendertermin**.  
Ein Kalendertermin ist ein zeitbezogenes Ereignis, dessen Daten u.a. aus Outlook/Graph kommen und das als Grundlage für Tagessteuerung, Vorbereitungslogik und Planung dient. 

Zusätzlich zeigt die Kalender-Seite **geplante Tasks**, soweit diese bewusst zeitlich verankert oder einem Tag zugeordnet wurden. 

Die Kalender-Seite ist damit der Ort, an dem zeitliche Ereignisse und zeitlich eingeordnete Aufgaben in einer gemeinsamen Zeitansicht sichtbar werden. 

### 6.4 Hauptinhalt der Seite

Die Kalender-Seite besteht in V1 aus einer nutzbaren Zeitansicht mit mindestens folgenden Perspektiven:

- **Tagesansicht**
- **einfache Wochenansicht** 

Die Seite muss nicht nur den heutigen Tag, sondern auch **Vergangenheit, Gegenwart und Zukunft** zugänglich machen. 

Innerhalb dieser Ansichten sollen in V1 mindestens sichtbar sein:

- Termine aus Outlook/Graph,
- in Leif OS angelegte Termine,
- geplante Tasks,
- eine einfache Einordnung der Tages- bzw. Wochendichte und Kapazität. 

### 6.5 Hauptaktionen auf der Kalender-Seite

In V1 gehört zur Kalender-Seite nicht nur das Anzeigen, sondern auch eine einfache operative Nutzung. 

Für V1 gehören dazu mindestens:

- **Tagesansicht öffnen und nutzen**
- **Wochenansicht öffnen und nutzen**
- **Vergangenheit und Zukunft ansehen**
- **Termine aus Outlook/Graph anzeigen**
- **geplante Tasks im Zeitkontext sehen**
- **einfache Termine direkt aus Leif OS im Outlook-Kalender anlegen** 

Die Kalender-Seite ist damit in V1 bereits schreibfähig im einfachen Sinn.  
Sie erlaubt Terminsetzung, auch wenn komplexe Interaktionsformen noch nicht Teil von V1 sind. 

### 6.6 Verhältnis zur Tasks-Seite

Die Kalender-Seite ist nicht die globale Aufgabenführungsseite. 

Die eigentliche Bearbeitung, Statusführung, Priorisierung und globale Sortierung von Tasks liegt auf der Tasks-Seite.  
Im Kalender erscheinen nur solche Aufgaben, die bewusst geplant bzw. zeitlich einem Tag oder Zeitraum zugeordnet wurden. 

Geplante Tasks müssen in V1 im Kalender sichtbar sein.  
Andernfalls wäre die Planung fachlich unvollständig und die Kalenderseite würde ihren Steuerungsnutzen verlieren. 

Damit gilt:

- **Tasks-Seite** = vollständige globale Aufgabensteuerung  
- **Kalender-Seite** = zeitliche Sicht auf Termine und geplante Aufgaben 

### 6.7 Verhältnis zum Dashboard

Das Dashboard zeigt in der rechten Spalte im Block **Heute** nur eine kompakte Tagesanzeige.   
Die Kalender-Seite ist dagegen die eigentliche operative Zeit- und Planungssicht mit Zugriff auf weitere Tage und Wochen. 

Damit gilt:

- **Dashboard** = verdichtete Anzeige des heutigen Tages  
- **Kalender-Seite** = ausführlichere operative Kalender- und Planungssicht 

### 6.8 Verhältnis zur Kapazitätslogik

Kapazität ist fachlich eine wichtige Perspektive und in V1 eng mit dem Kalender verbunden. 

Die Kalender-Seite ist einer der zentralen Orte, an denen Tages- und Wochenkapazität sichtbar wird.  
In V1 reicht dafür eine einfache Anzeige, z.B. als grobe Dichte-, Freiheits- oder Ampellogik auf Basis von Terminen und geplanter Arbeit. 

Die Kapazitätslogik muss in V1 noch kein ausgefeiltes Optimierungssystem sein.  
Wichtig ist aber, dass Zeitbelegung und verfügbare Planungsräume sichtbar genug werden, um den Tag bzw. die Woche sinnvoll zu steuern. 

### 6.9 Abgrenzung zu anderen Seiten

Die Kalender-Seite ist kein vollwertiges Outlook-Ersatzsystem.  
Sie dient der operativen Zeit- und Kapazitätssteuerung innerhalb von Leif OS und nicht dem vollständigen Nachbau aller Kalenderfunktionen externer Systeme. 

Sie ist auch keine zweite Tasks-Seite.  
Ungeplante Aufgaben, globale Aufgabenlisten und Priorisierungslogik gehören auf die Tasks-Seite und nicht in die Kalenderansicht. 

Ebenso ist sie keine Inbox-Seite.  
Neue Eingänge werden nicht im Kalender geklärt, sondern in der Inbox. 

### 6.10 V1-Abgrenzung

In V1 bleibt die Kalender-Seite trotz ihrer gestiegenen Bedeutung bewusst einfach in der Interaktion. 

Zum V1-Kern gehören:
- Tagesansicht,
- einfache Wochenansicht,
- Sicht auf Vergangenheit, Gegenwart und Zukunft,
- Anzeige externer und eigener Termine,
- Sichtbarkeit geplanter Tasks,
- einfache Termin-Erstellung in den Outlook-Kalender,
- einfache Kapazitätssicht. 

Nicht Ziel von V1 ist,
- Drag-and-drop-Planung,
- komplexe Zeitblock-Logik,
- ausgereifte automatische Optimierung der Tagesplanung,
- umfassende Vollersetzung externer Kalender-Clients. 

Die Kalender-Seite bleibt damit in V1 ein einfacher, aber aktiv nutzbarer Kalender- und Planungskern. 

---

## 7. Bereiche

### 7.1 Rolle der Bereiche-Seite

Die Bereiche-Seite ist die globale Einstiegsseite in die fachlichen Kontexträume von Leif OS.  
Sie dient nicht der operativen Arbeit an einzelnen Objekten, sondern der Navigation in die dauerhaft angelegten Lebens- und Arbeitsdomänen. 

### 7.2 Zweck der Seite

Die Bereiche-Seite beantwortet vor allem die Frage: **„In welchem fachlichen Kontext bewege ich mich?“** 

Von hier aus gelangt der Nutzer in die einzelnen Bereichsseiten wie Hausverwaltung, Finanzen Firma, Finanzen Privat, Familie/Privat oder Gesundheit/Sport. 

### 7.3 Hauptinhalt der Seite

Die Bereiche-Seite zeigt in V1 mindestens:

- die Liste der vorhandenen Hauptbereiche,
- einen klaren Einstieg in jede Bereichsseite,
- ggf. kurze Verdichtungen oder Kennzeichen pro Bereich. 

Sie ist damit primär Navigations- und Einstiegsseite, nicht bereits die eigentliche Bearbeitungsfläche eines Bereichs. 

### 7.4 Bereichsseiten

Jeder **Lebensbereich** besitzt eine eigene Bereichsseite.  
Diese Seite ist eine **strategische Arbeitsfläche**: kein Dateibaum, sondern ein **Querschnitt** durch verknüpfte Objekte – Überblick, **Unterthemen** (technisch: Projekte/Themencontainer), bereichsbezogene Tasks, Gedächtnis-Einträge (Ergebnisse), KI-Sparrings, relevante Kontakte, Notizen, Dateien und Termine sowie Querverbindungen zu anderen Bereichen. Optional: Filter oder Gruppierung nach Unterthema statt verschachtelter „Ordner"-Navigation. 

### 7.5 Verhältnis zu globalen Seiten

Die Bereichsseiten ergänzen die globalen Maintabs, ersetzen sie aber nicht. 

- **Tasks** bleiben global führbar, können aber nach Bereich gefiltert bzw. innerhalb eines Bereichs verdichtet dargestellt werden. 
- **Sparring** bleibt global eigenständig, kann aber bereichsbezogen gestartet oder angezeigt werden. 
- **Kalender**, **Inbox** und **Dashboard** bleiben globale Perspektiven und werden nicht zu Bereichsseiten umgebaut. 

### 7.6 V1-Abgrenzung

In V1 steht bei Bereiche vor allem die saubere fachliche Grundstruktur im Vordergrund. 

Nicht Ziel von V1 ist,
- ein hochkomplexes Bereichs-Dashboard pro Domäne,
- eine ausdifferenzierte Rechte- oder Mehrbenutzerlogik,
- tief verschachtelte Bereichsunterstrukturen ohne klaren fachlichen Bedarf. 

Die Bereiche-Seite bleibt damit in V1 der stabile Einstieg in die Kontexträume des Systems. 

---

## 8. Personen

### 8.1 Rolle der Personen-Seite

Die Personen-Seite ist die globale Sicht auf relevante Personen in Leif OS.  
Sie dient als zentrale Personenbasis für private, geschäftliche und bereichsbezogene Kontexte. 

### 8.2 Zweck der Seite

Die Personen-Seite beantwortet vor allem die Frage: **„Mit welchen Personen habe ich regelmäßig zu tun, und welche Grundinformationen dazu brauche ich?“** 

Im V1-Fokus steht eine einfache, alltagstaugliche Personenverwaltung.  
Sie soll nicht sofort ein vollwertiges CRM-System werden. 

### 8.3 Hauptinhalt der Seite

Die Personen-Seite zeigt in V1 mindestens:

- Vorname,
- Nachname,
- Kategorie,
- optional Anschrift,
- Geburtstag. 

Zusätzlich soll die Seite spätere Bezüge zu Bereichen, Aufgaben, Terminen und Kommunikation ermöglichen, ohne dass diese in V1 bereits voll ausgebaut sein müssen. 

### 8.4 Erinnerungslogik

Ein wichtiger V1-Nutzen der Personenlogik liegt in Erinnerungen rund um Geburtstage. 

Dazu gehören mindestens:
- Erinnerung am Geburtstag selbst,
- optional vorgelagerte Erinnerung zur Vorbereitung von Geschenk oder Nachricht. 

### 8.5 Verhältnis zu anderen Seiten

Personen sind ein eigenes Objekt und keine bloße Eigenschaft anderer Objekte. 

Sie können später mit:
- Tasks,
- Bereichen,
- Terminen,
- Dateien,
- Kommunikationskontexten  
verknüpft werden, bleiben aber fachlich als eigene Objektklasse erhalten. 

### 8.6 V1-Abgrenzung

Nicht Ziel von V1 ist,
- ein vollwertiges CRM,
- komplexe Kontakt-Historien,
- mehrstufige Beziehungs- oder Organisationsgraphen. 

Die Personen-Seite bleibt damit in V1 eine einfache, aber nützliche Personenbasis mit Erinnerungsfunktion. 