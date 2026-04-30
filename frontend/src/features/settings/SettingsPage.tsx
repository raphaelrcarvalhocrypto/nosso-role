"use client";

import { useEffect, useState } from 'react';
import { handleDatabaseError, OperationType, supabase } from '@/src/services/supabase/client';
import { ensureProfileAndSettings } from '@/src/services/supabase/data';
import { useAuthStore } from '@/src/stores/authStore';
import { Plus, Trash2 } from 'lucide-react';

export default function Settings() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>({
    name_1: '',
    name_2: '',
    relationship_start_date: '',
    relationship_periods: [],
    couple_photo: ''
  });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (!user) return;
        
        const prof = await ensureProfileAndSettings(user.id, user.email);
        
        if (prof?.couple_id) {
          setProfile(prof);
          const { data: appSettings, error: settingsError } = await supabase
            .from('app_settings')
            .select('*')
            .eq('couple_id', prof.couple_id)
            .maybeSingle();
          if (settingsError) {
            throw settingsError;
          }

          if (appSettings) {
            let periods = appSettings.relationship_periods || [];
            if (periods.length === 0 && appSettings.relationship_start_date) {
               periods = [{ start_date: appSettings.relationship_start_date, end_date: '' }];
            }
            setSettings({
              name_1: appSettings.name_1 || '',
              name_2: appSettings.name_2 || '',
              relationship_start_date: appSettings.relationship_start_date || '',
              relationship_periods: periods,
              couple_photo: appSettings.couple_photo || ''
            });
          } else {
            const brandNewSettings = {
              couple_id: prof.couple_id,
              name_1: '',
              name_2: '',
              relationship_start_date: '',
              relationship_periods: [],
              couple_photo: ''
            };
            const { error: insertError } = await supabase.from('app_settings').insert(brandNewSettings);
            if (insertError) {
              throw insertError;
            }
            setSettings(brandNewSettings);
          }
        }
      } catch (error) {
        handleDatabaseError(error, OperationType.GET, 'app_settings', user);
      }
    };
    if (user) loadSettings();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAlert('');

    try {
      if (profile?.couple_id) {
        // Enforce that relationship_start_date takes the first period's start date
        const firstStart = settings.relationship_periods.length > 0 ? settings.relationship_periods[0].start_date : settings.relationship_start_date;
        const { error } = await supabase
          .from('app_settings')
          .update({
          name_1: settings.name_1,
          name_2: settings.name_2,
          relationship_start_date: firstStart || null,
          relationship_periods: settings.relationship_periods,
          couple_photo: settings.couple_photo
          })
          .eq('couple_id', profile.couple_id);
        if (error) {
          throw error;
        }

        setAlert('Configurações salvas com sucesso!');
        setTimeout(() => setAlert(''), 3000);
      }
    } catch(error) {
       setAlert('Erro ao salvar as configurações.');
       handleDatabaseError(error, OperationType.UPDATE, 'app_settings', user);
    } finally {
      setLoading(false);
    }
  };

  const addPeriod = () => {
    setSettings({...settings, relationship_periods: [...(settings.relationship_periods || []), { start_date: '', end_date: '' }]});
  };

  const updatePeriod = (index: number, field: string, value: string) => {
    const newPeriods = [...settings.relationship_periods];
    newPeriods[index][field] = value;
    setSettings({...settings, relationship_periods: newPeriods});
  };

  const removePeriod = (index: number) => {
    setSettings({...settings, relationship_periods: settings.relationship_periods.filter((_: any, i: number) => i !== index)});
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <header className="mb-8 flex items-center gap-4">
        <div className="p-3 bg-slate-200/50 dark:bg-white/5 rounded-2xl border border-slate-300 dark:border-white/10">
          <span className="text-slate-700 dark:text-slate-300">⚙</span>
        </div>
        <h2 className="text-3xl font-serif text-slate-900 dark:text-white">Configurações</h2>
      </header>

      {alert && (
        <div className={`px-4 py-3 rounded-xl mb-6 text-sm ${alert.includes('Erro') ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20' : 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'}`}>
          {alert}
        </div>
      )}

      <div className="glass rounded-2xl p-6 sm:p-8 border border-slate-200/50 dark:border-white/5">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome 1</label>
              <input
                type="text"
                value={settings.name_1}
                onChange={(e) => setSettings({...settings, name_1: e.target.value})}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-[#0f1115] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-rose-500/50 text-slate-900 dark:text-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome 2</label>
              <input
                type="text"
                value={settings.name_2}
                onChange={(e) => setSettings({...settings, name_2: e.target.value})}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-[#0f1115] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-rose-500/50 text-slate-900 dark:text-white transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Histórico do Relacionamento
                <p className="text-xs text-slate-500 font-normal mt-1">Adicione os períodos em que estiveram juntos. Se tiveram alguma pausa, adicione um novo período para o retorno.</p>
              </label>
              <button type="button" onClick={addPeriod} className="text-xs flex items-center justify-center gap-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 font-bold transition-colors w-full sm:w-auto">
                <Plus size={14} /> Adicionar Período
              </button>
            </div>
            <div className="space-y-4">
              {(!settings.relationship_periods || settings.relationship_periods.length === 0) && (
                <div className="p-4 bg-slate-100 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 rounded-xl text-center text-sm text-slate-500">
                  Nenhum período adicionado. Clique acima para adicionar a data de início.
                </div>
              )}
              {settings.relationship_periods?.map((period: any, index: number) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 relative">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold ml-1 mb-1.5 block">Data de Início</label>
                    <input
                      type="date"
                      value={period.start_date}
                      onChange={(e) => updatePeriod(index, 'start_date', e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-rose-500/50 text-slate-900 dark:text-white text-sm shadow-sm"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold ml-1 mb-1.5 block">Data Fim <span className="lowercase font-normal">(deixe vazio se atual)</span></label>
                    <input
                      type="date"
                      value={period.end_date}
                      onChange={(e) => updatePeriod(index, 'end_date', e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-rose-500/50 text-slate-900 dark:text-white text-sm shadow-sm"
                    />
                  </div>
                  <button type="button" onClick={() => removePeriod(index)} className="absolute sm:relative top-2 right-2 sm:top-0 sm:right-0 p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 sm:border-transparent sm:bg-transparent dark:sm:bg-transparent shadow-sm sm:shadow-none mb-0 sm:mb-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">URL da Foto do Casal</label>
            <input
              type="url"
              placeholder="https://exemplo.com/foto.jpg"
              value={settings.couple_photo}
              onChange={(e) => setSettings({...settings, couple_photo: e.target.value})}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-[#0f1115] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-rose-500/50 text-slate-900 dark:text-white transition-all"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-white/5">
            <button
               type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ml-auto"
            >
              <span className="text-sm">💾</span>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
