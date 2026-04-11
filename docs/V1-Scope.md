# Leif OS – V1-Scope

## Ziel des Dokuments

Diese Datei beschreibt den **verbindlichen V1-Zuschnitt** für den Neustart von Leif OS.  
Sie grenzt den ersten sinnvollen, alltagstauglichen Funktionskern gegen spätere Ausbauideen ab. 

Der V1-Scope dient als harte Entscheidungsgrundlage dafür,
- was im Neustart zuerst gebaut werden soll,
- was bewusst vereinfacht bleibt,
- was explizit später kommt. 

---

## 1. V1-Leitlinie

V1 soll kein halbfertiges Abbild des kompletten Zielbilds sein, sondern ein **kleiner, robuster und täglich nutzbarer Kern**. 

Im Fokus stehen:

- Tagessteuerung,
- Priorisierungsunterstützung,
- Eingangsklärung,
- Aufgabenführung,
- Sparring,
- Kalender- und Kapazitätsbezug,
- einfache Bereichs- und Personenlogik. 

Nicht im Fokus stehen:

- Vollausbau aller Objektbeziehungen,
- komplexe Automatisierung,
- ausgefeilte Spezialansichten,
- UI-/Interaktionsluxus ohne klaren V1-Nutzen. 

---

## 2. Verbindlicher V1-Kern

Folgende Bausteine gehören verbindlich zu V1:

- **Globaler App-Rahmen** mit linker Hauptnavigation, oberer Kopfzeile, globaler Suche und globalem Plus-Button. 
- **Dashboard** als tägliche Start- und Steuerungsseite. 
- **Inbox** zur Klärung neuer Eingänge. 
- **Tasks** als globale Aufgabenführungsseite. 
- **Sparring** als eigener Arbeitsmodus und eigener Maintab. 
- **Kalender** als operativ nutzbare Zeit- und Planungssicht. 
- **Bereiche** als Einstieg in die fachlichen Kontexträume. 
- **Personen** als einfache Personenbasis mit Erinnerungsfunktion. 

Nicht verbindlich für V1 ist ein ausgebauter **Einstellungen**-Bereich als priorisierter Hauptbaustein. 

---

## 3. V1-Scope pro Maintab

