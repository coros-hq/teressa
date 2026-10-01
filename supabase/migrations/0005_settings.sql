-- PROPOSAL: not applied. Profile fields, notification preferences, and the avatars bucket.
-- Account deletion is NOT in this file: it depends on the answer to "what happens to published
-- components?", and will come as its own migration after that.

-- ---- profiles: public profile fields ---------------------------------------------------------------------
-- `full_name` (already there, filled in at sign-up) is the display name. It is not renamed, so the
-- sign-up trigger, the public_authors view and get_overview keep working untouched.
alter table public.profiles
  add column username text,
  add column bio text,
  add column website text,
  add column github_username text,
  add column avatar_path text;

-- Usernames that would clash with a page or could be mistaken for the product. Lower case.
create function public.is_reserved_username(name text) returns boolean
language sql immutable as $$
  select lower(name) = any (array[
    'admin', 'administrator', 'root', 'support', 'help', 'staff', 'team', 'teressa', 'official', 'security', 'abuse',
    'settings', 'studio', 'api', 'r', 'c', 'u', 'explore', 'overview', 'components', 'feedback',
    'sign-in', 'sign-up', 'sign-out', 'signin', 'signup', 'login', 'logout', 'register', 'auth',
    'forgot-password', 'reset-password', 'dashboard', 'docs', 'blog', 'about', 'terms', 'privacy', 'status',
    'new', 'edit', 'me', 'null', 'undefined', 'www', 'mail', 'static', 'assets', 'public'
  ]);
$$;

alter table public.profiles
  add constraint profiles_full_name_length check (full_name is null or char_length(btrim(full_name)) between 1 and 60),
  add constraint profiles_username_format check (username is null or username ~ '^[a-z][a-z0-9_-]{2,29}$'),
  add constraint profiles_username_not_reserved check (username is null or not public.is_reserved_username(username)),
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 160),
  add constraint profiles_website_format check (website is null or (char_length(website) <= 200 and website ~* '^https?://[^\s/$.?#][^\s]*$')),
  -- GitHub's own rule: letters, digits and single hyphens, no leading or trailing hyphen, up to 39.
  add constraint profiles_github_format check (github_username is null or github_username ~ '^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$'),
  -- An avatar must live in the person's own folder.
  add constraint profiles_avatar_path_own_folder check (avatar_path is null or (char_length(avatar_path) <= 200 and avatar_path like id::text || '/%'));

-- One username per person, whatever the capitalisation. People who haven't chosen one yet have none.
create unique index profiles_username_lower_key on public.profiles (lower(username)) where username is not null;

-- Lets the Settings form say "available / taken / not allowed" as someone types. Same answer the
-- table would give at save time, but it also covers the reserved names. The caller's own current
-- username counts as available.
create function public.is_username_available(p_username text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_username ~ '^[a-z][a-z0-9_-]{2,29}$'
     and not public.is_reserved_username(p_username)
     and not exists (
       select 1 from public.profiles
       where lower(username) = lower(p_username) and id <> coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid));
$$;
revoke all on function public.is_username_available(text) from public, anon;
grant execute on function public.is_username_available(text) to authenticated;

-- ---- profiles: who can read and write ------------------------------------------------------------------------
-- Everything in this table is meant to be public (display name, username, avatar, bio, website,
-- GitHub username). The email is never here: it lives in the sign-in system and is not exposed.
drop policy "own profile" on public.profiles;

create policy "profiles are public" on public.profiles
  for select to anon, authenticated using (true);
create policy "people edit their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
-- Only these can be changed from the app. id and created_at never can; rows are made by the sign-up trigger.
grant update (full_name, username, bio, website, github_username, avatar_path) on public.profiles to authenticated;

-- ---- notification preferences -----------------------------------------------------------------------------------
-- A table of its own rather than a column on profiles: the profile is public, and these are private.
-- A row appears the first time someone changes a toggle; until then the defaults below apply
-- (the app reads "no row" as these same values). Typed columns keep the defaults and the
-- allowed values in the database; adding a new kind of email later is one small migration.
create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  new_feedback boolean not null default true,
  comment_replies boolean not null default true,
  feedback_addressed boolean not null default true,
  product_updates boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "own preferences" on public.notification_preferences
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.notification_preferences from anon, authenticated;
grant select on public.notification_preferences to authenticated;
grant insert (user_id, new_feedback, comment_replies, feedback_addressed, product_updates) on public.notification_preferences to authenticated;
grant update (new_feedback, comment_replies, feedback_addressed, product_updates) on public.notification_preferences to authenticated;

create function public.touch_preferences() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger notification_preferences_touch before update on public.notification_preferences
  for each row execute function public.touch_preferences();

-- ---- avatars bucket ---------------------------------------------------------------------------------------------------
-- Public to read (they are shown on public profiles). The size and type limits are enforced by the
-- storage service itself, in addition to the checks in the browser.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Files are read through their public address, so no read policy is needed (and none is added:
-- that also keeps the folder listing private). Writing is limited to your own folder, <your id>/…
create policy "avatars: write inside your own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: see your own files" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: replace your own files" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: remove your own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
