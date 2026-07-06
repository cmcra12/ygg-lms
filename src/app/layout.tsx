import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YGG Loan Management",
  description: "Yellowgate Group internal loan management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
