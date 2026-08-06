import { describe, expect, it } from "vitest";
import { resolveAppRoute } from "./routes";

describe("resolveAppRoute", () => {
  it.each(["/", "/login", "/login/"])("resolves %s as home", (path) => {
    expect(resolveAppRoute(path)).toEqual({ kind: "home" });
  });

  it.each([
    "/admin",
    "/admin/",
    "/admin/links",
    "/admin/requests",
    "/admin/activity",
    "/admin/emails",
    "/admin/integrations",
    "/admin/team",
    "/admin/settings",
  ])("resolves %s as an admin route", (path) => {
    expect(resolveAppRoute(path)).toEqual({ kind: "admin" });
  });

  it("decodes booking and management path segments", () => {
    expect(resolveAppRoute("/book/design%20review/")).toEqual({
      kind: "booking",
      slug: "design review",
    });
    expect(resolveAppRoute("/manage/token%2D123")).toEqual({
      kind: "manage",
      token: "token-123",
    });
  });

  it.each([
    "/missing",
    "/admin/unknown",
    "/admin/integrations/setup",
    "/book",
    "/book/one/more",
    "/book/%E0%A4%A",
    "/manage",
    "/manage/one/more",
  ])("resolves %s as not found", (path) => {
    expect(resolveAppRoute(path)).toEqual({ kind: "not-found" });
  });
});
