"use client";

import Script from "next/script";

const ADSENSE_ID = "ca-pub-4636465145072045";

export default function AdSenseScript() {
  // Only load in production (on vercel domain)
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return null;
  }

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}
