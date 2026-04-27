import { create } from 'zustand';
import { User } from 'firebase/auth';

export type UserRole = 'teacher';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userProfile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setLoading: (loading) => set({ loading }),
}));
