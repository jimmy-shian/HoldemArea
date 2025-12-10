// Server-side game engine for authoritative single-table poker.
// This module handles all game logic: dealing, actions, showdown.
// It operates on the TableState and returns updated state.

import { GameState, Player, GameStage } from './_tableState';

const INITIAL_CHIPS = 10000;
const SMALL_BLIND = 50;
const BIG_BLIND = 100;
const PLAYER_COUNT = 4;

// Seeded RNG for deterministic deck shuffling
class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

// Simple card representation
interface Card {
  suit: 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';
  rank: number; // 2-14 (2-10, J=11, Q=12, K=13, A=14)
  key: string;
}

function createDeck(seed: number): Card[] {
  const rng = new SeededRNG(seed);
  const suits: ('HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES')[] = [
    'HEARTS',
    'DIAMONDS',
    'CLUBS',
    'SPADES',
  ];
  const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 2-A

  let deck: Card[] = [];
  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      const rankStr =
        rank === 11 ? 'J' : rank === 12 ? 'Q' : rank === 13 ? 'K' : rank === 14 ? 'A' : String(rank);
      deck.push({
        suit,
        rank,
        key: `${rankStr}${suit[0]}`,
      });
    });
  });

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

// Hand evaluation (simplified for server; returns a score)
function evaluateHandScore(holeCards: Card[], communityCards: Card[]): number {
  // For now, just return a simple score based on high card.
  // In a real implementation, this would evaluate pairs, straights, flushes, etc.
  const allCards = [...holeCards, ...communityCards];
  const maxRank = Math.max(...allCards.map((c) => c.rank));
  return maxRank;
}

export interface GameEngineState {
  gameState: GameState;
  players: Player[];
  deck: Card[];
}

/**
 * Start a new hand: deal cards, set blinds, determine first turn.
 */
export function startNewHand(
  currentState: GameEngineState,
): GameEngineState {
  const { players: prevPlayers, gameState: prevGameState } = currentState;

  // Move dealer
  const nextDealer = (prevGameState.dealerIndex + 1) % PLAYER_COUNT;
  const sbIndex = (nextDealer + 1) % PLAYER_COUNT;
  const bbIndex = (nextDealer + 2) % PLAYER_COUNT;

  // Reset players for new hand
  let newPlayers = prevPlayers.map((p) => ({
    ...p,
    bet: 0,
    totalHandBet: 0,
    cards: [],
    hasFolded: false,
    isDealer: p.id === nextDealer,
    isActive: false,
  }));

  // Give bots infinite chips if they bust
  newPlayers = newPlayers.map((p) => ({
    ...p,
    chips: p.chips === 0 && !p.isHuman ? INITIAL_CHIPS : p.chips,
  }));

  // Post blinds
  const sbPlayer = newPlayers[sbIndex];
  const bbPlayer = newPlayers[bbIndex];

  const sbAmt = Math.min(sbPlayer.chips, SMALL_BLIND);
  const bbAmt = Math.min(bbPlayer.chips, BIG_BLIND);

  sbPlayer.chips -= sbAmt;
  sbPlayer.bet = sbAmt;
  sbPlayer.totalHandBet = sbAmt;

  bbPlayer.chips -= bbAmt;
  bbPlayer.bet = bbAmt;
  bbPlayer.totalHandBet = bbAmt;

  const pot = sbAmt + bbAmt;

  // Deal cards
  const seed = Date.now();
  const newDeck = createDeck(seed);
  const hands: Card[][] = [[], [], [], []];

  for (let i = 0; i < 2; i++) {
    for (let p = 0; p < PLAYER_COUNT; p++) {
      hands[p].push(newDeck.shift()!);
    }
  }

  newPlayers.forEach((p, i) => {
    p.cards = hands[i];
  });

  const newGameState: GameState = {
    stage: 'PREFLOP',
    pot,
    communityCards: [],
    deckSeed: seed,
    currentTurnIndex: (bbIndex + 1) % PLAYER_COUNT,
    dealerIndex: nextDealer,
    highestBet: BIG_BLIND,
    minRaise: BIG_BLIND,
    winners: [],
    roundNumber: prevGameState.roundNumber + 1,
  };

  return {
    gameState: newGameState,
    players: newPlayers,
    deck: newDeck,
  };
}

/**
 * Apply a player action (check, call, raise, fold, allin).
 * Returns updated state or null if action is invalid.
 */
