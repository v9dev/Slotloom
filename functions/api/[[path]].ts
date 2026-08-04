interface PagesEnv {
  BACKEND_URL: string;
}

export const onRequest: PagesFunction<PagesEnv> = async ({ request, env }) => {
  const backend = env.BACKEND_URL?.replace(/\/$/, "");
  if (!backend) {
    return Response.json(
      { error: "Pages BACKEND_URL is not configured." },
      { status: 503 },
    );
  }

  const incoming = new URL(request.url);
  const target = new URL(`${incoming.pathname}${incoming.search}`, backend);
  return fetch(new Request(target, request));
};
