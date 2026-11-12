import { create } from 'zustand';
import type { UserModel } from '@/shared/session/types';

/**
 * The current user, in memory only (auth doc §8.1). "Signed in" means a
 * current user is set — not merely that a token is stored (§6).
 */
export type SessionStatus = 'restoring' | 'signedIn' | 'signedOut';

interface SessionState {
  status: SessionStatus;
  model: UserModel | null;
  signIn: (model: UserModel) => void;
  signOut: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'restoring',
  model: null,
  signIn: (model) => set({ status: 'signedIn', model }),
  signOut: () => set({ status: 'signedOut', model: null }),
}));
