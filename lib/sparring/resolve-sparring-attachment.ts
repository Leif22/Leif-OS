import type { SupabaseClient } from "@supabase/supabase-js";

/** Einmaliger Anhang fürs Sparring: Text/PDF extrahieren oder Bild für Vision vorbereiten. */
export type ResolvedSparringAttachment =
  | { ok: true; suffix: string; vision?: { base64: string; mime: string } }
  | { ok: false; error: string };

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const MAX_VISION_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_EXTRACT_CHARS = 120_000;

const VISION_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function truncateExtract(s: string): string {
  const t = s.trim();
  if (t.length <= MAX_EXTRACT_CHARS) return t;
  return `${t.slice(0, MAX_EXTRACT_CHARS)}\n\n… (gekürzt, maximal ${MAX_EXTRACT_CHARS.toLocaleString("de-DE")} Zeichen)`;
}

function isLikelyUtf8TextMime(mime: string, filename: string): boolean {
  const m = mime.toLowerCase();
  const n = filename.toLowerCase();
  if (m.startsWith("text/")) return true;
  if (m === "application/json" || m.includes("json")) return true;
  if (m.includes("xml") || m.includes("yaml") || m.includes("csv")) return true;
  if (n.endsWith(".md") || n.endsWith(".csv") || n.endsWith(".tsv") || n.endsWith(".log")) return true;
  if (m === "image/svg+xml") return true;
  return false;
}

async function extractPdfText(buffer: Buffer): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const mod = await import("pdf-parse");
    const pdfParse = mod.default as (b: Buffer) => Promise<{ text?: string }>;
    const data = await pdfParse(buffer);
    return { ok: true, text: (data.text ?? "").trim() };
  } catch {
    return { ok: false, error: "PDF konnte nicht gelesen werden." };
  }
}

async function prepareBufferForSparringAi(
  buffer: Buffer,
  mime: string,
  filename: string,
): Promise<ResolvedSparringAttachment> {
  const mimeLower = (mime || "application/octet-stream").toLowerCase();
  const nameLower = filename.toLowerCase();

  if (VISION_IMAGE_MIMES.has(mimeLower)) {
    if (buffer.length > MAX_VISION_IMAGE_BYTES) {
      return {
        ok: false,
        error: `Bild zu groß (max. ${Math.round(MAX_VISION_IMAGE_BYTES / (1024 * 1024))} MB für die KI-Analyse).`,
      };
    }
    const base64 = buffer.toString("base64");
    return {
      ok: true,
      suffix: `\n\n[Bilddatei: ${filename} (${mimeLower}) — wird dem Modell als Bild übergeben.]`,
      vision: { base64, mime: mimeLower },
    };
  }

  const looksPdf = mimeLower === "application/pdf" || mimeLower.includes("pdf") || nameLower.endsWith(".pdf");
  if (looksPdf) {
    const extracted = await extractPdfText(buffer);
    if (!extracted.ok) return extracted;
    if (!extracted.text) {
      return {
        ok: true,
        suffix: `\n\n[PDF „${filename}“: kein extrahierbarer Text (z. B. gescannte Seiten ohne OCR).]`,
      };
    }
    return {
      ok: true,
      suffix: `\n\n--- Text aus PDF „${filename}“ ---\n${truncateExtract(extracted.text)}`,
    };
  }

  if (isLikelyUtf8TextMime(mimeLower, filename)) {
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    const t = decoded.replace(/\uFFFD/g, "").trim();
    if (!t) {
      return { ok: true, suffix: `\n\n[Textdatei „${filename}“: leer oder nicht als UTF-8 lesbar.]` };
    }
    return { ok: true, suffix: `\n\n--- Inhalt „${filename}“ ---\n${truncateExtract(t)}` };
  }

  return {
    ok: true,
    suffix: `\n\n[Anhang „${filename}“ (${mimeLower}) — kein automatischer Textabruf. Bitte Inhalt kurz beschreiben oder als PDF/TXT/Bild anhängen.]`,
  };
}

/**
 * Liest entweder eine hochgeladene Datei oder ein gespeichertes Dokument (Leif OS) und
 * erzeugt einen Textblock für die Nutzernachricht sowie optional Vision-Daten fürs Modell.
 */
export async function resolveSparringAttachmentForAi(
  supabase: SupabaseClient,
  userId: string,
  params: { file: File | null; documentId: string | null },
): Promise<ResolvedSparringAttachment> {
  const file = params.file && params.file.size > 0 ? params.file : null;
  const documentId = params.documentId?.trim() || null;

  if (file && documentId) {
    return {
      ok: false,
      error: "Bitte entweder eine Datei vom Computer wählen oder ein Dokument aus Leif OS — nicht beides.",
    };
  }

  if (file) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return {
        ok: false,
        error: `Datei zu groß (max. ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB).`,
      };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "application/octet-stream";
    return prepareBufferForSparringAi(buf, mime, file.name || "Anhang");
  }

  if (documentId) {
    const { data: row, error } = await supabase
      .from("documents")
      .select("storage_path, original_filename, mime_type, byte_size")
      .eq("id", documentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !row) return { ok: false, error: "Dokument nicht gefunden." };

    if (row.byte_size > MAX_ATTACHMENT_BYTES) {
      return {
        ok: false,
        error: `Dokument zu groß (max. ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB).`,
      };
    }

    const { data: bin, error: dErr } = await supabase.storage.from("documents").download(row.storage_path);
    if (dErr || !bin) return { ok: false, error: dErr?.message ?? "Download des Dokuments fehlgeschlagen." };

    const buf = Buffer.from(await bin.arrayBuffer());
    const mime = row.mime_type || "application/octet-stream";
    const name = row.original_filename || "Dokument";
    return prepareBufferForSparringAi(buf, mime, name);
  }

  return { ok: true, suffix: "" };
}
