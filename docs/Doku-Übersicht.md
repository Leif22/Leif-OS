# Leif OS – Doku-Übersicht

Ziel dieser Datei ist, die Rollen der zentralen Doku-Dateien klar zu trennen.
Jede Datei beantwortet genau eine Leitfrage und übernimmt eine definierte Verantwortung.

## 1. Übersicht der Doku-Typen

| Datei | Zweck / Verantwortung | Leitfrage | Gehört ausdrücklich **nicht** hinein |
|---|---|---|---|
| `Produkt-Anforderungen.md` | Fachliches Produktbild von Leif OS: Zielbild, Rolle des Systems, Hauptaufgaben, Maintabs, Kernobjekte, Statusmodelle, Seitenarten, Grundprinzipien. | *Was ist Leif OS fachlich und welche Bausteine gehören konzeptionell dazu?* | V1-Abschneidung, detaillierte Seitenaufteilung, konkrete Routen/Dateipfade, Tabellen-/Feldlisten. |
| `V1-Scope.md` | Bewusster Erstumfang für den Neustart: Welche Teile des Produktbilds gehören in V1, welche bewusst nicht. | *Was bauen wir jetzt wirklich – und was lassen wir in dieser Runde weg?* | Endgültiges Zielbild (gehört in Produkt-Anforderungen), technische Umsetzung, detaillierte Seite-zu-Route- oder Tabellen-Details. |
| `Route-Map.md` | Fachliche Seiten- und Zuständigkeitskarte: globaler App-Rahmen, alle Seiten/Seitentypen mit Zweck, sichtbaren Objekten, Hauptaktionen und Abgrenzung zueinander. | *Wo in der Oberfläche lebt welche Funktion, und wofür ist jede Seite zuständig?* | Produktvision/Philosophie, V1/Später-Entscheidungen, technische Routen, Komponenten, Tabellen. Das gehört in Produkt-Anforderungen, V1-Scope oder Implementation-/Datenmodell-Doku. |
| `Objektmodell.md` | Fachliche Objektrollen, Beziehungen und Kardinalitäten: Welche Kernobjekte es gibt, wie sie zueinander stehen, welche Regeln und Einschränkungen gelten. | *Was sind die fachlichen Objekte, wie hängen sie zusammen und welche Regeln gelten für ihre Beziehungen?* | Tabellen-/Feldlisten, Datentypen, Constraints, SQL (→ Datenmodell.md). UI-/Seitenlogik, Aktionen, Workflows (→ Route-Map.md, Implementation-Map.md). |
| `Implementation-Map.md` | Technische Verortung der Funktionen: pro Funktion Seite, Serveraktionen/Queries, beteiligte Tabellen und Workflows – als Stub ohne konkreten Code. | *Welche Funktion wird wo gebaut, was braucht sie serverseitig, und welche Tabellen und Abläufe greifen?* | Produktziele, fachliche Scope-Fragen, rein fachliche Seitenbeschreibung ohne technische Konsequenz, Roh-Schema des Datenmodells. |
| `Datenmodell.md` | Tabellen-, Feld- und Relationssicht: Tabellen, Felder, Statuswerte, Relationen, Constraints, Indizes, RLS – passend zum fachlichen Objektmodell. | *Wie sehen die fachlichen Objekte im relationalen Modell aus?* | UI-/Seitenlogik, Navigationsentscheidungen, Komponentenzuschnitt, Implementierungsdetails von Routen oder Actions. |
| `Änderungsprotokoll.md` | Laufendes Log struktureller Änderungen an Pfaden, Zuständigkeiten, Datenmodell, Regeln und Doku-Struktur. | *Was wurde an Strukturentscheidungen wann geändert und warum?* | Vollständige Neuformulierung von Konzepten (gehört in die jeweiligen Hauptdateien), operative To-Dos, lose Notizen. |

## 2. Arbeitsregeln

1. **Eine Leitfrage pro Datei**
   Jeder neue Abschnitt muss zu der Leitfrage der jeweiligen Datei passen.
   Wenn er eher eine andere Leitfrage beantwortet, gehört er in eine andere Datei.

2. **Keine Misch-Dokus**
   Produktvision, Scope-Fragen, Seitenverortung, technische Umsetzung und Datenmodell bleiben in ihren eigenen Dateien.
   Mischformen („bisschen Produktbild, bisschen Route Map, bisschen Technik") sind ausdrücklich zu vermeiden.

3. **Konsistenz zwischen Dateien**
   Wo Themen in mehreren Dateien auftauchen (z.B. Dashboard in Produkt-Anforderungen, V1-Scope und Route-Map), müssen Aussagen konsistent bleiben und sich nur in der Flughöhe unterscheiden (Endbild vs. V1 vs. Seiten-Zuständigkeit).

4. **Aktualisierung blockweise**
   Änderungen an einer Datei erfolgen als konsolidierter Block (z.B. kompletter Abschnitt neu), nicht in kleinsten Schnipseln.
   Dadurch sinkt das Risiko von Inkonsistenzen und Merge-Fehlern.

5. **Keine technische Details in Produkt-/Route-Map-Dokus**
   Dateipfade, Komponentenbäume, konkrete Actions/Queries oder Tabellen gehören in `Implementation-Map.md` und `Datenmodell.md`, nicht in `Produkt-Anforderungen.md`, `V1-Scope.md` oder `Route-Map.md`.

6. **Objektmodell als Brücke zwischen fachlich und technisch**
   `Objektmodell.md` beschreibt die Objekte auf fachlicher Ebene (Rollen, Beziehungen, Kardinalitäten, Regeln). `Datenmodell.md` setzt diese in konkrete Tabellen/Felder um. Beides muss synchron sein, aber auf unterschiedlicher Flughöhe.

---

## Änderungsprotokoll

| Datum | Änderung | Grund |
|---|---|---|
| 2026-04-11 | `Objektmodell.md` als eigene Zeile in die Doku-Typen-Tabelle aufgenommen, inkl. Leitfrage und Abgrenzung | Fehlte bisher in der Übersicht, obwohl die Datei existiert und aktiv referenziert wird. |
| 2026-04-11 | Arbeitsregel 6 ergänzt: Objektmodell als Brücke zwischen fachlich und technisch | Klarstellung der Beziehung Objektmodell ↔ Datenmodell. |
| 2026-04-11 | Implementation-Map Leitfrage präzisiert: „Welche Funktion wird wo gebaut…" statt „Wie setzen wir um…" | Bessere Abgrenzung zum Datenmodell; die Impl.-Map beschreibt Verortung, nicht Schema-Details. |
