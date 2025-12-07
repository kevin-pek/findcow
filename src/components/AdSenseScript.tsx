"use client";

import { useEffect } from "react";

const ADSENSE_ID = "ca-pub-4636465145072045";

export default function AdSenseScript() {
  useEffect(() => {
    // Only load AdSense on non-localhost
    if (window.location.hostname === "localhost") {
      return;
    }

    // Check if script already exists
    if (document.querySelector(`script[src*="adsbygoogle"]`)) {
      return;
    }

    const script = document.createElement("script");
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`;
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, []);

  return null;
}