export function applyAction(
  currentState: GameEngineState,
  playerId: number,
  action: 'check' | 'call' | 'raise' | 'fold' | 'allin',
  amount: number = 0,
): GameEngineState | null {
  const { gameState, players } = currentState;

  // Validate it's this player's turn
  if (gameState.currentTurnIndex !== playerId) {
    return null;
  }

  const player = players[playerId];
  if (!player || player.hasFolded || gameState.stage === 'SHOWDOWN' || gameState.stage === 'IDLE') {
    return null;
  }

  const newPlayers = players.map((p) => ({ ...p })); // shallow copy
  const updatedPlayer = newPlayers[playerId];
  let newHighestBet = gameState.highestBet;
  let newPot = gameState.pot;

  if (action === 'fold') {
    updatedPlayer.hasFolded = true;
  } else if (action === 'check') {
    if (gameState.highestBet > updatedPlayer.bet) {
      return null; // Can't check if there's a bet to call
    }
  } else if (action === 'call') {
    const callAmount = gameState.highestBet - updatedPlayer.bet;
    const amountToDeduct = Math.min(updatedPlayer.chips, callAmount);
    updatedPlayer.chips -= amountToDeduct;
    updatedPlayer.bet += amountToDeduct;
    updatedPlayer.totalHandBet += amountToDeduct;
    newPot += amountToDeduct;
  } else if (action === 'raise' || action === 'allin') {
    let raiseTo = amount;
    if (raiseTo < gameState.highestBet && updatedPlayer.chips + updatedPlayer.bet > raiseTo) {
      raiseTo = gameState.highestBet;
    }
    const amountToAdd = raiseTo - updatedPlayer.bet;
    const actualAdd = Math.min(updatedPlayer.chips, amountToAdd);
    updatedPlayer.chips -= actualAdd;
    updatedPlayer.bet += actualAdd;
    updatedPlayer.totalHandBet += actualAdd;
    newPot += actualAdd;
    newHighestBet = Math.max(newHighestBet, updatedPlayer.bet);
  }

  // Advance turn to next active player
  let nextTurnIndex = (gameState.currentTurnIndex + 1) % PLAYER_COUNT;
  let attempts = 0;
  while (
    (newPlayers[nextTurnIndex].hasFolded || newPlayers[nextTurnIndex].chips === 0) &&
    attempts < PLAYER_COUNT
  ) {
    nextTurnIndex = (nextTurnIndex + 1) % PLAYER_COUNT;
    attempts++;
  }

  // Check if hand is over (only 1 player left or all matched)
  const notFolded = newPlayers.filter((p) => !p.hasFolded && (p.chips > 0 || p.bet > 0));
  const allMatched = notFolded.every((p) => p.bet === newHighestBet || p.chips === 0);

  let newStage: GameStage = gameState.stage;
  let newCommunityCards = gameState.communityCards;

  if (notFolded.length === 1) {
    // Only one player left, they win
    return handleShowdown(
      {
        gameState: {
          ...gameState,
          stage: 'SHOWDOWN' as GameStage,
          pot: newPot,
          highestBet: newHighestBet,
          currentTurnIndex: -1,
        },
        players: newPlayers,
        deck: currentState.deck,
      },
      [notFolded[0].id],
    );
  }

  if (allMatched && action !== 'raise' && action !== 'allin') {
    // All players matched the bet, move to next stage
    const deckCopy = [...currentState.deck];
    let cardsToDeal = 0;

    if (gameState.stage === 'PREFLOP') {
      cardsToDeal = 3; // Flop
      newStage = 'FLOP' as GameStage;
    } else if (gameState.stage === 'FLOP') {
      cardsToDeal = 1; // Turn
      newStage = 'TURN' as GameStage;
    } else if (gameState.stage === 'TURN') {
      cardsToDeal = 1; // River
      newStage = 'RIVER' as GameStage;
    } else if (gameState.stage === 'RIVER') {
      newStage = 'SHOWDOWN' as GameStage;
    }

    if (cardsToDeal > 0) {
      const dealt = deckCopy.splice(0, cardsToDeal);
      newCommunityCards = [...gameState.communityCards, ...dealt];
    }

    // Reset bets for next stage
    newPlayers.forEach((p) => {
      p.bet = 0;
    });
    newHighestBet = 0;
    nextTurnIndex = (gameState.dealerIndex + 1) % PLAYER_COUNT;

    // Skip folded/all-in players
    attempts = 0;
    while (
      (newPlayers[nextTurnIndex].hasFolded || newPlayers[nextTurnIndex].chips === 0) &&
      attempts < PLAYER_COUNT
    ) {
      nextTurnIndex = (nextTurnIndex + 1) % PLAYER_COUNT;
      attempts++;
    }

    if (newStage === ('SHOWDOWN' as GameStage)) {
      return handleShowdown(
        {
          gameState: {
            ...gameState,
            stage: 'SHOWDOWN' as GameStage,
            pot: newPot,
            communityCards: newCommunityCards,
            currentTurnIndex: -1,
          },
          players: newPlayers,
          deck: deckCopy,
        },
        [],
      );
    }

    return {
      gameState: {
        ...gameState,
        stage: newStage,
        pot: newPot,
        communityCards: newCommunityCards,
        highestBet: newHighestBet,
        currentTurnIndex: nextTurnIndex,
      },
      players: newPlayers,
      deck: deckCopy,
    };
  }

  return {
    gameState: {
      ...gameState,
      pot: newPot,
      highestBet: newHighestBet,
      currentTurnIndex: nextTurnIndex,
    },
    players: newPlayers,
    deck: currentState.deck,
  };
}

/**
 * Determine winners and award pot.
 */
export function handleShowdown(
  currentState: GameEngineState,
  forcedWinners: number[] = [],
): GameEngineState {
  const { gameState, players } = currentState;

  let winners = forcedWinners;

  if (winners.length === 0) {
    // Evaluate hands
    const activePlayers = players.filter((p) => !p.hasFolded && (p.chips > 0 || p.totalHandBet > 0));

    if (activePlayers.length === 0) {
      // No one to award to (shouldn't happen)
      return {
        ...currentState,
        gameState: {
          ...gameState,
          stage: 'IDLE',
          winners: [],
        },
      };
    }

    if (activePlayers.length === 1) {
      winners = [activePlayers[0].id];
    } else {
      let bestScore = -1;
      activePlayers.forEach((p) => {
        const score = evaluateHandScore(p.cards, gameState.communityCards);
        if (score > bestScore) {
          bestScore = score;
          winners = [p.id];
        } else if (score === bestScore) {
          winners.push(p.id);
        }
      });
    }
  }

  // Award pot
  const newPlayers = players.map((p) => ({ ...p }));
  const prizePerWinner = Math.floor(gameState.pot / winners.length);
  winners.forEach((wid) => {
    newPlayers[wid].chips += prizePerWinner;
  });

  return {
    ...currentState,
    gameState: {
      ...gameState,
      stage: 'IDLE',
      winners,
    },
    players: newPlayers,
  };
}
