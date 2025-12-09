// Self-contained table state module for Vercel serverless functions.
// We intentionally avoid importing from the frontend TypeScript files
// to reduce the chance of build/runtime issues in the serverless
// environment.

// These values mirror `constants.ts` but are duplicated here so that
// the backend does not depend on the Vite/TS build pipeline.
export const INITIAL_CHIPS = 10000;
export const BIG_BLIND = 100;
export const PLAYER_COUNT = 4;

// Minimal runtime shapes that match the frontend expectations.
// We only declare what we actually need on the server side.

export type GameStage =
  | 'IDLE'
  | 'PREFLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN';

export interface GameState {
  stage: GameStage;
  pot: number;
  communityCards: any[]; // Cards are opaque on the backend for now
  deckSeed: number;
  currentTurnIndex: number;
  dealerIndex: number;
  highestBet: number;
  minRaise: number;
  winners: number[];
  roundNumber: number;
}

export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  chips: number;
  bet: number;
  totalHandBet: number;
  cards: any[];
  hasFolded: boolean;
  isDealer: boolean;
  isActive: boolean;
  actionText?: string;
  lastAction?: 'check' | 'call' | 'raise' | 'fold' | 'allin';
}

export interface TableState {
  id: string;
  players: Player[];
  gameState: GameState;
}

let table: TableState | null = null;

function createInitialPlayers(): Player[] {
  const defaultNames = ['Bot User', 'Bot Alpha', 'Bot Beta', 'Bot Gamma'];

  return Array.from({ length: PLAYER_COUNT }, (_, index) => ({
    id: index,
    name: defaultNames[index] ?? `Bot ${index}`,
    isHuman: false,
    chips: INITIAL_CHIPS,
    bet: 0,
    totalHandBet: 0,
    cards: [],
    hasFolded: false,
    isDealer: index === 0,
    isActive: false,
  }));
}

function createInitialGameState(): GameState {
  return {
    stage: 'IDLE',
    pot: 0,
    communityCards: [],
    deckSeed: Date.now(),
    currentTurnIndex: -1,
    dealerIndex: 0,
    highestBet: 0,
    minRaise: BIG_BLIND,
    winners: [],
    roundNumber: 0,
  };
}

export function getTableState(): TableState {
  if (!table) {
    table = {
      id: 'table-1',
      players: createInitialPlayers(),
      gameState: createInitialGameState(),
    };
  }

  return table;
}

export function joinSeat(seatIndex: number, name: string): Player | null {
  const current = getTableState();

  if (seatIndex < 0 || seatIndex >= current.players.length) {
    return null;
  }

  const player = current.players[seatIndex];
  player.name = name;
  player.isHuman = true;

  return player;
}

export function leaveSeat(playerId: number): boolean {
  const current = getTableState();
  const index = current.players.findIndex((p) => p.id === playerId);

  if (index === -1) {
    return false;
  }

  const defaultNames = ['Bot User', 'Bot Alpha', 'Bot Beta', 'Bot Gamma'];
  const fallbackName = defaultNames[index] ?? `Bot ${index}`;

  current.players[index] = {
    ...current.players[index],
    name: fallbackName,
    isHuman: false,
  };

  return true;
}

export function updateFromClient(gameState: GameState, players: Player[]): void {
  const current = getTableState();
  current.gameState = gameState;
  current.players = players;
}

export function getPublicState(): { gameState: GameState; players: Player[] } {
  const current = getTableState();
  return {
    gameState: current.gameState,
    players: current.players,
  };
}
