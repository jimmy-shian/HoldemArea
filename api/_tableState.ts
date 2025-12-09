import { Player, GameState, GameStage } from '../types';
import { INITIAL_CHIPS, BIG_BLIND, PLAYER_COUNT } from '../constants';

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
    stage: GameStage.IDLE,
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
