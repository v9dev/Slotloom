import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

export type SlotloomEmailProps = {
  preview: string;
  heading: string;
  label?: string;
  message: string;
  appName: string;
  tagline: string;
  logoUrl: string;
  primaryColor?: string;
  accentColor?: string;
  contact: string;
  actionUrl?: string;
  actionLabel?: string;
  meetingTime?: string;
  meetingTitle?: string;
  calendarAttached?: boolean;
  darkMode?: boolean;
};

export function SlotloomEmail({
  preview,
  heading,
  label = "Meeting update",
  message,
  appName,
  tagline,
  logoUrl,
  primaryColor = "#2563eb",
  accentColor = "#7c3aed",
  contact,
  actionUrl,
  actionLabel = "View meeting",
  meetingTime,
  meetingTitle,
  calendarAttached = false,
  darkMode = false,
}: SlotloomEmailProps) {
  const paragraphs = message.split(/\n{2,}/).filter(Boolean);

  return (
    <Html lang="en" className={darkMode ? "dark-email" : undefined}>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{emailThemeCss}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={styles.body} className="email-body">
        <Container style={styles.container} className="email-card">
          <Section style={{ ...styles.accent, backgroundColor: primaryColor }} />
          <Section style={styles.brand}>
            <Img src={logoUrl} width="140" alt={appName} style={styles.logo} />
            <Text style={styles.tagline} className="email-muted">
              {tagline}
            </Text>
          </Section>
          <Text style={{ ...styles.eyebrow, color: accentColor }}>{label}</Text>
          <Heading style={styles.heading} className="email-title">{heading}</Heading>
          {paragraphs.map((paragraph, index) => (
            <Text key={index} style={styles.copy} className="email-copy">
              {paragraph}
            </Text>
          ))}
          {meetingTime ? (
            <Section style={styles.details} className="email-details">
              {meetingTitle ? (
                <>
                  <Text style={styles.detailLabel} className="email-muted">MEETING</Text>
                  <Text style={styles.meetingValue} className="email-title">{meetingTitle}</Text>
                </>
              ) : null}
              <Text style={styles.detailLabel} className="email-muted">DATE AND TIME</Text>
              <Text style={styles.detailValue} className="email-title">{meetingTime}</Text>
            </Section>
          ) : null}
          {actionUrl ? (
            <Section style={styles.action}>
              <Button href={actionUrl} style={{ ...styles.button, backgroundColor: primaryColor }} className="email-button">
                {actionLabel}
              </Button>
            </Section>
          ) : null}
          {calendarAttached ? (
            <Text style={styles.calendarNote} className="email-calendar">
              Calendar invite attached. Open the .ics file to add this meeting to your calendar.
            </Text>
          ) : null}
          <Hr style={styles.rule} className="email-rule" />
          <Text style={styles.footer} className="email-muted">
            Questions? Contact <Link href={`mailto:${contact}`} style={styles.link} className="email-link">{contact}</Link>
          </Text>
          <Text style={styles.footerMuted}>
            This message was sent by {appName} for the meeting organizer.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: { backgroundColor: "#f5f5f4", color: "#18181b", fontFamily: "Arial, sans-serif", margin: 0, padding: "32px 12px" },
  container: { backgroundColor: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "16px", margin: "0 auto", maxWidth: "560px", overflow: "hidden", padding: "0 36px 32px" },
  accent: { backgroundColor: "#3b82f6", borderRadius: "0 0 8px 8px", height: "5px", margin: "0 0 30px" },
  brand: { marginBottom: "32px" },
  logo: { display: "block", height: "auto", maxWidth: "140px" },
  tagline: { color: "#71717a", fontSize: "13px", lineHeight: "20px", margin: "10px 0 0" },
  eyebrow: { color: "#7c3aed", fontSize: "14px", fontWeight: 700, lineHeight: "20px", margin: "0 0 8px" },
  heading: { fontSize: "26px", lineHeight: "34px", margin: "0 0 22px" },
  copy: { color: "#52525b", fontSize: "15px", lineHeight: "24px", margin: "0 0 16px", whiteSpace: "pre-line" as const },
  details: { backgroundColor: "#f5f5f5", border: "1px solid #e4e4e7", borderRadius: "10px", margin: "24px 0", padding: "16px 18px" },
  detailLabel: { color: "#71717a", fontSize: "10px", fontWeight: 700, letterSpacing: "0.8px", margin: "0 0 6px" },
  detailValue: { color: "#18181b", fontSize: "15px", fontWeight: 600, lineHeight: "22px", margin: 0 },
  meetingValue: { color: "#18181b", fontSize: "15px", fontWeight: 600, lineHeight: "22px", margin: "0 0 14px" },
  action: { margin: "28px 0" },
  button: { backgroundColor: "#18181b", borderRadius: "8px", color: "#ffffff", display: "inline-block", fontSize: "14px", fontWeight: 600, padding: "12px 18px", textDecoration: "none" },
  calendarNote: { backgroundColor: "#eff6ff", borderRadius: "8px", color: "#1d4ed8", fontSize: "12px", lineHeight: "19px", margin: "0 0 24px", padding: "12px 14px" },
  rule: { borderColor: "#e4e4e7", margin: "30px 0 20px" },
  footer: { color: "#71717a", fontSize: "13px", lineHeight: "20px", margin: 0 },
  footerMuted: { color: "#a1a1aa", fontSize: "11px", lineHeight: "18px", margin: "8px 0 0" },
  link: { color: "#18181b", textDecoration: "underline" },
};

const emailThemeCss = `
  .dark-email .email-body { background-color: #111113 !important; color: #fafafa !important; }
  .dark-email .email-card { background-color: #1c1c1f !important; border-color: #3f3f46 !important; }
  .dark-email .email-title { color: #fafafa !important; }
  .dark-email .email-copy, .dark-email .email-muted { color: #b4b4bc !important; }
  .dark-email .email-details { background-color: #27272a !important; border-color: #3f3f46 !important; }
  .dark-email .email-button { background-color: #fafafa !important; color: #18181b !important; }
  .dark-email .email-calendar { background-color: #172554 !important; color: #bfdbfe !important; }
  .dark-email .email-rule { border-color: #3f3f46 !important; }
  .dark-email .email-link { color: #fafafa !important; }
  @media (prefers-color-scheme: dark) {
    .email-body { background-color: #111113 !important; color: #fafafa !important; }
    .email-card { background-color: #1c1c1f !important; border-color: #3f3f46 !important; }
    .email-title { color: #fafafa !important; }
    .email-copy, .email-muted { color: #b4b4bc !important; }
    .email-details { background-color: #27272a !important; border-color: #3f3f46 !important; }
    .email-button { background-color: #fafafa !important; color: #18181b !important; }
    .email-calendar { background-color: #172554 !important; color: #bfdbfe !important; }
    .email-rule { border-color: #3f3f46 !important; }
    .email-link { color: #fafafa !important; }
  }
`;
