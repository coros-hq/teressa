-- Which workspace a draft is edited in: the canvas (design with layers) or the code editor (write the
-- code, see it live). Chosen when the component is created and never changed after, so it can be
-- inserted but not updated from the app. Existing components are canvas components.
alter table public.components
  add column editor text not null default 'canvas' check (editor in ('canvas', 'code'));

grant insert (editor) on public.components to authenticated;
