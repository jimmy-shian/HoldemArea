// Simple in-memory SSE hub for the single table.
// Note: Works in Vercel Edge runtime; uses streaming Response.

type Client = ReadableStreamDefaultController;

const clients = new Set<Client>();

// Broadcast a JSON-serializable payload to all connected clients.
export function broadcastState(payload: unknown) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  const dead: Client[] = [];
  clients.forEach((client) => {
    try {
      client.enqueue(data);
    } catch {
      dead.push(client);
    }
  });
  dead.forEach((c) => clients.delete(c));
}

// Register a new SSE client and return the streaming Response.
export function registerClient(): Response {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      controller.enqueue(`: connected\n\n`);

      // Keep-alive ping every 15s to avoid idle timeout.
      const interval = setInterval(() => {
        try {
          controller.enqueue(`: ping\n\n`);
        } catch {
          /* ignore */
        }
      }, 15000);

      const cleanup = () => {
        clearInterval(interval);
        clients.delete(controller);
      };

      // Attach cleanup on cancellation via cancel() below.
      (controller as any)._cleanup = cleanup;
    },
    cancel(reason) {
      // On client disconnect
      const cleanup = (this as any)._cleanup;
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
