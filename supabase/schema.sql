-- PetSocial - schema seguro com Supabase (Auth + DB + Storage + RLS)

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  user_type text not null default 'adotante' check (user_type in ('adotante', 'tutor')),
  bio text,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_name text not null,
  description text not null,
  age_group text not null check (age_group in ('Filhote', 'Adulto')),
  size_group text not null check (size_group in ('Pequeno', 'Médio')),
  adoption_status text not null default 'disponivel' check (adoption_status in ('disponivel', 'em-processo', 'adotado')),
  image_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete set null,
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint chat_participants_different check (participant_a <> participant_b),
  constraint chat_participant_order check (participant_a < participant_b),
  unique (post_id, participant_a, participant_b)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_name text not null,
  image_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '24 hours'
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at before update on public.posts
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;
alter table public.stories enable row level security;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid and p.is_admin = true
  );
$$;

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public" on public.profiles
for select using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
for update using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "posts_select_public" on public.posts;
create policy "posts_select_public" on public.posts
for select using (true);

drop policy if exists "posts_insert_owner" on public.posts;
create policy "posts_insert_owner" on public.posts
for insert with check (auth.uid() = owner_id or public.is_admin(auth.uid()));

drop policy if exists "posts_update_owner_or_admin" on public.posts;
create policy "posts_update_owner_or_admin" on public.posts
for update using (auth.uid() = owner_id or public.is_admin(auth.uid()))
with check (auth.uid() = owner_id or public.is_admin(auth.uid()));

drop policy if exists "posts_delete_owner_or_admin" on public.posts;
create policy "posts_delete_owner_or_admin" on public.posts
for delete using (auth.uid() = owner_id or public.is_admin(auth.uid()));

drop policy if exists "likes_select_public" on public.post_likes;
create policy "likes_select_public" on public.post_likes
for select using (true);

drop policy if exists "likes_insert_own" on public.post_likes;
create policy "likes_insert_own" on public.post_likes
for insert with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "likes_delete_own_or_admin" on public.post_likes;
create policy "likes_delete_own_or_admin" on public.post_likes
for delete using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "comments_select_public" on public.post_comments;
create policy "comments_select_public" on public.post_comments
for select using (true);

drop policy if exists "comments_insert_own" on public.post_comments;
create policy "comments_insert_own" on public.post_comments
for insert with check (auth.uid() = owner_id or public.is_admin(auth.uid()));

drop policy if exists "comments_update_own_or_admin" on public.post_comments;
create policy "comments_update_own_or_admin" on public.post_comments
for update using (auth.uid() = owner_id or public.is_admin(auth.uid()))
with check (auth.uid() = owner_id or public.is_admin(auth.uid()));

drop policy if exists "comments_delete_own_or_admin" on public.post_comments;
create policy "comments_delete_own_or_admin" on public.post_comments
for delete using (auth.uid() = owner_id or public.is_admin(auth.uid()));

drop policy if exists "stories_select_public" on public.stories;
create policy "stories_select_public" on public.stories
for select using (true);

drop policy if exists "stories_insert_owner" on public.stories;
create policy "stories_insert_owner" on public.stories
for insert with check (auth.uid() = owner_id or public.is_admin(auth.uid()));

drop policy if exists "stories_update_owner_or_admin" on public.stories;
create policy "stories_update_owner_or_admin" on public.stories
for update using (auth.uid() = owner_id or public.is_admin(auth.uid()))
with check (auth.uid() = owner_id or public.is_admin(auth.uid()));

drop policy if exists "stories_delete_owner_or_admin" on public.stories;
create policy "stories_delete_owner_or_admin" on public.stories
for delete using (auth.uid() = owner_id or public.is_admin(auth.uid()));

drop policy if exists "channels_select_participants_or_admin" on public.chat_channels;
create policy "channels_select_participants_or_admin" on public.chat_channels
for select using (
  auth.uid() = participant_a
  or auth.uid() = participant_b
  or public.is_admin(auth.uid())
);

drop policy if exists "channels_insert_participants_or_admin" on public.chat_channels;
create policy "channels_insert_participants_or_admin" on public.chat_channels
for insert with check (
  (auth.uid() = participant_a or auth.uid() = participant_b)
  or public.is_admin(auth.uid())
);

drop policy if exists "channels_update_participants_or_admin" on public.chat_channels;
create policy "channels_update_participants_or_admin" on public.chat_channels
for update using (
  auth.uid() = participant_a
  or auth.uid() = participant_b
  or public.is_admin(auth.uid())
)
with check (
  auth.uid() = participant_a
  or auth.uid() = participant_b
  or public.is_admin(auth.uid())
);

drop policy if exists "channels_delete_participants_or_admin" on public.chat_channels;
create policy "channels_delete_participants_or_admin" on public.chat_channels
for delete using (
  auth.uid() = participant_a
  or auth.uid() = participant_b
  or public.is_admin(auth.uid())
);

drop policy if exists "messages_select_participants_or_admin" on public.chat_messages;
create policy "messages_select_participants_or_admin" on public.chat_messages
for select using (
  exists (
    select 1 from public.chat_channels c
    where c.id = channel_id
      and (auth.uid() = c.participant_a or auth.uid() = c.participant_b)
  )
  or public.is_admin(auth.uid())
);

drop policy if exists "messages_insert_owner_in_channel_or_admin" on public.chat_messages;
create policy "messages_insert_owner_in_channel_or_admin" on public.chat_messages
for insert with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.chat_channels c
    where c.id = channel_id
      and (auth.uid() = c.participant_a or auth.uid() = c.participant_b)
  )
  or public.is_admin(auth.uid())
);

drop policy if exists "messages_delete_owner_or_admin" on public.chat_messages;
create policy "messages_delete_owner_or_admin" on public.chat_messages
for delete using (auth.uid() = owner_id or public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public)
values ('petsocial-media', 'petsocial-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "storage_public_read_petsocial_media" on storage.objects;
create policy "storage_public_read_petsocial_media" on storage.objects
for select using (bucket_id = 'petsocial-media');

drop policy if exists "storage_upload_own_folder" on storage.objects;
create policy "storage_upload_own_folder" on storage.objects
for insert with check (
  bucket_id = 'petsocial-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "storage_update_own_folder_or_admin" on storage.objects;
create policy "storage_update_own_folder_or_admin" on storage.objects
for update using (
  bucket_id = 'petsocial-media'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin(auth.uid())
  )
)
with check (
  bucket_id = 'petsocial-media'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin(auth.uid())
  )
);

drop policy if exists "storage_delete_own_folder_or_admin" on storage.objects;
create policy "storage_delete_own_folder_or_admin" on storage.objects
for delete using (
  bucket_id = 'petsocial-media'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin(auth.uid())
  )
);
