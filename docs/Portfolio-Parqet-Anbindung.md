# Portfolio-Anbindung über Parqet (Referenz)

Dieses Dokument beschreibt, wie Leif OS das **Portfolio** technisch an **Parqet Connect** angebunden hatte. Die Produktfunktion wurde zugunsten eines reinen Planungs-/Task-Fokus entfernt; der Code unter `lib/parqet/` und die Supabase-Tabellen können als Blaupause für eine spätere Reaktivierung dienen.

## Zielbild

- OAuth 2.0 mit **PKCE** gegen den Parqet-Authorization-Server (`https://connect.parqet.com`).
- Nach erfolgreichem Login: **REST-Aufrufe** mit Access-Token (typisch gegen dieselbe Connect-Basis oder, falls konfiguriert, `https://api.parqet.com`).
- Persistenz in Supabase: **Snapshots** (Portfolio-Köpfe), **Positionen**, optional **lokale Verlaufs-Messpunkte** und **Parqet-Zeitreihenpunkte** aus der Performance-API.

## Umgebungsvariablen (Server)


| Variable                     | Rolle                                                                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PARQET_CLIENT_ID`           | OAuth-Client (Developer Hub). Ohne sie schlägt Connect fehl.                                                                                                                |
| `PARQET_CLIENT_SECRET`       | Nur falls der Flow client_secret erfordert (Connect nutzt PKCE-first).                                                                                                      |
| `PARQET_ISSUER` / Well-known | Standard in `lib/parqet/constants.ts`: `https://connect.parqet.com/.well-known/oauth-authorization-server`                                                                  |
| `PARQET_REDIRECT_URI`        | Optional; sonst wird `{Origin}/api/parqet/callback` aus dem Request abgeleitet (`lib/parqet/redirect-uri.ts`).                                                              |
| OAuth **Resource**           | `lib/parqet/oauth-resource.ts` / `parqetOAuthResourceParams()` — wichtig, damit das Access-Token für die richtige API-Ressource ausgestellt wird (sonst 401 auf Daten-API). |
| `PARQET_API_ORIGIN`          | Default `https://api.parqet.com`; zusätzliche Versuche nur wenn `PARQET_TRY_DATA_API=1` oder Resource gesetzt (`fetch-remote.ts`).                                          |
| `PARQET_SYNC_DEBUG=1`        | Ausführliche Logs beim Sync.                                                                                                                                                |


Scope (Konstante): `portfolio:read` (`lib/parqet/constants.ts`).

## OAuth-Flow (App-Routen)

1. **Start:** `GET /api/parqet/connect`
  - Session nötig (sonst Redirect auf `/login?next=/api/parqet/connect`).  
  - Erzeugt PKCE `code_verifier` / Challenge, `state`, speichert **httpOnly** Cookies (`parqet_oauth_state`, `parqet_oauth_verifier`).  
  - Redirect auf Parqet-Authorize-URL (`openid-client`).
2. **Callback:** `GET /api/parqet/callback`
  - Validiert `state`, tauscht Code mit `authorizationCodeGrant` + PKCE.  
  - Speichert Tokens über `saveParqetTokens` in `parqet_oauth_tokens`.  
  - Redirect auf `/dashboard?parqet_connected=1` (Erfolg) bzw. `?parqet_error=…` (Fehler).

## Datenabruf: Portfolios und Positionen

Implementierung: `lib/parqet/fetch-remote.ts`, `lib/parqet/parse-portfolios.ts`, Sync-Orchestrierung `lib/parqet/sync-portfolios.ts`.

### Listen-Endpunkt

Es werden mehrere mögliche Pfade für die Portfolio-Liste versucht, z. B. `/portfolios`, `/me/portfolios`, `/users/me/portfolios` — das API-Layout war nicht stabil, daher **Fallback-Kette**.

### Positionen pro Portfolio

Herausforderung: `GET /portfolios/{id}` liefert oft **nur Metadaten** ohne Zeilen. Daher:

1. Zuerst oder parallel: `**POST /performance`** mit Portfolio-IDs (siehe unten) → Array `**holdings**` auswerten (`parseParqetPerformanceHoldingRow`, `groupPerformanceHoldingsByPortfolio`).
2. Wenn leer: gezielte **Supplement-GETs** über viele Pfad-Varianten (`/holdings`, `/positions`, `/lines`, broker-spezifische URLs, Query-Parameter `include=holdings`, …) — siehe `PORTFOLIO_SUPPLEMENT_PATHS` und `parqetBrokerSupplementAttempts` in `fetch-remote.ts`.
3. Tiefensuche im JSON als letzte Heuristik (`extractPositionsDeepSearch`).

### Supabase-Tabellen (Auszug)

Migration u. a. `supabase/migrations/20260413130000_portfolio.sql`:

