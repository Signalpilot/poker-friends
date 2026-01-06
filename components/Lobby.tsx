'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useGame } from '@/lib/game-context';

export default function Lobby() {
  const { userData } = useAuth();
  const { games, loading, createGame, joinGame, setCurrentGame } = useGame();
  const [showCreate, setShowCreate] = useState(false);
  const [tableName, setTableName] = useState('');
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [error, setError] = useState('');

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const gameId = await createGame(tableName || 'Friendly Table', smallBlind, bigBlind);
      await joinGame(gameId);
      setCurrentGame(gameId);
      setShowCreate(false);
      setTableName('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    try {
      await joinGame(gameId);
      setCurrentGame(gameId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const waitingGames = games.filter(g => g.phase === 'waiting');
  const activeGames = games.filter(g => g.phase !== 'waiting' && g.phase !== 'showdown');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Card */}
      <div className="bg-gray-900/80 rounded-2xl p-6 mb-8 border border-yellow-500/30">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome, {userData?.displayName}! 👋</h2>
            <p className="text-gray-400">Create a table or join your friends</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-poker btn-gold text-lg"
          >
            🎲 Create Table
          </button>
        </div>
      </div>

      {/* Create Game Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-yellow-500/30">
            <h3 className="text-2xl font-bold mb-6 gold-text">Create New Table</h3>
            
            <form onSubmit={handleCreateGame} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Table Name</label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none"
                  placeholder="Friday Night Poker"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Small Blind</label>
                  <input
                    type="number"
                    value={smallBlind}
                    onChange={(e) => setSmallBlind(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Big Blind</label>
                  <input
                    type="number"
                    value={bigBlind}
                    onChange={(e) => setBigBlind(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none"
                    min={2}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 btn-poker bg-gray-700 hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-poker btn-green"
                >
                  Create & Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Game Lists */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Waiting Games */}
        <div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-green-400">●</span> Open Tables
          </h3>
          
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : waitingGames.length === 0 ? (
            <div className="bg-gray-900/50 rounded-xl p-6 text-center text-gray-400 border border-gray-700">
              <p className="text-4xl mb-2">🎴</p>
              <p>No open tables. Create one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {waitingGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-gray-900/80 rounded-xl p-4 border border-gray-700 hover:border-yellow-500/50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-lg">Table #{game.id.slice(0, 6)}</h4>
                      <p className="text-sm text-gray-400">
                        Blinds: {game.smallBlind}/{game.bigBlind} •
                        Players: {Object.keys(game.players || {}).length}/{game.maxPlayers}
                      </p>
                    </div>
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      className="btn-poker btn-green text-sm"
                    >
                      Join
                    </button>
                  </div>
                  
                  {/* Player avatars */}
                  <div className="flex gap-1 mt-3">
                    {Object.values(game.players || {}).map((player) => (
                      <div
                        key={player.id}
                        className="bg-gray-700 rounded-full px-3 py-1 text-xs"
                        title={player.name}
                      >
                        {player.name.slice(0, 10)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Games */}
        <div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-yellow-400">●</span> Games in Progress
          </h3>

          {activeGames.length === 0 ? (
            <div className="bg-gray-900/50 rounded-xl p-6 text-center text-gray-400 border border-gray-700">
              <p className="text-4xl mb-2">🃏</p>
              <p>No active games right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-gray-900/80 rounded-xl p-4 border border-yellow-500/30"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-lg">Table #{game.id.slice(0, 6)}</h4>
                      <p className="text-sm text-gray-400">
                        Phase: {game.phase} • Pot: {game.pot} 🪙
                      </p>
                    </div>
                    <span className="text-yellow-400 text-sm">In Progress</span>
                  </div>

                  <div className="flex gap-1 mt-3">
                    {Object.values(game.players || {}).map((player) => (
                      <div
                        key={player.id}
                        className={`rounded-full px-3 py-1 text-xs ${
                          player.folded ? 'bg-gray-700 text-gray-500' : 'bg-green-900 text-green-300'
                        }`}
                      >
                        {player.name.slice(0, 10)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* How to Play */}
      <div className="mt-12 bg-gray-900/50 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold mb-4">🎓 How to Play</h3>
        <div className="grid md:grid-cols-3 gap-6 text-gray-300">
          <div>
            <h4 className="font-bold text-yellow-400 mb-2">1. Create or Join</h4>
            <p className="text-sm">Create a new table or join an existing one. Wait for your friends to join.</p>
          </div>
          <div>
            <h4 className="font-bold text-yellow-400 mb-2">2. Play Texas Hold'em</h4>
            <p className="text-sm">Standard Texas Hold'em rules. Check, call, raise, or fold when it's your turn.</p>
          </div>
          <div>
            <h4 className="font-bold text-yellow-400 mb-2">3. Win Coins!</h4>
            <p className="text-sm">Win the pot by having the best hand or being the last player standing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
