import { lazy, Suspense, useEffect, useState } from "react";
import { resolveAppRoute } from "@/routes";

const Admin = lazy(() => import("./components/Admin"));
const Home = lazy(() => import("./components/Home"));
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
  let page;
  if (route.kind === "home") page = <Home />;
  else if (route.kind === "login") page = <Login />;
  else if (route.kind === "admin") page = <Admin />;
  else if (route.kind === "legal")
    page = <LegalPage document={route.document} />;
  else if (route.kind === "manage")
    page = <ManageBooking token={route.token} />;
  else if (route.kind === "booking") page = <PublicBooking slug={route.slug} />;
  else if (route.kind === "not-found") page = <NotFound path={path} />;
  else page = <NotFound path={path} />;

  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
          Loading…
        </main>
      }
    >
      {page}
    </Suspense>
  );
}
