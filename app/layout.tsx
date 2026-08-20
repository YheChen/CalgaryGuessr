import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { MapThemeProvider } from "@/components/site/map-theme";
import { AppShell } from "@/components/site/app-shell";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "CalgaryGuessr: How well do you know the Stampede City?",
    template: "%s · CalgaryGuessr",
  },
  description:
    "A street-guessing game for Calgary. Drop into Street View, read the city, and pin your guess across five rounds.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcf9f8" },
    { media: "(prefers-color-scheme: dark)", color: "#141110" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Warm up Google Maps origins before the game page needs them. */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" />
        <link
          rel="dns-prefetch"
          href="https://streetviewpixels-pa.googleapis.com"
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <MapThemeProvider>
            <AppShell>{children}</AppShell>
          </MapThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
