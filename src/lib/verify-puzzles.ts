import {
  generatePuzzleForSlot,
  verifyPuzzle,
  verifyUniqueness,
  SLOTS,
  type Slot,
} from "./puzzle";

// Verify puzzles for 2025 (5 shared slots per day)
const startDate = "2025-01-01";
const numDays = 365;
const slots = SLOTS.map((s) => s.slot);

console.log(
  `Verifying ${numDays * slots.length} puzzles (${numDays} days x ${slots.length} slots) starting from ${startDate}...`
);
console.log("");

// Check uniqueness (size-scoped so different grid sizes never false-collide)
const { unique, duplicates } = verifyUniqueness(startDate, numDays, slots);

if (unique) {
  console.log(`All ${numDays * slots.length} puzzles are unique!`);
} else {
  console.log(`Found ${duplicates.length} duplicate puzzles:`);
  for (const [key1, key2] of duplicates.slice(0, 20)) {
    console.log(`  ${key1} and ${key2} have the same grid`);
  }
}

console.log("");

// Sample some puzzles and verify they have exactly one COW
console.log("Verifying sample puzzles have exactly one COW...");
const sampleDates = [
  "2025-01-01",
  "2025-06-15",
  "2025-12-31",
  "2025-03-14", // Pi day
  "2025-07-04",
];

let allValid = true;
for (const date of sampleDates) {
  for (const slot of slots as Slot[]) {
    const puzzle = generatePuzzleForSlot(date, slot);
    const isValid = verifyPuzzle(puzzle);
    console.log(
      `  ${date} slot ${slot} (${puzzle.size}x${puzzle.size}): ${isValid ? "Valid (1 COW)" : "INVALID!"}`
    );
    if (!isValid) allValid = false;
  }
}

console.log("");
if (allValid) {
  console.log("All sample puzzles are valid!");
} else {
  console.log("WARNING: Some puzzles are invalid!");
}

// Show today's puzzle
console.log("");
console.log("Today's puzzle preview (slot 1):");
const today = new Date().toISOString().split("T")[0];
const todayPuzzle = generatePuzzleForSlot(today, 1);
console.log(`Date: ${todayPuzzle.date}`);
console.log(`Puzzle #${todayPuzzle.puzzleNumber}`);
console.log("");
todayPuzzle.grid.forEach((row) => console.log(row.join(" ")));
console.log("");
console.log(
  `COW is at row ${todayPuzzle.cowPosition.startRow}, col ${todayPuzzle.cowPosition.startCol}, direction: ${todayPuzzle.cowPosition.direction.name}`
);
