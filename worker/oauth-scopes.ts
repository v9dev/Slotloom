export type OAuthProvider = "google" | "microsoft";

const calendarScopes: Record<OAuthProvider, string[]> = {
  google: [
    "openid",
    "email",
    "https://www.googleapis.com/auth/calendar.events.owned",
  ],
  microsoft: [
    "openid",
    "profile",
    "email",
    "offline_access",
    "User.Read",
    "Calendars.ReadWrite",
  ],
};

const mailScopes: Record<OAuthProvider, string> = {
  google: "https://www.googleapis.com/auth/gmail.send",
  microsoft: "Mail.Send",
};

export function oauthScopes(provider: OAuthProvider, includeMail = false) {
  return includeMail
    ? [...calendarScopes[provider], mailScopes[provider]]
    : [...calendarScopes[provider]];
}

export function grantsMailSend(provider: OAuthProvider, granted: string) {
  const values = new Set(
    granted
      .split(/[\s,]+/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  return values.has(mailScopes[provider].toLowerCase());
}
