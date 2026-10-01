-- Profiles: one row per auth user, created automatically on sign-up.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Components: a studio design. `objects` is the canvas (DesignObject[] from design-model.ts).
create table public.components (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_name text not null default 'My project',
  name text not null default 'Untitled component',
  objects jsonb not null default '[]'::jsonb,
  version int not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index components_user_updated_idx on public.components (user_id, updated_at desc);

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger components_touch before update on public.components
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.components enable row level security;

create policy "own profile" on public.profiles
  for all using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own components" on public.components
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
