import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, getOrCreateUserProfile, getFirebaseErrorMessage, ADMIN_EMAIL, ADMIN_EMAILS } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isApproved: boolean;
  isPending: boolean;
  isBlocked: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const refreshProfile = async () => {
    if (!auth.currentUser) {
      setUserProfile(null);
      return;
    }
    try {
      const profile = await getOrCreateUserProfile(auth.currentUser);
      setUserProfile(profile);
    } catch (err: any) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await getOrCreateUserProfile(user);
          setUserProfile(profile);
        } catch (err) {
          console.error('Error fetching profile in onAuthStateChanged:', err);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const profile = await getOrCreateUserProfile(cred.user);
      setUserProfile(profile);
    } catch (err: any) {
      const msg = getFirebaseErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() }).catch(() => {});
      }
      const profile = await getOrCreateUserProfile(cred.user, name.trim());
      setUserProfile(profile);
    } catch (err: any) {
      const msg = getFirebaseErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setCurrentUser(null);
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      const msg = getFirebaseErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    const emailLower = (currentUser.email || '').toLowerCase();
    const isEmailAdmin = ADMIN_EMAILS.includes(emailLower);
    const isRoleAdmin = userProfile?.role === 'admin';
    return isEmailAdmin || isRoleAdmin;
  }, [currentUser, userProfile]);

  const isApproved = useMemo(() => {
    if (!userProfile) return false;
    if (isAdmin) return true;
    return userProfile.status === 'active';
  }, [userProfile, isAdmin]);

  const isPending = useMemo(() => {
    if (!userProfile) return false;
    if (isAdmin) return false;
    return userProfile.status === 'pending';
  }, [userProfile, isAdmin]);

  const isBlocked = useMemo(() => {
    if (!userProfile) return false;
    return userProfile.status === 'blocked';
  }, [userProfile]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAdmin,
        isApproved,
        isPending,
        isBlocked,
        loading,
        error,
        login,
        register,
        logout,
        resetPassword,
        refreshProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
