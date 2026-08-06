const adminSections = new Set([
  "links",
  "requests",
  "activity",
  "emails",
  "integrations",
  "team",
  "settings",
]);

export type AppRoute =
  | { kind: "home" }
  | { kind: "admin" }
  | { kind: "legal"; document: "privacy" | "terms" }
  | { kind: "booking"; slug: string }
  | { kind: "manage"; token: string }
  | { kind: "not-found" };

function normalizedPath(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

function decodedSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function resolveAppRoute(pathname: string): AppRoute {
  const path = normalizedPath(pathname);
  if (path === "/" || path === "/login") return { kind: "home" };
  if (path === "/privacy") return { kind: "legal", document: "privacy" };
  if (path === "/terms") return { kind: "legal", document: "terms" };

  const admin = path.match(/^\/admin(?:\/([^/]+))?$/);
  if (admin && (!admin[1] || adminSections.has(admin[1])))
    return { kind: "admin" };

  const manage = path.match(/^\/manage\/([^/]+)$/);
  if (manage) {
    const token = decodedSegment(manage[1]);
    if (token) return { kind: "manage", token };
  }

  const booking = path.match(/^\/book\/([^/]+)$/);
  if (booking) {
    const slug = decodedSegment(booking[1]);
    if (slug) return { kind: "booking", slug };
  }

  return { kind: "not-found" };
}
