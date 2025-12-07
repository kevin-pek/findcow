"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Puzzle,
  generatePuzzle,
  getTodayDateStr,
  validatePuzzleForDate,
} from "@/lib/puzzle";
import AdUnit from "./AdUnit";

type CellPosition = {
  row: number;
  col: number;
};

type GameState = "idle" | "playing" | "won";

export default function WordSearchGame() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [foundCow, setFoundCow] = useState<CellPosition[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const dateStr = getTodayDateStr();
    const savedState = localStorage.getItem(`findcow-${dateStr}`);

    if (savedState) {
      const state = JSON.parse(savedState);

      // Validate that saved puzzle matches expected puzzle for this date
      // This prevents tampering and ensures consistency across devices
      if (state.puzzle && validatePuzzleForDate(state.puzzle)) {
        setPuzzle(state.puzzle);
        setGameState(state.gameState);
        setFoundCow(state.foundCow);
        setStartTime(state.startTime);
        setEndTime(state.endTime);
        if (state.startTime && state.endTime) {
          setElapsedTime(Math.floor((state.endTime - state.startTime) / 1000));
        }
      } else {
        // Invalid saved state - regenerate fresh puzzle
        console.warn("Saved puzzle validation failed, regenerating...");
        localStorage.removeItem(`findcow-${dateStr}`);
        const newPuzzle = generatePuzzle(dateStr);
        setPuzzle(newPuzzle);
      }
    } else {
      const newPuzzle = generatePuzzle(dateStr);
      setPuzzle(newPuzzle);
    }
  }, []);

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

  useEffect(() => {
    if (puzzle && gameState !== "idle") {
      const dateStr = getTodayDateStr();
      localStorage.setItem(
        `findcow-${dateStr}`,
        JSON.stringify({
          puzzle,
          gameState,
          foundCow,
          startTime,
          endTime,
        })
      );
    }
  }, [puzzle, gameState, foundCow, startTime, endTime]);

  const handleStartGame = useCallback(() => {
    setGameState("playing");
    setStartTime(Date.now());
    setFoundCow([]);
    setEndTime(null);
    setElapsedTime(0);
  }, []);

  const getCellsInLine = useCallback(
    (start: CellPosition, end: CellPosition): CellPosition[] | null => {
      const dx = end.col - start.col;
      const dy = end.row - start.row;

      // Must be exactly 3 cells for COW
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      if (distance !== 2) return null;

      // Check if it's a valid direction
      const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
      const stepY = dy === 0 ? 0 : dy / Math.abs(dy);

      // Must be horizontal, vertical, or diagonal
      if (Math.abs(dx) !== 0 && Math.abs(dy) !== 0 && Math.abs(dx) !== Math.abs(dy)) {
        return null;
      }

      const cells: CellPosition[] = [];
      for (let i = 0; i <= distance; i++) {
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
    },
    [gameState]
  );

  const handleCellMouseEnter = useCallback(
    (row: number, col: number) => {
      if (!isSelecting || gameState !== "playing" || selectedCells.length === 0) return;

      const start = selectedCells[0];
      const end = { row, col };
      const cells = getCellsInLine(start, end);

      if (cells) {
        setSelectedCells(cells);
      }
    },
    [isSelecting, gameState, selectedCells, getCellsInLine]
  );

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || gameState !== "playing") {
      setIsSelecting(false);
      return;
    }

    setIsSelecting(false);

    if (selectedCells.length === 3 && checkSelection(selectedCells)) {
      const now = Date.now();
      setGameState("won");
      setFoundCow(selectedCells);
      setEndTime(now);
      if (startTime) {
        setElapsedTime(Math.floor((now - startTime) / 1000));
      }
    } else {
      setSelectedCells([]);
    }
  }, [isSelecting, gameState, selectedCells, checkSelection, startTime]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback(
    (row: number, col: number) => {
      if (gameState !== "playing") return;
      setIsSelecting(true);
      setSelectedCells([{ row, col }]);
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

        const start = selectedCells[0];
        const cells = getCellsInLine(start, { row, col });

        if (cells) {
          setSelectedCells(cells);
        }
      }
    },
    [isSelecting, gameState, selectedCells, getCellsInLine]
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

    const text = `Find the COW #${puzzle.puzzleNumber}\n🐮 Found in ${formatTime(elapsedTime)}\n\nPlay at: cow.kevinpek.com`;

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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 select-none">
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
            Puzzle #{puzzle.puzzleNumber} • {puzzle.date}
          </p>
        </div>

        {/* Timer - shown during play and after winning */}
        {gameState !== "idle" && (
          <div className="text-center mb-4">
            <div className={`text-4xl font-mono font-bold ${gameState === "won" ? "text-green-600 dark:text-green-400" : ""}`}>
              {formatTime(elapsedTime)}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center mb-4 text-sm text-gray-600 dark:text-gray-400">
          {gameState === "idle" ? (
            <p>Press Start to begin the challenge</p>
          ) : gameState === "playing" ? (
            <p>Drag to find the one hidden COW in the grid</p>
          ) : (
            <p className="text-green-600 dark:text-green-400 font-semibold">
              🎉 You found the COW!
            </p>
          )}
        </div>

        {/* Grid */}
        <div
          className={`grid gap-1 md:gap-2 mx-auto mb-6 touch-none ${isDisabled ? "opacity-50" : ""}`}
          style={{
            gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
            maxWidth: "min(100%, 400px)",
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

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  data-row={rowIndex}
                  data-col={colIndex}
                  className={`
                    aspect-square flex items-center justify-center
                    text-xl md:text-3xl font-bold rounded-lg
                    transition-all duration-150
                    ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
                    ${
                      isFound
                        ? "bg-green-500 text-white scale-105"
                        : isSelected
                        ? "bg-amber-400 text-black scale-105"
                        : isDisabled
                        ? "bg-gray-200 dark:bg-gray-700"
                        : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }
                  `}
                  onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                  onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                  onTouchStart={() => handleTouchStart(rowIndex, colIndex)}
                >
                  {isDisabled ? "" : letter}
                </div>
              );
            })
          )}
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

        {/* Share button */}
        {gameState === "won" && (
          <button
            onClick={shareResult}
            className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            Share Result 🐮
          </button>
        )}

        {/* Ad after winning */}
        {gameState === "won" && (
          <div className="mt-6">
            <AdUnit format="rectangle" />
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-500 dark:text-gray-500">
          <p>New puzzle every day at midnight</p>
        </div>
      </div>
    </div>
  );
}
