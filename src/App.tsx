import { lazy, Suspense } from "react";

const Admin = lazy(() => import("./components/Admin"));
const Login = lazy(() => import("./components/Login"));
const ManageBooking = lazy(() => import("./components/ManageBooking"));
const PublicBooking = lazy(() => import("./components/PublicBooking"));

export default function App() {
  const path = window.location.pathname;
  let page = <Login />;
  if (path.startsWith("/admin")) page = <Admin />;
  const manageToken = path.match(/^\/manage\/([^/]+)/)?.[1];
  if (manageToken)
    page = <ManageBooking token={decodeURIComponent(manageToken)} />;
  const slug = path.match(/^\/book\/([^/]+)/)?.[1];
  if (slug) page = <PublicBooking slug={decodeURIComponent(slug)} />;
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
