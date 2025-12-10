import { updateFromClient, getPublicState } from './_tableState';
import { broadcastState } from './_sse';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ message: 'Method not allowed' }),
      { status: 405, headers: { 'content-type': 'application/json' } },
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.gameState && body.players) {
    updateFromClient(body.gameState, body.players);
  }

  const state = getPublicState();

  // Broadcast to SSE clients for real-time sync.
  broadcastState(state);

  return new Response(JSON.stringify(state), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
