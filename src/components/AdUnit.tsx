"use client";

import { useEffect, useRef } from "react";

type AdUnitProps = {
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  responsive?: boolean;
  className?: string;
};

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

const ADSENSE_ID = "ca-pub-4636465145072045";

export default function AdUnit({
  format = "auto",
  responsive = true,
  className = "",
}: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isAdLoaded = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !isAdLoaded.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isAdLoaded.current = true;
      } catch (err) {
        console.error("AdSense error:", err);
      }
    }
  }, []);

  // Don't render in development
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  return (
    <div className={`ad-container overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_ID}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
