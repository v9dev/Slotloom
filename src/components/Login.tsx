import { ArrowRight, LockKeyhole } from "lucide-react";
import { useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicFooter } from "@/components/PublicFooter";
import { brand, setPageTitle } from "@/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export default function Login() {
  useEffect(() => setPageTitle("Sign in"), []);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm border-border/80 shadow-xl shadow-black/[.04]">
        <CardHeader className="space-y-10 pb-4">
          <a href="/" aria-label={`${brand.name} home`}>
            <BrandLogo className="self-start" />
          </a>
          <div className="space-y-3">
            <span className="flex size-10 items-center justify-center rounded-xl border bg-background">
              <LockKeyhole className="size-4" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Sign in to your workspace
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {brand.tagline} Manage scheduling links, responses, and your
                team.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full justify-between"
            size="lg"
            onClick={() => location.assign("/admin")}
          >
            Continue securely
            <ArrowRight />
          </Button>
          <p className="mt-5 rounded-lg border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
            Slotloom publishes availability and coordinates meeting responses.
            Optional Google or Microsoft connections create and update meeting
            events and send booking email only with the connected user’s
            authorization.
          </p>
        </CardContent>
        <CardFooter className="justify-center text-xs text-muted-foreground">
          Protected by Cloudflare Access
        </CardFooter>
      </Card>
      <PublicFooter className="mt-6 w-full max-w-sm px-2" />
    </main>
  );
}
