'use client';

import { useAuth } from '@/lib/auth-context';
import { useGame } from '@/lib/game-context';
import AuthForm from '@/components/AuthForm';
import Lobby from '@/components/Lobby';
import PokerTable from '@/components/PokerTable';
import AdminPanel from '@/components/AdminPanel';
import { useState } from 'react';

export default function Home() {
  const { user, userData, loading: authLoading, signOut } = useAuth();
  const { currentGame, setCurrentGame } = useGame();
  const [showAdmin, setShowAdmin] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData) {
    return <AuthForm />;
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-black/30 border-b border-yellow-500/30">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold gold-text">♠ Poker Friends ♥</h1>
            {currentGame && (
              <button
                onClick={() => setCurrentGame(null)}
                className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
              >
                ← Back to Lobby
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">🪙</span>
              <span className="font-bold text-yellow-300">{userData.coins.toLocaleString()}</span>
            </div>
            
            <span className="text-gray-300">|</span>
            
            <span className="text-gray-300">{userData.displayName}</span>
            
            {userData.isAdmin && (
              <button
                onClick={() => setShowAdmin(!showAdmin)}
                className="bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded text-sm"
              >
                Admin
              </button>
            )}
            
            <button
              onClick={signOut}
              className="bg-red-600 hover:bg-red-500 px-4 py-1 rounded text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Admin Panel */}
      {showAdmin && userData.isAdmin && (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      )}

      {/* Main Content */}
      {currentGame ? (
        <PokerTable />
      ) : (
        <Lobby />
      )}
    </main>
  );
}
