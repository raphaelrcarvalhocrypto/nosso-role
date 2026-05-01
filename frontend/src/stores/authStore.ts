import { create } from 'zustand';
import type { Subscription } from '@supabase/supabase-js';
import { AuthUser, supabase } from '@/services/supabase/client';

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
const AUTH_INIT_TIMEOUT_MS = 10000;

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
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tempo limite na inicializacao da autenticacao.')), AUTH_INIT_TIMEOUT_MS),
        ),
      ]);

      const { data: sessionData, error: sessionError } = sessionResult;
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
