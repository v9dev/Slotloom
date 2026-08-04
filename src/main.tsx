import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./styles.css";
import { applyBranding, brand } from "@/brand";

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
document.title = brand.name;
document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute("href", brand.favicon);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <App />
        <div className="fixed bottom-4 right-4 z-50 rounded-full border bg-background/90 shadow-sm backdrop-blur">
          <ThemeToggle />
        </div>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
