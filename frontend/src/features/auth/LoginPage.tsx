"use client";

import { useState } from 'react';
import { supabase } from '@/src/services/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const redirectTo = `${window.location.origin}/dashboard`;
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

      if (authError) {
        throw authError;
      }
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao fazer login com o Google.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-[#0f1115]">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-rose-500/10 dark:bg-rose-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-wine-500/10 dark:bg-wine-500/10 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md p-8 sm:p-12 glass rounded-2xl sm:border border-slate-200/50 dark:border-white/5 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 items-center justify-center shadow-lg shadow-rose-500/20 mb-6">
            <span className="text-white text-3xl">❤</span>
          </div>
          <h1 className="font-serif text-4xl font-medium tracking-wide mb-2 text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-slate-300">
            Bem-vindos
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Entre para acessar seu mundo particular.</p>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 px-4 py-3 rounded-xl mb-6 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white py-4 rounded-xl font-medium shadow-md transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-3 border border-slate-200 dark:border-white/10"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? 'Aguarde...' : 'Entrar com Google'}
        </button>

        <p className="border-t border-slate-200/50 dark:border-white/5 mt-8 pt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Ainda não têm uma conta?{' '}
          <Link href="/register" className="text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 font-medium transition-colors">
            Criar espaço
          </Link>
        </p>
      </div>
    </div>
  );
}
