"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  const [dragEndCell, setDragEndCell] = useState<CellPosition | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
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

  // Get cells in a line only if exactly 3 cells (for COW validation)
  const getCellsInLine = useCallback(
    (start: CellPosition, end: CellPosition): CellPosition[] | null => {
      const dx = end.col - start.col;
      const dy = end.row - start.row;

      // Must be exactly 3 cells for COW
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      if (distance !== 2) return null;

      // Must be horizontal, vertical, or diagonal
      if (Math.abs(dx) !== 0 && Math.abs(dy) !== 0 && Math.abs(dx) !== Math.abs(dy)) {
        return null;
      }

      const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
      const stepY = dy === 0 ? 0 : dy / Math.abs(dy);

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
          ) : (
            <p className="text-green-600 dark:text-green-400 font-semibold">
              🎉 You found the COW!
            </p>
          )}
        </div>

        {/* Grid */}
        <div className="relative mx-auto mb-6" style={{ maxWidth: "min(100%, 400px)" }}>
          <div
            ref={gridRef}
            className={`grid gap-1 md:gap-2 touch-none ${isDisabled ? "opacity-50" : ""}`}
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
                    ${isStart ? "ring-4 ring-amber-600 ring-offset-2 dark:ring-offset-gray-900 z-10" : ""}
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

        {/* Share button */}
        {gameState === "won" && (
          <button
            onClick={shareResult}
            className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            Share Result 🐮
          </button>
        )}

        {/* Footer */}
        <div className="text-center mt-4 text-xs text-gray-500 dark:text-gray-500">
          <p>New puzzle every day at midnight</p>
        </div>
      </div>
    </div>
  );
}
