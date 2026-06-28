import type { Metadata, Viewport } from "next";
import PWARegister from "@/components/common/PWARegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "F1 Manager — Build Your Racing Empire",
  description: "Manage your own Formula 1 team. Develop your car, sign drivers, set race strategies, and compete for the championship in this browser-based management game.",
  keywords: ["F1", "Formula 1", "manager", "game", "racing", "strategy"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "F1 Manager",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0f",
};

import { cookies } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}

