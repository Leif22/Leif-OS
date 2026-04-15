const TG_API = "https://api.telegram.org";

export async function telegramGetFilePath(fileId: string): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN fehlt." };

  const url = `${TG_API}/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`;
  const res = await fetch(url);
  const json = (await res.json()) as { ok?: boolean; description?: string; result?: { file_path?: string } };
  if (!json.ok || !json.result?.file_path) {
    return { ok: false, error: json.description ?? "getFile fehlgeschlagen." };
  }
  return { ok: true, path: json.result.file_path };
}

export async function telegramDownloadFile(fileId: string): Promise<
  { ok: true; buffer: Buffer; suggestedName: string } | { ok: false; error: string }
> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN fehlt." };

  const got = await telegramGetFilePath(fileId);
  if (!got.ok) return got;

  const fileUrl = `${TG_API}/file/bot${token}/${got.path}`;
  const bin = await fetch(fileUrl);
  if (!bin.ok) return { ok: false, error: `Download fehlgeschlagen (${bin.status}).` };
  const ab = await bin.arrayBuffer();
  const base = got.path.split("/").pop() ?? "telegram-file";
  return { ok: true, buffer: Buffer.from(ab), suggestedName: base };
}
