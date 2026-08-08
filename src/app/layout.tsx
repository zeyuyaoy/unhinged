import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maximum Extra",
  description: "An interactive narrative chaos engine for harmless creative roleplay.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
