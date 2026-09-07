import { ArrowLeft, SearchX } from "lucide-react";
import { useEffect } from "react";
import { brand, setPageTitle } from "@/brand";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicPageBackdrop } from "@/components/PublicPageBackdrop";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export default function NotFound({ path }: { path: string }) {
  const adminPath = path === "/admin" || path.startsWith("/admin/");
  const destination = adminPath ? "/admin" : "/";

  useEffect(() => setPageTitle("Page not found"), []);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted/30 p-4 sm:p-6"
    >
      <PublicPageBackdrop />
      <div className="relative w-full max-w-lg">
        <a
          href="/"
          aria-label={`${brand.name} home`}
          className="mb-6 inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <BrandLogo className="max-w-44" />
        </a>
        <Card className="w-full overflow-hidden border-border/80 shadow-xl shadow-black/[.04]">
          <CardHeader className="border-b bg-muted/30 pb-6">
            <div className="mb-7 flex items-center justify-between gap-4">
              <span className="flex size-11 items-center justify-center rounded-xl border bg-background text-muted-foreground shadow-sm">
                <SearchX className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium tabular-nums text-muted-foreground">
                Error 404
              </span>
            </div>
            <h1 className="font-heading text-3xl font-medium leading-snug tracking-tight">
              Page not found
            </h1>
            <CardDescription className="max-w-md text-sm leading-6">
              The address may be incorrect, or the page may have moved. Return
              to a known page and continue from there.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild size="lg" className="min-h-11 px-4">
              <a href={destination}>
                <ArrowLeft aria-hidden="true" />
                {adminPath ? "Return to overview" : "Return home"}
              </a>
            </Button>
            <p className="text-sm text-muted-foreground">{brand.tagline}</p>
          </CardContent>
        </Card>
        <PublicFooter className="mt-6 border-t px-2 pt-5" />
      </div>
    </main>
  );
}
