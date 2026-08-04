import { ArrowRight, LockKeyhole } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { brand } from "@/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export default function Login() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm border-border/80 shadow-xl shadow-black/[.04]">
        <CardHeader className="space-y-10 pb-4">
          <BrandLogo className="self-start" />
          <div className="space-y-3">
            <span className="flex size-10 items-center justify-center rounded-xl border bg-background">
              <LockKeyhole className="size-4" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Sign in to your workspace
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {brand.tagline} Manage scheduling links, responses, and your team.
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
        </CardContent>
        <CardFooter className="justify-center text-xs text-muted-foreground">
          Protected by Cloudflare Access
        </CardFooter>
      </Card>
    </main>
  );
}
