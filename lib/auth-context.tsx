'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { ref, set, get, onValue } from 'firebase/database';
import { auth, database } from './firebase';

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  coins: number;
  isAdmin: boolean;
  createdAt: number;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateCoins: (amount: number) => Promise<void>;
  giveCoins: (userId: string, amount: number) => Promise<void>;
  getAllUsers: () => Promise<UserData[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Listen to user data changes
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserData(snapshot.val());
          }
        });
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    
    // Check if this is the first user (make them admin)
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    const isFirstUser = !snapshot.exists();
    
    // Create user data in database
    const newUserData: UserData = {
      uid: userCredential.user.uid,
      email: email,
      displayName: displayName,
      coins: 1000, // Starting coins
      isAdmin: isFirstUser, // First user is admin
      createdAt: Date.now()
    };
    
    await set(ref(database, `users/${userCredential.user.uid}`), newUserData);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const updateCoins = async (amount: number) => {
    if (!user || !userData) return;
    const newCoins = userData.coins + amount;
    await set(ref(database, `users/${user.uid}/coins`), newCoins);
  };

  const giveCoins = async (userId: string, amount: number) => {
    if (!userData?.isAdmin) {
      throw new Error('Only admins can give coins');
    }
    
    const userRef = ref(database, `users/${userId}/coins`);
    const snapshot = await get(userRef);
    const currentCoins = snapshot.val() || 0;
    await set(userRef, currentCoins + amount);
  };

  const getAllUsers = async (): Promise<UserData[]> => {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      return Object.values(snapshot.val());
    }
    return [];
  };

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      loading,
      signIn,
      signUp,
      signOut,
      updateCoins,
      giveCoins,
      getAllUsers
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
