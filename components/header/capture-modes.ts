import { PRODUCT_COPY } from "@/lib/product-labels";

/** Erfassungsmodus der zentralen Header-Leiste (ohne KI als eigener Modus). */
export type HeaderCaptureMode = "inbox" | "task" | "termin" | "notiz";

export const HEADER_CAPTURE_MODES: readonly HeaderCaptureMode[] = ["inbox", "task", "termin", "notiz"] as const;

export function headerCaptureModeLabel(mode: HeaderCaptureMode): string {
  switch (mode) {
    case "inbox":
      return PRODUCT_COPY.headerCaptureModeInbox;
    case "task":
      return PRODUCT_COPY.headerCaptureModeTask;
    case "termin":
      return PRODUCT_COPY.headerCaptureModeTermin;
    case "notiz":
      return PRODUCT_COPY.headerCaptureModeNotiz;
    default:
      return mode;
  }
}
