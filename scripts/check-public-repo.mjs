import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const historyMode = process.argv.includes("--history");
const ignored = new Set(["pnpm-lock.yaml"]);
const findings = new Map();

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function record(file, category) {
  const categories = findings.get(file) || new Set();
  categories.add(category);
  findings.set(file, categories);
}

function isPlaceholder(value) {
  return /(?:example|replace|your[-_ ]|placeholder|private-key|public-key|local-secret|test-secret)/i.test(
    value,
  );
}

function allowedEmailDomain(domain) {
  return (
    domain === "example.com" ||
    domain === "example.org" ||
    domain === "example.net" ||
    domain === "your-domain.com" ||
    domain.endsWith(".example.com") ||
    domain.endsWith(".invalid") ||
    domain.endsWith(".test") ||
    domain.endsWith(".localhost")
  );
}

function allowedDocumentationHost(host) {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "example.com" ||
    host.endsWith(".example.com") ||
    host === "your-domain.com" ||
    host.endsWith(".your-domain.com") ||
    host === "github.com" ||
    host.endsWith(".github.com") ||
    host === "img.shields.io" ||
    host === "opensource.org" ||
    host === "developers.cloudflare.com" ||
    host.endsWith(".cloudflare.com") ||
    (host.endsWith(".cloudflareaccess.com") && host.startsWith("your-team.")) ||
    (host.endsWith(".workers.dev") && host.startsWith("example-")) ||
    (host.endsWith(".pages.dev") && host.startsWith("example-"))
  );
}

function isZeroIdentifier(value) {
  return value.replaceAll("-", "").split("").every((character) => character === "0");
}

function scan(file, text) {
  if (!text || text.includes("\0")) return;
  const isDocumentation =
    /(?:HANDOFF|README|CONTRIBUTING|SECURITY|wrangler|\.env)/i.test(file);

  if (/wrangler(?:\.[^.]+)?\.jsonc$/i.test(file)) {
    const workerName = text.match(/^\s*"name"\s*:\s*"([^"]+)"/m)?.[1];
    if (workerName && !isPlaceholder(workerName))
      record(file, "live Worker name");
    for (const match of text.matchAll(
      /"(?:database_name|bucket_name)"\s*:\s*"([^"]+)"/g,
    )) {
      if (!isPlaceholder(match[1])) record(file, "live resource name");
    }
  }

  for (const match of text.matchAll(
    /[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi,
  )) {
    if (!allowedEmailDomain(match[1].toLowerCase())) record(file, "real email");
  }

  if (isDocumentation) {
    for (const match of text.matchAll(/https?:\/\/[^\s)`"'<>]+/gi)) {
      try {
        const host = new URL(match[0]).hostname.toLowerCase();
        if (!allowedDocumentationHost(host)) {
          record(file, "non-example documentation URL");
        }
      } catch {
        record(file, "malformed URL");
      }
    }
    for (const match of text.matchAll(
      /\b(?:[a-z0-9-]+\.)+(?:ai|app|cloud|co|com|dev|in|io|me|net|org)\b/gi,
    )) {
      if (!allowedDocumentationHost(match[0].toLowerCase()))
        record(file, "non-example hostname");
    }
  }

  for (const match of text.matchAll(/(?<![a-f0-9])[a-f0-9]{32}(?![a-f0-9])/gi)) {
    if (!isZeroIdentifier(match[0]))
      record(file, "32-character account identifier");
  }
  for (const match of text.matchAll(
    /\b[a-f0-9]{8}-[a-f0-9]{4}-[1-5a-f0-9][a-f0-9]{3}-[89ab0-9a-f][a-f0-9]{3}-[a-f0-9]{12}\b/gi,
  )) {
    if (!isZeroIdentifier(match[0]))
      record(file, "resource or deployment UUID");
  }
  for (const match of text.matchAll(/(?<![a-f0-9])[a-f0-9]{64}(?![a-f0-9])/gi)) {
    if (!isZeroIdentifier(match[0])) record(file, "long hexadecimal identifier");
  }
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))
    record(file, "private key");
  if (/\b0x[A-Za-z0-9_-]{20,}\b/.test(text))
    record(file, "token-like literal");
  if (
    /\b(?:AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[0-9A-Za-z_]{20,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/.test(
      text,
    )
  )
    record(file, "known credential format");

  for (const match of text.matchAll(
    /(?:secret|token|password|api[_-]?key|policy[_-]?aud|client[_-]?secret)["']?\s*[:=]\s*["']([^"'\s]{10,})["']/gi,
  )) {
    if (!isPlaceholder(match[1])) record(file, "credential-like literal");
  }
  if (/(?:\.env|\.vars|HANDOFF|README|wrangler)/i.test(file)) {
    for (const match of text.matchAll(
      /^[ \t]*(?:secret|token|password|api[_-]?key|policy[_-]?aud|client[_-]?secret)[ \t]*=[ \t]*([^\s#]{10,})/gim,
    )) {
      if (!isPlaceholder(match[1])) record(file, "credential-like literal");
    }
  }
}

function currentFiles() {
  return git(["ls-files", "-z"])
    .split("\0")
    .filter(Boolean)
    .filter((file) => !ignored.has(file));
}

if (historyMode) {
  const revisions = git(["rev-list", "--all"]).trim().split("\n").filter(Boolean);
  for (const revision of revisions) {
    const files = git(["ls-tree", "-r", "--name-only", "-z", revision])
      .split("\0")
      .filter(Boolean)
      .filter((file) => !ignored.has(file));
    for (const file of files) {
      try {
        scan(file, git(["show", `${revision}:${file}`]));
      } catch {
        // Ignore binary or unreadable historical blobs.
      }
    }
  }
} else {
  for (const file of currentFiles()) {
    try {
      scan(file, readFileSync(file, "utf8"));
    } catch {
      // Ignore binary files.
    }
  }
}

if (findings.size) {
  console.error(
    `${historyMode ? "Git history" : "Public repository"} safety check failed:`,
  );
  for (const [file, categories] of [...findings].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    console.error(`  ${file}: ${[...categories].sort().join(", ")}`);
  }
  process.exit(1);
}

console.log(
  `${historyMode ? "Git history" : "Public repository"} safety check passed.`,
);
