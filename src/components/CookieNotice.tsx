import { Cookie } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const cookieNoticeStorageKey = "slotloom-storage-notice";
export const cookieNoticeVersion = "2026-09-07";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(
        localStorage.getItem(cookieNoticeStorageKey) !== cookieNoticeVersion,
      );
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(cookieNoticeStorageKey, cookieNoticeVersion);
    } catch {
      // The notice can still be dismissed for this page view.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      aria-labelledby="cookie-notice-title"
      aria-describedby="cookie-notice-description"
      aria-live="polite"
      className="fixed z-60 rounded-2xl border bg-background/95 p-4 shadow-[0_1px_2px_rgba(15,23,42,.08),0_20px_60px_rgba(15,23,42,.2)] backdrop-blur-xl [bottom:max(4.75rem,calc(env(safe-area-inset-bottom)+4.75rem))] [left:max(1rem,env(safe-area-inset-left))] [right:max(1rem,env(safe-area-inset-right))] sm:right-auto sm:w-[calc(100%-2rem)] sm:max-w-xl sm:[bottom:max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
          <Cookie className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p id="cookie-notice-title" className="font-semibold">
            Functional storage only
          </p>
          <p
            id="cookie-notice-description"
            className="mt-1 text-sm leading-6 text-muted-foreground"
          >
            Slotloom uses browser storage and may use Cloudflare security
            cookies for your theme choice, sign-in, and bot protection. The
            default app has no advertising trackers.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="ghost" className="min-h-11 px-4">
          <a href="/cookies">Read cookie notice</a>
        </Button>
        <Button type="button" className="min-h-11 px-4" onClick={dismiss}>
          Got it
        </Button>
      </div>
    </aside>
  );
}
