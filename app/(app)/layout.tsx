import { AppShell } from "@/components/app-shell";

export default function AppSectionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
