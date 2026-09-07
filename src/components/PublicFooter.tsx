import { brand } from "@/brand";

export function PublicFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row ${className}`}
    >
      <p>
        © {new Date().getFullYear()} {brand.name}
      </p>
      <nav
        aria-label="Public information"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-end"
      >
        <a
          className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          href="/support"
        >
          Help
        </a>
        <a
          className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          href="/accessibility"
        >
          Accessibility
        </a>
        <a
          className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          href="/cookies"
        >
          Cookie notice
        </a>
        <a
          className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          href="/privacy"
        >
          Privacy policy
        </a>
        <a
          className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          href="/terms"
        >
          Terms of service
        </a>
      </nav>
    </footer>
  );
}
