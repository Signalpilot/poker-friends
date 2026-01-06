'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { ref, set, get, onValue, remove, update } from 'firebase/database';
import { database } from './firebase';
import { useAuth } from './auth-context';
import { 
  GameState, 
  Player, 
  Card, 
  createDeck, 
  getNextPlayerIndex,
  determineWinner,
  getActivePlayers
} from './poker';
import { v4 as uuidv4 } from 'uuid';

interface GameContextType {
  games: GameState[];
  currentGame: GameState | null;
  loading: boolean;
  createGame: (name: string, smallBlind: number, bigBlind: number) => Promise<string>;
  joinGame: (gameId: string) => Promise<void>;
  leaveGame: (gameId: string) => Promise<void>;
  startGame: (gameId: string) => Promise<void>;
  placeBet: (amount: number) => Promise<void>;
  fold: () => Promise<void>;
  check: () => Promise<void>;
  call: () => Promise<void>;
  raise: (amount: number) => Promise<void>;
  allIn: () => Promise<void>;
  setCurrentGame: (gameId: string | null) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const { user, userData, updateCoins } = useAuth();
  const [games, setGames] = useState<GameState[]>([]);
  const [currentGame, setCurrentGameState] = useState<GameState | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to all games
  useEffect(() => {
    const gamesRef = ref(database, 'games');
    const unsubscribe = onValue(gamesRef, (snapshot) => {
      if (snapshot.exists()) {
        const gamesData = snapshot.val();
        setGames(Object.values(gamesData));
      } else {
        setGames([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to current game
  useEffect(() => {
    if (!currentGameId) {
      setCurrentGameState(null);
      return;
    }

    const gameRef = ref(database, `games/${currentGameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurrentGameState(snapshot.val());
      } else {
        setCurrentGameState(null);
        setCurrentGameId(null);
      }
    });

    return () => unsubscribe();
  }, [currentGameId]);

  const setCurrentGame = (gameId: string | null) => {
    setCurrentGameId(gameId);
  };

  const createGame = async (name: string, smallBlind: number, bigBlind: number): Promise<string> => {
    if (!user || !userData) throw new Error('Must be logged in');

    const gameId = uuidv4();
    const newGame: GameState = {
      id: gameId,
      players: {},
      communityCards: [],
      pot: 0,
      currentBet: 0,
      phase: 'waiting',
      deck: [],
      dealerIndex: 0,
      currentPlayerIndex: 0,
      turnOrder: [],
      smallBlind,
      bigBlind,
      minPlayers: 2,
      maxPlayers: 8,
      createdBy: user.uid,
    };

    await set(ref(database, `games/${gameId}`), newGame);
    return gameId;
  };

  const joinGame = async (gameId: string) => {
    if (!user || !userData) throw new Error('Must be logged in');

    const gameRef = ref(database, `games/${gameId}`);
    const snapshot = await get(gameRef);

    if (!snapshot.exists()) throw new Error('Game not found');

    const game: GameState = snapshot.val();
    const players = game.players || {};

    if (game.phase !== 'waiting') throw new Error('Game already in progress');
    if (Object.keys(players).length >= game.maxPlayers) throw new Error('Game is full');
    if (players[user.uid]) throw new Error('Already in game');

    const player: Player = {
      id: user.uid,
      name: userData.displayName,
      coins: userData.coins,
      cards: [],
      bet: 0,
      folded: false,
      isAllIn: false,
      isDealer: Object.keys(players).length === 0,
      isTurn: false,
      isAdmin: userData.isAdmin
    };

    await set(ref(database, `games/${gameId}/players/${user.uid}`), player);
  };

  const leaveGame = async (gameId: string) => {
    if (!user) throw new Error('Must be logged in');

    const gameRef = ref(database, `games/${gameId}`);
    const snapshot = await get(gameRef);
    
    if (!snapshot.exists()) return;
    
    const game: GameState = snapshot.val();
    
    // Remove player from game
    await remove(ref(database, `games/${gameId}/players/${user.uid}`));
    
    // If no players left, delete the game
    const playersSnapshot = await get(ref(database, `games/${gameId}/players`));
    if (!playersSnapshot.exists() || Object.keys(playersSnapshot.val()).length === 0) {
      await remove(gameRef);
    }
  };

  const startGame = async (gameId: string) => {
    if (!user) throw new Error('Must be logged in');

    const gameRef = ref(database, `games/${gameId}`);
    const snapshot = await get(gameRef);
    
    if (!snapshot.exists()) throw new Error('Game not found');
    
    const game: GameState = snapshot.val();
    
    if (game.createdBy !== user.uid) throw new Error('Only game creator can start');
    const gamePlayers = game.players || {};
    if (Object.keys(gamePlayers).length < game.minPlayers) throw new Error('Not enough players');

    const deck = createDeck();
    const playerIds = Object.keys(gamePlayers);
    const players = { ...gamePlayers };

    // Deal 2 cards to each player
    playerIds.forEach((playerId, index) => {
      players[playerId].cards = [deck.pop()!, deck.pop()!];
      players[playerId].isDealer = index === 0;
      players[playerId].bet = 0;
      players[playerId].folded = false;
      players[playerId].isAllIn = false;
    });

    // Set blinds
    const sbIndex = playerIds.length === 2 ? 0 : 1;
    const bbIndex = playerIds.length === 2 ? 1 : 2;
    
    players[playerIds[sbIndex]].bet = game.smallBlind;
    players[playerIds[bbIndex]].bet = game.bigBlind;

    // First to act is after big blind
    const firstToAct = (bbIndex + 1) % playerIds.length;
    players[playerIds[firstToAct]].isTurn = true;

    const updates: Partial<GameState> = {
      phase: 'preflop',
      deck: deck,
      players,
      pot: game.smallBlind + game.bigBlind,
      currentBet: game.bigBlind,
      turnOrder: playerIds,
      currentPlayerIndex: firstToAct,
      dealerIndex: 0,
    };

    await update(gameRef, updates);
  };

  const advancePhase = useCallback(async (game: GameState) => {
    const gameRef = ref(database, `games/${game.id}`);
    const deck = [...(game.deck || [])];
    let communityCards = [...(game.communityCards || [])];
    let newPhase = game.phase;

    // Reset bets for new round
    const players = { ...(game.players || {}) };
    Object.keys(players).forEach(id => {
      players[id].bet = 0;
      players[id].isTurn = false;
    });

    switch (game.phase) {
      case 'preflop':
        // Deal flop (3 cards)
        deck.pop(); // Burn card
        communityCards = [deck.pop()!, deck.pop()!, deck.pop()!];
        newPhase = 'flop';
        break;
      case 'flop':
        // Deal turn (1 card)
        deck.pop(); // Burn card
        communityCards.push(deck.pop()!);
        newPhase = 'turn';
        break;
      case 'turn':
        // Deal river (1 card)
        deck.pop(); // Burn card
        communityCards.push(deck.pop()!);
        newPhase = 'river';
        break;
      case 'river':
        // Showdown
        newPhase = 'showdown';
        const result = determineWinner(players, communityCards);
        if (result) {
          await update(gameRef, {
            phase: 'showdown',
            communityCards,
            winner: result.winner.id,
            winningHand: result.hand.name,
            lastAction: `${result.winner.name} wins with ${result.hand.name}!`
          });
          
          // Award pot to winner (update their coins in user database)
          const winnerRef = ref(database, `users/${result.winner.id}/coins`);
          const winnerSnapshot = await get(winnerRef);
          const currentCoins = winnerSnapshot.val() || 0;
          await set(winnerRef, currentCoins + game.pot);
        }
        return;
    }

    // Find first active player after dealer
    const turnOrder = game.turnOrder || [];
    const activePlayers = turnOrder.filter(id => players[id] && !players[id].folded && !players[id].isAllIn);
    if (activePlayers.length > 0 && players[activePlayers[0]]) {
      players[activePlayers[0]].isTurn = true;
    }

    await update(gameRef, {
      phase: newPhase,
      deck,
      communityCards,
      currentBet: 0,
      players,
      currentPlayerIndex: turnOrder.indexOf(activePlayers[0]) || 0
    });
  }, []);

  const checkRoundComplete = useCallback(async (game: GameState) => {
    const activePlayers = getActivePlayers(game.players || {});
    
    // If only one player left, they win
    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      const gameRef = ref(database, `games/${game.id}`);
      
      await update(gameRef, {
        phase: 'showdown',
        winner: winner.id,
        winningHand: 'Last Standing',
        lastAction: `${winner.name} wins! All others folded.`
      });
      
      // Award pot to winner
      const winnerRef = ref(database, `users/${winner.id}/coins`);
      const winnerSnapshot = await get(winnerRef);
      const currentCoins = winnerSnapshot.val() || 0;
      await set(winnerRef, currentCoins + game.pot);
      return;
    }

    // Check if all active players have matched the current bet (or are all-in)
    const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn);
    const allMatched = playersWhoCanAct.every(p => p.bet === game.currentBet);
    
    // Also need everyone to have acted at least once
    if (allMatched && playersWhoCanAct.length > 0) {
      await advancePhase(game);
    }
  }, [advancePhase]);

  const moveToNextPlayer = useCallback(async (game: GameState) => {
    const gamePlayers = game.players || {};
    const turnOrder = game.turnOrder || [];
    const nextIndex = getNextPlayerIndex(game.currentPlayerIndex, turnOrder, gamePlayers);

    if (nextIndex === -1) {
      // No more players can act, advance phase
      await advancePhase(game);
      return;
    }

    const players = { ...gamePlayers };
    turnOrder.forEach(id => {
      if (players[id]) players[id].isTurn = false;
    });
    if (players[turnOrder[nextIndex]]) {
      players[turnOrder[nextIndex]].isTurn = true;
    }

    await update(ref(database, `games/${game.id}`), {
      currentPlayerIndex: nextIndex,
      players
    });

    // Check if round is complete after turn change
    const updatedGameRef = ref(database, `games/${game.id}`);
    const snapshot = await get(updatedGameRef);
    if (snapshot.exists()) {
      await checkRoundComplete(snapshot.val());
    }
  }, [advancePhase, checkRoundComplete]);

  const placeBet = async (amount: number) => {
    if (!user || !currentGame) throw new Error('Not in a game');
    
    const player = currentGame.players[user.uid];
    if (!player || !player.isTurn) throw new Error('Not your turn');

    const gameRef = ref(database, `games/${currentGame.id}`);
    const playerRef = ref(database, `games/${currentGame.id}/players/${user.uid}`);
    
    // Deduct from user's coins
    await updateCoins(-amount);
    
    await update(playerRef, {
      bet: player.bet + amount,
      isTurn: false
    });

    await update(gameRef, {
      pot: currentGame.pot + amount,
      currentBet: Math.max(currentGame.currentBet, player.bet + amount),
      lastAction: `${player.name} bets ${amount}`
    });

    // Move to next player
    const snapshot = await get(gameRef);
    if (snapshot.exists()) {
      await moveToNextPlayer(snapshot.val());
    }
  };

  const fold = async () => {
    if (!user || !currentGame) throw new Error('Not in a game');
    
    const player = currentGame.players[user.uid];
    if (!player || !player.isTurn) throw new Error('Not your turn');

    await update(ref(database, `games/${currentGame.id}/players/${user.uid}`), {
      folded: true,
      isTurn: false
    });

    await update(ref(database, `games/${currentGame.id}`), {
      lastAction: `${player.name} folds`
    });

    const snapshot = await get(ref(database, `games/${currentGame.id}`));
    if (snapshot.exists()) {
      await checkRoundComplete(snapshot.val());
      const updatedSnapshot = await get(ref(database, `games/${currentGame.id}`));
      if (updatedSnapshot.exists() && updatedSnapshot.val().phase !== 'showdown') {
        await moveToNextPlayer(updatedSnapshot.val());
      }
    }
  };

  const check = async () => {
    if (!user || !currentGame) throw new Error('Not in a game');
    
    const player = currentGame.players[user.uid];
    if (!player || !player.isTurn) throw new Error('Not your turn');
    if (player.bet < currentGame.currentBet) throw new Error('Cannot check, must call or raise');

    await update(ref(database, `games/${currentGame.id}/players/${user.uid}`), {
      isTurn: false
    });

    await update(ref(database, `games/${currentGame.id}`), {
      lastAction: `${player.name} checks`
    });

    const snapshot = await get(ref(database, `games/${currentGame.id}`));
    if (snapshot.exists()) {
      await moveToNextPlayer(snapshot.val());
    }
  };

  const call = async () => {
    if (!user || !currentGame || !userData) throw new Error('Not in a game');
    
    const player = currentGame.players[user.uid];
    if (!player || !player.isTurn) throw new Error('Not your turn');

    const callAmount = currentGame.currentBet - player.bet;
    
    await updateCoins(-callAmount);
    
    await update(ref(database, `games/${currentGame.id}/players/${user.uid}`), {
      bet: currentGame.currentBet,
      isTurn: false
    });

    await update(ref(database, `games/${currentGame.id}`), {
      pot: currentGame.pot + callAmount,
      lastAction: `${player.name} calls ${callAmount}`
    });

    const snapshot = await get(ref(database, `games/${currentGame.id}`));
    if (snapshot.exists()) {
      await moveToNextPlayer(snapshot.val());
    }
  };

  const raise = async (amount: number) => {
    if (!user || !currentGame || !userData) throw new Error('Not in a game');
    
    const player = currentGame.players[user.uid];
    if (!player || !player.isTurn) throw new Error('Not your turn');

    const totalBet = currentGame.currentBet + amount;
    const betAmount = totalBet - player.bet;
    
    await updateCoins(-betAmount);
    
    await update(ref(database, `games/${currentGame.id}/players/${user.uid}`), {
      bet: totalBet,
      isTurn: false
    });

    await update(ref(database, `games/${currentGame.id}`), {
      pot: currentGame.pot + betAmount,
      currentBet: totalBet,
      lastAction: `${player.name} raises to ${totalBet}`
    });

    const snapshot = await get(ref(database, `games/${currentGame.id}`));
    if (snapshot.exists()) {
      await moveToNextPlayer(snapshot.val());
    }
  };

  const allIn = async () => {
    if (!user || !currentGame || !userData) throw new Error('Not in a game');
    
    const player = currentGame.players[user.uid];
    if (!player || !player.isTurn) throw new Error('Not your turn');

    const allInAmount = userData.coins;
    
    await updateCoins(-allInAmount);
    
    await update(ref(database, `games/${currentGame.id}/players/${user.uid}`), {
      bet: player.bet + allInAmount,
      isAllIn: true,
      isTurn: false
    });

    await update(ref(database, `games/${currentGame.id}`), {
      pot: currentGame.pot + allInAmount,
      currentBet: Math.max(currentGame.currentBet, player.bet + allInAmount),
      lastAction: `${player.name} goes ALL IN with ${allInAmount}!`
    });

    const snapshot = await get(ref(database, `games/${currentGame.id}`));
    if (snapshot.exists()) {
      await moveToNextPlayer(snapshot.val());
    }
  };

  return (
    <GameContext.Provider value={{
      games,
      currentGame,
      loading,
      createGame,
      joinGame,
      leaveGame,
      startGame,
      placeBet,
      fold,
      check,
      call,
      raise,
      allIn,
      setCurrentGame
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
