import type { Metadata, Viewport } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

export const metadata: Metadata = {
  title: "F1 Manager — Build Your Racing Empire",
  description: "Manage your own Formula 1 team. Develop your car, sign drivers, set race strategies, and compete for the championship in this browser-based management game.",
  keywords: ["F1", "Formula 1", "manager", "game", "racing", "strategy"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${orbitron.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