| Maintab | V1-Must-Haves | Später / Nicht V1 |
|---|---|---|
| **Dashboard** | Anzeige einer **empfohlenen nächsten Aufgabe** als zentraler Priorisierungsblock. Für diese Aufgabe sind die relevanten Task-Aktionen direkt ausführbar. Inbox als kompaktes operatives Werkzeug, beschränkt auf **ungelesene / noch nicht gesehene Eingänge**. Anzeige heutiger Termine sowie **heute geplanter Tasks** im Block „Heute“. Kurze Kapazitätsanzeige für heute. Einfache Anzeige des Gesamtvermögens und grundlegender Portfolio-Sichten. | Allgemeine Tasklisten oder umfangreiche Aufgabenübersichten direkt auf dem Dashboard. Tiefe Inbox-Interaktion direkt vom Dashboard aus, z.B. Massenaktionen oder vollständige Verlaufssicht. Komplexe Kapazitätsmodelle und ausgereifte automatische Tagesoptimierung. Historische Wertentwicklung, Performance-Analysen, feine Zeitraumfilter. |
| **Inbox** | Vollständige Seite für ungeklärte Eingänge. Standardansicht für ungeklärte Items unabhängig vom Gelesen-Status sowie optionale Einblendung bereits verarbeiteter Items. Minimalaktionen pro Item: **Task anlegen, in Sparring öffnen, als Ergebnis übernehmen, als Entwurf erstellen, verwerfen, als gelesen markieren**. Einfache Gelesen-/Ungelesen-Logik. | Multi-Channel-Control-Center mit tiefen Speziallogiken. Ticketsystem-artige Workflow-Zustände, Delegationslogik, Snooze, Waiting, komplexe Batch-Verarbeitung. Vollständiges Kommunikationsarchiv. |
| **Tasks** | Globale Taskliste mit Statusführung (`inbox`, `open`, `planned`, `done`, `canceled`). Priorisierungsblock **„Empfohlene nächste Aufgabe“** auch auf der Tasks-Seite ganz oben. Task anlegen/bearbeiten mit mindestens Titel, Beschreibung, Bereich, Tags, Priorität und optional Planung/Terminbezug. Einfache Planung eines Tasks auf einen Tag. Sortierfunktion mindestens nach Fälligkeit, geplantem Tag / zeitlicher Verankerung, Priorität, Status und Bereich. | Mehrdimensionale Filterwelten, gespeicherte Views, komplexe View-UI. Wiederkehrende Tasks, Task-Templates. Drag-and-drop-Planung, kapazitätsabhängige Planung, automatische Statuswechselregeln. Zusätzliche Ticketsystem-Status wie `waiting` oder `in_progress`. |
| **Sparring** | Freies Sparring ohne festen Kontext. Übersicht laufender Sparring-Kontexte. Sparring-Chat-Verlauf pro Gespräch. Aktionen aus Sparring heraus: **Ergebnis anlegen, Task aus Sparring anlegen, Entwurf erstellen**. Vorausagefülltes Task-Formular aus Sparring heraus. | Komplexes Sparring-Archiv mit ausgefeilter Such-, Vorlagen- oder Profil-Logik. Vollautomatisches Memory-Feeding kompletter Chatverläufe. |
| **Kalender** | Operative Kalenderansicht mit mindestens **Tages- und einfacher Wochenansicht**. Sicht auf Vergangenheit, Gegenwart und Zukunft. Anzeige von Outlook-/Graph-Terminen. Sichtbarkeit geplanter Tasks im Kalender. Einfache Termin-Erstellung aus Leif OS in den Outlook-Kalender. Einfache Kapazitätsanzeige auf Tages-/Wochenebene. | Drag-and-drop-Planung und komplexe Zeitblock-Logik. Ausgereifte automatische Optimierung der Tages- oder Wochenplanung. Vollständiger Ersatz externer Kalender-Clients. |
| **Bereiche** | Liste der vorhandenen Hauptbereiche als globaler Einstieg. Zugang zu einzelnen Bereichsseiten. Saubere Grundstruktur der Bereichsseiten mit Überblick, Projekten/Themencontainern, bereichsbezogenen Tasks, Ergebnissen, Sparring und Querverbindungen. | Hochkomplexe Bereichs-Dashboards, tief verschachtelte Unterstrukturen ohne klaren Nutzen. |
| **Personen** | Einfache Personenliste mit Vorname, Nachname, Kategorie sowie optional Anschrift und Geburtstag. Geburtstags-Erinnerungen und optionale vorgelagerte Geschenk-/Vorbereitungs-Erinnerung. Personen als eigene Objektklasse mit späteren Bezügen zu Aufgaben, Bereichen, Terminen und Kommunikation. | Vollwertiges CRM, komplexe Kontakt-Historien, Organisationsgraphen und tief ausgebaute Beziehungslogik. |
| **Einstellungen** | Kein priorisierter V1-Baustein. | Eigener ausgebauter Fokusbereich im Neustart. |

---

## 4. Wichtige fachliche Regeln in V1

### 4.1 Priorisierung

Ein zentraler Nutzen von Leif OS besteht darin, Priorisierung nicht vollständig manuell leisten zu müssen. 

Dafür gehört die Funktion **„Empfohlene nächste Aufgabe“** verbindlich in V1:
- auf dem **Dashboard** als täglicher Fokusblock,
- auf der **Tasks-Seite** als priorisierter Einstieg in die globale Aufgabenführung. 

Sortierung und Filterung der Taskliste ersetzen diese Priorisierungsfunktion nicht.  
Sie sind manuelle Ordnungswerkzeuge, während die empfohlene nächste Aufgabe eine verdichtete Systemempfehlung darstellt. 

