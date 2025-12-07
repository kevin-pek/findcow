import {
  generatePuzzle,
  verifyPuzzle,
  getGridHash,
  verifyUniqueness,
} from "./puzzle";

// Verify puzzles for 2025
const startDate = "2025-01-01";
const numDays = 365;

console.log(`Verifying ${numDays} puzzles starting from ${startDate}...`);
console.log("");

// Check uniqueness
const { unique, duplicates } = verifyUniqueness(startDate, numDays);

if (unique) {
  console.log(`All ${numDays} puzzles are unique!`);
} else {
  console.log(`Found ${duplicates.length} duplicate puzzles:`);
  for (const [date1, date2] of duplicates) {
    console.log(`  ${date1} and ${date2} have the same grid`);
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
  const puzzle = generatePuzzle(date);
  const isValid = verifyPuzzle(puzzle);
  console.log(`  ${date}: ${isValid ? "Valid (1 COW)" : "INVALID!"}`);
  if (!isValid) allValid = false;
}

console.log("");
if (allValid) {
  console.log("All sample puzzles are valid!");
} else {
  console.log("WARNING: Some puzzles are invalid!");
}

// Show today's puzzle
console.log("");
console.log("Today's puzzle preview:");
const today = new Date().toISOString().split("T")[0];
const todayPuzzle = generatePuzzle(today);
console.log(`Date: ${todayPuzzle.date}`);
console.log(`Puzzle #${todayPuzzle.puzzleNumber}`);
console.log("");
todayPuzzle.grid.forEach((row) => console.log(row.join(" ")));
console.log("");
console.log(
  `COW is at row ${todayPuzzle.cowPosition.startRow}, col ${todayPuzzle.cowPosition.startCol}, direction: ${todayPuzzle.cowPosition.direction.name}`
);
