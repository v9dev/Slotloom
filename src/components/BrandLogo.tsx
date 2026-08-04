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
        src={brand.mark}
        alt={brand.name}
        className={`size-9 rounded-xl object-contain ${className}`}
      />
    );
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}
      aria-label={brand.name}
    >
      <img
        src={brand.mark}
        alt=""
        className="size-8 rounded-lg object-contain"
      />
      <span className="text-[1.25rem] font-bold leading-none tracking-[-0.04em] text-foreground">
        {brand.name}
      </span>
    </span>
  );
}
