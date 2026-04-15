"use client";

import { createTelegramLinkToken, unlinkTelegramAccount } from "@/app/(app)/einstellungen/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { PRODUCT_COPY } from "@/lib/product-labels";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type LinkRow = {
  telegram_username: string | null;
  linked_at: string;
} | null;

export function TelegramSection({ link }: { link: LinkRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{
    token: string;
    expiresAt: string;
    deepLink: string | null;
  } | null>(null);

  function onCreateToken() {
    setError(null);
    setTokenInfo(null);
    startTransition(async () => {
      const res = await createTelegramLinkToken();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTokenInfo({ token: res.token, expiresAt: res.expiresAt, deepLink: res.deepLink });
      router.refresh();
    });
  }

  function onUnlink() {
    if (!window.confirm(PRODUCT_COPY.telegramUnlinkConfirm)) return;
    setError(null);
    startTransition(async () => {
      const res = await unlinkTelegramAccount();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTokenInfo(null);
      router.refresh();
    });
  }

  const linkedLabel = link
    ? link.telegram_username
      ? `@${link.telegram_username}`
      : PRODUCT_COPY.telegramLinkedNoUsername
    : null;

  return (
    <section className="rounded-xl border border-leif-border bg-leif-surface p-6 shadow-[var(--leif-shadow)]">
      <h2 className="text-[17px] font-semibold tracking-tight text-leif-text">{PRODUCT_COPY.telegramSectionTitle}</h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-leif-secondary">
        {PRODUCT_COPY.telegramSectionIntro}
      </p>

      {error ? (
        <div className="mt-4">
          <AlertBanner variant="error">{error}</AlertBanner>
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {link ? (
          <div className="rounded-lg border border-leif-border bg-leif-canvas/60 px-4 py-3 text-[13px] text-leif-text">
            <p className="font-medium text-leif-text">{PRODUCT_COPY.telegramStatusLinked}</p>
            <p className="mt-1 text-leif-secondary">
              {linkedLabel}
              <span className="mx-2 text-leif-muted">·</span>
              <span className="tabular-nums text-leif-muted">
                {new Date(link.linked_at).toLocaleString("de-DE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </p>
            <div className="mt-3">
              <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={onUnlink}>
                {PRODUCT_COPY.telegramUnlinkButton}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-leif-secondary">{PRODUCT_COPY.telegramStatusNotLinked}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="primary" size="sm" disabled={pending} onClick={onCreateToken}>
            {PRODUCT_COPY.telegramCreateLinkCode}
          </Button>
        </div>

        {tokenInfo ? (
          <div className="space-y-3 rounded-lg border border-leif-primary/30 bg-leif-primary-soft px-4 py-3 text-[13px] leading-relaxed text-leif-text">
            <p className="font-medium">{PRODUCT_COPY.telegramTokenHint}</p>
            {tokenInfo.deepLink ? (
              <p>
                <a href={tokenInfo.deepLink} className="font-medium text-leif-primary underline-offset-2 hover:underline">
                  {PRODUCT_COPY.telegramOpenDeepLink}
                </a>
              </p>
            ) : (
              <p className="text-leif-secondary">{PRODUCT_COPY.telegramNoBotUsername}</p>
            )}
            <p className="font-mono text-[12px] break-all text-leif-text">{tokenInfo.token}</p>
            <p className="text-leif-muted">
              {PRODUCT_COPY.telegramTokenExpires}{" "}
              {new Date(tokenInfo.expiresAt).toLocaleString("de-DE", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
