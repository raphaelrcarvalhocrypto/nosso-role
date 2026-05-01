"use client";

import { useEffect, useState } from 'react';
import { handleDatabaseError, OperationType, supabase } from '@/services/supabase/client';
import { ensureProfileAndSettings } from '@/services/supabase/data';
import { useAuthStore } from '@/stores/authStore';
import { Sparkles, Plus, Gift, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_ITEM_FORM = {
  title: '',
  description: '',
  link: '',
  priority: 'média',
  category: 'experiência',
  status: 'pendente',
};

export default function WishlistPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ ...DEFAULT_ITEM_FORM });

  const resetItemForm = () => {
    setNewItem({ ...DEFAULT_ITEM_FORM });
    setEditingItemId(null);
  };

  const fetchItems = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      if (!user) return;

      const profile = await ensureProfileAndSettings(user.id, user.email);
      if (!profile?.couple_id) return;

      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data ?? []);
    } catch (error) {
      const message = handleDatabaseError(error, OperationType.LIST, 'wishlist_items', user);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [user]);

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      setErrorMessage(null);
      const profile = await ensureProfileAndSettings(user.id, user.email);
      if (!profile?.couple_id) return;

      const payload = { ...newItem, couple_id: profile.couple_id };
      const { error } = editingItemId
        ? await supabase.from('wishlist_items').update(payload).eq('id', editingItemId)
        : await supabase.from('wishlist_items').insert({
            ...payload,
            created_at: new Date().toISOString(),
          });

      if (error) throw error;
      resetItemForm();
      await fetchItems();
    } catch (error) {
      const message = handleDatabaseError(
        error,
        editingItemId ? OperationType.UPDATE : OperationType.CREATE,
        'wishlist_items',
        user,
      );
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItemId(item.id);
    setNewItem({
      title: item.title ?? '',
      description: item.description ?? '',
      link: item.link ?? '',
      priority: item.priority ?? 'média',
      category: item.category ?? 'experiência',
      status: item.status ?? 'pendente',
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user) return;
    if (!window.confirm('Deseja excluir este desejo?')) return;

    try {
      setErrorMessage(null);
      const { error } = await supabase.from('wishlist_items').delete().eq('id', itemId);
      if (error) throw error;
      if (editingItemId === itemId) resetItemForm();
      await fetchItems();
    } catch (error) {
      const message = handleDatabaseError(error, OperationType.DELETE, 'wishlist_items', user);
      setErrorMessage(message);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      setErrorMessage(null);
      const nextStatus = currentStatus === 'pendente' ? 'realizado' : 'pendente';
      const { error } = await supabase.from('wishlist_items').update({ status: nextStatus }).eq('id', id);
      if (error) throw error;
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)));
    } catch (error) {
      const message = handleDatabaseError(error, OperationType.UPDATE, 'wishlist_items', user);
      setErrorMessage(message);
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const childVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-12 w-full max-w-5xl mx-auto">
      <motion.header variants={childVariants} className="text-center max-w-2xl mx-auto pt-4">
        <h2 className="text-4xl font-serif mb-2 text-slate-900 dark:text-white flex items-center justify-center gap-3">
          <Sparkles className="w-8 h-8 text-gold-500" />
          Lista de <span className="text-gold-500 italic">Desejos</span>
        </h2>
        <p className="text-slate-600 dark:text-slate-400">Coisas que sonhamos em fazer, lugares para ir ou o que ter juntos.</p>
      </motion.header>

      {errorMessage && (
        <motion.div
          variants={childVariants}
          className="rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
        >
          {errorMessage}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={childVariants} className="lg:col-span-2 space-y-6">
          <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading && (
              <div className="sm:col-span-2 glass p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 text-center text-slate-600 dark:text-slate-400">
                Carregando desejos...
              </div>
            )}
            {!loading && items.length === 0 && (
              <div className="sm:col-span-2 glass p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 text-center text-slate-600 dark:text-slate-400">
                Nenhum desejo cadastrado ainda.
              </div>
            )}

            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  variants={childVariants}
                  key={item.id}
                  layout
                  className={`glass p-6 rounded-2xl border transition-all ${
                    item.status === 'realizado'
                      ? 'border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 opacity-70'
                      : 'border-slate-200/80 dark:border-white/5 bg-white/50 dark:bg-transparent shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2 rounded-xl ${item.status === 'realizado' ? 'bg-emerald-500/10' : 'bg-slate-100 dark:bg-white/5'}`}>
                      {item.status === 'realizado' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                      ) : (
                        <Gift className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleStatus(item.id, item.status)}
                      className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border transition-colors ${
                        item.status === 'realizado'
                          ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-500'
                          : 'border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-500 bg-white/50 dark:bg-transparent'
                      }`}
                    >
                      {item.status === 'realizado' ? 'Realizado' : 'Marcar como Feito'}
                    </button>
                  </div>

                  <h4
                    className={`text-lg font-serif mb-2 ${
                      item.status === 'realizado' ? 'line-through text-slate-500' : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {item.title}
                  </h4>

                  {item.description && (
                    <p
                      className={`text-sm mb-4 ${
                        item.status === 'realizado' ? 'text-slate-400/70' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.description}
                    </p>
                  )}

                  {item.link && (
                    <div className="flex items-center gap-2 mb-4">
                      <LinkIcon className="w-4 h-4 text-blue-500 shrink-0" />
                      <a
                        href={item.link.includes('http') ? item.link : `https://${item.link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-500 hover:underline truncate break-all"
                      >
                        {item.link}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-1 rounded border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 font-medium">
                      {item.category}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border font-bold ${
                        item.priority === 'alta'
                          ? 'border-rose-500/30 text-rose-600 dark:text-rose-500 bg-rose-50 dark:bg-rose-500/10'
                          : item.priority === 'média'
                            ? 'border-amber-500/30 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10'
                            : 'border-slate-300 dark:border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-500/10'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditItem(item)}
                      className="text-xs px-2 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-xs px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                    >
                      Excluir
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        <aside>
          <motion.div variants={childVariants} className="glass p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 sticky top-8 shadow-xl">
            <h3 className="text-xl font-serif mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <Plus className="w-5 h-5 text-gold-500" />
              {editingItemId ? 'Editar Desejo' : 'Adicionar Desejo'}
            </h3>
            <form onSubmit={handleSubmitItem} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Título</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-gold-500/50 transition-colors text-slate-900 dark:text-slate-100"
                  placeholder="Ex: Pular de paraquedas"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Descrição</label>
                <textarea
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-gold-500/50 transition-colors h-24 resize-none text-slate-900 dark:text-slate-100"
                  placeholder="Detalhes sobre esse desejo..."
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Link (Opcional)</label>
                <input
                  type="url"
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 transition-colors text-slate-900 dark:text-slate-100"
                  placeholder="https://..."
                  value={newItem.link}
                  onChange={(e) => setNewItem({ ...newItem, link: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Prioridade</label>
                  <select
                    className="w-full bg-slate-100 dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-3 outline-none focus:border-gold-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                    value={newItem.priority}
                    onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="média">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Categoria</label>
                  <select
                    className="w-full bg-slate-100 dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-3 outline-none focus:border-gold-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  >
                    <option value="lugar">Lugar</option>
                    <option value="restaurante">Restaurante</option>
                    <option value="viagem">Viagem</option>
                    <option value="experiência">Experiência</option>
                    <option value="presente">Presente</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gold-400 hover:bg-gold-500 text-slate-900 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-gold-500/20 disabled:opacity-70"
                >
                  {saving ? 'Salvando...' : editingItemId ? 'Salvar Alterações' : 'Adicionar Desejo ✨'}
                </button>
                {editingItemId && (
                  <button
                    type="button"
                    onClick={resetItemForm}
                    className="w-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-medium"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </aside>
      </div>
    </motion.div>
  );
}
