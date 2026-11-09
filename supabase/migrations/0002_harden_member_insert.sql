-- 0002: harden group_members insert policy.
-- The original policy allowed any user to insert themselves with role='owner'
-- into someone else's group (privilege escalation). Owner rows are created by
-- the handle_new_group trigger (security definer, bypasses RLS), so inserts by
-- users must always be plain 'member' rows.

drop policy if exists "Users can join groups themselves" on public.group_members;

create policy "Users can join groups themselves"
  on public.group_members for insert
  with check (auth.uid() = user_id and role = 'member');
