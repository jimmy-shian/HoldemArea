import { PLAYER_COUNT, joinSeat } from './_tableState';

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  const { seatIndex, playerName } = req.body || {};

  if (typeof seatIndex !== 'number' || typeof playerName !== 'string') {
    res.status(400).json({ success: false, message: 'Invalid payload' });
    return;
  }

  if (seatIndex < 0 || seatIndex >= PLAYER_COUNT) {
    res.status(400).json({ success: false, message: 'Invalid seatIndex' });
    return;
  }

  const player = joinSeat(seatIndex, playerName);

  if (!player) {
    res.status(500).json({ success: false, message: 'Unable to join seat' });
    return;
  }

  res.status(200).json({ success: true, player });
}
