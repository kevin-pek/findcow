"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Puzzle,
  Slot,
  SLOTS,
  generatePuzzleForSlot,
  getTodayDateStr,
  nextDateSlot,
  normalizeSlot,
  progressKey,
  puzzleLabel,
  saveKey,
  validatePuzzleForSlot,
} from "@/lib/puzzle";
import AdUnit from "./AdUnit";

type CellPosition = {
  row: number;
  col: number;
};

type GameState = "idle" | "playing" | "paused" | "won";

type WordSearchGameProps = {
  dateStr: string;
  slot: Slot;
};

function markProgress(dateStr: string, slot: Slot, elapsedSec: number) {
  try {
    const raw = localStorage.getItem(progressKey(dateStr));
    const progress = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const prev = progress[String(slot)];
    if (prev == null || elapsedSec < prev) {
      progress[String(slot)] = elapsedSec;
      localStorage.setItem(progressKey(dateStr), JSON.stringify(progress));
    }
  } catch {
    // localStorage unavailable — progress is best-effort
  }
}

// Short confetti celebration on a fresh win. Skipped for users who prefer
// reduced motion. Fired from the win handler only — never on reloads.
function celebrate() {
  try {
    if (
      typeof window === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const base = { zIndex: 9999, disableForReducedMotion: true };
    confetti({ ...base, particleCount: 90, spread: 75, origin: { y: 0.65 } });
    window.setTimeout(() => {
      confetti({ ...base, particleCount: 45, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
    }, 150);
    window.setTimeout(() => {
      confetti({ ...base, particleCount: 45, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
    }, 300);
  } catch {
    // confetti is decorative — never break the win path
  }
}

export default function WordSearchGame({ dateStr, slot }: WordSearchGameProps) {
  const safeSlot = normalizeSlot(slot);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragEndCell, setDragEndCell] = useState<CellPosition | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [foundCow, setFoundCow] = useState<CellPosition[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  // Suspended-at timestamp: set when the game is paused, used to credit the
  // paused duration back into startTime on resume. Persisted in the save so a
  // reload while paused stays consistent.
  const [pausedAt, setPausedAt] = useState<number | null>(null);

  const pauseGame = useCallback(() => {
    if (pausedAt == null) {
      setPausedAt(Date.now());
      setGameState("paused");
    }
  }, [pausedAt]);

  const handleResume = useCallback(() => {
    if (pausedAt != null) {
      const now = Date.now();
      setStartTime((t) => (t == null ? t : t + (now - pausedAt)));
    }
    setPausedAt(null);
    // Clear any half-finished drag from before the pause
    setSelectedCells([]);
    setIsSelecting(false);
    setDragEndCell(null);
    setGameState("playing");
  }, [pausedAt]);

  useEffect(() => {
    const key = saveKey(dateStr, safeSlot);
    const savedState = localStorage.getItem(key);

    const freshPuzzle = () => {
      const newPuzzle = generatePuzzleForSlot(dateStr, safeSlot);
      setPausedAt(null);
      setPuzzle(newPuzzle);
      setGameState("idle");
      setFoundCow([]);
      setStartTime(null);
      setEndTime(null);
      setElapsedTime(0);
      setSelectedCells([]);
    };

    // One-time migration: legacy `findcow-${date}` (slot-1 era) -> new slot-1 key
    if (safeSlot === 1) {
      const legacy = localStorage.getItem(`findcow-${dateStr}`);
      if (legacy && !savedState) {
        try {
          const state = JSON.parse(legacy);
          if (state.puzzle && validatePuzzleForSlot({ ...state.puzzle, slot: 1 })) {
            localStorage.setItem(key, legacy);
          }
        } catch {
          // fall through to fresh puzzle
        }
        localStorage.removeItem(`findcow-${dateStr}`);
      }
    }

    const current = localStorage.getItem(key);
    if (current || savedState) {
      try {
        const state = JSON.parse((current ?? savedState) as string);

        // Validate that saved puzzle matches expected puzzle for this date+slot
        // This prevents tampering and ensures consistency across devices
        if (
          state.puzzle &&
          state.puzzle.date === dateStr &&
          validatePuzzleForSlot(state.puzzle)
        ) {
          setPuzzle(state.puzzle);
          setFoundCow(state.foundCow ?? []);
          setStartTime(state.startTime);
          setEndTime(state.endTime);
          if (state.startTime && state.endTime) {
            const secs = Math.floor((state.endTime - state.startTime) / 1000);
            setElapsedTime(secs);
            setGameState(state.gameState);
            // Backfill progress index for wins recorded before it existed
            // (e.g. migrated legacy saves), so the archive shows them done.
            if (state.gameState === "won") {
              markProgress(dateStr, safeSlot, secs);
            }
          } else if (
            state.startTime &&
            (state.gameState === "playing" || state.gameState === "paused")
          ) {
            // Never auto-run a restored game: come back paused and require an
            // explicit press of play to resume the timer.
            const pausedAt =
              typeof state.pausedAt === "number" ? state.pausedAt : Date.now();
            setPausedAt(pausedAt);
            setGameState("paused");
            setElapsedTime(Math.max(0, Math.floor((pausedAt - state.startTime) / 1000)));
          } else {
            setGameState(state.gameState);
            setElapsedTime(0);
          }
        } else {
          // Invalid saved state - regenerate fresh puzzle
          console.warn("Saved puzzle validation failed, regenerating...");
          localStorage.removeItem(key);
          freshPuzzle();
        }
      } catch {
        localStorage.removeItem(key);
        freshPuzzle();
      }
    } else {
      freshPuzzle();
    }
  }, [dateStr, safeSlot]);

  // Live timer during gameplay
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (gameState === "playing" && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, startTime]);

  // Pause the game when the tab is hidden. The timer stays frozen until the
  // user explicitly presses play again — background time never counts and
  // there is no auto-resume.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && gameState === "playing") {
        pauseGame();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [gameState, pauseGame]);

  useEffect(() => {
    if (puzzle && gameState !== "idle") {
      localStorage.setItem(
        saveKey(dateStr, safeSlot),
        JSON.stringify({
          puzzle,
          gameState,
          foundCow,
          startTime,
          endTime,
          pausedAt,
        })
      );
    }
  }, [puzzle, gameState, foundCow, startTime, endTime, pausedAt, dateStr, safeSlot]);

  const handleStartGame = useCallback(() => {
    setPausedAt(null);
    setGameState("playing");
    setStartTime(Date.now());
    setFoundCow([]);
    setEndTime(null);
    setElapsedTime(0);
  }, []);

  // Get cells in a straight line for visual feedback (max 3 cells)
  const getCellsInLinePath = useCallback(
    (start: CellPosition, end: CellPosition): CellPosition[] | null => {
      const dx = end.col - start.col;
      const dy = end.row - start.row;

      // Same cell - just return start
      if (dx === 0 && dy === 0) return [start];

      const distance = Math.max(Math.abs(dx), Math.abs(dy));

      // Check if it's a valid direction (horizontal, vertical, or diagonal)
      if (Math.abs(dx) !== 0 && Math.abs(dy) !== 0 && Math.abs(dx) !== Math.abs(dy)) {
        return null; // Not a straight line
      }

      const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
      const stepY = dy === 0 ? 0 : dy / Math.abs(dy);

      // Limit to max 3 cells (for COW)
      const maxDistance = Math.min(distance, 2);

      const cells: CellPosition[] = [];
      for (let i = 0; i <= maxDistance; i++) {
        cells.push({
          row: start.row + stepY * i,
          col: start.col + stepX * i,
        });
      }

      return cells;
    },
    []
  );

  const checkSelection = useCallback(
    (cells: CellPosition[]) => {
      if (!puzzle || cells.length !== 3) return false;

      const word = cells.map((c) => puzzle.grid[c.row][c.col]).join("");
      return word === "COW";
    },
    [puzzle]
  );

  const handleCellMouseDown = useCallback(
    (row: number, col: number) => {
      if (gameState !== "playing") return;
      setIsSelecting(true);
      setSelectedCells([{ row, col }]);
      setDragEndCell({ row, col });
    },
    [gameState]
  );

  const handleCellMouseEnter = useCallback(
    (row: number, col: number) => {
      if (!isSelecting || gameState !== "playing" || selectedCells.length === 0) return;

      const start = selectedCells[0];
      const end = { row, col };

      // Always track the current drag position for the line indicator
      setDragEndCell(end);

      // Use getCellsInLinePath for dynamic visual feedback (updates as you drag)
      const pathCells = getCellsInLinePath(start, end);

      if (pathCells) {
        setSelectedCells(pathCells);
      } else {
        // Invalid direction - only keep start cell selected
        setSelectedCells([start]);
      }
    },
    [isSelecting, gameState, selectedCells, getCellsInLinePath]
  );

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || gameState !== "playing") {
      setIsSelecting(false);
      setDragEndCell(null);
      return;
    }

    setIsSelecting(false);
    setDragEndCell(null);

    if (selectedCells.length === 3 && checkSelection(selectedCells)) {
      const now = Date.now();
      setGameState("won");
      setFoundCow(selectedCells);
      setEndTime(now);
      celebrate();
      if (startTime) {
        const secs = Math.floor((now - startTime) / 1000);
        setElapsedTime(secs);
        markProgress(dateStr, safeSlot, secs);
      }
    } else {
      setSelectedCells([]);
    }
  }, [isSelecting, gameState, selectedCells, checkSelection, startTime, dateStr, safeSlot]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback(
    (row: number, col: number) => {
      if (gameState !== "playing") return;
      setIsSelecting(true);
      setSelectedCells([{ row, col }]);
      setDragEndCell({ row, col });
    },
    [gameState]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isSelecting || gameState !== "playing" || selectedCells.length === 0) return;
      e.preventDefault();

      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
      if (element?.dataset?.row && element?.dataset?.col) {
        const row = parseInt(element.dataset.row);
        const col = parseInt(element.dataset.col);

        // Always track the current drag position for the line indicator
        setDragEndCell({ row, col });

        const start = selectedCells[0];
        // Use getCellsInLinePath for dynamic visual feedback
        const pathCells = getCellsInLinePath(start, { row, col });

        if (pathCells) {
          setSelectedCells(pathCells);
        } else {
          // Invalid direction - only keep start cell selected
          setSelectedCells([start]);
        }
      }
    },
    [isSelecting, gameState, selectedCells, getCellsInLinePath]
  );

  const handleTouchEnd = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  const isCellSelected = useCallback(
    (row: number, col: number) => {
      return selectedCells.some((c) => c.row === row && c.col === col);
    },
    [selectedCells]
  );

  const isStartingCell = useCallback(
    (row: number, col: number) => {
      return isSelecting && selectedCells.length > 0 && selectedCells[0].row === row && selectedCells[0].col === col;
    },
    [isSelecting, selectedCells]
  );

  const isCellFound = useCallback(
    (row: number, col: number) => {
      return foundCow.some((c) => c.row === row && c.col === col);
    },
    [foundCow]
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const shareResult = async () => {
    if (!puzzle) return;

    const text = `Find the COW ${puzzleLabel(puzzle)}\n🐮 Found in ${formatTime(elapsedTime)}\n\nPlay at: cow.kevinpek.com`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        await navigator.clipboard.writeText(text);
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    }
  };

  if (!puzzle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-2xl">Loading...</div>
      </div>
    );
  }

  const isDisabled = gameState === "idle";
  const isPaused = gameState === "paused";
  const today = getTodayDateStr();
  const next = nextDateSlot(dateStr, safeSlot);
  const hasNext = next.dateStr <= today;
  const isLastToday = dateStr === today && safeSlot === 5;

  return (
    <div className="flex flex-col items-center justify-center h-auto p-4 select-none">
      <div className="w-full max-w-md">
        {/* Top Ad - visible on idle/start screen */}
        {gameState === "idle" && (
          <div className="mb-4">
            <AdUnit format="horizontal" className="min-h-[50px]" />
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Find the COW
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Puzzle {puzzleLabel(puzzle)} • {puzzle.date} • {puzzle.size}×{puzzle.size}
          </p>
          <div className="flex justify-center gap-2 mt-3" role="tablist" aria-label="Daily challenges">
            {SLOTS.map((s) => {
              const isCurrent = s.slot === safeSlot;
              // Lock tab switching mid-game: navigating away would abandon the
              // running timer, so tabs are inert until the game is won (or
              // before it starts).
              if (gameState === "playing" && !isCurrent) {
                return (
                  <span
                    key={s.slot}
                    role="tab"
                    aria-selected={false}
                    aria-disabled={true}
                    title="Finish the current game first"
                    className="w-9 h-9 flex items-center justify-center rounded-lg font-bold text-sm bg-gray-100 dark:bg-gray-800 opacity-40 cursor-not-allowed"
                  >
                    {s.slot}
                  </span>
                );
              }
              return (
                <Link
                  key={s.slot}
                  role="tab"
                  aria-selected={isCurrent}
                  href={`/?d=${dateStr}&c=${s.slot}`}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold text-sm transition-colors ${
                    isCurrent
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {s.slot}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Timer - shown during play and after winning */}
        {gameState !== "idle" && (
          <div className="text-center mb-4">
            <div className={`text-4xl font-mono font-bold ${gameState === "won" ? "text-green-600 dark:text-green-400" : ""}`}>
              {formatTime(elapsedTime)}
            </div>          </div>
        )}

        {/* Instructions - hidden after winning to keep the win screen tight */}
        {gameState !== "won" && (
        <div className="text-center mb-4 text-sm text-gray-600 dark:text-gray-400">
          {gameState === "idle" ? (
            <div className="space-y-3 text-left bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="font-semibold text-center text-base">How to Play</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span>1.</span>
                  <span>Find the word <strong>COW</strong> hidden in the grid</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>2.</span>
                  <span>Click and drag across 3 letters to select</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>3.</span>
                  <span>COW can be horizontal, vertical, or diagonal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>4.</span>
                  <span>Complete it as fast as you can!</span>
                </li>
              </ul>

              {/* Valid directions diagram */}
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-2">Valid drag directions (straight lines only)</p>
                <div className="flex justify-center">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="text-amber-500">
                    {/* Center dot */}
                    <circle cx="60" cy="60" r="8" fill="currentColor" />

                    {/* Horizontal arrows */}
                    <line x1="20" y1="60" x2="40" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <polygon points="15,60 25,55 25,65" fill="currentColor" />
                    <line x1="80" y1="60" x2="100" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <polygon points="105,60 95,55 95,65" fill="currentColor" />

                    {/* Vertical arrows */}
                    <line x1="60" y1="20" x2="60" y2="40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <polygon points="60,15 55,25 65,25" fill="currentColor" />
                    <line x1="60" y1="80" x2="60" y2="100" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <polygon points="60,105 55,95 65,95" fill="currentColor" />

                    {/* Diagonal arrows */}
                    <line x1="25" y1="25" x2="40" y2="40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <polygon points="18,18 28,20 20,28" fill="currentColor" />
                    <line x1="80" y1="80" x2="95" y2="95" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <polygon points="102,102 92,100 100,92" fill="currentColor" />

                    <line x1="95" y1="25" x2="80" y2="40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <polygon points="102,18 100,28 92,20" fill="currentColor" />
                    <line x1="25" y1="95" x2="40" y2="80" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <polygon points="18,102 20,92 28,100" fill="currentColor" />
                  </svg>
                </div>
              </div>
            </div>
          ) : gameState === "playing" ? (
            <p>Drag to find the one hidden COW in the grid</p>
          ) : gameState === "paused" ? (
            <p className="invisible">Paused</p>
          ) : null}
        </div>
        )}

        {/* Grid */}
        <div className="relative mx-auto mb-6" style={{ maxWidth: "min(100%, 400px)" }}>
          <div
            ref={gridRef}
            className={`grid gap-1 md:gap-2 touch-none ${isDisabled || isPaused ? "opacity-50" : ""}`}
            style={{
              gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
            }}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => isSelecting && handleMouseUp()}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
          {puzzle.grid.map((row, rowIndex) =>
            row.map((letter, colIndex) => {
              const isSelected = isCellSelected(rowIndex, colIndex);
              const isFound = isCellFound(rowIndex, colIndex);
              const isStart = isStartingCell(rowIndex, colIndex);

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  data-row={rowIndex}
                  data-col={colIndex}
                  className={`
                    aspect-square flex items-center justify-center
                    text-xl md:text-3xl font-bold rounded-lg
                    transition-all duration-150
                    ${isDisabled || isPaused ? "cursor-not-allowed" : "cursor-pointer"}
                    ${
                      isFound
                        ? "bg-green-500 text-white scale-105"
                        : isSelected
                        ? "bg-amber-400 text-black scale-105"
                        : isDisabled
                        ? "bg-gray-200 dark:bg-gray-700"
                        : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }
                    ${isStart ? "ring-4 ring-amber-600 ring-offset-2 dark:ring-offset-gray-900 z-10" : ""}
                  `}
                  onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                  onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                  onTouchStart={() => handleTouchStart(rowIndex, colIndex)}
                >
                  {isDisabled || isPaused ? "" : letter}
                </div>
              );
            })
          )}
          </div>

          {/* Selection line overlay */}
          {isSelecting && selectedCells.length > 0 && dragEndCell && gridRef.current &&
           (selectedCells[0].row !== dragEndCell.row || selectedCells[0].col !== dragEndCell.col) && (() => {
            const grid = gridRef.current;
            const gridRect = grid.getBoundingClientRect();
            const gap = window.innerWidth >= 768 ? 8 : 4; // md:gap-2 = 8px, gap-1 = 4px

            // Calculate cell size: totalWidth = n * cellSize + (n-1) * gap
            const cellSize = (gridRect.width - (puzzle.size - 1) * gap) / puzzle.size;

            const startCell = selectedCells[0];

            // Check if this is a valid straight line direction
            const dx = dragEndCell.col - startCell.col;
            const dy = dragEndCell.row - startCell.row;
            const isValidDirection = dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);

            // Limit line to max 3 cells (distance of 2)
            const distance = Math.max(Math.abs(dx), Math.abs(dy));
            const cappedDistance = Math.min(distance, 2);
            const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
            const stepY = dy === 0 ? 0 : dy / Math.abs(dy);
            const cappedEndCol = startCell.col + stepX * cappedDistance;
            const cappedEndRow = startCell.row + stepY * cappedDistance;

            // Calculate center positions: position = col * (cellSize + gap) + cellSize / 2
            const startX = startCell.col * (cellSize + gap) + cellSize / 2;
            const startY = startCell.row * (cellSize + gap) + cellSize / 2;
            const endX = cappedEndCol * (cellSize + gap) + cellSize / 2;
            const endY = cappedEndRow * (cellSize + gap) + cellSize / 2;

            return (
              <svg
                className="absolute inset-0 pointer-events-none z-20"
                width={gridRect.width}
                height={gridRect.height}
              >
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={isValidDirection ? "rgb(217, 119, 6)" : "rgb(239, 68, 68)"}
                  strokeWidth={Math.max(cellSize * 0.15, 6)}
                  strokeLinecap="round"
                  opacity={0.6}
                />
              </svg>
            );
          })()}
        </div>

        {/* Start Button */}
        {gameState === "idle" && (
          <button
            onClick={handleStartGame}
            className="w-full py-4 px-6 bg-amber-500 hover:bg-amber-600 text-white text-xl font-bold rounded-lg transition-colors mb-6"
          >
            Start Game
          </button>
        )}

        {/* Resume Button */}
        {gameState === "paused" && (
          <button
            onClick={handleResume}
            className="w-full py-4 px-6 bg-amber-500 hover:bg-amber-600 text-white text-xl font-bold rounded-lg transition-colors mb-6"
          >
            ▶ Resume
          </button>
        )}

        {/* Share + Next buttons */}
        {gameState === "won" && (
          <div className="space-y-3">
            <button
              onClick={shareResult}
              className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Share Result 🐮
            </button>
            {hasNext ? (
              <Link
                href={`/?d=${next.dateStr}&c=${next.slot}`}
                className="block w-full py-3 px-6 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-lg transition-colors text-center"
              >
                Next Cow →
              </Link>
            ) : isLastToday ? (
              <Link
                href="/archive"
                className="block w-full py-3 px-6 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-lg transition-colors text-center"
              >
                You cleared today 5/5 — play previous puzzles →
              </Link>
            ) : null}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-4 text-xs text-gray-500 dark:text-gray-500 space-y-1">
          <p>5 fresh puzzles every day at midnight</p>
          <p>
            {gameState === "playing" ? (
              <span
                title="Finish the current game first"
                className="underline opacity-40 cursor-not-allowed"
              >
                Play previous puzzles
              </span>
            ) : (
              <Link href="/archive" className="underline hover:text-gray-700 dark:hover:text-gray-300">
                Play previous puzzles
              </Link>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
