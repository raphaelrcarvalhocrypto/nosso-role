"use client";

import { useEffect, useState } from 'react';
import { handleDatabaseError, OperationType, supabase } from '@/src/services/supabase/client';
import { ensureProfileAndSettings, markWelcomeAsSeen, type Profile } from '@/src/services/supabase/data';
import { useAuthStore } from '@/src/stores/authStore';
import { motion } from 'framer-motion';

const ROMANTIC_QUOTES = [
  'Voce e a minha melhor aventura.',
  'O universo conspira a nosso favor.',
  'Sempre foi voce, sempre sera.',
  'A vida e melhor com voce.',
];

export default function Dashboard() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [quote, setQuote] = useState(ROMANTIC_QUOTES[0]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [dismissingWelcome, setDismissingWelcome] = useState(false);
  const [stats, setStats] = useState({ dates: 0, trips: 0, wishes: 0 });

  useEffect(() => {
    setQuote(ROMANTIC_QUOTES[Math.floor(Math.random() * ROMANTIC_QUOTES.length)]);
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchData = async () => {
      try {
        if (!user) return;

        const userProfile = await ensureProfileAndSettings(user.id, user.email);
        setProfile(userProfile);
        setShowWelcome(!userProfile.welcome_seen_at);

        if (userProfile?.couple_id) {
          const { data: appSettings, error: settingsError } = await supabase
            .from('app_settings')
            .select('*')
            .eq('couple_id', userProfile.couple_id)
            .maybeSingle();

          if (settingsError) {
            throw settingsError;
          }

          if (appSettings) {
            setSettings(appSettings);
            updateTimers(appSettings.relationship_periods, appSettings.relationship_start_date);
            intervalId = setInterval(() => {
              updateTimers(appSettings.relationship_periods, appSettings.relationship_start_date);
            }, 60000);
          }

          const [{ count: datesCount, error: datesError }, { count: tripsCount, error: tripsError }, { count: wishesCount, error: wishesError }] =
            await Promise.all([
              supabase.from('dates').select('*', { count: 'exact', head: true }).eq('couple_id', userProfile.couple_id),
              supabase
                .from('trips')
                .select('*', { count: 'exact', head: true })
                .eq('couple_id', userProfile.couple_id)
                .in('status', ['concluida', 'concluída']),
              supabase
                .from('wishlist_items')
                .select('*', { count: 'exact', head: true })
                .eq('couple_id', userProfile.couple_id)
                .eq('status', 'pendente'),
            ]);

          if (datesError || tripsError || wishesError) {
            throw datesError || tripsError || wishesError;
          }

          setStats({
            dates: datesCount ?? 0,
            trips: tripsCount ?? 0,
            wishes: wishesCount ?? 0,
          });
        }
      } catch (error) {
        handleDatabaseError(error, OperationType.GET, 'multiple_tables', user);
      }
    };

    if (user) fetchData();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user]);

  const updateTimers = (periods: Array<{ start_date: string; end_date?: string }>, startDate?: string) => {
    const now = new Date();
    let totalMs = 0;

    let activePeriods = periods;
    if ((!activePeriods || activePeriods.length === 0) && startDate) {
      activePeriods = [{ start_date: startDate }];
    }

    if (!activePeriods || activePeriods.length === 0) {
      setDays(0);
      setHours(0);
      setMinutes(0);
      return;
    }

    activePeriods.forEach((p) => {
      if (!p.start_date) return;
      const start = new Date(p.start_date).getTime();
      let end = p.end_date ? new Date(p.end_date).getTime() : now.getTime();
      if (end > now.getTime()) end = now.getTime();
      if (start < end) {
        totalMs += end - start;
      }
    });

    const totMins = Math.floor(totalMs / 60000);
    const d = Math.floor(totMins / (24 * 60));
    const h = Math.floor((totMins % (24 * 60)) / 60);
    const m = totMins % 60;

    setDays(d);
    setHours(h);
    setMinutes(m);
  };

  const handleDismissWelcome = async () => {
    if (!user) return;
    setDismissingWelcome(true);
    try {
      await markWelcomeAsSeen(user.id);
      setShowWelcome(false);
      setProfile((prev) => (prev ? { ...prev, welcome_seen_at: new Date().toISOString() } : prev));
    } catch (error) {
      console.error('Erro ao marcar boas-vindas', error);
      setShowWelcome(false);
    } finally {
      setDismissingWelcome(false);
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
    <>
      {showWelcome && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#11141a] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-rose-500 font-bold mb-2">Primeiro acesso</p>
            <h3 className="text-2xl font-serif text-slate-900 dark:text-white mb-3">Bem-vindos ao Nosso Role</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Esse espaco agora e de voces. Comecem em Configuracoes para adicionar nomes, foto e data de inicio.
            </p>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Conta: {profile?.email ?? 'usuario autenticado'}
            </div>
            <button
              type="button"
              onClick={handleDismissWelcome}
              disabled={dismissingWelcome}
              className="w-full px-4 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium disabled:opacity-70"
            >
              {dismissingWelcome ? 'Salvando...' : 'Continuar'}
            </button>
          </div>
        </div>
      )}

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        <motion.header variants={childVariants} className="mb-10 text-center md:text-left">
          <h2 className="text-4xl font-serif mb-2 text-slate-900 dark:text-white">
            Ola, as coisas estao <span className="text-rose-500 italic">maravilhosas!</span>
          </h2>
          <div className="flex items-center justify-center md:justify-start gap-2 text-slate-600 dark:text-slate-400 text-sm mt-4 italic bg-slate-200/50 dark:bg-white/5 inline-flex px-4 py-2 rounded-full border border-slate-300 dark:border-white/5 shadow-sm">
            <span className="text-rose-500 font-serif text-lg">"</span>
            {quote}
          </div>
        </motion.header>

        <motion.div variants={childVariants} className="glass rounded-2xl p-8 sm:p-10 border border-slate-200/80 dark:border-white/10 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 dark:bg-rose-500/20 blur-[80px] rounded-full group-hover:bg-rose-500/20 dark:group-hover:bg-rose-500/30 transition-colors duration-1000"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-[#1a1d24] border-4 border-white dark:border-[#0f1115] shadow-[0_0_20px_rgba(244,63,94,0.15)] dark:shadow-[0_0_20px_rgba(244,63,94,0.3)] overflow-hidden flex items-center justify-center relative shrink-0">
              {settings?.couple_photo ? (
                <img src={settings.couple_photo} alt="Casal" className="w-full h-full object-cover" />
              ) : (
                <span className="text-rose-500 text-5xl">❤</span>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h3 className="text-rose-500 font-bold tracking-widest text-xs uppercase mb-3">Tempo Juntos</h3>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="text-center">
                  <motion.div key={days} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-5xl font-serif tabular-nums text-slate-800 dark:text-white">
                    {days}
                  </motion.div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Dias</div>
                </div>
                <div className="text-5xl font-serif text-slate-300 dark:text-white/20">:</div>
                <div className="text-center">
                  <motion.div key={hours} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-5xl font-serif tabular-nums text-slate-800 dark:text-white">
                    {hours}
                  </motion.div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Horas</div>
                </div>
                <div className="text-5xl font-serif text-slate-300 dark:text-white/20">:</div>
                <div className="text-center">
                  <motion.div key={minutes} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-5xl font-serif tabular-nums text-slate-800 dark:text-white">
                    {minutes}
                  </motion.div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Mins</div>
                </div>
              </div>
              {(!settings?.relationship_periods || settings.relationship_periods.length === 0) && !settings?.relationship_start_date && (
                <p className="text-sm text-rose-500 mt-4 bg-rose-50 dark:bg-rose-500/10 inline-block px-3 py-1.5 rounded-lg font-medium shadow-sm">
                  Va nas configuracoes e preencham a data de inicio.
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div variants={childVariants} className="glass p-6 rounded-2xl border border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors shadow-md">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl flex items-center justify-center">
                <span className="text-rose-500 text-xl">📅</span>
              </div>
              <motion.span key={stats.dates} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-serif text-slate-800 dark:text-white">
                {stats.dates}
              </motion.span>
            </div>
            <p className="font-bold text-slate-800 dark:text-slate-200">Dates realizados</p>
            <p className="text-sm text-slate-500 mt-1">Momentos incriveis juntos.</p>
          </motion.div>

          <motion.div variants={childVariants} className="glass p-6 rounded-2xl border border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors shadow-md">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-wine-500/10 rounded-xl flex items-center justify-center">
                <span className="text-[#9333ea] text-xl">✈</span>
              </div>
              <motion.span key={stats.trips} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-serif text-slate-800 dark:text-white">
                {stats.trips}
              </motion.span>
            </div>
            <p className="font-bold text-slate-800 dark:text-slate-200">Viagens pelo mundo</p>
            <p className="text-sm text-slate-500 mt-1">Nossa proxima parada nos espera.</p>
          </motion.div>

          <motion.div variants={childVariants} className="glass p-6 rounded-2xl border border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors shadow-md">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gold-400/10 rounded-xl flex items-center justify-center">
                <span className="text-gold-500 text-xl">✨</span>
              </div>
              <motion.span key={stats.wishes} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-serif text-slate-800 dark:text-white">
                {stats.wishes}
              </motion.span>
            </div>
            <p className="font-bold text-slate-800 dark:text-slate-200">Desejos a realizar</p>
            <p className="text-sm text-slate-500 mt-1">O futuro e promissor.</p>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}
