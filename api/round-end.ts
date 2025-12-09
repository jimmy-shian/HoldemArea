import { updateFromClient, getPublicState } from './_tableState';

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const body = req.body || {};

  if (body.gameState && body.players) {
    updateFromClient(body.gameState, body.players);
  }

  const state = getPublicState();
  res.status(200).json(state);
}
