"use client";

import { saveInboxAiRules } from "@/app/(app)/einstellungen/inbox-ai-rules-actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { textareaClass } from "@/components/ui/control-styles";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  initialRules: string;
};

export function InboxAiRulesSection({ initialRules }: Props) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-xl border border-leif-border bg-leif-surface p-6 shadow-[var(--leif-shadow)]">
      <h2 className="text-[17px] font-semibold tracking-tight text-leif-text">KI-Regeln fuer Inbox-Qualifizierung</h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-leif-secondary">
        Hinterlege hier feste Hinweise, die die KI bei der Tool-Auswahl und Feldbefuellung beruecksichtigt.
        Beispiel: &quot;Anrufe immer als Task mit 15 Minuten&quot; oder &quot;Ohne Datum standardmaessig morgen&quot;.
      </p>
      <div className="mt-4 space-y-3">
        {message ? <AlertBanner variant="warning">{message}</AlertBanner> : null}
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          rows={8}
          maxLength={4000}
          placeholder={"- Anrufe immer als Task mit 15 Minuten.\n- Wenn kein Datum genannt ist: Termin auf morgen.\n- Einkaufslisten als Notiz statt Task."}
          className={textareaClass}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-leif-muted">{rules.length} / 4000 Zeichen</span>
          <Button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setMessage(null);
                const res = await saveInboxAiRules(rules);
                if (!res.ok) {
                  setMessage(res.error);
                  return;
                }
                router.refresh();
                setMessage("Regeln gespeichert.");
              })
            }
          >
            {isPending ? "Speichern..." : "Regeln speichern"}
          </Button>
        </div>
      </div>
    </section>
  );
}
