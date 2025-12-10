import { getTableState, getPublicState } from './_tableState';
import { applyAction } from './gameEngine';
import { broadcastState } from './_sse';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ message: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    payload = null;
  }

  const { playerId, action, amount } = payload || {};

  if (typeof playerId !== 'number' || !action) {
    return new Response(
      JSON.stringify({ message: 'Invalid payload' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  console.log('[API] action received:', { playerId, action, amount });

  // Get current table state
  const table = getTableState();
  const currentState = {
    gameState: table.gameState,
    players: table.players,
    deck: [], // Not used in applyAction, but required by type
  };

  // Apply the action using the game engine
  const newState = applyAction(currentState, playerId, action as any, amount || 0);

  if (!newState) {
    // Invalid action
    return new Response(
      JSON.stringify({ message: 'Invalid action' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  // Update the table state with the new state
  table.gameState = newState.gameState;
  table.players = newState.players;

  const state = getPublicState();

  // Broadcast to SSE clients for real-time sync.
  broadcastState(state);

  return new Response(JSON.stringify(state), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
