import type { Metadata } from "next";
import ArchiveList from "./ArchiveList";

export const metadata: Metadata = {
  title: "Previous Puzzles - Find the COW",
  description:
    "Catch up on every previous Find the COW puzzle, from #1 to today. Five shared challenges per day — complete them all!",
};

export default function ArchivePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <ArchiveList />
    </main>
  );
}
