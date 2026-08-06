import { ArrowLeft, SearchX } from "lucide-react";
import { useEffect } from "react";
import { brand, setPageTitle } from "@/brand";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound({ path }: { path: string }) {
  const adminPath = path === "/admin" || path.startsWith("/admin/");
  const destination = adminPath ? "/admin" : "/";

  useEffect(() => setPageTitle("Page not found"), []);

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4 sm:p-6">
      <div className="w-full max-w-lg">
        <BrandLogo className="mb-6 max-w-44" />
        <Card className="overflow-hidden border-border/80 shadow-xl shadow-black/[.04]">
          <CardHeader className="border-b bg-muted/30 pb-6">
            <div className="mb-7 flex items-center justify-between gap-4">
              <span className="flex size-11 items-center justify-center rounded-xl border bg-background text-muted-foreground shadow-sm">
                <SearchX className="size-5" />
              </span>
              <span className="text-sm font-medium tabular-nums text-muted-foreground">
                Error 404
              </span>
            </div>
            <CardTitle className="text-3xl tracking-tight">
              Page not found
            </CardTitle>
            <CardDescription className="max-w-md text-sm leading-6">
              The address may be incorrect, or the page may have moved. Return
              to a known page and continue from there.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild size="lg">
              <a href={destination}>
                <ArrowLeft />
                {adminPath ? "Return to overview" : "Return home"}
              </a>
            </Button>
            <p className="text-sm text-muted-foreground">{brand.tagline}</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
