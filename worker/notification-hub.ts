type NotificationEvent = {
  userEmail: string | null;
  notification: Record<string, unknown>;
};

export class NotificationHub {
  constructor(private readonly ctx: DurableObjectState) {}

  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === "/connect") {
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
        return new Response("Expected a WebSocket upgrade.", { status: 426 });
      const userEmail = request.headers.get("x-slotloom-user");
      if (!userEmail) return new Response("Unauthorized.", { status: 401 });
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server, [`user:${userEmail}`]);
      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: { "Sec-WebSocket-Protocol": "slotloom" },
      });
    }
    if (url.pathname === "/broadcast" && request.method === "POST") {
      const event = await request.json<NotificationEvent>();
      const sockets = event.userEmail
        ? this.ctx.getWebSockets(`user:${event.userEmail}`)
        : this.ctx.getWebSockets();
      const message = JSON.stringify({
        type: "notification.created",
        notification: event.notification,
      });
      for (const socket of sockets) {
        try {
          socket.send(message);
        } catch {
          socket.close(1011, "Notification delivery failed");
        }
      }
      return Response.json({ delivered: sockets.length });
    }
    return new Response("Not found.", { status: 404 });
  }

  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    if (message === "ping") socket.send("pong");
  }
}
