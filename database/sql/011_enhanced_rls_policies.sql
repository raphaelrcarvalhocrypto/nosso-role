-- Enhanced RLS policies for improved security

-- Revoke all privileges from public schema for anonymous users
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Revoke all privileges on all tables in public schema for anonymous users
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Revoke all privileges on all sequences in public schema for anonymous users
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Additional validation function for enhanced security
CREATE OR REPLACE FUNCTION public.is_user_in_couple(couple_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.couple_id = $1
  );
$$;

-- Enhanced policy: prevent cross-couple access completely for couples table
DROP POLICY IF EXISTS "couples_select_restricted" ON public.couples;
CREATE POLICY "couples_select_restricted" ON public.couples
FOR SELECT TO authenticated
USING (id = (SELECT public.get_my_couple_id()));

-- Enhance security for profiles table to prevent cross-access
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() 
  AND couple_id = (SELECT public.get_my_couple_id())
);

-- Add additional checks to profiles update policy
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (
  id = auth.uid()
  AND couple_id = (SELECT public.get_my_couple_id())
)
WITH CHECK (
  id = auth.uid()
  AND email IS NOT DISTINCT FROM (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- Enhanced security for app_settings to ensure only couple members can access
DROP POLICY IF EXISTS "app_settings_rw_same_couple" ON public.app_settings;
CREATE POLICY "app_settings_rw_same_couple" ON public.app_settings
FOR ALL TO authenticated
USING (
  couple_id = public.get_my_couple_id()
  AND public.is_user_in_couple(couple_id)
)
WITH CHECK (
  couple_id = public.get_my_couple_id()
  AND public.is_user_in_couple(couple_id)
);

-- Enhanced security for dates with additional validation
DROP POLICY IF EXISTS "dates_rw_same_couple" ON public.dates;
CREATE POLICY "dates_rw_same_couple" ON public.dates
FOR ALL TO authenticated
USING (
  couple_id = public.get_my_couple_id()
  AND public.is_user_in_couple(couple_id)
)
WITH CHECK (
  couple_id = public.get_my_couple_id()
  AND public.is_user_in_couple(couple_id)
  AND (category IS NULL OR LENGTH(category) > 0)
);

-- Enhanced security for trips with additional validation
DROP POLICY IF EXISTS "trips_rw_same_couple" ON public.trips;
CREATE POLICY "trips_rw_same_couple" ON public.trips
FOR ALL TO authenticated
USING (
  couple_id = public.get_my_couple_id()
  AND public.is_user_in_couple(couple_id)
)
WITH CHECK (
  couple_id = public.get_my_couple_id()
  AND public.is_user_in_couple(couple_id)
  AND destination IS NOT NULL
  AND LENGTH(destination) > 0
  AND start_date <= end_date
);

-- Enhanced security for wishlist_items with additional validation
DROP POLICY IF EXISTS "wishlist_rw_same_couple" ON public.wishlist_items;
CREATE POLICY "wishlist_rw_same_couple" ON public.wishlist_items
FOR ALL TO authenticated
USING (
  couple_id = public.get_my_couple_id()
  AND public.is_user_in_couple(couple_id)
)
WITH CHECK (
  couple_id = public.get_my_couple_id()
  AND public.is_user_in_couple(couple_id)
  AND title IS NOT NULL
  AND LENGTH(title) > 0
);

-- Enhanced security for surprise_messages with additional validation
DROP POLICY IF EXISTS "surprises_select_unlocked_or_author_same_couple" ON public.surprise_messages;
CREATE POLICY "surprises_select_unlocked_or_author_same_couple" ON public.surprise_messages
FOR SELECT TO authenticated
USING (
  couple_id = public.get_my_couple_id()
  AND public.is_user_in_couple(couple_id)
  AND (unlock_date <= now() OR author_id = auth.uid())
);

DROP POLICY IF EXISTS "surprises_insert_same_couple_author" ON public.surprise_messages;
CREATE POLICY "surprises_insert_same_couple_author" ON public.surprise_messages
FOR INSERT TO authenticated
WITH CHECK (
  couple_id = public.get_my_couple_id()
  AND public.is_user_in_couple(couple_id)
  AND author_id = auth.uid()
  AND title IS NOT NULL
  AND LENGTH(title) > 0
  AND unlock_date > NOW()
);

DROP POLICY IF EXISTS "surprises_update_author_only" ON public.surprise_messages;
CREATE POLICY "surprises_update_author_only" ON public.surprise_messages
FOR UPDATE TO authenticated
USING (
  author_id = auth.uid()
  AND couple_id = public.get_my_couple_id()
  AND public.is_user_in_couple(couple_id)
)
WITH CHECK (
  author_id = auth.uid()
  AND couple_id = public.get_my_couple_id()
  AND public.is_user_in_couple(couple_id)
  AND unlock_date > NOW()
);

-- Add triggers to ensure update integrity
CREATE OR REPLACE FUNCTION public.prevent_updates_to_locked_surprises()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.unlock_date <= NOW() THEN
    RAISE EXCEPTION 'Cannot update surprise message after unlock date';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_updates_to_locked_surprises_trigger ON public.surprise_messages;
CREATE TRIGGER prevent_updates_to_locked_surprises_trigger
  BEFORE UPDATE ON public.surprise_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_updates_to_locked_surprises();