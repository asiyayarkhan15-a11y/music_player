-- ===================================================================
--  Music Player — track whether an account has a password
--
--  Run this AFTER schema.sql and profiles.sql.
--  Paste into Supabase -> SQL Editor -> New snippet -> Run.
--  Safe to run more than once.
--
--  WHY THIS EXISTS
--
--  The app needs to know "does this account have a password?" so it can
--  ask for the current one before changing it — and skip that for people
--  who signed up with Google and have never had one.
--
--  The obvious check does not work. Setting a password on an account that
--  was created through Google does NOT add an "email" identity: Supabase
--  writes the password onto the user record and the Providers column still
--  shows Google alone. Nothing in the browser-side user object exposes it
--  either.
--
--  The real answer lives in auth.users.encrypted_password, which the
--  browser can never read. So a trigger copies a single yes/no out to
--  public.profiles, where our own RLS lets the owner read it.
-- ===================================================================


alter table public.profiles
  add column if not exists has_password boolean not null default false;


-- Keeps profiles.has_password in step with the real password.
-- Fires on signup and on every password change.
create or replace function public.sync_has_password()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, has_password)
  values (
    new.id,
    new.encrypted_password is not null and new.encrypted_password <> ''
  )
  on conflict (id) do update
    set has_password = excluded.has_password;

  return new;
end;
$$;

drop trigger if exists on_auth_password_changed on auth.users;
create trigger on_auth_password_changed
  after insert or update of encrypted_password on auth.users
  for each row execute function public.sync_has_password();


-- Everyone who already exists, including you.
update public.profiles p
set has_password = (
  u.encrypted_password is not null and u.encrypted_password <> ''
)
from auth.users u
where u.id = p.id;


-- Check it worked — this should list your account with has_password = true
-- if you have set one, false if you are still Google-only.
select p.id, p.display_name, p.has_password
from public.profiles p;
