"use client";

import { useEffect, useState } from 'react';
import { handleDatabaseError, OperationType, supabase } from '@/src/services/supabase/client';
import { ensureProfileAndSettings } from '@/src/services/supabase/data';
import { useAuthStore } from '@/src/stores/authStore';
import { Plane, Plus, MapPin, Calendar, Wallet, Link as LinkIcon, Utensils, Coins } from 'lucide-react';
import CustomMap from '@/src/components/maps/CustomMap';
import { motion, AnimatePresence } from 'framer-motion';

export default function TripsPage() {
  const { user } = useAuthStore();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [newTrip, setNewTrip] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    estimated_budget: '',
    daily_budget: '',
    meal_budget: '',
    links: '',
    notes: '',
    status: 'planejando'
  });

  const fetchTrips = async () => {
    try {
      if (!user) return;
      
      const profile = await ensureProfileAndSettings(user.id, user.email);
      
      if (profile?.couple_id) {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('couple_id', profile.couple_id)
          .order('start_date', { ascending: true });
        if (error) {
          throw error;
        }
        setTrips(data ?? []);
      }
    } catch (error) {
      handleDatabaseError(error, OperationType.LIST, 'trips', user);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [user]);

  const handleAddTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const profile = await ensureProfileAndSettings(user.id, user.email);
      
      if (profile?.couple_id) {
        const { error } = await supabase.from('trips').insert({
          ...newTrip, 
          couple_id: profile.couple_id,
          estimated_budget: parseFloat(newTrip.estimated_budget) || 0,
          daily_budget: parseFloat(newTrip.daily_budget) || 0,
          meal_budget: parseFloat(newTrip.meal_budget) || 0,
          created_at: new Date().toISOString(),
        });
        if (error) {
          throw error;
        }

        setShowForm(false);
        setNewTrip({
          destination: '',
          start_date: '',
          end_date: '',
          estimated_budget: '',
          daily_budget: '',
          meal_budget: '',
          links: '',
          notes: '',
          status: 'planejando'
        });
        
        await fetchTrips();
      }
    } catch(error) {
      handleDatabaseError(error, OperationType.CREATE, 'trips', user);
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const childVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-12 w-full max-w-6xl mx-auto">
      <motion.header variants={childVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-serif mb-2 text-slate-900 dark:text-white">Nossas <span className="text-rose-500 italic">Viagens</span></h2>
          <p className="text-slate-500 dark:text-slate-400">Planeje cada detalhe das nossas aventuras.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white px-6 py-3 rounded-2xl font-medium transition-all active:scale-95 shadow-lg shadow-rose-500/20"
        >
          <Plus className="w-5 h-5" />
          Nova Viagem
        </button>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={childVariants} className="lg:col-span-2 space-y-6">
          <CustomMap className="w-full h-[400px] rounded-2xl border border-slate-200/50 dark:border-white/5" />
          
          <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trips.length === 0 && !loading && (
              <motion.div variants={childVariants} className="md:col-span-2 glass p-12 rounded-2xl text-center border border-slate-200/50 dark:border-white/5">
                <Plane className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">Nenhuma viagem planejada ainda.</p>
              </motion.div>
            )}
            
            <AnimatePresence>
              {trips.map((trip) => (
                <motion.div 
                  variants={childVariants}
                  key={trip.id}
                  className="glass p-6 rounded-2xl border border-slate-200/50 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                     <Plane className="w-24 h-24 rotate-45 text-slate-800 dark:text-white" />
                  </div>
                  
                  <h4 className="text-xl font-serif mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                    <MapPin className="w-5 h-5 text-rose-500" />
                    {trip.destination}
                  </h4>
                  
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      {new Date(trip.start_date).toLocaleDateString('pt-BR')} - {new Date(trip.end_date).toLocaleDateString('pt-BR')}
                    </div>
                    {trip.estimated_budget > 0 && (
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-500" />
                        Orçamento Total: <strong className="text-slate-800 dark:text-white">R$ {trip.estimated_budget}</strong>
                      </div>
                    )}
                    {trip.daily_budget > 0 && (
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-500" />
                        Média Diária: <strong>R$ {trip.daily_budget}</strong>
                      </div>
                    )}
                    {trip.meal_budget > 0 && (
                      <div className="flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-rose-400" />
                        Média/Refeição: <strong>R$ {trip.meal_budget}</strong>
                      </div>
                    )}
                    {trip.links && (
                      <div className="flex items-start gap-2 pt-1 border-t border-slate-200/50 dark:border-white/5 mt-2">
                        <LinkIcon className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                        <a href={trip.links.includes('http') ? trip.links : `https://${trip.links}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all truncate">
                          {trip.links}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border font-medium ${
                      trip.status === 'planejando' ? 'border-amber-500/30 text-amber-600 dark:text-amber-500 bg-amber-500/10' :
                      trip.status === 'confirmada' ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-500 bg-emerald-500/10' :
                      'border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-500/10'
                    }`}>
                      {trip.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        <aside className="space-y-6">
          <AnimatePresence>
            {showForm && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="glass p-6 md:p-8 rounded-2xl border border-slate-200/50 dark:border-white/10 shadow-xl">
                  <h3 className="text-xl font-serif mb-6 text-slate-900 dark:text-white">Detalhes da Viagem</h3>
                  <form onSubmit={handleAddTrip} className="space-y-4">
                    <div>
                      <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Destino</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-slate-900 dark:text-slate-100"
                        placeholder="Ex: Paris, França"
                        value={newTrip.destination}
                        onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Início</label>
                        <input 
                          type="date" 
                          required
                          className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                          value={newTrip.start_date}
                          onChange={e => setNewTrip({...newTrip, start_date: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Fim</label>
                        <input 
                          type="date" 
                          required
                          className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                          value={newTrip.end_date}
                          onChange={e => setNewTrip({...newTrip, end_date: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Orçamento Total (R$)</label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors text-slate-900 dark:text-slate-100"
                          placeholder="Ex: 5000"
                          value={newTrip.estimated_budget}
                          onChange={e => setNewTrip({...newTrip, estimated_budget: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Média por Dia (R$)</label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-amber-500/50 transition-colors text-slate-900 dark:text-slate-100"
                          placeholder="Ex: 300"
                          value={newTrip.daily_budget}
                          onChange={e => setNewTrip({...newTrip, daily_budget: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Refeição (R$)</label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-slate-900 dark:text-slate-100"
                          placeholder="Ex: 80"
                          value={newTrip.meal_budget}
                          onChange={e => setNewTrip({...newTrip, meal_budget: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Link de Passeio / Hotel (Opcional)</label>
                      <input 
                        type="url" 
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 transition-colors text-slate-900 dark:text-slate-100"
                        placeholder="https://..."
                        value={newTrip.links}
                        onChange={e => setNewTrip({...newTrip, links: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Itinerário & Notas</label>
                      <textarea 
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors h-24 resize-none text-slate-900 dark:text-slate-100"
                        placeholder="Museus, restaurantes, lugares para visitar..."
                        value={newTrip.notes}
                        onChange={e => setNewTrip({...newTrip, notes: e.target.value})}
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-rose-500 hover:bg-rose-400 text-white py-4 rounded-xl font-bold transition-all active:scale-95 mt-2 shadow-lg shadow-rose-500/20"
                    >
                      Salvar Planejamento
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={childVariants} className="glass p-8 rounded-2xl border border-slate-200/50 dark:border-white/5">
            <h3 className="text-xl font-serif mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
               Dica de Viagem
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 italic">
              "Viajar é a única coisa que você compra que te deixa mais rico e com as melhores histórias."
            </p>
          </motion.div>
        </aside>
      </div>
    </motion.div>
  );
}
