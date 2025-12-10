import { leaveSeat, getPublicState } from './_tableState';
import { broadcastState } from './_sse';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false }),
      { status: 405, headers: { 'content-type': 'application/json' } },
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { playerId } = body;

  if (typeof playerId !== 'number') {
    return new Response(
      JSON.stringify({ success: false }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  const ok = leaveSeat(playerId);

  const state = getPublicState();
  broadcastState(state);

  return new Response(
    JSON.stringify({ success: ok }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}
