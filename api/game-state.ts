import { getPublicState } from './_tableState';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const state = getPublicState();
  res.status(200).json(state);
}
