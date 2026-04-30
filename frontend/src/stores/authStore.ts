import { create } from 'zustand';
import type { Subscription } from '@supabase/supabase-js';
import { AuthUser, supabase } from '@/src/services/supabase/client';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  initialize: () => void;
  signOut: () => Promise<void>;
}

let authSubscription: Subscription | null = null;
let initInFlight = false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  error: null,
  initialize: async () => {
    if (initInFlight) {
      return;
    }
    initInFlight = true;

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      set({
        user: sessionData.session?.user ?? null,
        initialized: true,
        loading: false,
        error: null,
      });

      if (!authSubscription) {
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          set({ user: session?.user ?? null, initialized: true, loading: false, error: null });
        });
        authSubscription = listener.subscription;
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Falha ao inicializar autenticacao.';
      console.error('Auth config error', e);
      set({
        initialized: true,
        loading: false,
        error: `${errorMessage} Verifique suas credenciais Supabase.`,
      });
    } finally {
      initInFlight = false;
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
