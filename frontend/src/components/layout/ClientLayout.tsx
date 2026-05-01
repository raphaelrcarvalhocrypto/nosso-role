"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/navigation/Sidebar';
import BottomNav from '@/components/navigation/BottomNav';
import { Moon, Sun } from 'lucide-react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized, initialize, error } = useAuthStore();
  const { isDarkMode, toggleTheme, initTheme } = useThemeStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    if (!initialized || error) return;

    const isAuthRoute = pathname === '/login' || pathname === '/register';
    if (!user && !isAuthRoute) {
      router.push('/login');
    } else if (user && isAuthRoute) {
      router.push('/dashboard');
    }
  }, [user, initialized, pathname, router, error]);

  const ThemeToggleBtn = () => (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 p-3 rounded-full glass border border-slate-200/20 dark:border-white/5 text-slate-800 dark:text-slate-200 hover:scale-105 transition-all shadow-sm"
      aria-label="Toggle Theme"
    >
      {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );

  if (!initialized || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f1115]">
      <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin"></div>
    </div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f1115] p-4">
        <ThemeToggleBtn />
        <div className="glass p-8 rounded-2xl max-w-md w-full border border-rose-500/30 text-center shadow-lg">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-serif text-slate-900 dark:text-slate-100 mb-4">Erro de Configuração</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
            {error}
          </p>
          <div className="text-xs text-slate-500 bg-slate-200/50 dark:bg-white/5 p-4 rounded-xl border border-slate-300/50 dark:border-white/5 mx-auto text-left break-words">
            Por favor, verifique as configurações do Supabase.
          </div>
        </div>
      </div>
    );
  }

  const isAuthRoute = pathname === '/login' || pathname === '/register';

  if (isAuthRoute) {
    return (
       <>
         <ThemeToggleBtn />
         {children}
       </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#0f1115] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <ThemeToggleBtn />
      <div className="hidden md:block w-72 h-full glass border-r border-slate-200 dark:border-white/5 relative z-10">
        <Sidebar />
      </div>
      
      <main className="flex-1 h-full overflow-y-auto pb-28 md:pb-0 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-wine-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto p-4 sm:p-6 md:p-8 pb-32">
          {children}
        </div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 w-full glass border-t border-slate-200 dark:border-white/5 z-50">
        <BottomNav />
      </div>
    </div>
  );
}
