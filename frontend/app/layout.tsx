import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuroApply AI",
  description: "Intelligent job application assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh" }}>{children}</body>
    </html>
  );
}
