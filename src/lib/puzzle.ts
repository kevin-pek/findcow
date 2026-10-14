// Seeded random number generator for reproducible puzzles
function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Get seed from date string (YYYY-MM-DD format)
function dateToSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export type Direction = {
  dx: number;
  dy: number;
  name: string;
};

export const DIRECTIONS: Direction[] = [
  { dx: 1, dy: 0, name: "right" },
  { dx: -1, dy: 0, name: "left" },
  { dx: 0, dy: 1, name: "down" },
  { dx: 0, dy: -1, name: "up" },
  { dx: 1, dy: 1, name: "down-right" },
  { dx: -1, dy: -1, name: "up-left" },
  { dx: 1, dy: -1, name: "up-right" },
  { dx: -1, dy: 1, name: "down-left" },
];

export type CowPosition = {
  startRow: number;
  startCol: number;
  direction: Direction;
};

export type Puzzle = {
  grid: string[][];
  size: number;
  cowPosition: CowPosition;
  date: string;
  slot: Slot;
  puzzleNumber: number;
  hash: string; // Grid hash for verification
};

// Count all occurrences of COW in the grid
function countCows(grid: string[][]): number {
  const size = grid.length;
  let count = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] !== "C") continue;

      for (const dir of DIRECTIONS) {
        const oRow = row + dir.dy;
        const oCol = col + dir.dx;
        const wRow = row + dir.dy * 2;
        const wCol = col + dir.dx * 2;

        if (
          oRow >= 0 &&
          oRow < size &&
          oCol >= 0 &&
          oCol < size &&
          wRow >= 0 &&
          wRow < size &&
          wCol >= 0 &&
          wCol < size
        ) {
          if (grid[oRow][oCol] === "O" && grid[wRow][wCol] === "W") {
            count++;
          }
        }
      }
    }
  }

  return count;
}

