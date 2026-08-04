export const brand = {
  name: import.meta.env.VITE_APP_NAME || "Slotloom",
  logo: import.meta.env.VITE_BRAND_LOGO || "/brand/logo-light.svg",
  logoDark: import.meta.env.VITE_BRAND_LOGO_DARK || "/brand/logo-dark.svg",
  favicon: import.meta.env.VITE_BRAND_FAVICON || "/brand/mark.svg",
  tagline: "Scheduling, without the overhead.",
  primaryColor: "#2563eb",
  accentColor: "#7c3aed",
};

export function applyBranding(values: Partial<typeof brand>) {
  if (values.name?.trim()) brand.name = values.name.trim();
  if (values.logo?.trim()) brand.logo = values.logo.trim();
  if (values.logoDark?.trim()) brand.logoDark = values.logoDark.trim();
  if (values.favicon?.trim()) brand.favicon = values.favicon.trim();
  if (values.tagline?.trim()) brand.tagline = values.tagline.trim();
  if (values.primaryColor?.trim()) brand.primaryColor = values.primaryColor.trim();
  if (values.accentColor?.trim()) brand.accentColor = values.accentColor.trim();
  document.documentElement.style.setProperty("--brand-blue", brand.primaryColor);
  document.documentElement.style.setProperty("--brand-violet", brand.accentColor);
  document.documentElement.style.setProperty("--ring", brand.primaryColor);
}
