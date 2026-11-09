-- 0003: invite codes become protected data; joins are enforced server-side.
--
-- Fixes (see Plan.md review findings):
--  H1: join_code was a column of the world-readable groups table and group_members
--      self-insert had no code check -> anyone could join any group. Codes now live
--      in group_invites (member-readable only) and joining goes through the
--      join_group_by_code RPC; direct membership inserts are removed.
--  M1: max_members was only checked in the browser. The RPC enforces it atomically
--      (SELECT ... FOR UPDATE serializes concurrent joins per group).
--  M2: profiles/group_members were world-readable; visitors now get aggregate
--      member counts only (groups.member_count, trigger-maintained).
--  L5: sessions must be authored by the caller (created_by = auth.uid()).

-- ------------------------------------------------------------
-- 1. member_count maintained on groups (public aggregate, no personal data)
-- ------------------------------------------------------------
alter table public.groups add column member_count int not null default 0;

create or replace function public.recompute_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid := coalesce(new.group_id, old.group_id);
begin
  update public.groups
     set member_count = (select count(*) from public.group_members where group_id = v_group)
   where id = v_group;
  return null;
end;
$$;

create trigger trg_group_members_count
  after insert or delete on public.group_members
  for each row
  execute function public.recompute_member_count();

update public.groups g
   set member_count = (select count(*) from public.group_members gm where gm.group_id = g.id);

-- ------------------------------------------------------------
-- 2. invite codes move out of the world-readable table
-- ------------------------------------------------------------
create table public.group_invites (
  group_id uuid primary key references public.groups(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

insert into public.group_invites (group_id, code)
select id, join_code from public.groups;

alter table public.groups drop column join_code;

alter table public.group_invites enable row level security;

create policy "Group members can view their invite code"
  on public.group_invites for select
  using (public.is_group_member(group_id));

create policy "Group owners can update their invite code"
  on public.group_invites for update
  using (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));

-- No insert/delete policies on group_invites: codes are minted by the
-- security-definer group trigger below, so no client can forge them.

-- ------------------------------------------------------------
-- 3. group creation also mints a 6-character invite code (lookalikes removed)
-- ------------------------------------------------------------
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_attempt int := 0;
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'owner');

  loop
    v_attempt := v_attempt + 1;
    v_code := (
      select string_agg(ch, '')
      from (
        select substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32)::int + 1, 1) as ch
        from generate_series(1, 6)
      ) chars
    );
    begin
      insert into public.group_invites (group_id, code) values (new.id, v_code);
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then
        raise; -- practically unreachable with a 32^6 space
      end if;
    end;
  end loop;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 4. atomic, code-checked, capacity-enforced join
-- ------------------------------------------------------------
create or replace function public.join_group_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_group_id uuid;
  v_max int;
  v_count int;
begin
  if v_user is null then
    raise exception 'You must be signed in to join a group.';
  end if;

  select gi.group_id into v_group_id
  from public.group_invites gi
  where gi.code = upper(trim(p_code));

  if v_group_id is null then
    raise exception 'No group found with that code. Double-check and try again.';
  end if;

  if exists (
    select 1 from public.group_members
    where group_id = v_group_id and user_id = v_user
  ) then
    raise exception 'You are already a member of this group.';
  end if;

  -- Lock the group row so concurrent joins cannot exceed capacity.
  select g.max_members into v_max
  from public.groups g
  where g.id = v_group_id
  for update;

  select count(*) into v_count
  from public.group_members
  where group_id = v_group_id;

  if v_count >= v_max then
    raise exception 'This group is full.';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user, 'member');

  return v_group_id;
end;
$$;

grant execute on function public.join_group_by_code(text) to authenticated;
revoke execute on function public.join_group_by_code(text) from anon;

-- Joins now only happen through the RPC: direct self-insert is removed.
drop policy if exists "Users can join groups themselves" on public.group_members;

-- ------------------------------------------------------------
-- 5. sessions must be authored by the caller
-- ------------------------------------------------------------
drop policy if exists "Group members can create sessions" on public.study_sessions;
create policy "Group members can create sessions"
  on public.study_sessions for insert
  with check (auth.uid() = created_by and public.is_group_member(group_id));

-- ------------------------------------------------------------
-- 6. personal data is not world-readable; visitors get aggregates only
-- ------------------------------------------------------------
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Memberships are viewable by everyone" on public.group_members;
create policy "Group members can view the roster"
  on public.group_members for select
  using (public.is_group_member(group_id));
