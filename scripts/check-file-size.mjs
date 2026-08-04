import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const roots = ["src", "worker", "functions", "scripts"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"]);
const hardLimit = 1000;
const reviewThreshold = 500;
const files = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (extensions.has(extname(path))) files.push(path);
  }
}

roots.forEach(walk);
const reports = files
  .map((path) => ({
    path: relative(process.cwd(), path),
    lines: readFileSync(path, "utf8").split("\n").length,
  }))
  .sort((a, b) => b.lines - a.lines);
const violations = reports.filter((file) => file.lines > hardLimit);
const review = reports.filter(
  (file) => file.lines > reviewThreshold && file.lines <= hardLimit,
);

if (review.length)
  console.log(
    `Review large modules:\n${review.map((file) => `  ${file.lines}  ${file.path}`).join("\n")}`,
  );
if (violations.length) {
  console.error(
    `Source files must stay at or below ${hardLimit} lines:\n${violations.map((file) => `  ${file.lines}  ${file.path}`).join("\n")}`,
  );
  process.exit(1);
}

console.log(
  `Structure check passed: ${reports.length} source files, none above ${hardLimit} lines.`,
);
