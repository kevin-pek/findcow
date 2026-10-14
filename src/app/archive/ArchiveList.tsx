"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  SLOTS,
  dateFromPuzzleNumber,
  getPuzzleNumber,
  getTodayDateStr,
  progressKey,
  type Slot,
} from "@/lib/puzzle";

const PAGE_SIZE = 60;

type DayProgress = {
  done: number;
  nextSlot: Slot;
  completed: boolean[];
};

function readDayProgress(dateStr: string): DayProgress {
  const empty = { done: 0, nextSlot: 1 as Slot, completed: [false, false, false, false, false] };
  try {
    const raw = localStorage.getItem(progressKey(dateStr));
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Record<string, number>;
    const completed = [1, 2, 3, 4, 5].map((s) => parsed[String(s)] != null);
    const done = completed.filter(Boolean).length;
    let nextSlot: Slot = 1;
    for (let s = 1; s <= 5; s++) {
      if (parsed[String(s)] == null) {
        nextSlot = s as Slot;
        break;
      }
    }
    return { done, nextSlot, completed };
  } catch {
    return empty;
  }
}

export default function ArchiveList() {
  const latest = useMemo(() => getPuzzleNumber(getTodayDateStr()), []);
  const [progress] = useState<Record<number, DayProgress>>(() => {
    // localStorage is available: this is a client component, and the
    // initializer runs once on the client during first render.
    const map: Record<number, DayProgress> = {};
    for (let n = 1; n <= latest; n++) {
      map[n] = readDayProgress(dateFromPuzzleNumber(n));
    }
    return map;
  });
  const loaded = true;
  const [page, setPage] = useState(0);
  const [ascending, setAscending] = useState(true);

  const continueAt = useMemo(() => {
    for (let n = 1; n <= latest; n++) {
      if ((progress[n]?.done ?? 0) < 5) return n;
    }
    return null;
  }, [progress, latest]);
  const totalPages = Math.ceil(latest / PAGE_SIZE);
  const numbers = useMemo(() => {
    const all = Array.from({ length: latest }, (_, i) => i + 1);
    if (!ascending) all.reverse();
    return all.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  }, [latest, ascending, page]);

  const doneCount = useMemo(
    () => Object.values(progress).filter((p) => p.done === 5).length,
    [progress]
  );

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Previous Puzzles</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {loaded ? (
            <>
              {doneCount}/{latest} days cleared 5/5 —{" "}
              {ascending ? "oldest to newest" : "newest to oldest"}, same puzzles for
              everyone
            </>
          ) : (
            <>Loading your progress…</>
          )}
        </p>
      </div>

      {continueAt != null && loaded && (
        <Link
          href={`/?d=${dateFromPuzzleNumber(continueAt)}&c=${progress[continueAt]?.nextSlot ?? 1}`}
          className="block w-full py-4 px-6 bg-amber-500 hover:bg-amber-600 text-white text-lg font-bold rounded-lg transition-colors mb-6 text-center"
        >
          Resume at #{continueAt} →
        </Link>
      )}
      {continueAt == null && loaded && (
        <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg p-4 mb-6 text-center font-semibold">
          🎉 Fully caught up! New puzzles drop at midnight.
        </div>
      )}

      <div className="grid grid-cols-2 mb-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700" role="group" aria-label="Sort order">
        <button
          onClick={() => {
            setAscending(true);
            setPage(0);
          }}
          aria-pressed={ascending}
          className={`px-4 py-2 font-semibold text-sm transition-colors ${
            ascending
              ? "bg-gray-700 text-white dark:bg-gray-200 dark:text-gray-900"
              : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          ↑ Oldest first
        </button>
        <button
          onClick={() => {
            setAscending(false);
            setPage(0);
          }}
          aria-pressed={!ascending}
          className={`px-4 py-2 font-semibold text-sm transition-colors ${
            !ascending
              ? "bg-gray-700 text-white dark:bg-gray-200 dark:text-gray-900"
              : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          ↓ Newest first
        </button>
      </div>

      <ul className="grid grid-cols-3 gap-2">
        {numbers.map((n) => {
          const dateStr = dateFromPuzzleNumber(n);
          const p = progress[n] ?? {
            done: 0,
            nextSlot: 1 as Slot,
            completed: [false, false, false, false, false],
          };
          return (
            <li key={n}>
              <Link
                href={`/?d=${dateStr}&c=${p.nextSlot}`}
                className={`block rounded-lg px-2 py-2 transition-colors ${
                  p.done === 5
                    ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                    : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">#{n}</span>
                  {p.done === 5 && (
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                      ✓
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{dateStr}</div>
                <div className="flex gap-1 mt-1.5" aria-label={`${p.done} of 5 complete`}>
                  {SLOTS.map((s, i) => (
                    <span
                      key={s.slot}
                      className={`w-2.5 h-2.5 rounded-full ${
                        loaded && p.completed[i]
                          ? "bg-green-500"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                  ))}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between mt-6">
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 font-semibold disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="text-sm text-gray-500">
          Page {page + 1}/{totalPages}
        </span>
        <button
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 font-semibold disabled:opacity-40"
        >
          Next →
        </button>
      </div>

      <div className="text-center mt-6">
        <Link href="/" className="underline text-sm text-gray-500">
          ← Back to today&apos;s puzzles
        </Link>
      </div>
    </div>
  );
}
