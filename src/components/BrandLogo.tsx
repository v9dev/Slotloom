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
      className={`inline-flex min-w-0 items-center ${className}`}
      role="img"
      aria-label={brand.name}
    >
      <img
        src={brand.logo}
        alt=""
        aria-hidden="true"
        className="block h-8 w-auto max-w-full object-contain object-left dark:hidden"
      />
      <img
        src={brand.logoDark}
        alt=""
        aria-hidden="true"
        className="hidden h-8 w-auto max-w-full object-contain object-left dark:block"
      />
    </span>
  );
}
