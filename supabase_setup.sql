-- 1. Enable UUID extension for generating unique IDs
create extension if not exists "uuid-ossp";

-- 2. PROFILES TABLE (Public profile data linked to auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security)
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- Trigger to create a profile entry automatically when a new user signs up
create function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 3. PROJECTS TABLE (Stores history)
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  text_content text,           -- The full story text
  segments jsonb default '[]', -- The storyboard segments (Image prompt, audio ref, etc)
  mode text default 'editor',  -- 'editor' or 'storyboard'
  preview text,                -- Short text preview for the list view
  scene_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS for Projects
alter table public.projects enable row level security;

-- Policies for Projects (Users can only do CRUD on their own projects)
create policy "Users can view own projects" 
  on public.projects for select 
  using (auth.uid() = user_id);

create policy "Users can insert own projects" 
  on public.projects for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own projects" 
  on public.projects for update 
  using (auth.uid() = user_id);

create policy "Users can delete own projects" 
  on public.projects for delete 
  using (auth.uid() = user_id);


-- 4. API KEYS TABLE (User specific keys)
create table public.user_api_keys (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  key_value text not null,     -- Note: For production, consider using Supabase Vault or client-side encryption
  label text,                  -- Optional label (e.g., "My Pro Key")
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Enable RLS for Keys
alter table public.user_api_keys enable row level security;

-- Policies for Keys
create policy "Users can manage own keys" 
  on public.user_api_keys for all 
  using (auth.uid() = user_id);


-- 5. Helper to automatically update 'updated_at' column
create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at before update on public.projects
  for each row execute procedure moddatetime (updated_at);
