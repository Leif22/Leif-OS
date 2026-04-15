import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Leif OS",
  description: "Leif OS – persönliches Betriebssystem für Arbeit und Leben",
  icons: {
    icon: "/brand/leif-os-mark-hexagram.png",
    shortcut: "/brand/leif-os-mark-hexagram.png",
    apple: "/brand/leif-os-mark-hexagram.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
