import { lazy, Suspense, useEffect, useState } from "react";
import { resolveAppRoute } from "@/routes";
import { CookieNotice } from "@/components/CookieNotice";

const Admin = lazy(() => import("./components/Admin"));
const Home = lazy(() => import("./components/Home"));
const InfoPage = lazy(() => import("./components/InfoPage"));
const Login = lazy(() => import("./components/Login"));
const LegalPage = lazy(() => import("./components/LegalPage"));
const ManageBooking = lazy(() => import("./components/ManageBooking"));
const NotFound = lazy(() => import("./components/NotFound"));
const PublicBooking = lazy(() => import("./components/PublicBooking"));

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    addEventListener("popstate", update);
    return () => removeEventListener("popstate", update);
  }, []);

  const route = resolveAppRoute(path);
  useEffect(() => {
    const indexable =
      route.kind === "home" || route.kind === "legal" || route.kind === "info";
    const robots = document.querySelector<HTMLMetaElement>(
      'meta[name="robots"]',
    );
    const robotsMeta = robots || document.createElement("meta");
    robotsMeta.name = "robots";
    robotsMeta.content = indexable
      ? "index, follow"
      : route.kind === "booking"
        ? "noindex, follow"
        : "noindex, nofollow";
    if (!robots) document.head.appendChild(robotsMeta);

    const currentCanonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (indexable) {
      const canonical = currentCanonical || document.createElement("link");
      canonical.rel = "canonical";
      canonical.href = new URL(
        path === "/" ? "/" : path.replace(/\/+$/, ""),
        window.location.origin,
      ).toString();
      if (!currentCanonical) document.head.appendChild(canonical);
    } else {
      currentCanonical?.remove();
    }
  }, [path, route.kind]);

  let page;
  if (route.kind === "home") page = <Home />;
  else if (route.kind === "login") page = <Login />;
  else if (route.kind === "admin") page = <Admin />;
  else if (route.kind === "legal")
    page = <LegalPage document={route.document} />;
  else if (route.kind === "info") page = <InfoPage document={route.document} />;
  else if (route.kind === "manage")
    page = <ManageBooking token={route.token} />;
  else if (route.kind === "booking") page = <PublicBooking slug={route.slug} />;
  else if (route.kind === "not-found") page = <NotFound path={path} />;
  else page = <NotFound path={path} />;

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Suspense
        fallback={
          <main
            id="main-content"
            tabIndex={-1}
            className="flex min-h-svh items-center justify-center text-sm text-muted-foreground"
          >
            Loading…
          </main>
        }
      >
        {page}
      </Suspense>
      <CookieNotice />
    </>
  );
}
