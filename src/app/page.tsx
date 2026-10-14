"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import WordSearchGame from "@/components/WordSearchGame";
import { clampDateStr, normalizeSlot, type Slot } from "@/lib/puzzle";

// NOTE: the effective date/slot are resolved on the client on purpose.
// The server runs on UTC while players live in local timezones — resolving
// here guarantees "today" always means the player's local day, including the
// hours around midnight when server and client dates disagree.
function HomeInner() {
  const params = useSearchParams();
  const dateStr = clampDateStr(params.get("d"));
  const slot = normalizeSlot(Number(params.get("c") ?? 1)) as Slot;

  return <WordSearchGame key={`${dateStr}-s${slot}`} dateStr={dateStr} slot={slot} />;
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-pulse text-2xl">Loading...</div>
          </div>
        }
      >
        <HomeInner />
      </Suspense>
    </main>
  );
}
