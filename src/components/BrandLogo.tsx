import { brand } from "@/brand";

export function BrandLogo({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  if (compact)
    return (
      <img
        src={brand.favicon}
        alt={brand.name}
        className={`size-9 rounded-xl object-contain ${className}`}
      />
    );
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}
      aria-label={brand.name}
    >
      <img src={brand.logo} alt="" className="h-8 w-auto max-w-40 object-contain dark:hidden" />
      <img src={brand.logoDark} alt="" className="hidden h-8 w-auto max-w-40 object-contain dark:block" />
    </span>
  );
}
