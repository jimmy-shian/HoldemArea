import { PLAYER_COUNT, joinSeat } from './_tableState';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      { status: 405, headers: { 'content-type': 'application/json' } },
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { seatIndex, playerName } = body;

  if (typeof seatIndex !== 'number' || typeof playerName !== 'string') {
    return new Response(
      JSON.stringify({ success: false, message: 'Invalid payload' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  if (seatIndex < 0 || seatIndex >= PLAYER_COUNT) {
    return new Response(
      JSON.stringify({ success: false, message: 'Invalid seatIndex' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  const player = joinSeat(seatIndex, playerName);

  if (!player) {
    return new Response(
      JSON.stringify({ success: false, message: 'Unable to join seat' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ success: true, player }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}
