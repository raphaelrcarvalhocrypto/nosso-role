import { jwtVerify, JWTPayload } from 'jose';
import { supabase } from '@/services/supabase/client';

// Tipos para o payload do JWT
interface CustomJWTPayload extends JWTPayload {
  sub?: string;
  email?: string;
  role?: string;
  coupl

e_id?: string;
}

// Função para obter a chave secreta do JWT
function getJWTSecret(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error('SUPABASE_JWT_SECRET não está definida nas variáveis de ambiente');
  }
  return new TextEncoder().encode(secret);
}

// Função para validar e decodificar o token JWT
export async function validateJWT(token: string): Promise<CustomJWTPayload | null> {
  try {
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as CustomJWTPayload;
  } catch (error) {
    console.error('Erro na validação do JWT:', error);
    return null;
  }
}

// Função para verificar se o usuário tem acesso a um recurso específico
export async function verifyUserAccess(token: string, resourceId: string, resourceType: string): Promise<boolean> {
  try {
    // Validar o token JWT
    const payload = await validateJWT(token);
    if (!payload || !payload.sub) {
      return false;
    }

    // Verificar se o usuário pertence ao casal correto
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('couple_id')
      .eq('id', payload.sub)
      .single();

    if (error || !profile) {
      console.error('Erro ao buscar perfil do usuário:', error);
      return false;
    }

    // Verificar se o recurso pertence ao mesmo casal do usuário
    let query = supabase.from(resourceType).select('couple_id');
    
    // Adicionar condição específica para diferentes tipos de recursos
    switch (resourceType) {
      case 'dates':
        query = query.eq('id', resourceId);
        break;
      case 'trips':
        query = query.eq('id', resourceId);
        break;
      case 'wishlist_items':
        query = query.eq('id', resourceId);
        break;
      case 'surprise_messages':
        query = query.eq('id', resourceId);
        break;
      default:
        return false;
    }

    const { data: resource, error: resourceError } = await query.single();
    
    if (resourceError || !resource) {
      console.error(`Erro ao buscar recurso ${resourceType}:`, resourceError);
      return false;
    }

    // Verificar se o couple_id do usuário corresponde ao couple_id do recurso
    return profile.couple_id === resource.couple_id;
  } catch (error) {
    console.error('Erro na verificação de acesso do usuário:', error);
    return false;
  }
}

// Função para validar sessão do usuário
export async function validateUserSession(token: string): Promise<{ isValid: boolean; userId?: string; coupleId?: string }> {
  try {
    // Validar o token JWT
    const payload = await validateJWT(token);
    if (!payload || !payload.sub) {
      return { isValid: false };
    }

    // Verificar se o usuário ainda existe e obter informações do perfil
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, couple_id')
      .eq('id', payload.sub)
      .single();

    if (error || !profile) {
      console.error('Perfil de usuário não encontrado:', error);
      return { isValid: false };
    }

    return { 
      isValid: true, 
      userId: profile.id, 
      coupleId: profile.couple_id 
    };
  } catch (error) {
    console.error('Erro na validação da sessão do usuário:', error);
    return { isValid: false };
  }
}