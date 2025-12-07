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

export default function AdUnit({
  format = "auto",
  responsive = true,
  className = "",
}: AdUnitProps) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;
  const adRef = useRef<HTMLModElement>(null);
  const isAdLoaded = useRef(false);

  useEffect(() => {
    if (adsenseId && typeof window !== "undefined" && !isAdLoaded.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isAdLoaded.current = true;
      } catch (err) {
        console.error("AdSense error:", err);
      }
    }
  }, [adsenseId]);

  // Don't render anything if no AdSense ID configured
  if (!adsenseId) {
    return null;
  }

  return (
    <div className={`ad-container overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adsenseId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