### 4.2 Dashboard-Regel

Das Dashboard ist **keine allgemeine Taskseite**. 

Auf dem Dashboard erscheinen nur:
- **eine empfohlene nächste Aufgabe**,
- **ungelesene Inbox-Items**,
- **heutige Termine**,
- **heute geplante Tasks**,
- **Kapazität heute**,
- **Finanz-/Portfolio-Blick**. 

### 4.3 Inbox-Regel

Ein Inbox-Item ist ein ungeklärter Eingang und kein dauerhafter Endzustand. 

Inbox-Items müssen in V1 in einen sinnvollen Folgepfad überführt werden:
- Task,
- Sparring,
- Ergebnis,
- Entwurf,
- Verwerfen. 

### 4.4 Task-Regel

Für Tasks gilt ein bewusst schlankes Statusmodell mit ausschließlich folgenden Statuswerten:

- `inbox`
- `open`
- `planned`
- `done`
- `canceled` 

Nicht Teil von V1 sind Statuswerte wie `in_progress` oder `waiting`. 

Zusätzlich gelten für Tasks in V1 die Merkmale:
- **Bereich** als primärer fachlicher Kontextraum,
- **Priorität** als Wichtigkeitsstufe,
- **Tags** als frei kombinierbare Zusatzmarkierungen.

Tags dürfen Bereichslogik ergänzen, aber nicht die primäre Bereichszuordnung ersetzen. 

### 4.5 Kalender-Regel

Der Kalender ist in V1 **nicht nur read-only**. 

Geplante Tasks müssen im Kalender sichtbar sein, und einfache Termin-Erstellung aus Leif OS heraus gehört bereits zum V1-Kern.  Drag-and-drop und komplexe Planungsautomatik gehören dagegen bewusst später. 

### 4.6 Sparring-Regel

Sparring ist ein eigener Arbeitsmodus und kein bloßer Chat-Zusatz. 

Wichtig in V1 sind:
- freier Start,
- laufende Kontexte,
- strukturierte Outputs,
- Übergang in Task, Ergebnis oder Entwurf. 

Memory wird nicht blind aus Chatverläufen befüllt, sondern nur aus bestätigten strukturierten Ergebnissen. 

---

## 5. Was bewusst später kommt

Folgende Punkte gehören ausdrücklich **nicht** zum priorisierten V1-Kern:

- Historische Finanzentwicklung, Performance-Analysen und tiefe Portfolio-Logik.
- Komplexe Kapazitätsberechnungen und automatische Tagesoptimierung.
- Ticketsystem-artige Zustandsmodelle in Inbox oder Tasks.
- Wiederkehrende Tasks, Task-Templates und umfangreiche Aufgaben-Automatisierung.
- Drag-and-drop-Planung im Kalender oder in der Tasks-Seite.
- Vollausgebautes CRM oder tiefes Kontakt-/Beziehungsmanagement.
- Vollständige Ersetzung externer Kalender-Clients.
- Vollautomatische Übernahme kompletter Sparring-Chats in Memory.
- Ausgebauter Einstellungen-Bereich als V1-Schwerpunkt.

---

## 6. Prüffrage für V1-Entscheidungen

Eine Funktion gehört nur dann in V1, wenn sie mindestens eines der folgenden Ziele direkt stärkt:

- tägliche Priorisierung verbessern,
- neue Eingänge schneller klären,
- Aufgaben operativ besser führen,
- Tages- und Wochenkapazität sichtbar und nutzbar machen,
- Sparring in konkrete Folgeobjekte überführen,
- Bereiche oder Personen im Alltag sofort sinnvoll nutzbar machen.

Wenn eine Funktion vor allem „auch noch schön wäre“, aber keinen klaren Beitrag zu diesen V1-Zielen leistet, gehört sie nicht in den ersten Neustart-Umfang. 