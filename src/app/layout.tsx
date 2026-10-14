import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Find the COW - Daily Word Search Puzzle Game",
  description:
    "Can you find the hidden COW? Play the viral daily word search puzzle challenging thousands. Five hidden COWs, five grids, new puzzles every midnight. Free to play - share your score!",
  keywords: [
    "word search",
    "puzzle game",
    "daily puzzle",
    "cow game",
    "brain game",
    "free online game",
    "word game",
    "puzzle challenge",
    "daily challenge",
    "wordle alternative",
    "casual game",
    "find the cow game",
    "daily brain teaser",
    "quick puzzle game",
    "word find game",
    "hidden word puzzle",
    "mobile puzzle game",
    "viral puzzle game",
  ],
  authors: [{ name: "Find the COW" }],
  creator: "Find the COW",
  publisher: "Find the COW",
  applicationName: "Find the COW",
  appleWebApp: {
    capable: true,
    title: "Find the COW",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  metadataBase: new URL("https://cow.kevinpek.com"),
  alternates: {
    canonical: "https://cow.kevinpek.com",
  },
  openGraph: {
    title: "Find the COW - Daily Word Search Puzzle",
    description:
      "Can you find the one hidden COW? A free daily puzzle game - new challenge every day! Play now and share your score.",
    type: "website",
    locale: "en_US",
    url: "https://cow.kevinpek.com",
    siteName: "Find the COW",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find the COW - Daily Word Search Puzzle",
    description:
      "Can you find the one hidden COW? A free daily puzzle game - new challenge every day!",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "game",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": ["WebApplication", "Game"],
              name: "Find the COW",
              description:
                "A daily word search puzzle where you find the one hidden COW in a grid of C, O, and W letters. New puzzle every day!",
              url: "https://cow.kevinpek.com",
              applicationCategory: "GameApplication",
              genre: ["Puzzle", "Word Game", "Casual"],
              gamePlatform: ["Web Browser", "iOS Safari", "Android Chrome"],
              operatingSystem: "Any",
              inLanguage: "en",
              isAccessibleForFree: true,
              playMode: "SinglePlayer",
              numberOfPlayers: {
                "@type": "QuantitativeValue",
                minValue: 1,
                maxValue: 1,
              },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
              },
              publisher: {
                "@type": "Organization",
                name: "Find the COW",
                url: "https://cow.kevinpek.com",
              },
              image: "https://cow.kevinpek.com/opengraph-image",
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
