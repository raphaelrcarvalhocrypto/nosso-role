import { create } from 'zustand';
import { AuthUser, supabase } from '@/src/services/supabase/client';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  initialize: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  error: null,
  initialize: async () => {
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

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null, initialized: true, loading: false, error: null });
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Falha ao inicializar autenticação.';
      console.error('Auth config error', e);
      set({
        initialized: true,
        loading: false,
        error: `${errorMessage} Verifique suas credenciais Supabase.`,
      });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
