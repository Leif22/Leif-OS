<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Supabase (lokal + Cursor)

Der Nutzer verbindet das Remote-Projekt **einmal** im Projektordner mit der CLI; danach kann der Agent `npm run db:push` ausführen, sobald unter `supabase/migrations/` neue SQL-Dateien liegen.

**Einmalig (vom Nutzer im Cursor-Terminal):**

1. `npx supabase login` (Browser)
2. `npx supabase link --project-ref <Reference ID aus Dashboard → Project Settings → General>`
3. DB-Passwort eingeben, wenn die CLI danach fragt

**Nach Schema-Änderungen:** `npm run db:push` (oder zuerst `npm run db:push:dry`). Ohne erfolgreichen Push schlagen App-Queries fehl, wenn Spalten/Tabellen fehlen.

Konfiguration: `supabase/config.toml`. Nach `link` entstehen lokale CLI-Dateien unter `supabase/.temp` / `supabase/.branches` (gitignored).
