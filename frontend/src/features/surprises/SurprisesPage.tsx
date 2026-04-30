"use client";

import { useEffect, useState } from 'react';
import { handleDatabaseError, OperationType, supabase } from '@/src/services/supabase/client';
import { ensureProfileAndSettings } from '@/src/services/supabase/data';
import { useAuthStore } from '@/src/stores/authStore';
import { Gift, Lock, Unlock, Clock, Send, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SurprisesPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [newMessage, setNewMessage] = useState({
    title: '',
    message: '',
    unlock_date: '',
  });

  const fetchMessages = async () => {
    try {
      if (!user) return;
      
      const profile = await ensureProfileAndSettings(user.id, user.email);
      
      if (profile?.couple_id) {
        const { data, error } = await supabase
          .from('surprise_messages')
          .select('*')
          .eq('couple_id', profile.couple_id)
          .order('unlock_date', { ascending: true });
        if (error) {
          throw error;
        }
        setMessages(data ?? []);
      }
    } catch(error) {
      handleDatabaseError(error, OperationType.LIST, 'surprise_messages', user);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [user]);

  const handleAddSurprise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const profile = await ensureProfileAndSettings(user.id, user.email);
      
      if (profile?.couple_id) {
        const { error } = await supabase.from('surprise_messages').insert({
          ...newMessage, 
          couple_id: profile.couple_id,
          author_id: user.id,
          created_at: new Date().toISOString(),
        });
        if (error) {
          throw error;
        }

        setShowForm(false);
        setNewMessage({ title: '', message: '', unlock_date: '' });
        
        await fetchMessages();
      }
    } catch(error) {
      handleDatabaseError(error, OperationType.CREATE, 'surprise_messages', user);
    }
  };

  const isUnlocked = (date: string) => {
    return new Date(date) <= new Date();
  };

  return (
    <div className="space-y-8 pb-12 w-full max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-serif mb-2 text-slate-900 dark:text-white">Mensagens <span className="text-rose-500 italic">Surpresa</span></h2>
          <p className="text-slate-600 dark:text-slate-400">Escreva algo que só será revelado no futuro.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 text-white px-6 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-rose-500/20"
        >
          <Plus className="w-5 h-5" />
          Preparar Surpresa
        </button>
      </header>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, height: 0 }}
            animate={{ opacity: 1, scale: 1, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.95, height: 0 }}
            className="glass p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 mx-auto w-full overflow-hidden"
          >
            <h3 className="text-xl font-serif mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <Send className="w-5 h-5 text-rose-500" />
              Nova Cápsula do Tempo
            </h3>
            <form onSubmit={handleAddSurprise} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Título</label>
                <input 
                  type="text" required
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-slate-900 dark:text-white"
                  placeholder="Ex: Uma carta para nosso aniversário"
                  value={newMessage.title}
                  onChange={e => setNewMessage({...newMessage, title: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">A mensagem</label>
                <textarea 
                  required
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors h-40 resize-none text-slate-900 dark:text-white"
                  placeholder="Abra seu coração..."
                  value={newMessage.message}
                  onChange={e => setNewMessage({...newMessage, message: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Data de Desbloqueio</label>
                <input 
                  type="datetime-local" required
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-sm text-slate-900 dark:text-white"
                  value={newMessage.unlock_date}
                  onChange={e => setNewMessage({...newMessage, unlock_date: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-rose-500/20 mt-2"
              >
                Lançar para o Futuro 🚀
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {messages.map((item) => {
          const unlocked = isUnlocked(item.unlock_date);
          return (
            <motion.div 
              key={item.id}
              className={`glass p-6 rounded-2xl border transition-all ${
                unlocked ? 'border-rose-500/30 dark:border-rose-500/20' : 'border-slate-200/80 dark:border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${
                  unlocked ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                }`}>
                  {unlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                {!unlocked && (
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500">
                    <Clock className="w-3 h-3" />
                    Em breve
                  </div>
                )}
              </div>
              
              <h4 className="text-lg font-serif mb-3 text-slate-900 dark:text-white">{item.title}</h4>
              
              {unlocked ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {item.message}
                  </p>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
                    Escrito em {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="py-6 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center border border-dashed border-slate-300 dark:border-white/10">
                    <span className="text-xs text-slate-600 dark:text-slate-500 font-medium italic">Conteúdo selado até o momento certo.</span>
                  </div>
                  <div className="flex flex-col gap-1 text-[10px] uppercase tracking-widest font-bold">
                    <span className="text-slate-500">Desbloqueia em:</span>
                    <span className="text-rose-500 text-xs">{new Date(item.unlock_date).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
