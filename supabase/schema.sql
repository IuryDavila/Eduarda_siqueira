-- Execute no SQL Editor do Supabase. Cada usuária só acessa a própria linha (RLS).
create table if not exists public.beauty_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.beauty_profiles enable row level security;
create policy "ler o próprio perfil" on public.beauty_profiles for select using (auth.uid() = user_id);
create policy "criar o próprio perfil" on public.beauty_profiles for insert with check (auth.uid() = user_id);
create policy "editar o próprio perfil" on public.beauty_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "apagar o próprio perfil" on public.beauty_profiles for delete using (auth.uid() = user_id);

-- Catálogo (leitura pública, escrita só por admin). Ainda não usado pelo front-end: o app lê PRODUCTS em js/app.js.
create table if not exists public.admins (user_id uuid primary key references auth.users(id));
create table if not exists public.brands (id uuid primary key default gen_random_uuid(), name text not null, tier text, style text, why text);
create table if not exists public.products (id uuid primary key default gen_random_uuid(), brand_id uuid references public.brands(id), name text not null, category text, finish text, coverage text, skin_type text, price numeric, url text, image_url text, featured boolean default false);
alter table public.brands enable row level security; alter table public.products enable row level security; alter table public.admins enable row level security;
create policy "ler marcas" on public.brands for select using (true);
create policy "ler produtos" on public.products for select using (true);
create policy "admin escreve marcas" on public.brands for all using (exists (select 1 from public.admins a where a.user_id = auth.uid())) with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));
create policy "admin escreve produtos" on public.products for all using (exists (select 1 from public.admins a where a.user_id = auth.uid())) with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));
create policy "admin se vê" on public.admins for select using (user_id = auth.uid());

-- ===== Painel admin (rode depois do bloco acima) =====
alter table public.brands add column if not exists origin text;
create unique index if not exists brands_name_uq on public.brands(name);
alter table public.products add column if not exists slug text, add column if not exists brand_name text, add column if not exists origin text, add column if not exists tier text, add column if not exists tags text[] default '{}', add column if not exists tons text, add column if not exists pitch text, add column if not exists conf text default 'a confirmar', add column if not exists iury boolean default false, add column if not exists active boolean default true;
create unique index if not exists products_slug_uq on public.products(slug);
do $$ begin
  alter table public.products add constraint products_url_https check (url is null or url ~* '^https://');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_img_https check (image_url is null or image_url ~* '^https://');
exception when duplicate_object then null; end $$;
-- Primeiro administrador: crie a conta (entre uma vez em admin.html), depois rode, trocando o e-mail:
-- insert into public.admins (user_id) select id from auth.users where email = 'SEU_EMAIL_AQUI';
