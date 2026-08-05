export type OAuthProvider = "google" | "microsoft";

export const oauthScopes: Record<OAuthProvider, string[]> = {
  google: [
    "openid",
    "email",
    "https://www.googleapis.com/auth/calendar.events.owned",
    "https://www.googleapis.com/auth/gmail.send",
  ],
  microsoft: [
    "openid",
    "profile",
    "email",
    "offline_access",
    "User.Read",
    "Calendars.ReadWrite",
    "Mail.Send",
  ],
};

const mailScopes: Record<OAuthProvider, string> = {
  google: "https://www.googleapis.com/auth/gmail.send",
  microsoft: "mail.send",
};

export function grantsMailSend(provider: OAuthProvider, granted: string) {
  const values = new Set(
    granted
      .split(/[\s,]+/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  return values.has(mailScopes[provider].toLowerCase());
}
