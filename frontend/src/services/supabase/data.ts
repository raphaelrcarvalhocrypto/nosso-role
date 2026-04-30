import { supabase } from '@/src/services/supabase/client';

export type Profile = {
  id: string;
  couple_id: string;
  email: string | null;
  welcome_seen_at?: string | null;
  created_at: string;
  updated_at: string | null;
};

export type CoupleInvite = {
  couple_id: string;
  invite_code: string;
  created_by: string;
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

async function ensureAppSettingsForCouple(coupleId: string) {
  const { data: appSettings, error: settingsError } = await supabase
    .from('app_settings')
    .select('couple_id')
    .eq('couple_id', coupleId)
    .maybeSingle();

  if (settingsError) {
    throw settingsError;
  }

  if (appSettings) {
    return;
  }

  const { error: insertSettingsError } = await supabase.from('app_settings').insert({
    couple_id: coupleId,
    name_1: '',
    name_2: '',
    relationship_start_date: null,
    relationship_periods: [],
    couple_photo: '',
  });

  if (insertSettingsError) {
    throw insertSettingsError;
  }
}

export async function ensureProfileAndSettings(userId: string, email?: string | null) {
  const existingProfile = await getProfileByUserId(userId);
  if (existingProfile) {
    await ensureAppSettingsForCouple(existingProfile.couple_id);
    return existingProfile;
  }

  // Trigger do Supabase pode criar o perfil automaticamente.
  // Se não encontrou acima, pode estar sendo criado agora.
  // NÃO criamos casal manualmente — o trigger cuida disso.
  // Apenas aguardamos um pouco e tentamos buscar novamente.
  
  // Pequeno delay para o trigger processar
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Segunda tentativa de buscar o perfil
  const profileAfterDelay = await getProfileByUserId(userId);
  if (profileAfterDelay) {
    await ensureAppSettingsForCouple(profileAfterDelay.couple_id);
    return profileAfterDelay;
  }

  // Se ainda não existe após delay, algo está errado (trigger não configurado?)
  // Lançamos erro claro em vez de tentar criar manualmente (evita conflito 409)
   throw new Error('Perfil não encontrado após login. Verifique se o trigger handle_new_user está configurado no Supabase.');

function generateInviteCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
}

export async function getCoupleInvite(coupleId: string) {
  const { data, error } = await supabase
    .from('couple_invites')
    .select('*')
    .eq('couple_id', coupleId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as CoupleInvite | null;
}

export async function createOrRotateCoupleInvite(coupleId: string, userId: string) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const inviteCode = generateInviteCode();

    const { error } = await supabase.from('couple_invites').upsert(
      {
        couple_id: coupleId,
        invite_code: inviteCode,
        created_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'couple_id' },
    );

    if (!error) {
      return inviteCode;
    }

    const errorCode = (error as { code?: string }).code;
    if (errorCode !== '23505') {
      throw error;
    }
    lastError = error;
  }

  throw lastError ?? new Error('Nao foi possivel gerar um codigo de convite unico.');
}

export async function joinCoupleWithInviteCode(inviteCode: string) {
  const normalizedCode = inviteCode.trim().toUpperCase();
  const { data, error } = await supabase.rpc('join_couple_with_invite', {
    invite_code_input: normalizedCode,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function markWelcomeAsSeen(userId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('profiles')
    .update({
      welcome_seen_at: now,
      updated_at: now,
    })
    .eq('id', userId);

  if (error) {
    throw error;
  }
}
