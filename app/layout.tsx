import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "NikoHealth Operations Dashboard",
  description: "Live order counts by status.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
