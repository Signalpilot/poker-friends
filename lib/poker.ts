// Types
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
  value: number;
}

export interface Player {
  id: string;
  name: string;
  coins: number;
  cards: Card[];
  bet: number;
  folded: boolean;
  isAllIn: boolean;
  isDealer: boolean;
  isTurn: boolean;
  isAdmin?: boolean;
}

export interface GameState {
  id: string;
  players: { [key: string]: Player };
  communityCards: Card[];
  pot: number;
  currentBet: number;
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  deck: Card[];
  dealerIndex: number;
  currentPlayerIndex: number;
  turnOrder: string[];
  smallBlind: number;
  bigBlind: number;
  minPlayers: number;
  maxPlayers: number;
  createdBy: string;
  winner?: string;
  winningHand?: string;
  lastAction?: string;
}

// Card utilities
const SUITS: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let i = 0; i < RANKS.length; i++) {
      deck.push({
        suit,
        rank: RANKS[i],
        value: i + 2
      });
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getSuitSymbol(suit: Card['suit']): string {
  const symbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };
  return symbols[suit];
}

export function getSuitColor(suit: Card['suit']): string {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-gray-900';
}

// Hand evaluation
export interface HandResult {
  rank: number;
  name: string;
  cards: Card[];
  kickers: number[];
}

function getHandRanks(cards: Card[]): number[] {
  return cards.map(c => c.value).sort((a, b) => b - a);
}

function countRanks(cards: Card[]): Map<number, number> {
  const counts = new Map<number, number>();
  cards.forEach(c => {
    counts.set(c.value, (counts.get(c.value) || 0) + 1);
  });
  return counts;
}

function isFlush(cards: Card[]): boolean {
  const suit = cards[0].suit;
  return cards.every(c => c.suit === suit);
}

function isStraight(cards: Card[]): boolean {
  const values = [...new Set(cards.map(c => c.value))].sort((a, b) => a - b);
  if (values.length < 5) return false;
  
  // Check for A-2-3-4-5 (wheel)
  if (values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5)) {
    return true;
  }
  
  // Check for consecutive values
  for (let i = 0; i <= values.length - 5; i++) {
    let consecutive = true;
    for (let j = 0; j < 4; j++) {
      if (values[i + j + 1] - values[i + j] !== 1) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) return true;
  }
  return false;
}

export function evaluateHand(playerCards: Card[], communityCards: Card[]): HandResult {
  const allCards = [...playerCards, ...communityCards];
  
  // Generate all 5-card combinations
  const combinations: Card[][] = [];
  for (let i = 0; i < allCards.length - 4; i++) {
    for (let j = i + 1; j < allCards.length - 3; j++) {
      for (let k = j + 1; k < allCards.length - 2; k++) {
        for (let l = k + 1; l < allCards.length - 1; l++) {
          for (let m = l + 1; m < allCards.length; m++) {
            combinations.push([allCards[i], allCards[j], allCards[k], allCards[l], allCards[m]]);
          }
        }
      }
    }
  }
  
  let bestHand: HandResult = { rank: 0, name: 'High Card', cards: [], kickers: [] };
  
  for (const hand of combinations) {
    const result = evaluateFiveCards(hand);
    if (result.rank > bestHand.rank || 
        (result.rank === bestHand.rank && compareKickers(result.kickers, bestHand.kickers) > 0)) {
      bestHand = result;
    }
  }
  
  return bestHand;
}

function evaluateFiveCards(cards: Card[]): HandResult {
  const counts = countRanks(cards);
  const values = getHandRanks(cards);
  const flush = isFlush(cards);
  const straight = isStraight(cards);
  
  const pairs = [...counts.entries()].filter(([_, count]) => count === 2);
  const threes = [...counts.entries()].filter(([_, count]) => count === 3);
  const fours = [...counts.entries()].filter(([_, count]) => count === 4);
  
  // Royal Flush
  if (flush && straight && values.includes(14) && values.includes(13)) {
    return { rank: 10, name: 'Royal Flush', cards, kickers: values };
  }
  
  // Straight Flush
  if (flush && straight) {
    return { rank: 9, name: 'Straight Flush', cards, kickers: values };
  }
  
  // Four of a Kind
  if (fours.length > 0) {
    return { rank: 8, name: 'Four of a Kind', cards, kickers: [fours[0][0], ...values.filter(v => v !== fours[0][0])] };
  }
  
  // Full House
  if (threes.length > 0 && pairs.length > 0) {
    return { rank: 7, name: 'Full House', cards, kickers: [threes[0][0], pairs[0][0]] };
  }
  
  // Flush
  if (flush) {
    return { rank: 6, name: 'Flush', cards, kickers: values };
  }
  
  // Straight
  if (straight) {
    return { rank: 5, name: 'Straight', cards, kickers: values };
  }
  
  // Three of a Kind
  if (threes.length > 0) {
    return { rank: 4, name: 'Three of a Kind', cards, kickers: [threes[0][0], ...values.filter(v => v !== threes[0][0])] };
  }
  
  // Two Pair
  if (pairs.length >= 2) {
    const pairValues = pairs.map(p => p[0]).sort((a, b) => b - a);
    return { rank: 3, name: 'Two Pair', cards, kickers: [...pairValues, ...values.filter(v => !pairValues.includes(v))] };
  }
  
  // One Pair
  if (pairs.length === 1) {
    return { rank: 2, name: 'One Pair', cards, kickers: [pairs[0][0], ...values.filter(v => v !== pairs[0][0])] };
  }
  
  // High Card
  return { rank: 1, name: 'High Card', cards, kickers: values };
}

function compareKickers(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

// Game utilities
export function getActivePlayers(players: { [key: string]: Player }): Player[] {
  return Object.values(players).filter(p => !p.folded);
}

export function getNextPlayerIndex(
  currentIndex: number, 
  turnOrder: string[], 
  players: { [key: string]: Player }
): number {
  let nextIndex = (currentIndex + 1) % turnOrder.length;
  let attempts = 0;
  
  while (attempts < turnOrder.length) {
    const playerId = turnOrder[nextIndex];
    const player = players[playerId];
    if (player && !player.folded && !player.isAllIn) {
      return nextIndex;
    }
    nextIndex = (nextIndex + 1) % turnOrder.length;
    attempts++;
  }
  
  return -1; // No valid players
}

export function determineWinner(players: { [key: string]: Player }, communityCards: Card[]): { winner: Player; hand: HandResult } | null {
  const activePlayers = getActivePlayers(players);
  
  if (activePlayers.length === 0) return null;
  if (activePlayers.length === 1) {
    return { 
      winner: activePlayers[0], 
      hand: { rank: 0, name: 'Last Standing', cards: [], kickers: [] } 
    };
  }
  
  let bestPlayer: Player | null = null;
  let bestHand: HandResult | null = null;
  
  for (const player of activePlayers) {
    const hand = evaluateHand(player.cards, communityCards);
    if (!bestHand || hand.rank > bestHand.rank || 
        (hand.rank === bestHand.rank && compareKickers(hand.kickers, bestHand.kickers) > 0)) {
      bestPlayer = player;
      bestHand = hand;
    }
  }
  
  return bestPlayer && bestHand ? { winner: bestPlayer, hand: bestHand } : null;
}
