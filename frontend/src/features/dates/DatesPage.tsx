"use client";

import { useEffect, useState } from 'react';
import { handleDatabaseError, OperationType, supabase } from '@/src/services/supabase/client';
import { ensureProfileAndSettings } from '@/src/services/supabase/data';
import { useAuthStore } from '@/src/stores/authStore';
import { CalendarHeart, Plus, MapPin, Star, Heart } from 'lucide-react';
import CustomMap from '@/src/components/maps/CustomMap';
import { motion, AnimatePresence } from 'framer-motion';

export default function DatesPage() {
  const { user } = useAuthStore();
  const [dates, setDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [newDate, setNewDate] = useState({
    title: '',
    date: '',
    location: '',
    category: 'restaurante',
    status: 'planejado',
    rating: 5,
    suggested_by: 'ambos'
  });

  const fetchDates = async () => {
    try {
      if (!user) return;
      
      const profile = await ensureProfileAndSettings(user.id, user.email);
      
      if (profile?.couple_id) {
        const { data, error } = await supabase
          .from('dates')
          .select('*')
          .eq('couple_id', profile.couple_id)
          .order('date', { ascending: false });

        if (error) {
          throw error;
        }
        setDates(data ?? []);
      }
    } catch (error) {
      handleDatabaseError(error, OperationType.LIST, 'dates', user);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDates();
  }, [user]);

  const handleAddDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const profile = await ensureProfileAndSettings(user.id, user.email);
      
      if (profile?.couple_id) {
        const { error } = await supabase.from('dates').insert({
          ...newDate, 
          couple_id: profile.couple_id,
          created_at: new Date().toISOString(),
        });
        if (error) {
          throw error;
        }

        setShowForm(false);
        setNewDate({
          title: '',
          date: '',
          location: '',
          category: 'restaurante',
          status: 'planejado',
          rating: 5,
          suggested_by: 'ambos'
        });
        
        await fetchDates();
      }
    } catch (error) {
      handleDatabaseError(error, OperationType.CREATE, 'dates', user);
    }
  };

  return (
    <div className="space-y-8 pb-12 w-full max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-serif mb-2 text-slate-900 dark:text-white">Nossos <span className="text-rose-500 italic">Dates</span></h2>
          <p className="text-slate-600 dark:text-slate-400">Colecionando momentos e risadas.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-rose-500/20"
        >
          <Plus className="w-5 h-5" />
          Registrar Date
        </button>
      </header>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="glass p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
          >
            <h3 className="text-xl font-serif mb-6 underline decoration-rose-500/30 underline-offset-8 text-slate-900 dark:text-white">Novo Momento</h3>
            <form onSubmit={handleAddDate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">O que fizemos/faremos?</label>
                  <input 
                    type="text" required
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-slate-900 dark:text-white"
                    placeholder="Ex: Jantar no Terraço"
                    value={newDate.title}
                    onChange={e => setNewDate({...newDate, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Data</label>
                  <input 
                    type="date" required
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-sm text-slate-900 dark:text-white"
                    value={newDate.date}
                    onChange={e => setNewDate({...newDate, date: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Localização</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-slate-900 dark:text-white"
                    placeholder="Ex: Av. Paulista, 100"
                    value={newDate.location}
                    onChange={e => setNewDate({...newDate, location: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Categoria</label>
                  <select 
                    className="w-full bg-slate-100 dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-slate-900 dark:text-white"
                    value={newDate.category}
                    onChange={e => setNewDate({...newDate, category: e.target.value})}
                  >
                    <option value="restaurante">Restaurante</option>
                    <option value="cinema">Cinema</option>
                    <option value="aventura">Aventura</option>
                    <option value="casa">Em casa</option>
                    <option value="viagem">Viagem</option>
                    <option value="surpresa">Surpresa</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Status</label>
                     <select 
                      className="w-full bg-slate-100 dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-sm text-slate-900 dark:text-white"
                      value={newDate.status}
                      onChange={e => setNewDate({...newDate, status: e.target.value})}
                    >
                      <option value="planejado">Planejado</option>
                      <option value="realizado">Realizado</option>
                    </select>
                  </div>
                  <div>
                     <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Nota (1-5)</label>
                     <input 
                      type="number" min="1" max="5"
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-slate-900 dark:text-white"
                      value={newDate.rating}
                      onChange={e => setNewDate({...newDate, rating: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full h-[52px] bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-rose-500/20"
                >
                  Salvar Momento
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-xl font-serif flex items-center gap-2 text-slate-900 dark:text-white">
            <Heart className="w-5 h-5 text-rose-500" />
            Histórico de Momentos
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {dates.map((date) => (
              <motion.div 
                key={date.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass p-5 rounded-2xl border border-slate-200/80 dark:border-white/5 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center text-rose-500 dark:text-rose-400">
                    <span className="text-[10px] uppercase font-bold">{new Date(date.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                    <span className="text-lg font-serif leading-none">{new Date(date.date).getDate()}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-200 leading-tight">{date.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-500 mt-1">
                      <MapPin className="w-3 h-3" />
                      {date.location || 'Local não informado'}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < date.rating ? 'text-amber-500 dark:text-amber-400 fill-current' : 'text-slate-300 dark:text-slate-700'}`} />
                    ))}
                  </div>
                  <span className={`text-[9px] uppercase tracking-tighter px-2 py-0.5 rounded-full border ${
                    date.status === 'realizado' ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-500 bg-emerald-50 max-dark:bg-emerald-500/5' : 'border-amber-500/30 text-amber-600 dark:text-amber-500 bg-amber-50 max-dark:bg-amber-500/5'
                  }`}>
                    {date.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
           <h3 className="text-xl font-serif flex items-center gap-2 text-slate-900 dark:text-white">
            <MapPin className="w-5 h-5 text-rose-500" />
            Nossa Localização
          </h3>
          <CustomMap className="w-full h-full min-h-[400px] rounded-2xl shadow-sm" />
        </div>
      </div>
    </div>
  );
}
