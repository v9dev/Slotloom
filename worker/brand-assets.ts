import { json, type Env } from "./domain";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

export async function uploadBrandAsset(
  request: Request,
  env: Env,
  kind: string,
  actor: string,
) {
  if (!env.BRAND_ASSETS)
    return json({ error: "Brand asset storage is not configured." }, 503);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return json({ error: "Choose an image to upload." }, 400);
  if (!ALLOWED_IMAGE_TYPES.has(file.type))
    return json({ error: "Use PNG, JPEG, WebP, SVG, or ICO." }, 400);
  if (file.size > 2 * 1024 * 1024)
    return json({ error: "Images must be 2 MB or smaller." }, 400);
  const extension =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const key = `workspace/${kind}-${crypto.randomUUID()}.${extension}`;
  await env.BRAND_ASSETS.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: { uploadedBy: actor },
  });
  return json({ url: `/api/public/brand-assets/${encodeURIComponent(key)}` });
}

export async function serveBrandAsset(env: Env, encodedKey: string) {
  if (!env.BRAND_ASSETS)
    return json({ error: "Brand asset storage is not configured." }, 503);
  const object = await env.BRAND_ASSETS.get(decodeURIComponent(encodedKey));
  if (!object) return json({ error: "Brand asset not found." }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  if (headers.get("content-type") === "image/svg+xml")
    headers.set(
      "content-security-policy",
      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    );
  return new Response(object.body, { headers });
}
