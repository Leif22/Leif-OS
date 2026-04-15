This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## KI / Sparring (OpenAI)

Optional in `.env.local`:

- `OPENAI_API_KEY` — wenn gesetzt, speichert die App nach jeder Nutzernachricht im KI-Bereich eine Modellantwort (Server-seitig).
- `OPENAI_MODEL_DEFAULT` — Chat / KI-Workspace (Sparring); siehe zentrale Konfiguration in `lib/ai/config.ts`.
- `OPENAI_MODEL_FAST` — für schnelle oder einfache Aufrufe (vorbereitet; gleiche Datei).

Beispiel:

```env
OPENAI_MODEL_DEFAULT=gpt-4o
OPENAI_MODEL_FAST=gpt-4o-mini
```

Ohne Schlüssel bleiben nur deine eigenen Nachrichten gespeichert.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to load and optimize [Inter](https://fonts.google.com/specimen/Inter).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
