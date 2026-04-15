import { cn } from "@/lib/cn";

/** Fester Dateiname — bei Austausch des Motivs Datei ersetzen oder Namen ändern (Cache-Bust). */
const LOGO_SRC = "/brand/leif-os-mark-hexagram.png";

type Props = {
  className?: string;
  /** Neben sichtbarem „Leif OS“-Text: nur dekorativ. */
  decorative?: boolean;
  /** Pixelgröße (Breite = Höhe). */
  size?: number;
};

/**
 * Markenlogo aus `public/brand/`.
 * Bewusst natives `<img>`: `next/image` in Flex-Kopfzeilen kollabiert in manchen Layouts zu 0×0.
 */
export function LeifOsLogo({ className, decorative, size = 64 }: Props) {
  return (
    <img
      src={LOGO_SRC}
      alt={decorative ? "" : "Leif OS"}
      width={size}
      height={size}
      decoding="async"
      fetchPriority="high"
      className={cn("block shrink-0 object-contain", className)}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-hidden={decorative ? true : undefined}
    />
  );
}
