import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { UserProfile } from '../types/user';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (name: string, email: string, pass: string) => Promise<User>;
  signInWithEmail: (email: string, pass: string) => Promise<User>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmailLink: () => Promise<void>;
  sendVerificationCode: (email: string) => Promise<{ success: boolean; message: string; debugCode?: string }>;
  verifyCode: (email: string, code: string) => Promise<boolean>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  logOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch or create user document in Firestore
  const fetchProfile = async (firebaseUser: User): Promise<UserProfile | null> => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        return data;
      } else {
        // First-time record initialization
        const initialProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          firstName: firebaseUser.displayName ? firebaseUser.displayName.split(' ')[0] : '',
          onboarded: false,
          emailVerified: firebaseUser.emailVerified,
          authProvider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
          createdAt: new Date().toISOString(),
        };

        await setDoc(userDocRef, initialProfile);
        setProfile(initialProfile);
        return initialProfile;
      }
    } catch (err) {
      console.error('Error fetching/creating user profile:', err);
      // Fallback local memory profile so user is not blocked
      const fallbackProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        firstName: firebaseUser.displayName ? firebaseUser.displayName.split(' ')[0] : '',
        onboarded: false,
        emailVerified: firebaseUser.emailVerified,
        authProvider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
        createdAt: new Date().toISOString(),
      };
      setProfile(fallbackProfile);
      return fallbackProfile;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await fetchProfile(result.user);
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (name: string, email: string, pass: string): Promise<User> => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }

    const newProfile: UserProfile = {
      uid: cred.user.uid,
      email: cred.user.email || email,
      displayName: name.trim(),
      firstName: name.trim().split(' ')[0],
      onboarded: false,
      emailVerified: false,
      authProvider: 'password',
      createdAt: new Date().toISOString(),
    };

    const userDocRef = doc(db, 'users', cred.user.uid);
    try {
      await setDoc(userDocRef, newProfile);
      setProfile(newProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${cred.user.uid}`);
    }

    // Attempt sending native Firebase email verification link
    try {
      await sendEmailVerification(cred.user);
    } catch {
      // Ignored if rate limited
    }

    return cred.user;
  };

  const signInWithEmail = async (email: string, pass: string): Promise<User> => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await fetchProfile(cred.user);
    }
    return cred.user;
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const sendVerificationEmailLink = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const sendVerificationCode = async (email: string) => {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send verification code.');
    }
    return data;
  };

  const verifyCode = async (email: string, code: string): Promise<boolean> => {
    const res = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid code.');
    }

    // Mark verified in Firestore profile
    if (auth.currentUser) {
      await updateUserProfile({ emailVerified: true });
    }
    return true;
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const updated = {
      ...(profile || {}),
      ...data,
      uid: user.uid,
      email: user.email || profile?.email || '',
      updatedAt: new Date().toISOString(),
    } as UserProfile;

    try {
      await setDoc(userDocRef, updated, { merge: true });
      setProfile(updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const logOut = async () => {
    await signOut(auth);
    setProfile(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await fetchProfile(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        sendPasswordReset,
        sendVerificationEmailLink,
        sendVerificationCode,
        verifyCode,
        updateUserProfile,
        logOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
