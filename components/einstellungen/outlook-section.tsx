"use client";

import { setOutlookSyncDefaultExcludeFromPlanner } from "@/app/(app)/einstellungen/calendar-planner-actions";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useTransition } from "react";

type Props = {
  linked: boolean;
  /** Nach Outlook-Sync: neue importierte Termine standardmäßig in der Planung ausblenden. */
  defaultExcludeOutlookFromPlanner: boolean;
};

export function OutlookSection({ linked, defaultExcludeOutlookFromPlanner }: Props) {
  const [excludeNewByDefault, setExcludeNewByDefault] = useState(defaultExcludeOutlookFromPlanner);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setExcludeNewByDefault(defaultExcludeOutlookFromPlanner);
  }, [defaultExcludeOutlookFromPlanner]);

  return (
    <section className="rounded-xl border border-leif-border bg-leif-surface p-6 shadow-[var(--leif-shadow)]">
      <h2 className="text-[17px] font-semibold tracking-tight text-leif-text">Outlook Kalender</h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-leif-secondary">
        Verbinde Outlook, damit Termine aus Leif OS direkt in Exchange / Microsoft 365 geschrieben und bestehende
        Outlook-Termine synchronisiert werden koennen.
      </p>

      <div className="mt-6 rounded-lg border border-leif-border bg-leif-canvas/60 px-4 py-3 text-[13px] text-leif-text">
        <p className="font-medium">{linked ? "Verbunden" : "Nicht verbunden"}</p>
        <p className="mt-1 text-leif-secondary">
          {linked
            ? "Die Verbindung ist aktiv. Du kannst sie hier bei Bedarf trennen."
            : "Verbinde dein Microsoft-Konto, um Outlook im Kalender zu nutzen."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/microsoft/connect">
            <Button type="button" variant="primary" size="sm">
              {linked ? "Erneut verbinden" : "Mit Outlook verbinden"}
            </Button>
          </a>
          {linked ? (
            <a href="/api/microsoft/disconnect">
              <Button type="button" variant="secondary" size="sm">
                Verbindung trennen
              </Button>
            </a>
          ) : null}
        </div>
        {linked ? (
          <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-leif-border/80 pt-4">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-leif-border text-leif-primary focus:ring-leif-primary"
              checked={excludeNewByDefault}
              disabled={isPending}
              onChange={(e) => {
                const next = e.target.checked;
                setExcludeNewByDefault(next);
                startTransition(async () => {
                  const res = await setOutlookSyncDefaultExcludeFromPlanner(next);
                  if (!res.ok) {
                    setExcludeNewByDefault(!next);
                  }
                });
              }}
            />
            <span>
              <span className="font-medium text-leif-text">Planung: neue Outlook-Termine ausblenden</span>
              <span className="mt-1 block text-[12px] leading-relaxed text-leif-secondary">
                Wenn aktiviert, erscheinen neu synchronisierte Outlook-Termine nicht in der Planungsansicht und
                blockieren dort keine Zeitfenster. Du kannst das pro Termin oder Serie im Planer mit dem
                Augen-Symbol ändern.
              </span>
            </span>
          </label>
        ) : null}
      </div>
    </section>
  );
}

