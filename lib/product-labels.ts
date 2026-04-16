/**
 * Verbindliche UI-Begriffe für Leif OS (eine Begriffswelt).
 * Routen, Tabellennamen und API-Pfade bleiben technisch (z. B. `sparring_chats`).
 */

export const PRODUCT_LABEL = {
  dashboard: "Dashboard",
  /** @deprecated Portfolio-UI entfernt; Doku: docs/Portfolio-Parqet-Anbindung.md */
  portfolio: "Portfolio",
  /** Kategorien für Tasks (Tabelle `areas`) */
  lebensbereiche: "Bereiche",
  lebensbereich: "Bereich",
  tasks: "Tasks",
  kalender: "Kalender",
  planer: "Planer",
  inbox: "Inbox",
  ki: "KI",
  kontakte: "Kontakte",
  kontakt: "Kontakt",
  dokumente: "Dokumente",
  dokument: "Dokument",
  notizen: "Notizen",
  notiz: "Notiz",
  gedaechtnis: "Gedächtnis",
  einstellungen: "Einstellungen",
} as const;

/** Längere oder kontextabhängige UI-Texte */
export const PRODUCT_COPY = {
  plusMenuTask: "Task anlegen",
  plusMenuKi: "KI-Sparring starten",
  plusMenuKontakt: "Kontakt anlegen",
  plusMenuNotiz: "Notiz anlegen",
  plusMenuDokument: "Dokument hochladen",
  plusMenuGedaechtnis: "Eintrag im Gedächtnis",
  /** Globales „+ Neu“-Menü: Einträge (einheitlich mit „Neu…“ / Aktionsformulierung) */
  plusMenuDropdownNeuerTask: "Neuer Task",
  plusMenuDropdownNeuerEingang: "Neuer Eingang",
  plusMenuDropdownNeueNotiz: "Neue Notiz",
  plusMenuDropdownNeuerKontakt: "Neuer Kontakt",
  plusMenuDropdownKiSparring: "KI-Sparring starten",
  plusMenuDropdownDokumentHochladen: "Dokument hochladen",
  plusMenuDropdownGedaechtnisEintrag: "Neuer Gedächtnis-Eintrag",
  schnellanlageTitle: "Schnellanlage",

  /** Zentrale Header-Erfassung: Modus-Dropdown */
  headerCaptureModeInbox: "Inbox",
  headerCaptureModeTask: "Task",
  headerCaptureModeTermin: "Termin",
  headerCaptureModeNotiz: "Notiz",
  headerCaptureAriaMode: "Erfassungsmodus",
  headerCapturePlaceholderInbox: "Titel eingeben, Enter zum Anlegen in der Inbox",
  headerCapturePlaceholderTask: "Task-Titel",
  headerCapturePlaceholderTermin: "Termin-Titel",
  headerCapturePlaceholderNotiz: "Notiz-Titel",
  headerCaptureDurationHint: "Min.",
  headerCaptureDueHint: "Fällig",
  headerCaptureStartHint: "Beginn",
  headerCaptureNoteProjectHint: "Projekt",
  headerCaptureNoteNoProject: "Kein Projekt",

  lebensbereichePageDescription:
    "Bereiche strukturieren deine Tasks. Namen und Reihenfolge kannst du anpassen; Löschen ist nur möglich, wenn kein Task mehr diesem Bereich zugeordnet ist.",
  bereicheSettingsDescription:
    "Hier pflegst du die Bereiche, die du bei Tasks als Kategorie auswählst. Dieselben Einträge findest du nicht mehr als eigene Seite in der Navigation.",
  lebensbereicheEmpty: "Noch keine Bereiche. Lege oben den ersten an.",
  neuerLebensbereich: "Neuer Bereich",
  lebensbereichLoeschenConfirm: "Bereich wirklich löschen?",

  kontaktePageDescription: "Stammdaten und Lebensbereichsverknüpfungen.",
  kontakteLoading: "Lade Kontakte…",
  kontakteEmpty: "Noch keine Kontakte. Lege die erste mit „Kontakt anlegen“ an.",
  kontakteIntro:
    "Stammdaten zu Kontakten in deinem Kontext. Geburtstag und Vorerinnerung kannst du für spätere Kalenderintegration nutzen.",

  gedaechtnisPageDescription:
    "Erkenntnisse und Entscheidungen — u. a. aus der KI übernommen. In der KI: Aktion „Eintrag im Gedächtnis“.",
  gedaechtnisEmpty:
    "Noch keine Einträge. Lege z. B. aus einem KI-Sparring einen Eintrag im Gedächtnis an.",
  gedaechtnisColumnFromKi: "Aus KI",

  kiListEmptyOffen: (workspace: string) =>
    `Keine offenen Sparrings im ${workspace}-Bereich. Über den Filter kannst du Geschlossene oder Gelöschte anzeigen.`,
  kiListEmptyAktiv: (workspace: string) =>
    `Keine aktiven (nicht gelöschten) Sparrings im ${workspace}-Bereich.`,
  kiListEmptyGeloescht: (workspace: string) =>
    `Keine gelöschten Sparrings im ${workspace}-Bereich (Papierkorb).`,
  kiListEmptyAlle: (workspace: string) =>
    `Noch keine Sparrings im ${workspace}-Bereich. Starte mit „Neues Sparring“.`,

  kiUntitledChat: "Freies Sparring",
  kiChatRowFallback: "KI-Sparring",
  kiDeleteConfirm:
    "Dieses Sparring löschen? Es wird als gelöscht markiert und erscheint nur noch unter „Gelöschte“.",
  kiDeleteAria: "Sparring löschen",
  kiCloseListAria: "Sparring schließen",
  kiCloseConfirm: "Dieses Sparring als geschlossen markieren?",
  kiLeaveNeuConfirm:
    "Zur Übersicht gehen, ohne ein Sparring anzulegen?\n\nOK = Ja\nAbbrechen = hier bleiben",
  kiNeuDescription:
    "Es wird erst ein Sparring angelegt, wenn du unten eine erste Nachricht speicherst. Ohne Text kannst du jederzeit zur Übersicht zurück.",
  kiNeuSubmit: "Sparring anlegen und speichern",
  kiNeuPageTitle: "Neues Sparring",
  kiPageDescription:
    "Denkpartner für Klärung und nächste Schritte: Nachrichten speichern, KI-Antworten, Titel und Übernahmen in Tasks oder Notizen.",
  kiNeuPageSubtitle: "Erste Nachricht speichert den Chat. Du kannst ohne Text zur Übersicht zurück.",

  portfolioPageDescription:
    "Depotblöcke und Einzelpositionen — für Auswertung und Tiefe, nicht für die Tagessteuerung im Dashboard.",

  kiResultDialogTitle: "Eintrag im Gedächtnis aus KI",
  kiResultDialogBody: "Wird im Gedächtnis gespeichert und einem Lebensbereich zugeordnet.",
  kiResultSave: "Im Gedächtnis speichern",
  kiResultPickArea: "Bitte einen Lebensbereich wählen.",

  taskFromKiHint:
    "Vorschlag aus den letzten KI-Nachrichten (eine konkrete Aufgabe); Titel und Beschreibung kannst du vor dem Speichern anpassen.",
  taskNoAreasLoaded:
    "Es sind keine Bereiche geladen. Ohne Bereich kann kein Task angelegt werden.",
  taskAreaRequired: "Bereich",
  taskAreaSelectPlaceholder: "Keine Bereiche",

  inboxPageDescription:
    "Neuer Input sichten: Zeile anklicken, Ziel wählen (Task, KI, Notiz, Termin, Dokument …) und im nächsten Schritt ausfüllen — oder verwerfen. Kein Postfach, keine Dauerablage.",
  inboxOpenInKi: "In KI öffnen",
  inboxCreateGedaechtnis: "Eintrag im Gedächtnis",
  inboxGedaechtnisDialogTitle: "Eintrag im Gedächtnis aus Inbox",
  inboxGedaechtnisDialogBody:
    "Wird im Gedächtnis gespeichert; der Eingang wird als verarbeitet markiert.",
  inboxSearchHitKi: "KI",
  inboxSearchHitGedaechtnis: "Gedächtnis",

  dokumentePageDescription:
    "Dateien zentral ablegen und mit Bereichen und Notizen verknüpfen — mehrere Verknüpfungen pro Dokument möglich. Aus der Inbox (z. B. Telegram mit Anhang) kannst du ein Dokument anlegen.",
  inboxDocumentToolboxLabel: "Dokument anlegen",
  inboxDocumentDialogTitle: "Dokument aus Inbox",
  inboxDocumentDialogBody:
    "Der Eingang wird als Datei im Dokumentenspeicher abgelegt und als verarbeitet markiert. Bei Telegram-Anhängen wird die Datei über den Bot geladen (TELEGRAM_BOT_TOKEN). Verknüpfungen pflegst du danach auf der Dokumentenseite.",
  notizenPageDescription:
    "Kurzlebige Merker und Entwürfe — ohne Titel, in Listen als Textauszug. Optional einem Bereich zuordnen.",
  notizAreaOptional: "Lebensbereich (optional)",
  notizFromKiHint:
    "Vorschlag aus den letzten KI-Nachrichten; du kannst den Text vor dem Speichern frei anpassen.",

  kalenderTableArea: "Bereich",

  planerPageDescription:
    "Zeitliche Planung statt Wunschliste: Termine, offene Aufgaben, Regelaufgaben, Kapazität und Puffer zusammenführen — zuerst als Tagesplan, später zusätzlich als Wochenplan. Der Planer ist aktiv; Kalender und Tasks liefern die Rohdaten.",
  planerPlaceholderUebersicht:
    "Hier erscheint die zusammengefasste Planung (z. B. Ampel, Reihenfolge, Vorschläge zum Verschieben), sobald die Engine angebunden ist.",
  planerPlaceholderBloecke:
    "Noch keine Zeitblöcke berechnet — Struktur für Vorschläge und manuelle Anpassungen ist vorbereitet.",
  planerPlaceholderKapazitaet:
    "Kapazität und Regeln (z. B. Tagesbudget) werden hier angebunden — ohne Überplanung.",
  planerPlaceholderTermine:
    "Kalendereinträge werden hier eingelesen und als feste Balken dargestellt (Anbindung folgt).",
  planerPlaceholderAufgaben:
    "Offene Tasks mit Dauer und Priorität erscheinen hier als planbare Kandidaten (Anbindung folgt).",
  planerPlaceholderPuffer:
    "Erkannte oder manuelle Pufferfenster — Platzhalter bis zur Slot-Berechnung.",

  einstellungenPageDescription:
    "Verbindungen und Schnittstellen zu Leif OS — zuerst Telegram für Nachrichten in die Inbox.",

  telegramSectionTitle: "Telegram → Inbox",
  telegramSectionIntro:
    "Verknüpfe deinen Telegram-Account einmalig. Danach landen Textnachrichten, die du dem Bot in einem privaten Chat schickst, als neue Inbox-Einträge. Der Kalender und andere Bereiche bleiben unverändert.",
  telegramStatusLinked: "Verbunden",
  telegramStatusNotLinked: "Noch nicht mit Telegram verbunden.",
  telegramLinkedNoUsername: "Telegram (ohne @-Namen)",
  telegramCreateLinkCode: "Verknüpfungs-Code erzeugen",
  telegramTokenHint:
    "Wichtig: Nicht nur „/start“ tippen — der lange Code muss mit dabei sein. Am einfachsten: grünen Link „In Telegram öffnen“ (legt /start + Code automatisch an). Alternativ eine Nachricht exakt in der Form: /start <kompletter Code aus der Box darunter> (gültig ca. 15 Minuten).",
  telegramOpenDeepLink: "In Telegram öffnen",
  telegramNoBotUsername:
    "Lege in der Umgebungsvariable NEXT_PUBLIC_TELEGRAM_BOT_USERNAME deinen Bot-Namen ohne @ fest, dann erscheint hier ein Direktlink.",
  telegramTokenExpires: "Gültig bis",
  telegramUnlinkButton: "Telegram trennen",
  telegramUnlinkConfirm: "Telegram-Verknüpfung wirklich entfernen? Neue Bot-Nachrichten gehen dann nicht mehr in deine Inbox.",

  personFormAreasLegend: "Lebensbereiche",
  personFormNoAreas: "Keine Lebensbereiche angelegt.",

  breadcrumbLebensbereiche: "Lebensbereiche",
  alleEintraegeGedaechtnis: "Alles im Gedächtnis",
  sectionGedaechtnis: "Gedächtnis",
  sectionKi: "KI",
  neuesKiGespraech: "Neues Sparring",
  kiKeinKontext: "Kein Sparring mit diesem Lebensbereich als Kontext.",
  kontakteMitLebensbereich: "Keine Kontakte mit diesem Lebensbereich verknüpft.",

  taskInThisLebensbereich: "Task in diesem Lebensbereich",
  keineTasksInLebensbereich: "Keine Tasks in diesem Lebensbereich.",
  keineNotizenInLebensbereich: "Keine Notizen in diesem Lebensbereich.",
  keineGedaechtnisInLebensbereich: "Keine Einträge im Gedächtnis mit diesem Lebensbereich.",

  kontaktLoeschenConfirm: "Diesen Kontakt wirklich löschen?",
  kontaktAnlegen: "Kontakt anlegen",
  kontaktBearbeiten: "Kontakt bearbeiten",
  kontaktNichtAusgewaehlt: "Kein Kontakt ausgewählt.",

  gedaechtnisAnlegenButton: "Eintrag im Gedächtnis",
  kiGedaechtnisBulkTitle: "Gedächtnis aus KI-Sparring",
  kiGedaechtnisBulkBody:
    "Vorschläge aus dem gesamten Verlauf. Zeilen anhaken, Titel und Text anpassen, Lebensbereich und Art wählen, dann speichern.",
  kiGedaechtnisBulkLoading: "Analyse läuft…",
  kiGedaechtnisBulkEmpty: "Keine gedächtniswürdigen Punkte erkannt. Du kannst Einträge manuell unter Gedächtnis anlegen.",
  kiGedaechtnisBulkSave: "Ausgewählte ins Gedächtnis",
  kiAssistantActionsHint:
    "Unter jeder KI-Antwort: Task oder Notiz aus genau dieser Antwort. Oben: mehrere Gedächtnis-Einträge aus dem ganzen Verlauf.",
  kiWeiterverarbeitenHinweis:
    "Gedächtnis: der gesamte Verlauf wird analysiert; du wählst Zeilen aus. Task/Notiz: je unter der betreffenden KI-Antwort. Mindestens ein Lebensbereich für Gedächtnis.",
  kiKeineBereicheGedaechtnis:
    "Keine Lebensbereiche angelegt — „Eintrag im Gedächtnis“ ist erst danach möglich.",
  kiBackKeepConfirm:
    "Sparring in der Übersicht behalten?\n\nOK = Ja, behalten\nAbbrechen = als gelöscht markieren (erscheint nur noch unter „Gelöschte“)",
  kiGeschlossenKeineNachrichten: "Dieses Sparring ist geschlossen; keine neuen Nachrichten.",
  kiDeletedReadonlyTemplate:
    "Dieses Sparring ist gelöscht (nur noch lesbar). Unter „{{w}}“ den Filter „Gelöschte“ wählen, um es wiederzufinden.",
  kiNeuAbbrauchMitText:
    "Eingegebenen Text verwerfen und zur Übersicht gehen?\n\nOK = Ja\nAbbrechen = hier bleiben",

  errorKiChatMissing: "Sparring nicht gefunden oder gelöscht.",
  errorKiNotFound: "Sparring nicht gefunden.",
  errorKiDeletedNoTakeover: "Gelöschtes Sparring kann nicht übernommen werden.",
  errorLebensbereichNotFound: "Lebensbereich nicht gefunden.",
  errorGedaechtnisInsert: "Eintrag im Gedächtnis konnte nicht angelegt werden.",

  taskDraftTitleFromKi: "Aus KI übernommen",
  taskDraftDescFromKi: (body: string) => `Aus KI übernommen:\n\n${body}`,
  taskDraftDescEmpty: "Aus KI übernommen (noch keine Nachrichten im Verlauf).",

  errorTaskLebensbereichRequired: "Bereich ist Pflichtfeld.",
  errorKontaktInsert: "Kontakt konnte nicht angelegt werden.",
  errorKontaktNotFound: "Kontakt nicht gefunden.",
} as const;

export function formatKiDeletedReadonly(workspace: string): string {
  return PRODUCT_COPY.kiDeletedReadonlyTemplate.replace("{{w}}", workspace);
}
