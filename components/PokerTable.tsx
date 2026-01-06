'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useGame } from '@/lib/game-context';
import PlayingCard from './PlayingCard';

export default function PokerTable() {
  const { user, userData } = useAuth();
  const { currentGame, startGame, leaveGame, setCurrentGame, fold, check, call, raise, allIn } = useGame();
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showRaise, setShowRaise] = useState(false);

  if (!currentGame || !user || !userData) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <p className="text-xl">Loading game...</p>
      </div>
    );
  }

  const players = Object.values(currentGame.players);
  const currentPlayer = currentGame.players[user.uid];
  const isMyTurn = currentPlayer?.isTurn;
  const canStart = currentGame.createdBy === user.uid && 
                   currentGame.phase === 'waiting' && 
                   players.length >= currentGame.minPlayers;

  const handleLeave = async () => {
    await leaveGame(currentGame.id);
    setCurrentGame(null);
  };

  const handleStart = async () => {
    try {
      await startGame(currentGame.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRaise = async () => {
    if (raiseAmount > 0) {
      await raise(raiseAmount);
      setShowRaise(false);
      setRaiseAmount(0);
    }
  };

  const callAmount = currentGame.currentBet - (currentPlayer?.bet || 0);
  const minRaise = currentGame.bigBlind;

  // Arrange players around the table
  const getPlayerPosition = (index: number, total: number) => {
    const positions: { [key: number]: string[] } = {
      2: ['bottom-4 left-1/2 -translate-x-1/2', 'top-4 left-1/2 -translate-x-1/2'],
      3: ['bottom-4 left-1/2 -translate-x-1/2', 'top-1/4 left-4', 'top-1/4 right-4'],
      4: ['bottom-4 left-1/2 -translate-x-1/2', 'left-4 top-1/2 -translate-y-1/2', 'top-4 left-1/2 -translate-x-1/2', 'right-4 top-1/2 -translate-y-1/2'],
      5: ['bottom-4 left-1/2 -translate-x-1/2', 'bottom-1/4 left-4', 'top-4 left-1/4', 'top-4 right-1/4', 'bottom-1/4 right-4'],
      6: ['bottom-4 left-1/2 -translate-x-1/2', 'bottom-1/4 left-4', 'top-1/4 left-4', 'top-4 left-1/2 -translate-x-1/2', 'top-1/4 right-4', 'bottom-1/4 right-4'],
      7: ['bottom-4 left-1/2 -translate-x-1/2', 'bottom-4 left-1/4', 'left-4 top-1/3', 'top-4 left-1/3', 'top-4 right-1/3', 'right-4 top-1/3', 'bottom-4 right-1/4'],
      8: ['bottom-4 left-1/2 -translate-x-1/2', 'bottom-4 left-1/4', 'left-4 top-1/2 -translate-y-1/2', 'top-4 left-1/4', 'top-4 left-1/2 -translate-x-1/2', 'top-4 right-1/4', 'right-4 top-1/2 -translate-y-1/2', 'bottom-4 right-1/4'],
    };
    return positions[total]?.[index] || 'bottom-4 left-1/2 -translate-x-1/2';
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Game Info Bar */}
      <div className="flex justify-between items-center mb-4 bg-black/30 rounded-xl px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-gray-400">
            Table #{currentGame.id.slice(0, 8)}
          </span>
          <span className="text-gray-400">
            Blinds: {currentGame.smallBlind}/{currentGame.bigBlind}
          </span>
          <span className={`font-bold ${
            currentGame.phase === 'waiting' ? 'text-blue-400' :
            currentGame.phase === 'showdown' ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {currentGame.phase.toUpperCase()}
          </span>
        </div>
        
        <button
          onClick={handleLeave}
          className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm"
        >
          Leave Table
        </button>
      </div>

      {/* Last Action */}
      {currentGame.lastAction && (
        <div className="text-center mb-4">
          <span className="bg-black/50 px-6 py-2 rounded-full text-yellow-300">
            {currentGame.lastAction}
          </span>
        </div>
      )}

      {/* Poker Table */}
      <div className="relative mx-auto" style={{ maxWidth: '900px', height: '500px' }}>
        {/* Table Felt */}
        <div className="absolute inset-0 poker-table">
          {/* Pot Display */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="pot-display">
              <span className="text-yellow-400 text-2xl font-bold">🪙 {currentGame.pot}</span>
            </div>
            
            {/* Community Cards */}
            <div className="flex gap-2 justify-center mt-4">
              {currentGame.communityCards.map((card, i) => (
                <PlayingCard key={i} card={card} size="md" className="animate-deal" />
              ))}
              {/* Placeholder cards */}
              {Array(5 - currentGame.communityCards.length).fill(null).map((_, i) => (
                <div 
                  key={`empty-${i}`} 
                  className="w-14 h-20 rounded-lg border-2 border-dashed border-gray-600/30"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Player Seats */}
        {players.map((player, index) => {
          const isMe = player.id === user.uid;
          const position = getPlayerPosition(index, players.length);
          const showCards = isMe || currentGame.phase === 'showdown';
          
          return (
            <div
              key={player.id}
              className={`absolute ${position} player-seat ${
                player.isTurn ? 'active' : ''
              } ${player.folded ? 'folded' : ''} ${
                currentGame.winner === player.id ? 'winner' : ''
              }`}
              style={{ width: '140px' }}
            >
              {/* Player Info */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  isMe ? 'bg-yellow-600' : 'bg-gray-600'
                }`}>
                  {player.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">
                    {player.name}
                    {player.isDealer && <span className="ml-1 text-yellow-400">Ⓓ</span>}
                  </div>
                  <div className="text-xs text-yellow-400">🪙 {player.coins}</div>
                </div>
              </div>

              {/* Player Cards */}
              <div className="flex gap-1 justify-center">
                {player.cards.length > 0 ? (
                  player.cards.map((card, i) => (
                    <PlayingCard 
                      key={i} 
                      card={showCards ? card : undefined} 
                      faceDown={!showCards}
                      size="sm" 
                    />
                  ))
                ) : (
                  <div className="text-xs text-gray-500">No cards</div>
                )}
              </div>

              {/* Bet Amount */}
              {player.bet > 0 && (
                <div className="text-center mt-1">
                  <span className="bg-yellow-600/80 px-2 py-0.5 rounded text-xs font-bold">
                    Bet: {player.bet}
                  </span>
                </div>
              )}

              {/* Status */}
              {player.folded && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                  <span className="text-red-400 font-bold">FOLDED</span>
                </div>
              )}
              {player.isAllIn && !player.folded && (
                <div className="text-center mt-1">
                  <span className="bg-red-600 px-2 py-0.5 rounded text-xs font-bold animate-pulse">
                    ALL IN
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-center">
        {currentGame.phase === 'waiting' ? (
          <div className="text-center">
            <p className="text-gray-400 mb-4">
              Waiting for players... ({players.length}/{currentGame.minPlayers} minimum)
            </p>
            {canStart && (
              <button
                onClick={handleStart}
                className="btn-poker btn-green text-xl"
              >
                🎲 Start Game
              </button>
            )}
          </div>
        ) : currentGame.phase === 'showdown' ? (
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-4">
              🏆 {currentGame.players[currentGame.winner || '']?.name} wins with {currentGame.winningHand}!
            </div>
            {currentGame.createdBy === user.uid && (
              <button
                onClick={handleStart}
                className="btn-poker btn-green"
              >
                Deal New Hand
              </button>
            )}
          </div>
        ) : isMyTurn && currentPlayer && !currentPlayer.folded ? (
          <div className="flex flex-wrap gap-3 justify-center items-center bg-black/50 rounded-xl p-4">
            <button
              onClick={fold}
              className="btn-poker btn-red"
            >
              Fold
            </button>
            
            {currentPlayer.bet >= currentGame.currentBet ? (
              <button
                onClick={check}
                className="btn-poker btn-blue"
              >
                Check
              </button>
            ) : (
              <button
                onClick={call}
                className="btn-poker btn-blue"
                disabled={userData.coins < callAmount}
              >
                Call {callAmount}
              </button>
            )}
            
            {showRaise ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(Math.max(minRaise, Number(e.target.value)))}
                  className="w-24 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                  min={minRaise}
                  max={userData.coins}
                />
                <button
                  onClick={handleRaise}
                  className="btn-poker btn-gold"
                  disabled={raiseAmount < minRaise}
                >
                  Raise
                </button>
                <button
                  onClick={() => setShowRaise(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setRaiseAmount(currentGame.bigBlind * 2);
                  setShowRaise(true);
                }}
                className="btn-poker btn-gold"
              >
                Raise
              </button>
            )}
            
            <button
              onClick={allIn}
              className="btn-poker bg-purple-600 hover:bg-purple-500"
            >
              All In ({userData.coins})
            </button>
          </div>
        ) : (
          <div className="text-gray-400">
            {currentPlayer?.folded ? 'You folded this hand' : 'Waiting for other players...'}
          </div>
        )}
      </div>

      {/* My Hand Summary */}
      {currentPlayer && currentPlayer.cards.length > 0 && !currentPlayer.folded && (
        <div className="fixed bottom-4 left-4 bg-black/80 rounded-xl p-4 border border-yellow-500/30">
          <div className="text-sm text-gray-400 mb-2">Your Hand</div>
          <div className="flex gap-2">
            {currentPlayer.cards.map((card, i) => (
              <PlayingCard key={i} card={card} size="md" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
