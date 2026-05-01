import { supabase } from '@/services/supabase/client';

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

export const COUPLE_PHOTOS_BUCKET = 'couple-photos';

const STORAGE_PUBLIC_MARKER = `/storage/v1/object/public/${COUPLE_PHOTOS_BUCKET}/`;
const STORAGE_SIGNED_MARKER = `/storage/v1/object/sign/${COUPLE_PHOTOS_BUCKET}/`;
const STORAGE_LEGACY_PUBLIC_MARKER = `/object/public/${COUPLE_PHOTOS_BUCKET}/`;

export function extractCouplePhotoPath(photoRef: string | null | undefined) {
  if (!photoRef) return null;

  const trimmed = photoRef.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    const markers = [STORAGE_PUBLIC_MARKER, STORAGE_SIGNED_MARKER, STORAGE_LEGACY_PUBLIC_MARKER];
    for (const marker of markers) {
      const markerIndex = trimmed.indexOf(marker);
      if (markerIndex < 0) continue;

      const rawPath = trimmed.slice(markerIndex + marker.length).split('?')[0];
      return decodeURIComponent(rawPath).replace(/^\/+/, '');
    }

    return null;
  }

  return trimmed.replace(/^\/+/, '');
}

export async function resolveCouplePhotoUrl(photoRef: string | null | undefined) {
  if (!photoRef) return '';

  const trimmed = photoRef.trim();
  if (!trimmed) return '';

  const storagePath = extractCouplePhotoPath(trimmed);
  if (!storagePath) {
    return trimmed;
  }

  const { data, error } = await supabase.storage
    .from(COUPLE_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24);

  if (error) throw error;
  return data.signedUrl;
}

export async function getProfileByUserId(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

async function ensureAppSettingsForCouple(coupleId: string) {
  const { data: appSettings, error: settingsError } = await supabase
    .from('app_settings')
    .select('couple_id')
    .eq('couple_id', coupleId)
    .maybeSingle();

  if (settingsError) throw settingsError;
  if (appSettings) return;

  const { error: insertSettingsError } = await supabase.from('app_settings').insert({
    couple_id: coupleId,
    name_1: '',
    name_2: '',
    relationship_start_date: null,
    relationship_periods: [],
    couple_photo: '',
  });

  if (insertSettingsError) throw insertSettingsError;
}

export async function ensureProfileAndSettings(userId: string, email?: string | null) {
  const existingProfile = await getProfileByUserId(userId);
  if (existingProfile) {
    await ensureAppSettingsForCouple(existingProfile.couple_id);
    return existingProfile;
  }

  // Create profile through a security-definer RPC to avoid RLS issues.
  const { data: bootstrappedProfile, error: bootstrapError } = await supabase.rpc('ensure_my_profile');
  if (bootstrapError) throw bootstrapError;

  const profile = bootstrappedProfile as Profile | null;
  if (!profile) {
    throw new Error('Falha ao inicializar perfil do usuario.');
  }

  await ensureAppSettingsForCouple(profile.couple_id);
  return {
    ...profile,
    email: profile.email ?? email ?? null,
  } as Profile;
}

function generateInviteCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
}

export async function getCoupleInvite(coupleId: string) {
  const { data, error } = await supabase
    .from('couple_invites')
    .select('*')
    .eq('couple_id', coupleId)
    .maybeSingle();
  if (error) throw error;
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

    if (!error) return inviteCode;

    const errorCode = (error as { code?: string }).code;
    if (errorCode !== '23505') throw error;
    lastError = error;
  }

  throw lastError ?? new Error('Nao foi possivel gerar um codigo de convite unico.');
}

export async function joinCoupleWithInviteCode(inviteCode: string) {
  const normalizedCode = inviteCode.trim().toUpperCase();
  const { data, error } = await supabase.rpc('join_couple_with_invite', {
    invite_code_input: normalizedCode,
  });
  if (error) throw error;
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

  if (error) throw error;
}
