'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  coins: number;
  isAdmin: boolean;
  createdAt: number;
}

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const { giveCoins, getAllUsers, userData } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [giveAmounts, setGiveAmounts] = useState<{ [key: string]: number }>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers.sort((a, b) => b.coins - a.coins));
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGiveCoins = async (userId: string) => {
    const amount = giveAmounts[userId] || 0;
    if (amount <= 0) return;

    try {
      await giveCoins(userId, amount);
      setMessage(`Gave ${amount} coins to user!`);
      setGiveAmounts({ ...giveAmounts, [userId]: 0 });
      await loadUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleGiveToAll = async () => {
    const amount = 500;
    try {
      for (const user of users) {
        if (user.uid !== userData?.uid) {
          await giveCoins(user.uid, amount);
        }
      }
      setMessage(`Gave ${amount} coins to everyone!`);
      await loadUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-purple-500/50">
        {/* Header */}
        <div className="bg-purple-900/50 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>👑</span> Admin Panel
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {message && (
            <div className={`mb-4 px-4 py-2 rounded-lg ${
              message.startsWith('Error') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'
            }`}>
              {message}
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-6 p-4 bg-gray-800/50 rounded-xl">
            <h3 className="font-bold mb-3">Quick Actions</h3>
            <button
              onClick={handleGiveToAll}
              className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded text-sm"
            >
              🎁 Give 500 coins to everyone
            </button>
          </div>

          {/* Users List */}
          <h3 className="font-bold mb-3">All Players ({users.length})</h3>
          
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading users...</div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.uid}
                  className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      user.isAdmin ? 'bg-purple-600' : 'bg-gray-600'
                    }`}>
                      {user.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        {user.displayName}
                        {user.isAdmin && <span className="text-purple-400 text-xs">ADMIN</span>}
                      </div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-yellow-400 font-bold">🪙 {user.coins.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {user.uid !== userData?.uid && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={giveAmounts[user.uid] || ''}
                          onChange={(e) => setGiveAmounts({
                            ...giveAmounts,
                            [user.uid]: Number(e.target.value)
                          })}
                          className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          placeholder="Amount"
                          min={1}
                        />
                        <button
                          onClick={() => handleGiveCoins(user.uid)}
                          className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm"
                          disabled={!giveAmounts[user.uid] || giveAmounts[user.uid] <= 0}
                        >
                          Give
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-800/50 text-sm text-gray-400">
          💡 Tip: Use the admin panel to give coins to friends who are running low!
        </div>
      </div>
    </div>
  );
}
