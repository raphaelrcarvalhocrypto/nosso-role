"use client";

import { useEffect, useState } from 'react';
import { handleDatabaseError, OperationType, supabase } from '@/services/supabase/client';
import { ensureProfileAndSettings } from '@/services/supabase/data';
import { useAuthStore } from '@/stores/authStore';
import { Lock, Unlock, Clock, Send, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_MESSAGE_FORM = {
  title: '',
  message: '',
  unlock_date: '',
};

export default function SurprisesPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState({ ...DEFAULT_MESSAGE_FORM });

  const resetMessageForm = () => {
    setNewMessage({ ...DEFAULT_MESSAGE_FORM });
    setEditingMessageId(null);
  };

  const fetchMessages = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      if (!user) return;
      const profile = await ensureProfileAndSettings(user.id, user.email);
      if (!profile?.couple_id) return;

      const { data, error } = await supabase
        .from('surprise_messages')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .order('unlock_date', { ascending: true });

      if (error) throw error;
      setMessages(data ?? []);
    } catch (error) {
      const message = handleDatabaseError(error, OperationType.LIST, 'surprise_messages', user);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [user]);

  const handleSubmitSurprise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      setErrorMessage(null);
      const profile = await ensureProfileAndSettings(user.id, user.email);
      if (!profile?.couple_id) return;

      const payload = {
        ...newMessage,
        couple_id: profile.couple_id,
        author_id: user.id,
      };

      const { error } = editingMessageId
        ? await supabase.from('surprise_messages').update(payload).eq('id', editingMessageId)
        : await supabase.from('surprise_messages').insert({
            ...payload,
            created_at: new Date().toISOString(),
          });

      if (error) throw error;
      resetMessageForm();
      setShowForm(false);
      await fetchMessages();
    } catch (error) {
      const message = handleDatabaseError(
        error,
        editingMessageId ? OperationType.UPDATE : OperationType.CREATE,
        'surprise_messages',
        user,
      );
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditMessage = (message: any) => {
    setEditingMessageId(message.id);
    setNewMessage({
      title: message.title ?? '',
      message: message.message ?? '',
      unlock_date: message.unlock_date ? String(message.unlock_date).slice(0, 16) : '',
    });
    setShowForm(true);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;
    if (!window.confirm('Deseja excluir esta surpresa?')) return;

    try {
      setErrorMessage(null);
      const { error } = await supabase.from('surprise_messages').delete().eq('id', messageId);
      if (error) throw error;
      if (editingMessageId === messageId) resetMessageForm();
      await fetchMessages();
    } catch (error) {
      const message = handleDatabaseError(error, OperationType.DELETE, 'surprise_messages', user);
      setErrorMessage(message);
    }
  };

  const isUnlocked = (date: string) => new Date(date) <= new Date();

  return (
    <div className="space-y-8 pb-12 w-full max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-serif mb-2 text-slate-900 dark:text-white">
            Mensagens <span className="text-rose-500 italic">Surpresa</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400">Escreva algo que só será revelado no futuro.</p>
        </div>
        <button
          onClick={() => {
            const next = !showForm;
            setShowForm(next);
            if (!next) resetMessageForm();
          }}
          className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 text-white px-6 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-rose-500/20"
        >
          <Plus className="w-5 h-5" />
          {editingMessageId ? 'Editar Surpresa' : 'Preparar Surpresa'}
        </button>
      </header>

      {errorMessage && (
        <div className="rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

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
              {editingMessageId ? 'Editar Cápsula do Tempo' : 'Nova Cápsula do Tempo'}
            </h3>
            <form onSubmit={handleSubmitSurprise} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Título</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-slate-900 dark:text-white"
                  placeholder="Ex: Uma carta para nosso aniversário"
                  value={newMessage.title}
                  onChange={(e) => setNewMessage({ ...newMessage, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Mensagem</label>
                <textarea
                  required
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors h-40 resize-none text-slate-900 dark:text-white"
                  placeholder="Abra seu coração..."
                  value={newMessage.message}
                  onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Data de Desbloqueio</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-sm text-slate-900 dark:text-white"
                  value={newMessage.unlock_date}
                  onChange={(e) => setNewMessage({ ...newMessage, unlock_date: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-rose-500/20 mt-2 disabled:opacity-70"
                >
                  {saving ? 'Salvando...' : editingMessageId ? 'Salvar Alterações' : 'Lançar para o Futuro 🚀'}
                </button>
                {editingMessageId && (
                  <button
                    type="button"
                    onClick={() => {
                      resetMessageForm();
                      setShowForm(false);
                    }}
                    className="w-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-medium"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && (
          <div className="md:col-span-2 lg:col-span-3 glass p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 text-center">
            <p className="text-slate-600 dark:text-slate-400">Carregando surpresas...</p>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 glass p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              Nenhuma mensagem visível no momento. Crie uma nova surpresa ou aguarde o desbloqueio.
            </p>
          </div>
        )}

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
                <div
                  className={`p-3 rounded-2xl ${
                    unlocked ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                  }`}
                >
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
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{item.message}</p>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
                    Escrito em {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="py-6 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center border border-dashed border-slate-300 dark:border-white/10">
                    <span className="text-xs text-slate-600 dark:text-slate-500 font-medium italic">
                      Conteúdo selado até o momento certo.
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-[10px] uppercase tracking-widest font-bold">
                    <span className="text-slate-500">Desbloqueia em:</span>
                    <span className="text-rose-500 text-xs">{new Date(item.unlock_date).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              )}

              {item.author_id === user?.id && (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditMessage(item)}
                    className="text-xs px-2 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(item.id)}
                    className="text-xs px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                  >
                    Excluir
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
