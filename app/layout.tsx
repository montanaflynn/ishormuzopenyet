import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Is the Strait of Hormuz Open Yet?",
  description: "Live status of the Strait of Hormuz",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full m-0 p-0 overflow-hidden">{children}</body>
    </html>
  );
}
