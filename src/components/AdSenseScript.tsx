"use client";

import Script from "next/script";
import { useState, useEffect } from "react";

const ADSENSE_ID = "ca-pub-4636465145072045";

export default function AdSenseScript() {
  const [isLocalhost, setIsLocalhost] = useState(true); // Default to true to prevent loading during SSR

  useEffect(() => {
    setIsLocalhost(window.location.hostname === "localhost");
  }, []);

  // Don't load on localhost
  if (isLocalhost) {
    return null;
  }

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
