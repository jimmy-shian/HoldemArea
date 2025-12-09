import { getPublicState } from './_tableState';

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  // For now we just log the action and return the current shared state.
  // The front-end still runs the main game logic locally.
  // Later this can be extended so the server becomes the source of truth.
  const payload = req.body || {};
  // eslint-disable-next-line no-console
  console.log('[API] action received:', payload);

  const state = getPublicState();
  res.status(200).json(state);
}
