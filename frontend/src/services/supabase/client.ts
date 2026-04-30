import { createBrowserClient } from '@supabase/ssr';
import type { Session, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabasePublishableKey);

export type AuthUser = User;
export type AuthSession = Session;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface DatabaseErrorInfo {
  error: string;
  operationType: OperationType;
  table: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleDatabaseError(
  error: unknown,
  operationType: OperationType,
  table: string | null,
  user?: AuthUser | null,
) {
  const errInfo: DatabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    table,
    authInfo: {
      userId: user?.id,
      email: user?.email,
    },
  };

  console.error('Supabase Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
