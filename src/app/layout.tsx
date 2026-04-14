import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:       "Mine Monitor — Fire Risk Index Apparatus",
  description: "Real-time underground mine gas monitoring dashboard with Bluetooth connectivity.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
