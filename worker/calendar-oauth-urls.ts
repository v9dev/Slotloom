import type { Env } from "./domain";

type OAuthProvider = "google" | "microsoft";

const cookieName = (provider: OAuthProvider) =>
  `slotloom_oauth_${provider}_state`;

const cookieAttributes = (env: Env, provider: OAuthProvider) =>
  `Path=/api/oauth/${provider}/callback; HttpOnly; SameSite=Lax${new URL(env.APP_URL).protocol === "https:" ? "; Secure" : ""}`;

export function calendarOAuthCallbackUrl(env: Env, provider: OAuthProvider) {
  return new URL(
    `/api/oauth/${provider}/callback`,
    env.APP_URL.replace(/\/$/, "") + "/",
  ).toString();
}

export function calendarOAuthRedirect(
  env: Env,
  provider: OAuthProvider,
  result: "connected" | "error",
  reason?: string,
) {
  const url = new URL(
    "/admin/integrations",
    env.APP_URL.replace(/\/$/, "") + "/",
  );
  url.searchParams.set("oauth", result);
  url.searchParams.set("provider", provider);
  if (reason) url.searchParams.set("reason", reason.slice(0, 80));
  return new Response(null, {
    status: 302,
    headers: {
      location: url.toString(),
      "set-cookie": `${cookieName(provider)}=; ${cookieAttributes(env, provider)}; Max-Age=0`,
    },
  });
}

export function calendarOAuthStartResponse(
  env: Env,
  provider: OAuthProvider,
  state: string,
  authorizationUrl: string,
) {
  return new Response(JSON.stringify({ authorizationUrl }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "set-cookie": `${cookieName(provider)}=${state}; ${cookieAttributes(env, provider)}; Max-Age=600`,
    },
  });
}

export function readCalendarOAuthState(
  request: Request,
  provider: OAuthProvider,
) {
  const name = `${cookieName(provider)}=`;
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(name))
      ?.slice(name.length) || ""
  );
}
