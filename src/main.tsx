import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./styles.css";
import { applyBranding, brand, setPageTitle } from "@/brand";

async function loadBranding() {
  try {
    const response = await fetch("/api/public/brand");
    if (!response.ok) return;
    const value = (await response.json()) as {
      name?: string;
      logo?: string;
      logoDark?: string;
      favicon?: string;
      tagline?: string;
      primaryColor?: string;
      accentColor?: string;
    };
    applyBranding(value);
  } catch {
    // Build-time defaults keep the application usable if the API is offline.
  }
}

await loadBranding();
setPageTitle();
document
  .querySelector<HTMLLinkElement>('link[rel="icon"]')
  ?.setAttribute("href", brand.favicon);

const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
const pageOwnsThemeToggle =
  currentPath === "/" ||
  currentPath === "/login" ||
  currentPath === "/admin" ||
  currentPath.startsWith("/admin/");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <App />
        {!pageOwnsThemeToggle && (
          <div
            className="fixed z-50 rounded-full border bg-background/95 shadow-sm backdrop-blur"
            style={{
              right: "max(1rem, env(safe-area-inset-right))",
              bottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            <ThemeToggle />
          </div>
        )}
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
