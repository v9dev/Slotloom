import { existsSync, readFileSync, writeFileSync } from "node:fs";

const target = ".dev.vars";
const example = ".dev.vars.example";
const current = existsSync(target) ? readFileSync(target, "utf8") : "";
const existingKeys = new Set(
  current
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
    .filter(Boolean),
);
const missing = readFileSync(example, "utf8")
  .split(/\r?\n/)
  .filter((line) => {
    const key = line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1];
    return !key || !existingKeys.has(key);
  });
const output = [current.trimEnd(), ...missing].filter(Boolean).join("\n") + "\n";
writeFileSync(target, output, { mode: 0o600 });
console.log(`Prepared ${target}. Existing values were preserved.`);
