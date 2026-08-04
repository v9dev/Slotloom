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
      className={`inline-flex min-w-0 shrink-0 items-center gap-2.5 ${className}`}
      aria-label={brand.name}
    >
      <img
        src={brand.favicon}
        alt=""
        className="size-8 shrink-0 rounded-[0.6rem] object-contain shadow-sm"
      />
      <span className="truncate text-xl font-semibold leading-none tracking-[-0.035em] text-foreground">
        {brand.name}
      </span>
    </span>
  );
}
