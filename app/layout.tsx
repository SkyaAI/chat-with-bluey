import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaSetup from "@/app/ui/pwa-setup";

export const metadata: Metadata = {
  title: "Chat with Bluey",
  description: "A friendly daily companion for cooking, reminders, and games",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#175cd3" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><PwaSetup />{children}</body>
    </html>
  );
}
