"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  startOfDay,
} from 'date-fns';
import { handleDatabaseError, OperationType, supabase } from '@/services/supabase/client';
import {
  ensureProfileAndSettings,
  markWelcomeAsSeen,
  resolveCouplePhotoUrl,
  type Profile,
} from '@/services/supabase/data';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import SecureAuthWrapper from '@/components/auth/SecureAuthWrapper';

const ROMANTIC_QUOTES = [
  'Voce e a minha melhor aventura.',
  'O universo conspira a nosso favor.',
  'Sempre foi voce, sempre sera.',
  'A vida e melhor com voce.',
];

type RelationshipPeriod = {
  start_date: string;
  end_date?: string;
};

const MILESTONE_DAYS = [100, 180, 365, 500, 730, 1000, 1460, 1825];

export default function Dashboard() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [days, setDays] = useState(0);
  const [totalDaysTogether, setTotalDaysTogether] = useState(0);
  const [totalYearsTogether, setTotalYearsTogether] = useState(0);
  const [totalMonthsRemainder, setTotalMonthsRemainder] = useState(0);
  const [totalDaysRemainder, setTotalDaysRemainder] = useState(0);
  const [quote, setQuote] = useState(ROMANTIC_QUOTES[0]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [dismissingWelcome, setDismissingWelcome] = useState(false);
  const [stats, setStats] = useState({ dates: 0, trips: 0, wishes: 0 });
  const [weeklyStats, setWeeklyStats] = useState({ dates: 0, trips: 0, wishes: 0, surprises: 0 });
  const [weeklyDelta, setWeeklyDelta] = useState({ dates: 0, trips: 0, wishes: 0, surprises: 0 });
  const [couplePhotoUrl, setCouplePhotoUrl] = useState('');

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
            if (appSettings.couple_photo) {
              try {
                const signedPhotoUrl = await resolveCouplePhotoUrl(appSettings.couple_photo);
                setCouplePhotoUrl(signedPhotoUrl);
              } catch (photoError) {
                console.error('Erro ao resolver foto do casal', photoError);
                setCouplePhotoUrl(appSettings.couple_photo);
              }
            } else {
              setCouplePhotoUrl('');
            }
            updateTimers(appSettings.relationship_periods, appSettings.relationship_start_date);
            intervalId = setInterval(() => {
              updateTimers(appSettings.relationship_periods, appSettings.relationship_start_date);
            }, 60000);
          }

          const [{ count: datesCount, error: datesError }, { count: tripsCount, error: tripsError }, { count: wishesCount, error: wishesError }] =
            await Promise.all([
              supabase
                .from('dates')
                .select('*', { count: 'exact', head: true })
                .eq('couple_id', userProfile.couple_id)
                .eq('status', 'realizado'),
              supabase
                .from('trips')
                .select('*', { count: 'exact', head: true })
                .eq('couple_id', userProfile.couple_id)
                .in('status', ['concluida']),
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

          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const sevenDaysAgoIso = sevenDaysAgo.toISOString();
          const fourteenDaysAgo = new Date();
          fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
          const fourteenDaysAgoIso = fourteenDaysAgo.toISOString();

          const [
            { count: weeklyDatesCount, error: weeklyDatesError },
            { count: weeklyTripsCount, error: weeklyTripsError },
            { count: weeklyWishesCount, error: weeklyWishesError },
            { count: weeklySurprisesCount, error: weeklySurprisesError },
            { count: previousWeeklyDatesCount, error: previousWeeklyDatesError },
            { count: previousWeeklyTripsCount, error: previousWeeklyTripsError },
            { count: previousWeeklyWishesCount, error: previousWeeklyWishesError },
            { count: previousWeeklySurprisesCount, error: previousWeeklySurprisesError },
          ] = await Promise.all([
            supabase
              .from('dates')
              .select('*', { count: 'exact', head: true })
              .eq('couple_id', userProfile.couple_id)
              .gte('created_at', sevenDaysAgoIso),
            supabase
              .from('trips')
              .select('*', { count: 'exact', head: true })
              .eq('couple_id', userProfile.couple_id)
              .gte('created_at', sevenDaysAgoIso),
            supabase
              .from('wishlist_items')
              .select('*', { count: 'exact', head: true })
              .eq('couple_id', userProfile.couple_id)
              .gte('created_at', sevenDaysAgoIso),
            supabase
              .from('surprise_messages')
              .select('*', { count: 'exact', head: true })
              .eq('couple_id', userProfile.couple_id)
              .gte('created_at', sevenDaysAgoIso),
            supabase
              .from('dates')
              .select('*', { count: 'exact', head: true })
              .eq('couple_id', userProfile.couple_id)
              .gte('created_at', fourteenDaysAgoIso)
              .lt('created_at', sevenDaysAgoIso),
            supabase
              .from('trips')
              .select('*', { count: 'exact', head: true })
              .eq('couple_id', userProfile.couple_id)
              .gte('created_at', fourteenDaysAgoIso)
              .lt('created_at', sevenDaysAgoIso),
            supabase
              .from('wishlist_items')
              .select('*', { count: 'exact', head: true })
              .eq('couple_id', userProfile.couple_id)
              .gte('created_at', fourteenDaysAgoIso)
              .lt('created_at', sevenDaysAgoIso),
            supabase
              .from('surprise_messages')
              .select('*', { count: 'exact', head: true })
              .eq('couple_id', userProfile.couple_id)
              .gte('created_at', fourteenDaysAgoIso)
              .lt('created_at', sevenDaysAgoIso),
          ]);

          if (
            weeklyDatesError ||
            weeklyTripsError ||
            weeklyWishesError ||
            weeklySurprisesError ||
            previousWeeklyDatesError ||
            previousWeeklyTripsError ||
            previousWeeklyWishesError ||
            previousWeeklySurprisesError
          ) {
            throw (
              weeklyDatesError ||
              weeklyTripsError ||
              weeklyWishesError ||
              weeklySurprisesError ||
              previousWeeklyDatesError ||
              previousWeeklyTripsError ||
              previousWeeklyWishesError ||
              previousWeeklySurprisesError
            );
          }

          const resolvedWeeklyStats = {
            dates: weeklyDatesCount ?? 0,
            trips: weeklyTripsCount ?? 0,
            wishes: weeklyWishesCount ?? 0,
            surprises: weeklySurprisesCount ?? 0,
          };
          const resolvedPreviousWeeklyStats = {
            dates: previousWeeklyDatesCount ?? 0,
            trips: previousWeeklyTripsCount ?? 0,
            wishes: previousWeeklyWishesCount ?? 0,
            surprises: previousWeeklySurprisesCount ?? 0,
          };

          setWeeklyStats({
            dates: resolvedWeeklyStats.dates,
            trips: resolvedWeeklyStats.trips,
            wishes: resolvedWeeklyStats.wishes,
            surprises: resolvedWeeklyStats.surprises,
          });

          setWeeklyDelta({
            dates: resolvedWeeklyStats.dates - resolvedPreviousWeeklyStats.dates,
            trips: resolvedWeeklyStats.trips - resolvedPreviousWeeklyStats.trips,
            wishes: resolvedWeeklyStats.wishes - resolvedPreviousWeeklyStats.wishes,
            surprises: resolvedWeeklyStats.surprises - resolvedPreviousWeeklyStats.surprises,
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
    const today = startOfDay(new Date());

    let activePeriods = periods;
    if ((!activePeriods || activePeriods.length === 0) && startDate) {
      activePeriods = [{ start_date: startDate }];
    }

    if (!activePeriods || activePeriods.length === 0) {
      setDays(0);
      setTotalDaysTogether(0);
      setTotalYearsTogether(0);
      setTotalMonthsRemainder(0);
      setTotalDaysRemainder(0);
      return;
    }

    const normalizedPeriods: Array<{ start: Date; end: Date; isCurrent: boolean }> = [];

    activePeriods.forEach((p) => {
      if (!p.start_date) return;
      const start = startOfDay(new Date(`${p.start_date}T00:00:00`));
      if (Number.isNaN(start.getTime())) return;

      let end = p.end_date ? startOfDay(new Date(`${p.end_date}T00:00:00`)) : today;
      if (Number.isNaN(end.getTime())) {
        end = today;
      }
      if (end > today) end = today;

      if (start <= end) {
        normalizedPeriods.push({ start, end, isCurrent: !p.end_date });
      }
    });

    if (normalizedPeriods.length === 0) {
      setDays(0);
      setTotalDaysTogether(0);
      setTotalYearsTogether(0);
      setTotalMonthsRemainder(0);
      setTotalDaysRemainder(0);
      return;
    }

    const totalDays = normalizedPeriods.reduce(
      (acc, period) => acc + differenceInCalendarDays(period.end, period.start) + 1,
      0,
    );
    setTotalDaysTogether(totalDays);

    const currentPeriod =
      normalizedPeriods
        .filter((period) => period.isCurrent)
        .sort((a, b) => b.start.getTime() - a.start.getTime())[0] ?? null;

    const currentDays = currentPeriod ? differenceInCalendarDays(today, currentPeriod.start) + 1 : 0;
    setDays(currentDays);

    const durationAnchor = new Date(2000, 0, 1);
    const durationEnd = addDays(durationAnchor, totalDays);
    const years = differenceInYears(durationEnd, durationAnchor);
    const afterYears = addYears(durationAnchor, years);
    const months = differenceInMonths(durationEnd, afterYears);
    const afterMonths = addMonths(afterYears, months);
    const daysRemainder = differenceInDays(durationEnd, afterMonths);

    setTotalYearsTogether(years);
    setTotalMonthsRemainder(months);
    setTotalDaysRemainder(daysRemainder);
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

  const timelinePeriods: RelationshipPeriod[] =
    Array.isArray(settings?.relationship_periods) && settings.relationship_periods.length > 0
      ? settings.relationship_periods
      : settings?.relationship_start_date
        ? [{ start_date: settings.relationship_start_date }]
        : [];

  const sortedPeriods = [...timelinePeriods].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const nextMilestone = MILESTONE_DAYS.find((milestone) => milestone > totalDaysTogether) ?? null;
  const daysToMilestone = nextMilestone ? nextMilestone - totalDaysTogether : 0;
  const hasAnyActivity = stats.dates > 0 || stats.trips > 0 || stats.wishes > 0;

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
              {couplePhotoUrl ? (
                <img src={couplePhotoUrl} alt="Casal" className="w-full h-full object-cover" />
              ) : (
                <span className="text-rose-500 text-5xl">❤</span>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h3 className="text-rose-500 font-bold tracking-widest text-xs uppercase mb-3">Tempo Juntos</h3>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="text-center">
                  <motion.div
                    key={totalDaysTogether}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-5xl font-serif tabular-nums text-slate-800 dark:text-white"
                  >
                    {totalDaysTogether}
                  </motion.div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                    Dias no total
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300">
                  {totalYearsTogether} {totalYearsTogether === 1 ? 'ano' : 'anos'}, {totalMonthsRemainder}{' '}
                  {totalMonthsRemainder === 1 ? 'mes' : 'meses'} e {totalDaysRemainder}{' '}
                  {totalDaysRemainder === 1 ? 'dia' : 'dias'}
                </span>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300">
                  Fase atual: {days} {days === 1 ? 'dia' : 'dias'}
                </span>
              </div>
              {(!settings?.relationship_periods || settings.relationship_periods.length === 0) && !settings?.relationship_start_date && (
                <p className="text-sm text-rose-500 mt-4 bg-rose-50 dark:bg-rose-500/10 inline-block px-3 py-1.5 rounded-lg font-medium shadow-sm">
                  Va nas configuracoes e preencham a data de inicio.
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.section variants={childVariants} className="glass p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm uppercase tracking-widest text-rose-500 font-bold">Resumo da Semana</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Ultimos 7 dias</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3">
              <p className="text-[11px] uppercase text-slate-500 dark:text-slate-400">Dates</p>
              <p className="text-2xl font-serif text-slate-900 dark:text-white">{weeklyStats.dates}</p>
              <p className={`text-xs mt-1 ${weeklyDelta.dates >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatDelta(weeklyDelta.dates)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3">
              <p className="text-[11px] uppercase text-slate-500 dark:text-slate-400">Viagens</p>
              <p className="text-2xl font-serif text-slate-900 dark:text-white">{weeklyStats.trips}</p>
              <p className={`text-xs mt-1 ${weeklyDelta.trips >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatDelta(weeklyDelta.trips)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3">
              <p className="text-[11px] uppercase text-slate-500 dark:text-slate-400">Desejos</p>
              <p className="text-2xl font-serif text-slate-900 dark:text-white">{weeklyStats.wishes}</p>
              <p className={`text-xs mt-1 ${weeklyDelta.wishes >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatDelta(weeklyDelta.wishes)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3">
              <p className="text-[11px] uppercase text-slate-500 dark:text-slate-400">Surpresas</p>
              <p className="text-2xl font-serif text-slate-900 dark:text-white">{weeklyStats.surprises}</p>
              <p
                className={`text-xs mt-1 ${
                  weeklyDelta.surprises >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatDelta(weeklyDelta.surprises)}
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section variants={childVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-md">
            <h3 className="text-sm uppercase tracking-widest text-rose-500 font-bold mb-4">Acoes Rapidas</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dates" className="rounded-xl border border-slate-200 dark:border-white/10 p-3 hover:border-rose-400/60 transition-colors">
                <p className="text-xs text-slate-500 dark:text-slate-400">Novo</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Date</p>
              </Link>
              <Link href="/trips" className="rounded-xl border border-slate-200 dark:border-white/10 p-3 hover:border-rose-400/60 transition-colors">
                <p className="text-xs text-slate-500 dark:text-slate-400">Nova</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Viagem</p>
              </Link>
              <Link href="/wishlist" className="rounded-xl border border-slate-200 dark:border-white/10 p-3 hover:border-rose-400/60 transition-colors">
                <p className="text-xs text-slate-500 dark:text-slate-400">Novo</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Desejo</p>
              </Link>
              <Link href="/surprises" className="rounded-xl border border-slate-200 dark:border-white/10 p-3 hover:border-rose-400/60 transition-colors">
                <p className="text-xs text-slate-500 dark:text-slate-400">Nova</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Surpresa</p>
              </Link>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-md">
            <h3 className="text-sm uppercase tracking-widest text-rose-500 font-bold mb-4">Proximo Marco</h3>
            {nextMilestone ? (
              <div className="space-y-2">
                <p className="text-3xl font-serif text-slate-900 dark:text-white">{nextMilestone} dias</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Faltam <span className="font-semibold">{daysToMilestone} dias</span> para o proximo marco juntos.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-3xl font-serif text-slate-900 dark:text-white">{totalDaysTogether} dias</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Voces ja passaram todos os marcos iniciais. Hora de adicionar novos objetivos.
                </p>
              </div>
            )}
          </div>
        </motion.section>

        <motion.section variants={childVariants} className="glass p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-md">
          <h3 className="text-sm uppercase tracking-widest text-rose-500 font-bold mb-4">Timeline do Relacionamento</h3>
          {sortedPeriods.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sem periodos registrados ainda. Adicione em Configuracoes para montar a timeline.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedPeriods.map((period, index) => (
                <div
                  key={`${period.start_date}-${period.end_date ?? 'atual'}-${index}`}
                  className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-white/70 dark:bg-white/[0.02]"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400">Periodo {index + 1}</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">
                    {formatDate(period.start_date)} - {period.end_date ? formatDate(period.end_date) : 'Atual'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.section>

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

        {!hasAnyActivity && (
          <motion.section variants={childVariants} className="glass rounded-2xl p-6 border border-dashed border-slate-300 dark:border-white/10 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              Voces ainda nao registraram atividades. Que tal criar o primeiro momento agora?
            </p>
            <Link
              href="/dates"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium"
            >
              Criar primeiro date
            </Link>
          </motion.section>
        )}
      </motion.div>
    </>
  );
}

function formatDate(value: string) {
  if (!value) return '-';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR').format(parsed);
}

function formatDelta(value: number) {
  if (value > 0) return `+${value} vs semana anterior`;
  if (value < 0) return `${value} vs semana anterior`;
  return '0 vs semana anterior';
}

