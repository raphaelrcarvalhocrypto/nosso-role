"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase/client';
import { useRouter } from 'next/navigation';

interface SecureAuthWrapperProps {
  children: React.ReactNode;
  requireVerifiedSession?: boolean;
}

export default function SecureAuthWrapper({ 
  children, 
  requireVerifiedSession = false 
}: SecureAuthWrapperProps) {
  const { user, loading, initialized, initialize, error } = useAuthStore();
  const [isSessionValid, setIsSessionValid] = useState(true);
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!initialized || error) return;

    const verifySession = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      if (requireVerifiedSession) {
        // Aqui você pode adicionar verificações adicionais de segurança
        // como validação de token JWT mais rigorosa
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsSessionValid(false);
          router.push('/login');
          return;
        }
        
        // Verificação adicional de integridade da sessão
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, couple_id')
            .eq('id', user.id)
            .single();
          
          if (!profile) {
            setIsSessionValid(false);
            router.push('/login');
            return;
          }
        } catch (err) {
          console.error('Erro na verificação de perfil:', err);
          setIsSessionValid(false);
          router.push('/login');
          return;
        }
      }
    };

    verifySession();
  }, [user, initialized, error, router, requireVerifiedSession]);

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f1115]">
        <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !isSessionValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f1115] p-4">
        <div className="glass p-8 rounded-2xl max-w-md w-full border border-rose-500/30 text-center shadow-lg">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-serif text-slate-900 dark:text-slate-100 mb-4">Erro de Autenticação</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
            {error || 'Sessão inválida. Faça login novamente.'}
          </p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-rose-500 hover:bg-rose-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}