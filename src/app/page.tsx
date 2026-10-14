import WordSearchGame from "@/components/WordSearchGame";
import { clampDateStr, normalizeSlot, type Slot } from "@/lib/puzzle";

type HomeProps = {
  searchParams: Promise<{ d?: string; c?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const dateStr = clampDateStr(params.d);
  const slot = normalizeSlot(Number(params.c ?? 1)) as Slot;

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <WordSearchGame key={`${dateStr}-s${slot}`} dateStr={dateStr} slot={slot} />
    </main>
  );
}