// Check if placing a letter at position would create additional COWs
function wouldCreateExtraCow(
  grid: string[][],
  row: number,
  col: number,
  letter: string,
  existingCow: CowPosition
): boolean {
  const size = grid.length;
  const tempGrid = grid.map((r) => [...r]);
  tempGrid[row][col] = letter;

  // Check all positions around this cell that could form COW
  for (const dir of DIRECTIONS) {
    // Check if this position is C in a COW
    if (letter === "C") {
      const oRow = row + dir.dy;
      const oCol = col + dir.dx;
      const wRow = row + dir.dy * 2;
      const wCol = col + dir.dx * 2;

      if (
        oRow >= 0 &&
        oRow < size &&
        oCol >= 0 &&
        oCol < size &&
        wRow >= 0 &&
        wRow < size &&
        wCol >= 0 &&
        wCol < size
      ) {
        if (tempGrid[oRow][oCol] === "O" && tempGrid[wRow][wCol] === "W") {
          // Check if this is the existing COW
          if (
            !(
              row === existingCow.startRow &&
              col === existingCow.startCol &&
              dir.dx === existingCow.direction.dx &&
              dir.dy === existingCow.direction.dy
            )
          ) {
            return true;
          }
        }
      }
    }

    // Check if this position is O in a COW
    if (letter === "O") {
      const cRow = row - dir.dy;
      const cCol = col - dir.dx;
      const wRow = row + dir.dy;
      const wCol = col + dir.dx;

      if (
        cRow >= 0 &&
        cRow < size &&
        cCol >= 0 &&
        cCol < size &&
        wRow >= 0 &&
        wRow < size &&
        wCol >= 0 &&
        wCol < size
      ) {
        if (tempGrid[cRow][cCol] === "C" && tempGrid[wRow][wCol] === "W") {
          if (
            !(
              cRow === existingCow.startRow &&
              cCol === existingCow.startCol &&
              dir.dx === existingCow.direction.dx &&
              dir.dy === existingCow.direction.dy
            )
          ) {
            return true;
          }
        }
      }
    }

    // Check if this position is W in a COW
    if (letter === "W") {
      const oRow = row - dir.dy;
      const oCol = col - dir.dx;
      const cRow = row - dir.dy * 2;
      const cCol = col - dir.dx * 2;

      if (
        oRow >= 0 &&
        oRow < size &&
        oCol >= 0 &&
        oCol < size &&
        cRow >= 0 &&
        cRow < size &&
        cCol >= 0 &&
        cCol < size
      ) {
        if (tempGrid[oRow][oCol] === "O" && tempGrid[cRow][cCol] === "C") {
          if (
            !(
              cRow === existingCow.startRow &&
              cCol === existingCow.startCol &&
              dir.dx === existingCow.direction.dx &&
              dir.dy === existingCow.direction.dy
            )
          ) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

// Generate a puzzle grid with exactly one COW
function generateGrid(
  random: () => number,
  size: number = 6
): { grid: string[][]; cowPosition: CowPosition } | null {
  const letters = ["C", "O", "W"];
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Initialize empty grid
    const grid: string[][] = Array(size)
      .fill(null)
      .map(() => Array(size).fill(""));

    // First, place a single COW
    const direction = DIRECTIONS[Math.floor(random() * DIRECTIONS.length)];
    const { dx, dy } = direction;

    // Calculate valid starting positions for this direction
    const minRow = dy < 0 ? 2 : 0;
    const maxRow = dy > 0 ? size - 3 : size - 1;
    const minCol = dx < 0 ? 2 : 0;
    const maxCol = dx > 0 ? size - 3 : size - 1;

    if (minRow > maxRow || minCol > maxCol) continue;

    const startRow = minRow + Math.floor(random() * (maxRow - minRow + 1));
    const startCol = minCol + Math.floor(random() * (maxCol - minCol + 1));

    // Place COW
    grid[startRow][startCol] = "C";
    grid[startRow + dy][startCol + dx] = "O";
    grid[startRow + dy * 2][startCol + dx * 2] = "W";

    const cowPosition: CowPosition = { startRow, startCol, direction };

    // Fill remaining cells carefully
    let valid = true;
    for (let row = 0; row < size && valid; row++) {
      for (let col = 0; col < size && valid; col++) {
        if (grid[row][col] !== "") continue;

        // Try random letters, avoiding ones that create extra COWs
        const shuffledLetters = [...letters].sort(() => random() - 0.5);
        let placed = false;

        for (const letter of shuffledLetters) {
          if (!wouldCreateExtraCow(grid, row, col, letter, cowPosition)) {
            grid[row][col] = letter;
            placed = true;
            break;
          }
        }

        if (!placed) {
          valid = false;
        }
      }
    }

    if (valid) {
      // Final verification
      const cowCount = countCows(grid);
      if (cowCount === 1) {
        return { grid, cowPosition };
      }
    }
  }

  return null;
}

// Get the epoch date for puzzle numbering (when the game "launched")
// Use UTC to ensure consistency across all timezones
export const EPOCH_DATE = Date.UTC(2025, 0, 1); // Jan 1, 2025 UTC
export const EPOCH_DATE_STR = "2025-01-01";

// Daily challenge slots: 5 shared puzzles per day, same grid for everyone.
// Slot 1 preserves the legacy seed (dateStr alone) for backward compatibility.
export type Slot = 1 | 2 | 3 | 4 | 5;

export type SlotDef = {
  slot: Slot;
  label: string;
  size: number;
};

export const SLOTS: SlotDef[] = [
  { slot: 1, label: "Classic", size: 6 },
  { slot: 2, label: "Classic+", size: 6 },
  { slot: 3, label: "Tricky", size: 7 },
  { slot: 4, label: "Tricky+", size: 7 },
  { slot: 5, label: "Beast", size: 8 },
];

export function normalizeSlot(slot: number): Slot {
  if (slot >= 1 && slot <= 5) return slot as Slot;
  return 1;
}

export function getSlotDef(slot: Slot): SlotDef {
  return SLOTS[slot - 1];
}

// Seed key for a date+slot. Slot 1 uses the bare date for back-compat.
export function slotSeedKey(dateStr: string, slot: Slot): string {
  return slot === 1 ? dateStr : `${dateStr}#${slot}`;
}

// Clamp any string to a playable date in [EPOCH, today]. Future dates are
// clamped to today so tomorrow's puzzles can't be leaked via URL.
export function clampDateStr(input: string | null | undefined): string {
  const today = getTodayDateStr();
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return today;
  if (input < EPOCH_DATE_STR) return EPOCH_DATE_STR;
  if (input > today) return today;
  const [y, m, d] = input.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return today;
  }
  return input;
}

export function dateFromPuzzleNumber(n: number): string {
  const safe = Math.max(1, Math.floor(n));
  const ms = EPOCH_DATE + (safe - 1) * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().split("T")[0];
}

// Local-storage keys: per-puzzle save + per-day 5-slot progress index.
export function saveKey(dateStr: string, slot: Slot): string {
  return `findcow-${dateStr}-s${slot}`;
}

export function progressKey(dateStr: string): string {
  return `findcow-progress:${dateStr}`;
}

export function getPuzzleNumber(dateStr: string): number {
  // Parse date string as UTC
  const [year, month, day] = dateStr.split("-").map(Number);
  const dateUTC = Date.UTC(year, month - 1, day);
  const diffTime = dateUTC - EPOCH_DATE;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

// Generate puzzle for a specific date (legacy: slot 1, 6x6)
export function generatePuzzle(dateStr: string, size: number = 6): Puzzle {
  return generatePuzzleForSlot(dateStr, 1, size);
}

// Generate the shared deterministic puzzle for a date+slot.
// Slot 1 with default size reproduces the legacy puzzle exactly.
export function generatePuzzleForSlot(
  dateStr: string,
  slot: Slot,
  size?: number
): Puzzle {
  const resolvedSize = size ?? getSlotDef(slot).size;
  const seed = dateToSeed(slotSeedKey(dateStr, slot));

  // Try multiple times with different sub-seeds if needed
  for (let subSeed = 0; subSeed < 1000; subSeed++) {
    const subRandom = seededRandom(seed + subSeed);
    const result = generateGrid(subRandom, resolvedSize);
    if (result) {
      const hash = getGridHash(result.grid);

      const puzzle: Puzzle = {
        grid: result.grid,
        size: resolvedSize,
        cowPosition: result.cowPosition,
        date: dateStr,
        slot,
        puzzleNumber: getPuzzleNumber(dateStr),
        hash,
      };

      // Runtime validation - ensure exactly one COW exists
      const cowCount = countCows(result.grid);
      if (cowCount !== 1) {
        console.error(
          `Invalid puzzle generated for ${dateStr} slot ${slot}: found ${cowCount} COWs`
        );
        continue; // Try next sub-seed
      }

      return puzzle;
    }
  }

  throw new Error(`Could not generate valid puzzle for date: ${dateStr} slot: ${slot}`);
}

// Get today's date string in YYYY-MM-DD format (local timezone)
export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Verify a puzzle is valid (has exactly one COW and hash matches)
export function verifyPuzzle(puzzle: Puzzle): boolean {
  const cowCount = countCows(puzzle.grid) === 1;
  const hashMatches = getGridHash(puzzle.grid) === puzzle.hash;
  return cowCount && hashMatches;
}

// Validate a puzzle matches expected generation for its date+slot
// This ensures a saved puzzle hasn't been tampered with.
// Back-compat: saves without a slot field are treated as slot 1.
export function validatePuzzleForDate(puzzle: Puzzle): boolean {
  return validatePuzzleForSlot(puzzle);
}

export function validatePuzzleForSlot(puzzle: Puzzle): boolean {
  const slot = normalizeSlot((puzzle as Partial<Puzzle>).slot ?? 1);
  const expectedPuzzle = generatePuzzleForSlot(
    puzzle.date,
    slot,
    puzzle.size
  );

  // Check if the hash matches what we'd generate
  return puzzle.hash === expectedPuzzle.hash;
}

// Get grid hash for uniqueness checking
export function getGridHash(grid: string[][]): string {
  return grid.map((row) => row.join("")).join("");
}

// Display label: "#412" for slot 1 (legacy), "#412-3" otherwise.
export function puzzleLabel(puzzle: Pick<Puzzle, "puzzleNumber" | "slot">): string {
  const slot = normalizeSlot(puzzle.slot ?? 1);
  return slot === 1 ? `#${puzzle.puzzleNumber}` : `#${puzzle.puzzleNumber}-${slot}`;
}

// Next puzzle in the catch-up chain: s1..s4 -> same date next slot,
// s5 -> slot 1 of the next day (clamped to today by callers).
export function nextDateSlot(
  dateStr: string,
  slot: Slot
): { dateStr: string; slot: Slot } {
  if (slot < 5) return { dateStr, slot: (slot + 1) as Slot };
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return {
    dateStr: next.toISOString().split("T")[0],
    slot: 1,
  };
}

// Generate multiple puzzles and verify uniqueness
export function verifyUniqueness(
  startDate: string,
  numDays: number,
  slots: Slot[] = [1]
): { unique: boolean; duplicates: string[][] } {
  const hashes = new Map<string, string>();
  const duplicates: string[][] = [];

  const start = new Date(startDate);
  for (let i = 0; i < numDays; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    for (const slot of slots) {
      const puzzle = generatePuzzleForSlot(dateStr, slot);
      const hash = `${puzzle.size}:${getGridHash(puzzle.grid)}`;
      const key = `${dateStr}-s${slot}`;

      if (hashes.has(hash)) {
        duplicates.push([hashes.get(hash)!, key]);
      } else {
        hashes.set(hash, key);
      }
    }
  }

  return { unique: duplicates.length === 0, duplicates };
}
