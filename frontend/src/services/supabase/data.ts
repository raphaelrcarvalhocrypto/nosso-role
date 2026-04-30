import { supabase } from '@/src/services/supabase/client';

export type Profile = {
  id: string;
  couple_id: string;
  email: string | null;
  created_at: string;
  updated_at: string | null;
};

export async function getProfileByUserId(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (error) {
    throw error;
  }

  return data as Profile | null;
}

export async function ensureProfileAndSettings(userId: string, email?: string | null) {
  const existingProfile = await getProfileByUserId(userId);
  if (existingProfile) {
    return existingProfile;
  }

  const coupleId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    couple_id: coupleId,
    email: email ?? null,
    created_at: now,
    updated_at: now,
  });

  if (profileError) {
    throw profileError;
  }

  const { error: settingsError } = await supabase.from('app_settings').insert({
    couple_id: coupleId,
    name_1: '',
    name_2: '',
    relationship_start_date: null,
    relationship_periods: [],
    couple_photo: '',
  });

  if (settingsError) {
    throw settingsError;
  }

  return {
    id: userId,
    couple_id: coupleId,
    email: email ?? null,
    created_at: now,
    updated_at: now,
  } as Profile;
}
