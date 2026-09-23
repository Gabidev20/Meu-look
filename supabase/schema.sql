-- Meu Look — rode este arquivo inteiro no SQL Editor do Supabase (uma vez só).

-- Peças do guarda-roupa ------------------------------------------------------
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  image_path  text not null,
  name        text not null,
  category    text not null,          -- ver CATEGORIES em src/lib/types.ts
  colors      text[] not null default '{}',
  pattern     text,
  material    text,
  style_tags  text[] not null default '{}',
  formality   int  not null default 3 check (formality between 1 and 5),
  seasons     text[] not null default '{}',
  description text,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists items_user_idx on public.items (user_id, created_at desc);

-- Looks salvos -----------------------------------------------------------------
create table if not exists public.outfits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  title        text not null,
  occasion     text,
  item_ids     uuid[] not null,
  explanation  text,
  styling_tip  text,
  is_favorite  boolean not null default false,
  worn_count   int not null default 0,
  last_worn_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists outfits_user_idx on public.outfits (user_id, created_at desc);

-- Cada pessoa só enxerga e altera as próprias linhas ---------------------------
alter table public.items   enable row level security;
alter table public.outfits enable row level security;

drop policy if exists "items_own" on public.items;
create policy "items_own" on public.items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "outfits_own" on public.outfits;
create policy "outfits_own" on public.outfits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Fotos: bucket privado, cada pessoa só acessa a própria pasta (<user_id>/...) --
insert into storage.buckets (id, name, public)
values ('wardrobe', 'wardrobe', false)
on conflict (id) do nothing;

drop policy if exists "wardrobe_own_select" on storage.objects;
create policy "wardrobe_own_select" on storage.objects for select
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "wardrobe_own_insert" on storage.objects;
create policy "wardrobe_own_insert" on storage.objects for insert
  with check (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "wardrobe_own_delete" on storage.objects;
create policy "wardrobe_own_delete" on storage.objects for delete
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);
