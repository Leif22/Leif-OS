import type { SupabaseClient } from "@supabase/supabase-js";
import {
  graphCreateYearlyAllDayRecurringEvent,
  graphDeleteEvent,
} from "@/lib/microsoft/graph-events";
import { getValidMicrosoftAccessToken } from "@/lib/microsoft/tokens";
import {
  berlinWallClockYmd,
  monthDayFromBirthdayIso,
  nextYearlyBirthdayOccurrence,
} from "@/lib/persons/birthday-berlin";

export type PersonBirthdayOutlookPayload = {
  first_name: string;
  last_name: string;
  birthday: string | null;
};

/**
 * Synchronisiert den jährlichen Geburtstags-Ganztagestermin in Outlook (Serienmaster).
 * Ohne Outlook-Token: keine Anlage, optional Warnung; bestehende Graph-ID wird bei fehlendem Geburtstag trotzdem gelöscht (wenn Token da).
 */
export async function syncPersonBirthdayOutlookSeries(
  supabase: SupabaseClient,
  userId: string,
  personId: string,
  payload: PersonBirthdayOutlookPayload,
  previousOutlookEventId: string | null,
): Promise<{ warning: string | null }> {
  const tokenRes = await getValidMicrosoftAccessToken(supabase, userId);

  const clearDbOutlookId = async () => {
    await supabase
      .from("persons")
      .update({ birthday_outlook_event_id: null })
      .eq("id", personId)
      .eq("user_id", userId);
  };

  const setDbOutlookId = async (id: string | null) => {
    await supabase
      .from("persons")
      .update({ birthday_outlook_event_id: id })
      .eq("id", personId)
      .eq("user_id", userId);
  };

  if (!payload.birthday) {
    if (previousOutlookEventId && "accessToken" in tokenRes) {
      try {
        await graphDeleteEvent(tokenRes.accessToken, previousOutlookEventId);
      } catch {
        /* Outlook ggf. bereits gelöscht */
      }
    }
    await clearDbOutlookId();
    return { warning: null };
  }

  if ("error" in tokenRes) {
    if (previousOutlookEventId) {
      /* Alte Serie nicht löschbar ohne Token — ID in DB belassen */
    }
    return {
      warning: `${tokenRes.error} Geburtstag ist gespeichert; der Outlook-Kalendereintrag wurde nicht angepasst.`,
    };
  }

  const md = monthDayFromBirthdayIso(payload.birthday);
  if (!md) {
    return { warning: "Geburtstagsdatum ungültig — kein Outlook-Termin angelegt." };
  }

  const fromYmd = berlinWallClockYmd();
  const occ = nextYearlyBirthdayOccurrence(fromYmd, md.month, md.day);
  if (!occ) {
    return { warning: "Kein gültiges nächstes Geburtstagsdatum — kein Outlook-Termin angelegt." };
  }

  if (previousOutlookEventId) {
    try {
      await graphDeleteEvent(tokenRes.accessToken, previousOutlookEventId);
    } catch {
      /* weiter mit neuem Termin */
    }
  }

  const subject = `Geburtstag ${payload.first_name.trim()} ${payload.last_name.trim()}`.trim();
  const bodyText =
    "Wiederkehrender Geburtstag aus Leif OS (Personen).\n\n" +
    `Person: ${payload.last_name.trim()}, ${payload.first_name.trim()}`;

  try {
    const newId = await graphCreateYearlyAllDayRecurringEvent(tokenRes.accessToken, {
      subject,
      body: bodyText,
      month: md.month,
      dayOfMonth: md.day,
      firstStartYmd: occ.startYmd,
      firstEndExclusiveYmd: occ.endExclusiveYmd,
    });
    await setDbOutlookId(newId);
  } catch (e) {
    await setDbOutlookId(null);
    const msg = e instanceof Error ? e.message : "Outlook-Fehler";
    return { warning: `Geburtstag ist gespeichert; Outlook-Termin fehlgeschlagen: ${msg}` };
  }

  return { warning: null };
}
