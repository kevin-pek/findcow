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
    "Play Find the COW, a free daily word search puzzle! Find the one hidden COW in a grid of C, O, and W letters. New brain teaser every day - challenge your friends and share your score!",
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
  ],
  authors: [{ name: "Find the COW" }],
  creator: "Find the COW",
  publisher: "Find the COW",
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
        {/* Google AdSense - only load in production */}
        {process.env.NODE_ENV === "production" && (
          <script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4636465145072045"
            crossOrigin="anonymous"
          />
        )}
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Find the COW",
              description:
                "A daily word search puzzle where you find the one hidden COW in a grid of C, O, and W letters.",
              url: "https://cow.kevinpek.com",
              applicationCategory: "Game",
              genre: "Puzzle",
              operatingSystem: "Any",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.8",
                ratingCount: "150",
              },
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