- `portfolio_snapshots` — je User und `parqet_portfolio_id` ein Kopf-Datensatz (Name, `total_value`, Währung, Gain-Felder, Zeitstempel).
- `portfolio_positions` — Zeilen je Snapshot (Name, ISIN, Werte, Gewicht, …).
- `portfolio_total_history` — beim Sync wird ein **Messpunkt Gesamtvermögen** eingefügt (lokale Historie über Zeit, unabhängig von Parqet-Charts).
- `portfolio_parqet_series_points` — optional extrahierte **Kurvenpunkte** aus der Performance-API (`user_id`, `as_of`, `total_value`, `currency`).

## Historische Werte und Performance (der „tricky“ Teil)

### Zwei Datenquellen für Charts

Die UI (zuletzt `lib/portfolio/fetch-overview.ts` plus Dashboard-Kachel im entfernten `dashboard-portfolio-compact-card`) kombinierte:

1. `**portfolio_total_history`** — bei jedem manuellen „Aktualisieren“ / Sync wird der aktuelle Gesamtwert als neue Zeile geschrieben. Daraus entsteht eine **Treppen-/Messpunkt-Kurve** (robust, aber nur ab erster Messung).
2. `**portfolio_parqet_series_points`** — aus der **Parqet Performance-API** extrahierte Serie (feiner, wenn die API eine echte Zeitreihe liefert).

Die Dashboard-Logik bevorzugte für kurze Ranges oft Parqet-Serie, sonst Fallback auf lokale Historie (`filterHistoryByRange` in `lib/portfolio/dashboard-metrics.ts`).

### POST `/performance`

- Implementierung: `fetchParqetPerformanceHoldings` in `fetch-remote.ts` (JSON-Body mit Portfolio-IDs; optional `**interval`** für relative Zeiträume).
- **Holdings-Zeilen** liefern aktuelle Positionen; Mapping auf interne `ParsedParqetPosition` in `parse-portfolios.ts` (`parseParqetPerformanceHoldingRow` — viele mögliche Feldnamen für Marktwerte).
- **Gesamt-Zeitreihe:** `lib/parqet/extract-performance-series.ts` parst bevorzugt das OpenAPI-artige Muster `**charts[].values.history`** (Datum + Wert), mit vielen Fallbacks für abweichende JSON-Formen.

### Sync der Serie

`lib/parqet/sync-parqet-series.ts` → `syncParqetPortfolioValueSeries`:

- Für dieselben Portfolio-IDs wird `/performance` mit `**interval.type: "relative"**` und mehreren Werten nacheinander versucht:  
`["max", "1y", "6m", "3m", "1m", "ytd", "1w", "1d"]` — es wird die **längste brauchbare Serie** gewählt (Abbruch, sobald genug Punkte, z. B. ≥ 12).
- Ergebnis: Delete aller bisherigen Zeilen in `portfolio_parqet_series_points` für den User, dann Batch-Insert (Chunks à 400).

**Typisches Problem:** Die API-Antwort enthält nur **aktuelle Holdings** ohne `charts`/History → dann bleibt `portfolio_parqet_series_points` leer; die UI nutzt ausschließlich `portfolio_total_history` und Hinweistexte im Sync (`portfolio-actions.ts`).

## Server Action „Aktualisieren“ (entfernt)

Die zuletzt genutzte Server Action `refreshPortfolios` lag unter `app/(app)/dashboard/portfolio-actions.ts` (nicht mehr im Tree). Ablauf war:

1. `getValidParqetAccessToken` (Refresh über gespeicherte Tokens).
2. `fetchParqetPortfoliosJson` — aggregiert Listen- + Detail-Aufrufe.
3. `syncParqetPortfoliosToDb` — schreibt Snapshots/Positionen, `portfolio_total_history`, ruft `syncParqetPortfolioValueSeries` auf.
4. `revalidatePath` für Dashboard/Portfolio.

## Reaktivierung (Checkliste)

1. OAuth-App bei Parqet + Redirect-URL (`…/api/parqet/callback`) registrieren.
2. Env-Variablen setzen, ggf. `resource`-Parameter wie früher (`oauth-resource.ts`).
3. Routen `app/api/parqet/connect` und `callback` sowie UI (Einstellungen, Dashboard-Kachel, Seite `/portfolio`) wieder einbinden.
4. Migrationen für Portfolio-Tabellen auf Ziel-DB anwenden (`npm run db:push`).
5. Sync testen mit `PARQET_SYNC_DEBUG=1` und prüfen, ob `/performance` **charts** oder nur **holdings** liefert.

## Code-Index (Stand Refaktor)


| Bereich       | Pfade                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| OAuth + Token | `lib/parqet/tokens.ts`, `lib/parqet/configuration.ts`, `app/api/parqet/connect/route.ts`, `app/api/parqet/callback/route.ts` |
| API-Fetch     | `lib/parqet/fetch-remote.ts`                                                                                                 |
| Parsing       | `lib/parqet/parse-portfolios.ts`, `lib/parqet/extract-performance-series.ts`                                                 |
| DB-Sync       | `lib/parqet/sync-portfolios.ts`, `lib/parqet/sync-parqet-series.ts`                                                          |
| Lesen für UI  | `lib/portfolio/fetch-overview.ts`, `lib/portfolio/dashboard-metrics.ts`                                                      |


