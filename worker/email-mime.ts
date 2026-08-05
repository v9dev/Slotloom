export type EmailAttachmentContent = {
  content: string;
  filename: string;
  type: string;
};

export type OAuthEmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachmentContent[];
};

const encoder = new TextEncoder();

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

export function textToBase64(value: string) {
  return bytesToBase64(encoder.encode(value));
}

const wrapBase64 = (value: string) =>
  value.match(/.{1,76}/g)?.join("\r\n") || "";

const cleanHeader = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

const encodedHeader = (value: string) => {
  const clean = cleanHeader(value);
  return /^[\x20-\x7e]*$/.test(clean)
    ? clean
    : `=?UTF-8?B?${textToBase64(clean)}?=`;
};

const safeFilename = (value: string) =>
  cleanHeader(value).replace(/["\\]/g, "_") || "attachment";

function alternativePart(message: OAuthEmailMessage, boundary: string) {
  return [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(textToBase64(message.text)),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(textToBase64(message.html)),
    `--${boundary}--`,
  ].join("\r\n");
}

export function gmailRawMessage(from: string, message: OAuthEmailMessage) {
  const mixedBoundary = `slotloom-mixed-${crypto.randomUUID()}`;
  const alternativeBoundary = `slotloom-alternative-${crypto.randomUUID()}`;
  const headers = [
    `From: ${cleanHeader(from)}`,
    `To: ${cleanHeader(message.to)}`,
    ...(message.replyTo ? [`Reply-To: ${cleanHeader(message.replyTo)}`] : []),
    `Subject: ${encodedHeader(message.subject)}`,
    "MIME-Version: 1.0",
  ];
  const alternative = alternativePart(message, alternativeBoundary);
  const attachments = message.attachments || [];
  const body = attachments.length
    ? [
        ...headers,
        `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
        "",
        `--${mixedBoundary}`,
        `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
        "",
        alternative,
        ...attachments.flatMap((attachment) => [
          `--${mixedBoundary}`,
          `Content-Type: ${cleanHeader(attachment.type)}; name="${safeFilename(attachment.filename)}"`,
          "Content-Transfer-Encoding: base64",
          `Content-Disposition: attachment; filename="${safeFilename(attachment.filename)}"`,
          "",
          wrapBase64(textToBase64(attachment.content)),
        ]),
        `--${mixedBoundary}--`,
      ].join("\r\n")
    : [
        ...headers,
        `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
        "",
        alternative,
      ].join("\r\n");
  return textToBase64(body)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
