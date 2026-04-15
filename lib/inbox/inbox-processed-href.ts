import type { InboxListItem } from "@/lib/inbox/types";

/** Ziel-URL für ein verarbeitetes Inbox-Item (nach `processed_as` / `processed_ref_id`). */
export function hrefForProcessedInboxItem(
  item: Pick<InboxListItem, "processed_as" | "processed_ref_id">,
): string | null {
  const ref = item.processed_ref_id?.trim();
  if (!ref) return null;
  const enc = encodeURIComponent(ref);
  switch (item.processed_as) {
    case "task":
      return `/tasks?task=${enc}`;
    case "sparring":
      return `/sparring/${ref}`;
    case "result":
    case "person":
      return null;
    case "note":
    case "draft":
      return `/notizen?note=${enc}`;
    case "event":
      return `/kalender`;
    case "document":
      return `/dokumente/${ref}`;
    default:
      return null;
  }
}
