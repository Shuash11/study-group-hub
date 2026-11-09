-- ============================================================
-- Study Group Hub — initial schema (0001)
-- Apply in Supabase Dashboard → SQL Editor → New query → paste → Run
-- (or via `supabase db push` after `supabase link`)
-- ============================================================

-- ------------------------------------------------------------
-- profiles: one row per user, auto-created when they sign up
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  course text,
  bio text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- ------------------------------------------------------------
-- helper: is the current user a member of group g?
-- ------------------------------------------------------------
create or replace function public.is_group_member(g uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = g and user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- groups
-- ------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course_code text not null,
  description text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  max_members int not null default 20 check (max_members > 0),
  join_code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

create policy "Groups are viewable by everyone"
  on public.groups for select using (true);

create policy "Authenticated users can create groups"
  on public.groups for insert with check (auth.uid() = owner_id);

create policy "Group owners can update their groups"
  on public.groups for update using (auth.uid() = owner_id);

create policy "Group owners can delete their groups"
  on public.groups for delete using (auth.uid() = owner_id);

-- ------------------------------------------------------------
-- group_members: who belongs to which group (many-to-many)
-- ------------------------------------------------------------
create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

create policy "Memberships are viewable by everyone"
  on public.group_members for select using (true);

create policy "Users can join groups themselves"
  on public.group_members for insert with check (auth.uid() = user_id);

create policy "Users can leave groups themselves"
  on public.group_members for delete using (auth.uid() = user_id and role = 'member');

create policy "Group owners manage member roles"
  on public.group_members for update using (
    exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  );

-- ------------------------------------------------------------
-- study_sessions: scheduled sessions per group
-- ------------------------------------------------------------
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  duration_minutes int not null default 60 check (duration_minutes > 0),
  location text,
  details text,
  created_at timestamptz not null default now()
);

alter table public.study_sessions enable row level security;

create policy "Group members can view sessions"
  on public.study_sessions for select using (public.is_group_member(group_id));

create policy "Group members can create sessions"
  on public.study_sessions for insert with check (public.is_group_member(group_id));

create policy "Session creators can update their sessions"
  on public.study_sessions for update using (auth.uid() = created_by);

create policy "Session creators can delete their sessions"
  on public.study_sessions for delete using (auth.uid() = created_by);

-- ------------------------------------------------------------
-- session_rsvps: going / maybe / not_going per member per session
-- ------------------------------------------------------------
create table public.session_rsvps (
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('going', 'maybe', 'not_going')),
  responded_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

alter table public.session_rsvps enable row level security;

create policy "Group members can view RSVPs"
  on public.session_rsvps for select using (
    public.is_group_member((select s.group_id from public.study_sessions s where s.id = session_id))
  );

create policy "Members can RSVP for themselves"
  on public.session_rsvps for insert with check (
    auth.uid() = user_id
    and public.is_group_member((select s.group_id from public.study_sessions s where s.id = session_id))
  );

create policy "Users can update their own RSVPs"
  on public.session_rsvps for update using (auth.uid() = user_id);

create policy "Users can delete their own RSVPs"
  on public.session_rsvps for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- triggers: auto-create profile on signup, owner membership on group creation
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- ------------------------------------------------------------
-- indexes for the query patterns the app uses
-- ------------------------------------------------------------
create index idx_groups_course_code on public.groups (course_code);
create index idx_group_members_user on public.group_members (user_id);
create index idx_sessions_group on public.study_sessions (group_id, starts_at);
create index idx_rsvps_user on public.session_rsvps (user_id);
