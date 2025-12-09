import { leaveSeat } from './_tableState';

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false });
    return;
  }

  const { playerId } = req.body || {};

  if (typeof playerId !== 'number') {
    res.status(400).json({ success: false });
    return;
  }

  const ok = leaveSeat(playerId);
  res.status(200).json({ success: ok });
}
