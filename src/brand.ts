export const brand = {
  name: import.meta.env.VITE_APP_NAME || "Slotloom",
  mark: import.meta.env.VITE_BRAND_MARK || "/brand/mark.svg",
  tagline: "Scheduling, without the overhead.",
};

export function applyBranding(values: Partial<typeof brand>) {
  if (values.name?.trim()) brand.name = values.name.trim();
  if (values.mark?.trim()) brand.mark = values.mark.trim();
  if (values.tagline?.trim()) brand.tagline = values.tagline.trim();
}
