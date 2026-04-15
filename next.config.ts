import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Weniger aggressives Caching für `next/image` (lokal schneller sichtbar nach Asset-Tausch). */
  images: {
    minimumCacheTTL: 0,
  },
  /** pdf-parse nutzt Node-APIs; nicht ins Client-Bundle packen. */
  serverExternalPackages: ["pdf-parse"],
  /**
   * Dokument-Uploads per Server Action (FormData). Muss ≥ größte erlaubte Datei in
   * `createDocumentUpload` sein. Gesamtstorage = Supabase-Plan, nicht diese Zahl.
   */
  experimental: {
    serverActions: {
      bodySizeLimit: "256mb",
    },
  },
};

export default nextConfig;
