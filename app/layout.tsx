import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { MapThemeProvider } from "@/components/site/map-theme";
import { AppShell } from "@/components/site/app-shell";
import { getSiteUrl } from "@/lib/site-url";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const siteUrl = getSiteUrl();

const TITLE = "CalgaryGuessr: How well do you know the Stampede City?";
const DESCRIPTION =
  "A street-guessing game for Calgary. Drop into Street View, read the city, and pin your guess across five rounds.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: TITLE,
    template: "%s · CalgaryGuessr",
  },
  description: DESCRIPTION,
  keywords: [
    "Calgary",
    "GeoGuessr",
    "Street View",
    "geography game",
    "map game",
    "Alberta",
    "Stampede City",
  ],
  authors: [{ name: "Yanzhen Chen", url: "https://github.com/YheChen" }],
  creator: "Yanzhen Chen",
  applicationName: "CalgaryGuessr",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: TITLE,
    description: DESCRIPTION,
    siteName: "CalgaryGuessr",
    locale: "en_CA",
    images: [
      {
        url: "/CalgaryGuessrThumbnail.webp",
        // The image's true dimensions. Declaring a 1200x630 it is not would
        // make crawlers crop to the wrong box.
        width: 2120,
        height: 894,
        alt: "The Calgary skyline at dusk",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/CalgaryGuessrThumbnail.webp"],
  },
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
