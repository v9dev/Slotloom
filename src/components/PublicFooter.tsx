import { brand } from "@/brand";

export function PublicFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row ${className}`}
    >
      <p>
        © {new Date().getFullYear()} {brand.name}
      </p>
      <nav aria-label="Legal" className="flex items-center gap-4">
        <a
          className="underline-offset-4 hover:text-foreground hover:underline"
          href="/privacy"
        >
          Privacy policy
        </a>
        <a
          className="underline-offset-4 hover:text-foreground hover:underline"
          href="/terms"
        >
          Terms of service
        </a>
      </nav>
    </footer>
  );
}
